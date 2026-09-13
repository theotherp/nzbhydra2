import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";

import type {LogEntry} from "../../../api/system/logs";
import {monoFontFamily} from "../../../app/theme";

/**
 * Legacy's `log-entry.html` modal, with the whole record appended. Every part
 * of the entry is rendered as text through React children — a log line can
 * contain anything the application logged, including markup, and legacy piped
 * it through `ng-bind-html`. Nothing here uses `dangerouslySetInnerHTML`.
 *
 * A feature-owned MUI `Dialog` rather than `C-DIALOG-SERVICE.confirm`, which
 * models a message-and-details confirmation and cannot carry preformatted
 * blocks; the same shape `services/updates/ChangelogDialog` uses.
 */
export function LogEntryDialog({
    entry,
    onClose,
}: {
    entry: LogEntry | null;
    onClose: () => void;
}) {
    return (
        <Dialog
            aria-labelledby="system-log-entry-title"
            data-testid="system-log-entry-dialog"
            fullWidth
            maxWidth="lg"
            onClose={onClose}
            open={entry !== null}
        >
            <DialogTitle id="system-log-entry-title">
                Log entry details
            </DialogTitle>
            <DialogContent dividers>
                {entry === null ? null : (
                    <Stack spacing={2}>
                        <LogEntrySection
                            content={entry.message ?? ""}
                            title="Message"
                        />
                        {entry.ipAddress === null ? null : (
                            <Typography>
                                Accessing IP address: {entry.ipAddress}
                            </Typography>
                        )}
                        {entry.username === null ? null : (
                            <Typography>
                                Accessing username: {entry.username}
                            </Typography>
                        )}
                        {entry.stackTrace === null ? null : (
                            <LogEntrySection
                                content={entry.stackTrace}
                                title="Stacktrace"
                            />
                        )}
                        <LogEntrySection
                            content={JSON.stringify(entry.fields, null, 2)}
                            title="Full entry"
                        />
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function LogEntrySection({content, title}: {content: string; title: string}) {
    return (
        <Stack spacing={0.5}>
            <Typography component="h3" variant="subtitle2">
                {title}
            </Typography>
            <Typography
                component="pre"
                sx={{
                    fontFamily: monoFontFamily,
                    maxHeight: "40vh",
                    my: 0,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                }}
                variant="body2"
            >
                {content}
            </Typography>
        </Stack>
    );
}
