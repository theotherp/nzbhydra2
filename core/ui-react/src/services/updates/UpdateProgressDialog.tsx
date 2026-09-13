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
 * makes both a backdrop click and Escape inert in MUI: `Modal` routes each of
 * them through `onClose`, so with no handler there is nothing for either
 * gesture to close (v9 removed `disableEscapeKeyDown` in favour of exactly
 * this).
 */
export function UpdateProgressDialog({messages}: {messages: string[] | null}) {
    return (
        <Dialog
            aria-labelledby="hydra-update-progress-title"
            data-testid="system-update-progress-dialog"
            fullWidth
            maxWidth="sm"
            open={messages !== null}
        >
            <DialogTitle id="hydra-update-progress-title">
                Update in progress
            </DialogTitle>
            <DialogContent>
                {messages === null || messages.length === 0 ? (
                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                            alignItems: "center",
                        }}
                    >
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
