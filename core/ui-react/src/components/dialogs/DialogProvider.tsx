import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {DialogContext, type Confirmation, type DialogResult} from "./dialogs";

type PendingConfirmation = Confirmation & {
    /** Monotonic per provider; keys the rendered dialog. */
    id: number;
    resolve: (result: DialogResult) => void;
};

export function DialogProvider({children}: {children: React.ReactNode}) {
    /**
     * Confirmations are queued rather than replaced: two callers can be
     * awaiting `confirm()` at once (two send buttons clicked in quick
     * succession, or a background help dialog arriving while the user is
     * answering another), and replacing the pending one would drop its
     * `resolve` so its promise never settled. The head of the queue is the
     * rendered dialog; answering it resolves that caller and shows the next.
     *
     * The queue lives in a ref because `confirm()` appends from inside a
     * promise executor: StrictMode's dev-only double-invoke of a state updater
     * would append the same entry twice.
     */
    const queue = useRef<PendingConfirmation[]>([]);
    const nextId = useRef(0);
    const [pending, setPending] = useState<PendingConfirmation | null>(null);
    /**
     * The rendered dialog's React key. It follows the head's id, so promoting
     * the next confirmation mounts a fresh dialog rather than swapping the
     * title and message under the user's focus -- an in-place swap would let a
     * second Enter press dismiss a dialog the user never saw, and screen
     * readers would not re-announce it. It deliberately does not reset when the
     * queue empties, so the last dialog keeps its exit transition.
     */
    const [dialogKey, setDialogKey] = useState(0);

    const confirm = useCallback(
        (confirmation: Confirmation): Promise<DialogResult> =>
            new Promise((resolve) => {
                const entry = {...confirmation, id: nextId.current++, resolve};
                queue.current = [...queue.current, entry];
                if (queue.current.length === 1) {
                    setPending(entry);
                    setDialogKey(entry.id);
                }
            }),
        [],
    );

    const close = useCallback((result: DialogResult) => {
        const [head, ...rest] = queue.current;
        if (head === undefined) {
            return;
        }
        queue.current = rest;
        setPending(rest[0] ?? null);
        if (rest[0] !== undefined) {
            setDialogKey(rest[0].id);
        }
        head.resolve(result);
    }, []);

    // An unmount while confirmations are queued (navigating away, a route
    // teardown) must settle them as a dismissal, or every awaiting caller
    // hangs forever. The cleanup resets the queue and the rendered head
    // together: a child's effects run before its parent's, so StrictMode's
    // dev-only effect replay can enqueue a confirmation before this cleanup
    // runs, and leaving `pending` behind would render a dialog whose buttons
    // answer an entry the drain already resolved. `dialogKey` is left alone --
    // ids stay monotonic, so the replayed entry still mounts a fresh dialog.
    useEffect(
        () => () => {
            const abandoned = queue.current;
            queue.current = [];
            setPending(null);
            for (const entry of abandoned) {
                entry.resolve("cancelled");
            }
        },
        [],
    );

    const contextValue = useMemo(() => ({confirm}), [confirm]);

    const acknowledgeOnly = pending?.variant === "acknowledge";

    return (
        <DialogContext.Provider value={contextValue}>
            {children}
            <Dialog
                aria-describedby="hydra-confirmation-description"
                aria-labelledby="hydra-confirmation-title"
                data-testid={pending?.testId}
                key={dialogKey}
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
                    <DialogContentText
                        id="hydra-confirmation-description"
                        sx={{overflowWrap: "break-word"}}
                    >
                        {pending?.message}
                    </DialogContentText>
                    {pending?.details && pending.details.length > 0 ? (
                        <Box component="ul" sx={{mb: 0, mt: 1, pl: 3}}>
                            {pending.details.map((detail) => (
                                <DialogContentText
                                    component="li"
                                    key={detail}
                                    sx={{overflowWrap: "break-word"}}
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
