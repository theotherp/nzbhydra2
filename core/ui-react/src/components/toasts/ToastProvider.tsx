import {Alert, Snackbar} from "@mui/material";
import {useState} from "react";

import {ToastContext, type Toast} from "./toasts";

const TOAST_LIFETIME_MS = 5000;
export function ToastProvider({children}: {children: React.ReactNode}) {
    const [toast, setToast] = useState<Toast | null>(null);

    return (
        <ToastContext.Provider value={{showToast: setToast}}>
            {children}
            <Snackbar
                anchorOrigin={{horizontal: "right", vertical: "bottom"}}
                autoHideDuration={TOAST_LIFETIME_MS}
                onClose={(_, reason) => {
                    if (reason !== "clickaway") {
                        setToast(null);
                    }
                }}
                open={toast !== null}
            >
                <Alert
                    onClose={() => setToast(null)}
                    severity={toast?.severity}
                    variant="filled"
                >
                    {toast?.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
}
