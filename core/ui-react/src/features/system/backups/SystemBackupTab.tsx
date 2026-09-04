import {
    Alert,
    Button,
    CircularProgress,
    LinearProgress,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {
    backupDownloadUrl,
    createAndDownloadBackup,
    createBackup,
    createdBackupFileName,
    getBackups,
    restoreBackup,
    uploadBackup,
    type BackupEntry,
} from "../../../api/system/backup";
import {ApiTransport, type UploadProgress} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {useToasts} from "../../../components/toasts/toasts";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {useBackupRestartCountdown} from "./useBackupRestartCountdown";

const RESTORE_COUNTDOWN_MESSAGE =
    "Extraction of backup successful. Restarting for wrapper to restore data.";
const UPLOAD_COUNTDOWN_MESSAGE =
    "Upload successful. Restarting for wrapper to restore data.";
const CREATE_FAILURE = "Unable to create a backup.";
const RESTORE_FAILURE = "Unable to restore the backup.";
const UPLOAD_FAILURE = "Unable to restore from the uploaded file.";

/**
 * `F-SYSTEM-BACKUP`: legacy's `hydrabackup` directive (`backup.js`,
 * `backup.html`) as the shell's Backup tab. Creating, listing, downloading,
 * restoring, and upload-and-restore; the two restoring actions make the
 * instance exit for its wrapper to put the data in place, so both hand off to
 * the restart countdown.
 */
export function SystemBackupTab({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const dialogs = useDialogs();
    const toasts = useToasts();
    const countdown = useBackupRestartCountdown(transport);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const backups = useQuery({
        queryFn: () => getBackups(transport),
        queryKey: ["system-backups"],
    });

    const failed = (message: string | null, fallback: string) =>
        toasts.showToast({
            message: message ?? fallback,
            severity: "error",
        });

    const createOnly = async () => {
        setBusy(true);
        try {
            const result = await createBackup(transport);
            if (result.kind === "successful") {
                await backups.refetch();
                return;
            }
            failed(result.message, CREATE_FAILURE);
        } finally {
            setBusy(false);
        }
    };

    const createAndDownload = async () => {
        setBusy(true);
        try {
            const blob = await createAndDownloadBackup(transport);
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = createdBackupFileName(new Date());
            link.click();
            URL.revokeObjectURL(link.href);
            await backups.refetch();
        } catch {
            failed(null, CREATE_FAILURE);
        } finally {
            setBusy(false);
        }
    };

    /**
     * Deliberate addition over legacy, whose `backup.html` restored from an
     * unlabelled icon click with no confirmation at all: restoring discards
     * the running configuration and database and restarts the instance, which
     * is not something a mis-click should be able to do.
     */
    const restore = async (filename: string) => {
        const answer = await dialogs.confirm({
            confirmLabel: "Restore and restart",
            message: `Restoring "${filename}" replaces the current configuration and database, and NZBHydra2 will restart to let its wrapper put the data in place.`,
            testId: "system-backup-restore-confirm",
            title: "Restore this backup?",
        });
        if (answer !== "confirmed") {
            return;
        }
        setBusy(true);
        let result;
        try {
            result = await restoreBackup(transport, filename);
        } finally {
            setBusy(false);
        }
        if (result.kind === "successful") {
            await countdown.start(RESTORE_COUNTDOWN_MESSAGE);
            return;
        }
        failed(result.message, RESTORE_FAILURE);
    };

    const upload = async (file: File) => {
        setBusy(true);
        setProgress({loaded: 0, total: file.size});
        let result;
        try {
            result = await uploadBackup(transport, file, setProgress);
        } finally {
            setBusy(false);
        }
        if (result.kind === "successful") {
            await countdown.start(UPLOAD_COUNTDOWN_MESSAGE);
            return;
        }
        // A refused file leaves the instance untouched, so the progress bar
        // goes away again and the message is all that is reported
        // (`backup.js:51-53`).
        setProgress(null);
        failed(result.message, UPLOAD_FAILURE);
    };

    return (
        <Stack data-testid="system-backup" spacing={3}>
            <Stack
                direction="row"
                sx={{
                    flexWrap: "wrap",
                    gap: 2,
                }}
            >
                <Button
                    data-testid="system-backup-create-download"
                    disabled={busy}
                    onClick={() => void createAndDownload()}
                    type="button"
                    variant="contained"
                >
                    Create and download backup
                </Button>
                <Button
                    data-testid="system-backup-create-only"
                    disabled={busy}
                    onClick={() => void createOnly()}
                    type="button"
                    variant="outlined"
                >
                    Just create backup
                </Button>
                {/*
                 * MUI's documented file-upload shape: the button *is* the
                 * label, and the native input it wraps is the control. The
                 * input carries no separate visible label because the button's
                 * own text is its label (ADR-0014's "visible label" rule); it
                 * keeps an accessible name for assistive technology.
                 */}
                <Button component="label" disabled={busy} variant="outlined">
                    Upload and restore from file
                    <input
                        accept=".zip,application/zip"
                        aria-label="Backup file to upload and restore"
                        data-testid="system-backup-upload"
                        disabled={busy}
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            // The same file may be chosen twice in a row; the
                            // input keeps its value otherwise and fires no
                            // second change event.
                            event.target.value = "";
                            if (file) {
                                void upload(file);
                            }
                        }}
                        type="file"
                    />
                </Button>
            </Stack>

            {progress !== null && (
                <UploadProgressBar
                    loaded={progress.loaded}
                    total={progress.total}
                />
            )}

            <Stack spacing={2}>
                <Typography component="h2" variant="h5">
                    Existing backups
                </Typography>
                {backups.isPending && (
                    <Stack
                        role="status"
                        spacing={2}
                        sx={{
                            alignItems: "center",
                        }}
                    >
                        <CircularProgress variant="indeterminate" />
                        <Typography>Loading the backups</Typography>
                    </Stack>
                )}
                {backups.isError && (
                    <Alert severity="error">
                        Unable to load the existing backups.
                    </Alert>
                )}
                {backups.isSuccess && backups.data.length === 0 && (
                    <Typography>No backups have been created yet.</Typography>
                )}
                {backups.isSuccess && backups.data.length > 0 && (
                    <TableContainer>
                        <Table data-testid="system-backup-table" size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Filename</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Restore</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {backups.data.map((entry, index) => (
                                    <BackupRow
                                        busy={busy}
                                        entry={entry}
                                        index={index}
                                        key={entry.filename}
                                        onRestore={() =>
                                            void restore(entry.filename)
                                        }
                                        serverTimeZone={
                                            bootstrap.serverTimeZone
                                        }
                                        transport={transport}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Stack>
            {countdown.dialog}
        </Stack>
    );
}

function BackupRow({
    busy,
    entry,
    index,
    onRestore,
    serverTimeZone,
    transport,
}: {
    busy: boolean;
    entry: BackupEntry;
    index: number;
    onRestore: () => void;
    serverTimeZone: string | null;
    transport: ApiTransport;
}) {
    return (
        <TableRow data-testid="system-backup-row">
            <TableCell>
                <Link
                    data-testid={`system-backup-download-${index}`}
                    href={backupDownloadUrl(transport, entry.filename)}
                    rel="noreferrer"
                    target="_blank"
                >
                    {entry.filename}
                </Link>
            </TableCell>
            <TableCell>
                {formatServerDateTime(entry.creationDate, serverTimeZone)}
            </TableCell>
            <TableCell>
                <Button
                    data-testid={`system-backup-restore-${index}`}
                    disabled={busy}
                    onClick={onRestore}
                    size="small"
                    type="button"
                    variant="outlined"
                >
                    Restore
                </Button>
            </TableCell>
        </TableRow>
    );
}

const BYTES_PER_KILOBYTE = 1024;

/**
 * Legacy's progress bar (`backup.html:20-23`) showed kilobytes loaded against
 * the file's size. The total is unknown until the browser reports it, so the
 * bar is indeterminate until then rather than showing a made-up percentage.
 */
function UploadProgressBar({
    loaded,
    total,
}: {
    loaded: number;
    total: number | null;
}) {
    const kilobytes = (value: number) =>
        Math.floor(value / BYTES_PER_KILOBYTE).toLocaleString();
    const percent =
        total !== null && total > 0
            ? Math.min(100, Math.round((100 * loaded) / total))
            : null;

    return (
        <Stack data-testid="system-backup-upload-progress" spacing={1}>
            <Typography>
                {percent === null
                    ? `Uploading: ${kilobytes(loaded)} kB`
                    : `Uploading: ${kilobytes(loaded)} kB of ${kilobytes(
                          total ?? 0,
                      )} kB (${percent}%)`}
            </Typography>
            <LinearProgress
                aria-label="Backup upload progress"
                value={percent ?? undefined}
                variant={percent === null ? "indeterminate" : "determinate"}
            />
        </Stack>
    );
}
