import {
    Alert,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Link,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {useEffect, useState} from "react";

import {
    debugInfosFileName,
    downloadDebugInfos,
    endpointsUrl,
    executeSqlQuery,
    executeSqlUpdate,
    getSensitiveDataLogging,
    heapDumpUrl,
    logThreadDump,
    setSensitiveDataLogging,
    uploadDebugInfos,
    type SqlResult,
} from "../../../api/system/debug";
import {ApiTransport} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {useToasts} from "../../../components/toasts/toasts";
import {CpuUsageCard} from "./CpuUsageCard";
import {useThreadCpuUsage} from "./useThreadCpuUsage";

const DOWNLOAD_FAILURE = "Unable to create the debug infos.";
const UPLOAD_FAILURE = "Unable to create and upload the debug infos.";
const THREAD_DUMP_SUCCESS = "Thread dump written to the log file.";
const THREAD_DUMP_FAILURE = "Unable to log a thread dump.";
const SENSITIVE_LOAD_FAILURE =
    "Unable to read whether sensitive data logging is enabled.";
const SENSITIVE_TOGGLE_FAILURE =
    "Unable to change the sensitive data logging setting.";
const SQL_FAILURE = "Unable to execute the SQL statement.";

/** Legacy's two growl texts (`system-controller.js:148-150`). */
export const SENSITIVE_ENABLED_WARNING =
    "Sensitive data logging enabled. API keys, passwords and usernames will appear unmasked in the log!";
export const SENSITIVE_DISABLED_INFO =
    "Sensitive data logging disabled. Values will be masked in the log again.";

/** Legacy's two tooltips (`bugreport.html:57-62`). */
export const SENSITIVE_ENABLE_TOOLTIP =
    "Temporarily disables masking of API keys, passwords and usernames in the log file. Useful for debugging connection issues. Will reset on restart.";
export const SENSITIVE_DISABLE_TOOLTIP =
    "Sensitive data logging is active. API keys, passwords and usernames appear unmasked in the log. Click to disable.";

/** Legacy's heap-dump tooltip (`bugreport.html:66-67`). */
export const HEAP_DUMP_TOOLTIP =
    "Will not work on J9 based JREs (and possibly others as well).";

export const UPLOAD_RESULT_PREFIX =
    "URL with debug infos (will auto-delete on first download):";

/**
 * `F-SYSTEM-BUGREPORT`: legacy's Bugreport / Debug tab (`bugreport.html`,
 * `system-controller.js:92-245`) as the shell's sixth tab. Every action here
 * is an admin diagnostic against the running instance: the anonymized debug
 * archive, a thread dump, the sensitive-logging switch, the heap dump and
 * endpoint listing, a raw SQL console, and the polled CPU chart.
 */
export function SystemBugreportTab({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    // `showToast` is the provider's own state setter and so keeps its
    // identity; the context object around it does not, which is why the
    // effect below depends on the function rather than on the service.
    const {showToast} = useToasts();
    const cpu = useThreadCpuUsage(transport);
    const [busy, setBusy] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [sensitiveEnabled, setSensitiveEnabled] = useState(false);
    const [sql, setSql] = useState("");
    const [sqlOutput, setSqlOutput] = useState("");

    // Legacy reads the current state once when the controller is created
    // (`system-controller.js:135-137`) and leaves the button showing "enable"
    // until the answer arrives.
    useEffect(() => {
        let cancelled = false;
        getSensitiveDataLogging(transport)
            .then((enabled) => {
                if (!cancelled) {
                    setSensitiveEnabled(enabled);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    showToast({
                        message: SENSITIVE_LOAD_FAILURE,
                        severity: "error",
                    });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [showToast, transport]);

    const failed = (message: string) => showToast({message, severity: "error"});

    const download = async () => {
        setBusy(true);
        try {
            const blob = await downloadDebugInfos(transport);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = debugInfosFileName(new Date());
            link.click();
            URL.revokeObjectURL(link.href);
        } catch {
            failed(DOWNLOAD_FAILURE);
        } finally {
            setBusy(false);
        }
    };

    const upload = async () => {
        setBusy(true);
        setUploadedUrl(null);
        setUploadError(null);
        try {
            const result = await uploadDebugInfos(transport);
            if (result.kind === "successful") {
                setUploadedUrl(result.url);
                return;
            }
            // Legacy put the failing response's body where the link would
            // have gone (`system-controller.js:121`); it stays text here.
            setUploadError(result.message ?? UPLOAD_FAILURE);
        } finally {
            setBusy(false);
        }
    };

    const threadDump = async () => {
        setBusy(true);
        try {
            const result = await logThreadDump(transport);
            showToast(
                result.kind === "successful"
                    ? {message: THREAD_DUMP_SUCCESS, severity: "info"}
                    : {message: THREAD_DUMP_FAILURE, severity: "error"},
            );
        } finally {
            setBusy(false);
        }
    };

    /**
     * The button reports the state the *server* ended up in, not the flip that
     * was requested: `setSensitiveDataLoggingEnabled` answers with
     * `SensitiveDataRemovingPatternLayoutEncoder.isDisabled()` after applying
     * the change, and that is the only account of whether the encoder actually
     * changed.
     */
    const toggleSensitive = async () => {
        setBusy(true);
        try {
            const enabled = await setSensitiveDataLogging(
                transport,
                !sensitiveEnabled,
            );
            setSensitiveEnabled(enabled);
            showToast(
                enabled
                    ? {message: SENSITIVE_ENABLED_WARNING, severity: "warning"}
                    : {message: SENSITIVE_DISABLED_INFO, severity: "info"},
            );
        } catch {
            failed(SENSITIVE_TOGGLE_FAILURE);
        } finally {
            setBusy(false);
        }
    };

    const runSql = async (
        action: (transport: ApiTransport, sql: string) => Promise<SqlResult>,
    ) => {
        setBusy(true);
        let result: SqlResult;
        try {
            result = await action(transport, sql);
        } finally {
            setBusy(false);
        }
        if (result.kind === "successful") {
            setSqlOutput(result.output);
            return;
        }
        failed(result.message ?? SQL_FAILURE);
    };

    return (
        <Stack data-testid="system-bugreport" spacing={3}>
            <Card variant="outlined">
                <CardContent>
                    <Stack spacing={2}>
                        <Typography component="h2" variant="h6">
                            Bugreport / Debug infos
                        </Typography>
                        <Typography component="div">
                            So you found a bug? Ideally{" "}
                            {/*
                             * Legacy links both of these directly, without the
                             * dereferer wrapper it uses elsewhere
                             * (`bugreport.html:8-11`).
                             */}
                            <Link
                                href="https://github.com/theotherp/nzbhydra2/issues/new"
                                rel="noreferrer"
                                target="_blank"
                            >
                                raise an issue on github
                            </Link>
                            . If you don&apos;t have an account create one ;-) I
                            prefer GitHub issues for communication. Otherwise{" "}
                            <Link href="mailto:theotherp@posteo.net">
                                send me a mail
                            </Link>
                            .
                        </Typography>
                        <Typography component="div">
                            <b>But</b> please read this first: Don&apos;t just
                            tell me what the problem is. If you just post an
                            exception from the console or say &quot;x does not
                            work&quot; I probably won&apos;t be willing or able
                            to help. Remember you want something from me.
                        </Typography>
                        <Typography component="ul">
                            <li>
                                Tell me what you expect to happen and what
                                actually happens
                            </li>
                            <li>
                                If hydra doesn&apos;t even start, tell me your
                                OS and how you start it.
                            </li>
                            <li>
                                If the website looks weird tell me what browser
                                you use. If you use a reverse proxy post your
                                config and your base URL setting.
                            </li>
                            <li>
                                If the GUI behaves strangely or doesn&apos;t
                                react as it should check the browser console for
                                errors.
                            </li>
                        </Typography>
                        <Typography component="div">
                            Tell me anything that might help. If you do all that
                            I will do my best to help you and improve NZBHydra.
                        </Typography>
                        <Typography component="div">
                            If possible provide the log and your settings. Here
                            you can get anonymized versions of both to be
                            posted:
                        </Typography>

                        <Stack direction="row" flexWrap="wrap" gap={2}>
                            <Button
                                data-testid="system-debug-download"
                                disabled={busy}
                                onClick={() => void download()}
                                type="button"
                                variant="contained"
                            >
                                Create and download debug infos
                            </Button>
                            {/*
                             * Legacy hid this behind a split-button dropdown
                             * (`bugreport.html:38-48`). Both actions are shown
                             * side by side instead: there are two of them, and
                             * a dropdown that holds exactly one item only hides
                             * it.
                             */}
                            <Button
                                data-testid="system-debug-upload"
                                disabled={busy}
                                onClick={() => void upload()}
                                type="button"
                                variant="outlined"
                            >
                                Create and upload debug infos to file share
                            </Button>
                            {busy && (
                                <CircularProgress
                                    aria-label="Working"
                                    role="status"
                                    size={24}
                                />
                            )}
                        </Stack>

                        {uploadedUrl !== null && (
                            <Typography
                                component="div"
                                data-testid="system-debug-upload-result"
                            >
                                {UPLOAD_RESULT_PREFIX}{" "}
                                {/*
                                 * The share address is data, never markup: it
                                 * is an attribute value and a text node here,
                                 * where legacy built an anchor as an HTML
                                 * string for `ng-bind-html`.
                                 */}
                                <Link
                                    href={uploadedUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    {uploadedUrl}
                                </Link>
                            </Typography>
                        )}
                        {uploadError !== null && (
                            <Alert
                                data-testid="system-debug-upload-result"
                                severity="error"
                            >
                                {uploadError}
                            </Alert>
                        )}

                        <Stack direction="row" flexWrap="wrap" gap={2}>
                            <Button
                                data-testid="system-thread-dump"
                                disabled={busy}
                                onClick={() => void threadDump()}
                                type="button"
                                variant="outlined"
                            >
                                Log thread dump
                            </Button>
                            {/*
                             * `describeChild` keeps the button's own text as
                             * its accessible name; MUI's default would make
                             * the tooltip the label and hide the wording that
                             * says which way the switch currently stands.
                             */}
                            <Tooltip
                                describeChild
                                title={
                                    sensitiveEnabled
                                        ? SENSITIVE_DISABLE_TOOLTIP
                                        : SENSITIVE_ENABLE_TOOLTIP
                                }
                            >
                                <Button
                                    color={
                                        sensitiveEnabled ? "warning" : "primary"
                                    }
                                    data-testid="system-sensitive-toggle"
                                    disabled={busy}
                                    onClick={() => void toggleSensitive()}
                                    type="button"
                                    variant={
                                        sensitiveEnabled
                                            ? "contained"
                                            : "outlined"
                                    }
                                >
                                    {sensitiveEnabled
                                        ? "Disable sensitive data in logs (currently enabled!)"
                                        : "Enable sensitive data in logs"}
                                </Button>
                            </Tooltip>
                            <Tooltip describeChild title={HEAP_DUMP_TOOLTIP}>
                                <Button
                                    component="a"
                                    data-testid="system-heap-dump"
                                    href={heapDumpUrl(transport)}
                                    rel="noreferrer"
                                    target="_blank"
                                    variant="outlined"
                                >
                                    Create heap dump
                                </Button>
                            </Tooltip>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            <CpuUsageCard
                serverTimeZone={bootstrap.serverTimeZone}
                stopped={cpu.stopped}
                threadSeries={cpu.threadSeries}
            />

            <Card variant="outlined">
                <CardContent>
                    <Stack spacing={2}>
                        <Typography component="h2" variant="h6">
                            Debug SQL execution
                        </Typography>
                        <Typography component="div">
                            You may want to take a look at the settings to make
                            sure there&apos;s nothing in there you wouldn&apos;t
                            want me to see. You can use the input box below to
                            execute any SQL query against the database. You will
                            likely never need this but it allows me to ask you
                            to execute a query when I try to solve a bug.
                        </Typography>
                        <TextField
                            fullWidth
                            label="SQL"
                            minRows={5}
                            multiline
                            onChange={(event) => setSql(event.target.value)}
                            slotProps={{
                                htmlInput: {"data-testid": "system-sql-input"},
                            }}
                            value={sql}
                        />
                        <Stack direction="row" flexWrap="wrap" gap={2}>
                            <Button
                                data-testid="system-sql-query"
                                disabled={busy}
                                onClick={() => void runSql(executeSqlQuery)}
                                type="button"
                                variant="outlined"
                            >
                                Query
                            </Button>
                            <Button
                                data-testid="system-sql-execute"
                                disabled={busy}
                                onClick={() => void runSql(executeSqlUpdate)}
                                type="button"
                                variant="outlined"
                            >
                                Execute
                            </Button>
                        </Stack>
                        <TextField
                            fullWidth
                            label="Result"
                            minRows={10}
                            multiline
                            slotProps={{
                                htmlInput: {
                                    "data-testid": "system-sql-output",
                                    readOnly: true,
                                },
                            }}
                            value={sqlOutput}
                        />
                    </Stack>
                </CardContent>
            </Card>

            <Card variant="outlined">
                <CardContent>
                    <Stack alignItems="flex-start" spacing={2}>
                        <Typography component="h2" variant="h6">
                            Misc
                        </Typography>
                        <Button
                            component="a"
                            data-testid="system-endpoints"
                            href={endpointsUrl(transport)}
                            rel="noreferrer"
                            target="_blank"
                            variant="outlined"
                        >
                            List HTTP endpoints
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
}
