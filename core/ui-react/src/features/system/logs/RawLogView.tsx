import {
    Alert,
    Button,
    CircularProgress,
    FormControlLabel,
    Stack,
    Switch,
    Typography,
} from "@mui/material";
import {useQuery} from "@tanstack/react-query";
import {useEffect, useRef, useState} from "react";

import {getCurrentLogFile} from "../../../api/system/logs";
import {ApiTransport} from "../../../api/transport";
import {monoFontFamily} from "../../../app/theme";
import {
    loadAutoRefresh,
    loadTail,
    saveAutoRefresh,
    saveTail,
} from "./persistence";

/** Legacy's `$interval(..., 5000)` for the raw view (`hydra-log.js:87`). */
const REFRESH_INTERVAL_MS = 5000;

/**
 * Legacy's Raw view (`log.html:60-79`): the current log file as text, with the
 * refresh and tail toggles. The refresh timer belongs to this component, so it
 * exists only while the raw view is the selected one and is torn down with it
 * on a view change or an unmount — legacy had to cancel its `$interval` by
 * hand on `$destroy` and guard it with `active === 1` inside the tick.
 */
export function RawLogView({transport}: {transport: ApiTransport}) {
    const [autoRefresh, setAutoRefresh] = useState(loadAutoRefresh);
    const [tail, setTail] = useState(loadTail);
    const logPanel = useRef<HTMLPreElement>(null);
    const log = useQuery({
        queryFn: () => getCurrentLogFile(transport),
        queryKey: ["system-log-current"],
        refetchInterval: autoRefresh ? REFRESH_INTERVAL_MS : false,
        // FM-121 gave the application a 30-second default `staleTime`. A log
        // tail is the one thing here that is worth reading precisely because
        // it changed a second ago, so this view keeps react-query's original
        // "always refetch on mount" behavior: with auto-refresh switched off
        // nothing else would bring a re-opened Log tab up to date.
        staleTime: 0,
    });
    const content = log.data;

    function scrollToBottom() {
        const panel = logPanel.current;
        if (panel !== null) {
            panel.scrollTop = panel.scrollHeight;
        }
    }

    // Legacy scrolls to the end whenever the raw view loads or is refreshed
    // while tailing (`hydra-log.js:59-88`).
    useEffect(() => {
        if (content !== undefined && tail) {
            const panel = logPanel.current;
            if (panel !== null) {
                panel.scrollTop = panel.scrollHeight;
            }
        }
    }, [content, tail]);

    /**
     * Legacy's `toggleUpdate` (`hydra-log.js:90-101`): switching the refresh
     * off also switches tailing off, because a tail that never refreshes
     * follows nothing.
     */
    function toggleAutoRefresh(next: boolean) {
        setAutoRefresh(next);
        saveAutoRefresh(next);
        if (!next) {
            setTail(false);
            saveTail(false);
        }
    }

    /** The same coupling from the other side: tailing implies refreshing. */
    function toggleTail(next: boolean) {
        setTail(next);
        saveTail(next);
        if (next && !autoRefresh) {
            setAutoRefresh(true);
            saveAutoRefresh(true);
        }
    }

    return (
        <Stack data-testid="system-log-view-raw" spacing={2}>
            <Stack
                alignItems={{sm: "center"}}
                direction={{sm: "row", xs: "column"}}
                spacing={2}
            >
                <Button
                    onClick={() => void log.refetch()}
                    type="button"
                    variant="outlined"
                >
                    Update
                </Button>
                <Button
                    onClick={scrollToBottom}
                    type="button"
                    variant="outlined"
                >
                    Scroll to bottom
                </Button>
                <FormControlLabel
                    control={
                        <Switch
                            checked={autoRefresh}
                            onChange={(event) =>
                                toggleAutoRefresh(event.target.checked)
                            }
                            slotProps={{
                                input: {
                                    "data-testid": "system-log-refresh-toggle",
                                } as React.InputHTMLAttributes<HTMLInputElement>,
                            }}
                        />
                    }
                    label="Update every five seconds"
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={tail}
                            onChange={(event) =>
                                toggleTail(event.target.checked)
                            }
                            slotProps={{
                                input: {
                                    "data-testid": "system-log-tail-toggle",
                                } as React.InputHTMLAttributes<HTMLInputElement>,
                            }}
                        />
                    }
                    label="Scroll to the end after every update"
                />
            </Stack>
            {log.isPending && (
                <Stack alignItems="center" role="status" spacing={2}>
                    <CircularProgress variant="indeterminate" />
                    <Typography>Loading the log file</Typography>
                </Stack>
            )}
            {log.isError && (
                <Alert severity="error">Unable to load the log file.</Alert>
            )}
            {content !== undefined && (
                // Log lines regularly contain markup-like text (request URLs,
                // XML/HTML payloads, exception messages). It is rendered as
                // React children, so it is text and never markup; legacy had
                // to escape it by hand before `ng-bind-html`
                // (`hydra-log.js:32-36`).
                <Typography
                    component="pre"
                    ref={logPanel}
                    // Scrollable content needs to be in the tab order to be
                    // scrollable by keyboard alone (WCAG 2.1.1).
                    tabIndex={0}
                    sx={{
                        fontFamily: monoFontFamily,
                        maxHeight: "65vh",
                        my: 0,
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                    }}
                    variant="body2"
                >
                    {content}
                </Typography>
            )}
        </Stack>
    );
}
