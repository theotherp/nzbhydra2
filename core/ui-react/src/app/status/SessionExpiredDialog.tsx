import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import {useEffect, useState} from "react";

import {isSessionExpired, subscribeToSessionExpiry} from "../sessionExpiry";

/**
 * `C-SESSION-EXPIRY`'s visible half: the one notice a reader gets when their
 * session has expired underneath them, mounted once by the shell so that
 * however many queries failed, there is only ever one of it.
 *
 * **Why this is not `C-DIALOG-SERVICE`.** The dialog service is a React
 * context exposing `confirm(...)`, a promise a *component* awaits inside an
 * event handler. What raises this dialog is a `QueryCache`/`MutationCache`
 * `onError` callback — a plain function the query client calls outside the
 * React tree, with no component, no hook, and no context to reach. Routing it
 * through the service would mean giving the service a module-level escape
 * hatch, which is a larger change to a shared component than mounting this
 * one, and would still leave the coalescing (`sessionExpiry.ts`'s latch) here.
 * The confirm-shaped API is also the wrong shape: this is not a question with
 * an answer the caller resumes on.
 *
 * **Why the action is a Reload button and not an automatic reload.** The
 * reload is a full document navigation, which is what completes the OIDC (or
 * form) login flow — but it also destroys whatever the reader had typed into
 * an unsaved config tab or a search form. Doing it for them, unasked, from a
 * background refetch they never issued, would lose that work; and an automatic
 * reload needs a loop guard for the case where the reloaded page is itself
 * refused. FM-171's packet chose the affordance, and no recorded decision asks
 * for the automatic behaviour.
 *
 * Stock MUI throughout (ADR-0014): `Dialog` with a title, one line of text and
 * two `Button`s, no `sx`, no design literals.
 */
export function SessionExpiredDialog() {
    // The latch may already have flipped before this mounts (a query that
    // failed while the shell was still rendering), so the initial state reads
    // it rather than waiting for a notification that has already been sent.
    const [open, setOpen] = useState(isSessionExpired);

    useEffect(() => subscribeToSessionExpiry(() => setOpen(true)), []);

    return (
        <Dialog
            aria-labelledby="hydra-session-expired-title"
            data-testid="session-expired-dialog"
            fullWidth
            maxWidth="xs"
            onClose={() => setOpen(false)}
            open={open}
        >
            <DialogTitle id="hydra-session-expired-title">
                Session expired
            </DialogTitle>
            <DialogContent dividers>
                <DialogContentText>
                    Your session has expired, so this page can no longer load
                    data. Reload to sign in again.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                {/*
                 * A dismiss affordance, because the reader may want to copy
                 * something off the page — or finish reading it — before the
                 * reload throws it away. Dismissing does not re-arm the latch,
                 * so a later failing refetch cannot reopen this.
                 */}
                <Button onClick={() => setOpen(false)}>Dismiss</Button>
                <Button
                    autoFocus
                    data-testid="session-expired-reload"
                    onClick={() => window.location.reload()}
                    variant="contained"
                >
                    Reload
                </Button>
            </DialogActions>
        </Dialog>
    );
}
