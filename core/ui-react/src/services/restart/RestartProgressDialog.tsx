import {
    CircularProgress,
    Dialog,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
} from "@mui/material";

/**
 * `C-RESTART-COORDINATOR`'s progress dialog. It is deliberately not
 * dismissable — there is nothing to go back to while the server is down, and
 * legacy's modal was opened with `backdrop: 'static', keyboard: false` for the
 * same reason. Omitting `onClose` is what makes both a backdrop click and
 * Escape inert in MUI: `Modal` routes each of them through `onClose`, so with
 * no handler there is nothing for either gesture to close (v9 removed
 * `disableEscapeKeyDown` in favour of exactly this).
 */
export function RestartProgressDialog({
    message,
    open,
}: {
    message: string;
    open: boolean;
}) {
    return (
        <Dialog
            aria-describedby="hydra-restart-description"
            aria-labelledby="hydra-restart-title"
            data-testid="restart-progress-dialog"
            open={open}
        >
            <DialogTitle id="hydra-restart-title">
                Restarting NZBHydra2
            </DialogTitle>
            <DialogContent>
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                        alignItems: "center",
                    }}
                >
                    <CircularProgress
                        aria-label="Restart in progress"
                        size={24}
                        variant="indeterminate"
                    />
                    <DialogContentText
                        data-testid="restart-progress-message"
                        id="hydra-restart-description"
                    >
                        {message}
                    </DialogContentText>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
