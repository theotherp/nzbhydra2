import {
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

    return (
        <DialogContext.Provider value={{confirm}}>
            {children}
            <Dialog
                aria-describedby="hydra-confirmation-description"
                aria-labelledby="hydra-confirmation-title"
                onClose={(_, reason) => {
                    if (
                        reason === "escapeKeyDown" ||
                        reason === "backdropClick"
                    ) {
                        close("cancelled");
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => close("cancelled")}>
                        {pending?.cancelLabel ?? "Cancel"}
                    </Button>
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
