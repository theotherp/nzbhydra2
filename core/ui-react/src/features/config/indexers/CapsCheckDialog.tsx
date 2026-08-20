import {
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from "@mui/material";
import {useEffect, useRef, useState} from "react";

import {
    capsCheckMessageLines,
    checkIndexerCaps,
    getCapsCheckMessages,
    type CapsCheckType,
    type IndexerCapsCheckResult,
    type IndexerValues,
} from "../../../api/config/indexers";
import {ApiTransport} from "../../../api/transport";

export const CAPS_CHECK_DIALOG_TEST_ID = "config-indexer-caps-dialog";

/** `$interval(..., 500)` in `CheckCapsModalInstanceCtrl`. */
export const CAPS_MESSAGE_POLL_INTERVAL_MS = 500;

export const CAPS_CHECK_TITLE = "Checking caps... Please wait";
export const CAPS_CHECK_FOOTER =
    "This window will close automatically when the caps check is finished";

/** The request one open dialog runs; held in the parent's state, never rebuilt. */
export type CapsCheckRequest = {
    checkType: CapsCheckType;
    indexerConfig: IndexerValues;
};

/**
 * `CheckCapsModalInstanceCtrl` + `checker-state.html`: the progress dialog that
 * runs one capability check and shows what the server reports while it runs.
 *
 * Three things about it are load-bearing:
 *
 * - The check request is fired **once** per dialog and its promise is what
 *   resolves the transaction, so the entry being edited is never committed
 *   before the server has answered.
 * - The message poll is a plain 500ms interval that is cleared on *every* exit
 *   path — the check resolving, the check failing, and the dialog unmounting —
 *   because it otherwise keeps hitting `API-CONFIG-INDEXER-CAPS-MESSAGES` for a
 *   check that is long over.
 * - The dialog cannot be dismissed (legacy's `backdrop: "static"` with no close
 *   control): the caps check is already running on the server and closing the
 *   window would not stop it.
 */
export function CapsCheckDialog({
    onFailed,
    onResolved,
    request,
    transport,
}: {
    onFailed: () => void;
    onResolved: (results: IndexerCapsCheckResult[]) => void;
    request: CapsCheckRequest;
    transport: ApiTransport;
}) {
    const [messages, setMessages] = useState<string[]>([]);
    // The in-flight check. A ref so React 19 StrictMode's dev-only
    // mount -> unmount -> remount cannot post a second check to the indexer.
    const check = useRef<Promise<IndexerCapsCheckResult[]> | null>(null);
    const settled = useRef(false);
    const onResolvedRef = useRef(onResolved);
    const onFailedRef = useRef(onFailed);
    onResolvedRef.current = onResolved;
    onFailedRef.current = onFailed;

    useEffect(() => {
        let active = true;
        const poll = window.setInterval(() => {
            void (async () => {
                let lines: string[];
                try {
                    lines = capsCheckMessageLines(
                        await getCapsCheckMessages(transport),
                        request.checkType,
                    );
                } catch {
                    // A dropped poll says nothing about the check itself;
                    // legacy's `$http.get` has no error handler either.
                    return;
                }
                if (active) {
                    setMessages(lines);
                }
            })();
        }, CAPS_MESSAGE_POLL_INTERVAL_MS);
        const stop = () => {
            active = false;
            window.clearInterval(poll);
        };
        check.current ??= checkIndexerCaps(
            transport,
            request.indexerConfig,
            request.checkType,
        );
        void check.current.then(
            (results) => {
                if (!active || settled.current) {
                    return;
                }
                settled.current = true;
                stop();
                onResolvedRef.current(results);
            },
            () => {
                if (!active || settled.current) {
                    return;
                }
                settled.current = true;
                stop();
                onFailedRef.current();
            },
        );
        return stop;
    }, [request, transport]);

    return (
        <Dialog
            aria-labelledby="config-indexer-caps-dialog-title"
            data-testid={CAPS_CHECK_DIALOG_TEST_ID}
            disableEscapeKeyDown
            fullWidth
            maxWidth="sm"
            open
        >
            <DialogTitle id="config-indexer-caps-dialog-title">
                {CAPS_CHECK_TITLE}
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {messages.length === 0 ? null : (
                        <List
                            aria-live="polite"
                            data-testid="config-indexer-caps-messages"
                            dense
                            disablePadding
                        >
                            {messages.map((message, index) => (
                                <ListItem disablePadding key={index}>
                                    <ListItemText primary={message} />
                                </ListItem>
                            ))}
                        </List>
                    )}
                    <Stack
                        alignItems="center"
                        direction="row"
                        role="status"
                        spacing={1}
                    >
                        <CircularProgress size={18} variant="indeterminate" />
                        <Typography variant="body2">
                            Checking capabilities…
                        </Typography>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Typography sx={{mr: "auto"}} variant="body2">
                    {CAPS_CHECK_FOOTER}
                </Typography>
            </DialogActions>
        </Dialog>
    );
}
