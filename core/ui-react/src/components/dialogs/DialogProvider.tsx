import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import {useState} from "react";

import {DialogContext, type Confirmation, type DialogResult} from "./dialogs";

type PendingConfirmation = Confirmation & {
    resolve: (result: DialogResult) => void;
};

export function DialogProvider({children}: {children: React.ReactNode}) {
    const [pending, setPending] = useState<PendingConfirmation | null>(null);

    const confirm = (confirmation: Confirmation): Promise<DialogResult> =>
        new Promise((resolve) => setPending({...confirmation, resolve}));

    const close = (result: DialogResult) => {
        if (pending !== null) {
            pending.resolve(result);
            setPending(null);
        }
    };

    const acknowledgeOnly = pending?.variant === "acknowledge";

    return (
        <DialogContext.Provider value={{confirm}}>
            {children}
            <Dialog
                aria-describedby="hydra-confirmation-description"
                aria-labelledby="hydra-confirmation-title"
                data-testid={pending?.testId}
                onClose={(_, reason) => {
                    if (
                        reason === "escapeKeyDown" ||
                        reason === "backdropClick"
                    ) {
                        close(acknowledgeOnly ? "confirmed" : "cancelled");
                    }
                }}
                open={pending !== null}
            >
                <DialogTitle id="hydra-confirmation-title">
                    {pending?.title}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="hydra-confirmation-description">
                        {pending?.message}
                    </DialogContentText>
                    {pending?.details && pending.details.length > 0 ? (
                        <Box component="ul" sx={{mb: 0, mt: 1, pl: 3}}>
                            {pending.details.map((detail) => (
                                <DialogContentText
                                    component="li"
                                    key={detail}
                                    variant="body2"
                                >
                                    {detail}
                                </DialogContentText>
                            ))}
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    {acknowledgeOnly ? null : (
                        <Button onClick={() => close("cancelled")}>
                            {pending?.cancelLabel ?? "Cancel"}
                        </Button>
                    )}
                    {!acknowledgeOnly && pending?.denyLabel ? (
                        <Button onClick={() => close("denied")}>
                            {pending.denyLabel}
                        </Button>
                    ) : null}
                    <Button
                        autoFocus
                        onClick={() => close("confirmed")}
                        variant="contained"
                    >
                        {pending?.confirmLabel ?? "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>
        </DialogContext.Provider>
    );
}
