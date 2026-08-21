import {
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    Stack,
} from "@mui/material";

/**
 * `C-UPDATE-COORDINATOR`'s progress dialog (legacy `update-modal.html`). Like
 * the restart dialog it is deliberately not dismissable — legacy opened it
 * with `backdrop: 'static', keyboard: false` — because the instance is being
 * replaced underneath the page while it is open. Omitting `onClose` is what
 * makes a backdrop click inert in MUI.
 */
export function UpdateProgressDialog({messages}: {messages: string[] | null}) {
    return (
        <Dialog
            aria-labelledby="hydra-update-progress-title"
            data-testid="system-update-progress-dialog"
            disableEscapeKeyDown
            fullWidth
            maxWidth="sm"
            open={messages !== null}
        >
            <DialogTitle id="hydra-update-progress-title">
                Update in progress
            </DialogTitle>
            <DialogContent>
                {messages === null || messages.length === 0 ? (
                    <Stack alignItems="center" direction="row" spacing={2}>
                        <CircularProgress
                            aria-label="Update in progress"
                            size={24}
                            variant="indeterminate"
                        />
                    </Stack>
                ) : (
                    <List dense>
                        {messages.map((message, index) => (
                            <ListItem disableGutters key={index}>
                                <ListItemText primary={message} />
                                {index === messages.length - 1 && (
                                    <CircularProgress
                                        aria-label="Update in progress"
                                        size={16}
                                        variant="indeterminate"
                                    />
                                )}
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
}
