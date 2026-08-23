import {createContext, useContext} from "react";

export type ToastSeverity = "success" | "info" | "warning" | "error";

/**
 * A toast body is either plain text or rich content, never both. Text bodies
 * are rendered as text — newlines become line breaks — and are never treated
 * as HTML, whoever authored them.
 */
type ToastBody =
    | {content?: undefined; message: string}
    | {content: React.ReactNode; message?: undefined};

export type Toast = ToastBody & {
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
