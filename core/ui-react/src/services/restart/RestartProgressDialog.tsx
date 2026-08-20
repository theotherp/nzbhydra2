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
 * same reason. Omitting `onClose` is what makes a backdrop click inert in MUI.
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
            disableEscapeKeyDown
            open={open}
        >
            <DialogTitle id="hydra-restart-title">
                Restarting NZBHydra2
            </DialogTitle>
            <DialogContent>
                <Stack alignItems="center" direction="row" spacing={2}>
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
