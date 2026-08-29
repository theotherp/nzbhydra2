import {createContext, useContext} from "react";

type ToastSeverity = "success" | "info" | "warning" | "error";

export type Toast = {
    /**
     * The toast's body. Always plain text, rendered as text — newlines become
     * line breaks — and never treated as HTML, whoever authored it. ADR-0037:
     * a toast accepts no React element anywhere, so its content can never be
     * interactive (a `FocusTrap` inside an open modal owns focus regardless of
     * DOM position, which would make any such control untabbable).
     */
    message: string;
    /** Called once when the toast leaves the screen, however it was closed. */
    onClose?: () => void;
    /** No auto-hide; the toast stays until it is dismissed or withdrawn. */
    persistent?: boolean;
    severity: ToastSeverity;
    /** Overrides the alert's default `data-testid`. */
    testId?: string;
};

/** Withdraws a toast that is still on screen; a no-op once it has closed. */
export type DismissToast = () => void;

export type ToastContextValue = {
    showToast: (toast: Toast) => DismissToast;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts(): ToastContextValue {
    const toasts = useContext(ToastContext);
    if (toasts === null) {
        throw new Error("useToasts must be used within a ToastProvider");
    }
    return toasts;
}
