import {createContext, useContext} from "react";

export type ToastSeverity = "success" | "info" | "warning" | "error";

export type Toast = {
    message: string;
    severity: ToastSeverity;
};

export type ToastContextValue = {
    showToast: (toast: Toast) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts(): ToastContextValue {
    const toasts = useContext(ToastContext);
    if (toasts === null) {
        throw new Error("useToasts must be used within a ToastProvider");
    }
    return toasts;
}
