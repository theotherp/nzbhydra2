import {createContext, useContext} from "react";

/**
 * `denied` is the third answer a Save / Discard / Cancel style dialog needs:
 * an explicit "no" that is not the same as dismissing the dialog. It only
 * appears when a confirmation asks for it through `denyLabel`.
 */
export type DialogResult = "confirmed" | "denied" | "cancelled";

export type Confirmation = {
    cancelLabel?: string;
    confirmLabel?: string;
    /**
     * Renders a third button between cancel and confirm, resolving `denied`.
     */
    denyLabel?: string;
    /** Rendered as a list under the message (server validation messages). */
    details?: string[];
    message: string;
    /** Applied to the dialog root so a test can address this exact dialog. */
    testId?: string;
    /**
     * `acknowledge` renders the confirm button only — the shape legacy's
     * `ModalService.open(..., {yes: {text: "OK"}})` produced for a message the
     * user can only take note of.
     */
    variant?: "confirm" | "acknowledge";
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
