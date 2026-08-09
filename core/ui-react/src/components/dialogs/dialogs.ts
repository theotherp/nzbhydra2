import {createContext, useContext} from "react";

export type DialogResult = "confirmed" | "cancelled";

export type Confirmation = {
    cancelLabel?: string;
    confirmLabel?: string;
    message: string;
    title: string;
};

export type DialogContextValue = {
    confirm: (confirmation: Confirmation) => Promise<DialogResult>;
};

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogs(): DialogContextValue {
    const dialogs = useContext(DialogContext);
    if (dialogs === null) {
        throw new Error("useDialogs must be used within a DialogProvider");
    }
    return dialogs;
}
