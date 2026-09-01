import {
    Box,
    Button,
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

const CAPS_CHECK_DIALOG_TEST_ID = "config-indexer-caps-dialog";

/** `$interval(..., 500)` in `CheckCapsModalInstanceCtrl`. */
export const CAPS_MESSAGE_POLL_INTERVAL_MS = 500;

const CAPS_CHECK_TITLE = "Checking caps... Please wait";
const CAPS_CHECK_FOOTER =
    "This window will close automatically when the caps check is finished";

/**
 * FM-167's exit. Deliberately not "Cancel": `IndexerWeb` exposes no abort at
 * all (`POST /internalapi/indexer/checkCaps` is synchronous over
 * `IndexerChecker`'s `executor.invokeAll`), so the only thing that can stop is
 * this browser's waiting.
 */
const LEAVE_LABEL = "Stop waiting";
const LEAVE_FOOTER =
    "The check keeps running on the server; only this window stops waiting for it. Its results are then not applied to the configuration, and you can check again later.";

/**
 * What the counter counts. The server publishes progress as a multimap of
 * `CheckerEvent {indexerName, message}` and `CheckCapsResponse` carries no
 * counters, so "reported" — has sent at least one message — is the strongest
 * claim the client can make about an indexer, and the caption says so rather
 * than letting the number read as "finished".
 */
const PROGRESS_CAPTION =
    "An indexer is counted once it has sent its first message, not when its check is finished.";

/**
 * The request one open dialog runs; held in the parent's state, never rebuilt.
 * `indexerConfig` is `null` for a bulk (`ALL`/`INCOMPLETE`) recheck, which
 * checks the saved indexers instead of one unsaved entry.
 */
export type CapsCheckRequest = {
    checkType: CapsCheckType;
    indexerConfig: IndexerValues | null;
};

/** How many indexers have published at least one message. */
function reportingIndexers(messages: Record<string, string[]>): number {
    return Object.values(messages).filter((entries) => entries.length > 0)
        .length;
}

/**
 * The lines this poll added, as a multiset difference: the server only ever
 * appends to the multimap, so everything beyond what the previous tick held is
 * new — and a line two indexers happen to share is still announced twice.
 */
function appendedLines(
    previous: readonly string[],
    next: readonly string[],
): string[] {
    const remaining = new Map<string, number>();
    for (const line of previous) {
        remaining.set(line, (remaining.get(line) ?? 0) + 1);
    }
    const added: string[] = [];
    for (const line of next) {
        const count = remaining.get(line) ?? 0;
        if (count > 0) {
            remaining.set(line, count - 1);
        } else {
            added.push(line);
        }
    }
    return added;
}

/**
 * A key per rendered line that survives the next tick, so the list is appended
 * to instead of being remounted every 500ms. The line's text plus how often it
 * has already occurred: the multimap's *key* order is a `HashMultimap`'s and
 * can shift when a new indexer starts reporting, which is exactly what a
 * positional key cannot survive.
 */
function messageKeys(lines: readonly string[]): string[] {
    const seen = new Map<string, number>();
    return lines.map((line) => {
        const occurrence = seen.get(line) ?? 0;
        seen.set(line, occurrence + 1);
        return `${occurrence}:${line}`;
    });
}

/**
 * The denominator: how many indexers this check covers. A `SINGLE` check
 * covers the one entry it carries; a bulk check covers what the caller counted
 * in the configuration. Never fewer than have already reported — the caller
 * counts the *form's* entries and the server checks the *saved* ones, so an
 * unsaved edit must not be able to produce "3 of 2".
 */
function expectedIndexers(
    checkType: CapsCheckType,
    indexerCount: number | undefined,
    reported: number,
): number {
    return Math.max(checkType === "SINGLE" ? 1 : (indexerCount ?? 0), reported);
}

function progressText(reported: number, expected: number): string {
    return `${reported} of ${expected} indexers have reported`;
}

/**
 * `CheckCapsModalInstanceCtrl` + `checker-state.html`: the progress dialog that
 * runs one capability check and shows what the server reports while it runs.
 *
 * Four things about it are load-bearing:
 *
 * - The check request is fired **once** per dialog and its promise is what
 *   resolves the transaction, so the entry being edited is never committed
 *   before the server has answered.
 * - The message poll is a plain 500ms interval that is cleared on *every* exit
 *   path — the check resolving, the check failing, the admin leaving, and the
 *   dialog unmounting — because it otherwise keeps hitting
 *   `API-CONFIG-INDEXER-CAPS-MESSAGES` for a check that is long over.
 * - Leaving (FM-167) abandons the *waiting*, not the check: there is no abort
 *   endpoint, so the request runs to completion on the server and this dialog
 *   simply stops listening. Every post-await write is gated on `abandoned`, so
 *   a promise that resolves after the admin left writes nothing — neither back
 *   into the form nor into a toast. A backdrop click still dismisses nothing,
 *   so a long check is not lost to a stray click.
 * - The visible message list is not itself a live region. It is re-rendered
 *   every 500ms, and an `aria-live` list re-reads *every* line each tick; the
 *   off-screen region beside it carries only what this tick added.
 *
 * `onLeave` is optional because `IndexerDialog`'s own caps check awaits this
 * dialog's outcome to decide whether the entry may be committed — there is
 * nothing for it to fall back to if the admin walks away mid-transaction — and
 * that dialog is out of FM-167's scope.
 */
export function CapsCheckDialog({
    indexerCount,
    onFailed,
    onLeave,
    onResolved,
    request,
    transport,
}: {
    /**
     * How many indexers the caller expects this check to cover; only the
     * denominator of the progress readout depends on it. Omitted for a
     * `SINGLE` check, which covers exactly one.
     */
    indexerCount?: number;
    onFailed: () => void;
    /** Absent where the caller cannot survive an abandoned check. */
    onLeave?: () => void;
    onResolved: (results: IndexerCapsCheckResult[]) => void;
    request: CapsCheckRequest;
    transport: ApiTransport;
}) {
    const [messages, setMessages] = useState<string[]>([]);
    const [reported, setReported] = useState(0);
    /** Only what the last tick added; see the live-region note above. */
    const [announcement, setAnnouncement] = useState("");
    // The in-flight check, paired with the request it belongs to. A ref so
    // React 19 StrictMode's dev-only mount -> unmount -> remount cannot post a
    // second check to the indexer, and paired so a *new* request cannot be
    // answered by the previous request's promise.
    const check = useRef<{
        promise: Promise<IndexerCapsCheckResult[]>;
        request: CapsCheckRequest;
    } | null>(null);
    const settled = useRef(false);
    const abandoned = useRef(false);
    /** What the previous tick rendered, for the appended-lines diff. */
    const shown = useRef<string[]>([]);
    const reportedRef = useRef(0);
    const stopPolling = useRef<(() => void) | null>(null);
    const onResolvedRef = useRef(onResolved);
    const onFailedRef = useRef(onFailed);
    const indexerCountRef = useRef(indexerCount);

    // What the poll and the check's continuation read; kept out of the check
    // effect's dependencies so a re-render cannot restart the check, and
    // written after the render rather than during it (`react-hooks/refs`).
    useEffect(() => {
        onResolvedRef.current = onResolved;
        onFailedRef.current = onFailed;
        indexerCountRef.current = indexerCount;
    });

    useEffect(() => {
        let active = true;
        const poll = window.setInterval(() => {
            void (async () => {
                let published: Record<string, string[]>;
                try {
                    published = await getCapsCheckMessages(transport);
                } catch {
                    // A dropped poll says nothing about the check itself;
                    // legacy's `$http.get` has no error handler either.
                    return;
                }
                if (!active || abandoned.current) {
                    return;
                }
                const lines = capsCheckMessageLines(
                    published,
                    request.checkType,
                );
                const reporting = reportingIndexers(published);
                const added = appendedLines(shown.current, lines);
                const expected = expectedIndexers(
                    request.checkType,
                    indexerCountRef.current,
                    reporting,
                );
                const announced = [...added];
                if (reporting !== reportedRef.current && expected > 1) {
                    announced.push(progressText(reporting, expected));
                }
                shown.current = lines;
                reportedRef.current = reporting;
                setMessages(lines);
                setReported(reporting);
                if (announced.length > 0) {
                    setAnnouncement(announced.join(". "));
                }
            })();
        }, CAPS_MESSAGE_POLL_INTERVAL_MS);
        const stop = () => {
            active = false;
            window.clearInterval(poll);
        };
        stopPolling.current = stop;
        if (check.current === null || check.current.request !== request) {
            check.current = {
                promise: checkIndexerCaps(
                    transport,
                    request.indexerConfig,
                    request.checkType,
                ),
                request,
            };
        }
        void check.current.promise.then(
            (results) => {
                if (!active || settled.current || abandoned.current) {
                    return;
                }
                settled.current = true;
                stop();
                onResolvedRef.current(results);
            },
            () => {
                if (!active || settled.current || abandoned.current) {
                    return;
                }
                settled.current = true;
                stop();
                onFailedRef.current();
            },
        );
        return () => {
            stop();
            if (stopPolling.current === stop) {
                stopPolling.current = null;
            }
        };
    }, [request, transport]);

    /**
     * Stop waiting. The check itself cannot be stopped, so this only closes
     * the poll and blocks every remaining write: whatever the abandoned
     * request answers is dropped rather than applied to a form the admin has
     * moved on from.
     */
    const leave = () => {
        if (onLeave === undefined) {
            return;
        }
        abandoned.current = true;
        settled.current = true;
        stopPolling.current?.();
        onLeave();
    };

    const expected = expectedIndexers(
        request.checkType,
        indexerCount,
        reported,
    );
    // A single indexer has no progress to report that the message list does
    // not already say, so the counter is shown only where it adds something.
    const showsProgress = expected > 1;
    const keys = messageKeys(messages);

    return (
        <Dialog
            aria-labelledby="config-indexer-caps-dialog-title"
            data-testid={CAPS_CHECK_DIALOG_TEST_ID}
            disableEscapeKeyDown={onLeave === undefined}
            fullWidth
            maxWidth="sm"
            onClose={(_event, reason) => {
                // Escape leaves; a backdrop click does not, so minutes of
                // waiting are not lost to a stray click beside the dialog.
                if (reason === "escapeKeyDown") {
                    leave();
                }
            }}
            open
        >
            <DialogTitle id="config-indexer-caps-dialog-title">
                {CAPS_CHECK_TITLE}
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {messages.length === 0 ? null : (
                        <List
                            data-testid="config-indexer-caps-messages"
                            dense
                            disablePadding
                        >
                            {messages.map((message, index) => (
                                <ListItem disablePadding key={keys[index]}>
                                    <ListItemText primary={message} />
                                </ListItem>
                            ))}
                        </List>
                    )}
                    <Stack
                        alignItems="center"
                        data-testid="config-indexer-caps-progress"
                        direction="row"
                        spacing={1}
                    >
                        <CircularProgress
                            size={18}
                            value={
                                showsProgress
                                    ? Math.round((reported / expected) * 100)
                                    : undefined
                            }
                            variant={
                                showsProgress ? "determinate" : "indeterminate"
                            }
                        />
                        <Typography variant="body2">
                            {showsProgress
                                ? progressText(reported, expected)
                                : "Checking capabilities…"}
                        </Typography>
                    </Stack>
                    {showsProgress ? (
                        <Typography color="text.secondary" variant="caption">
                            {PROGRESS_CAPTION}
                        </Typography>
                    ) : null}
                    <Box
                        aria-live="polite"
                        data-testid="config-indexer-caps-announcement"
                        sx={{
                            border: 0,
                            clip: "rect(0 0 0 0)",
                            // The visually-hidden box must be literal 1px
                            // strings: numeric width/height 0..1 are
                            // percentages in MUI sx (`SearchPage.tsx`).
                            height: "1px",
                            margin: "-1px",
                            overflow: "hidden",
                            padding: 0,
                            position: "absolute",
                            whiteSpace: "nowrap",
                            width: "1px",
                        }}
                    >
                        {announcement}
                    </Box>
                </Stack>
            </DialogContent>
            {/*
             * Wrapping, because the explanation beside the button is a
             * sentence rather than a label and would otherwise squeeze the
             * button to a couple of characters on a phone.
             */}
            <DialogActions sx={{flexWrap: "wrap", rowGap: 1}}>
                <Typography sx={{mr: "auto"}} variant="body2">
                    {onLeave === undefined ? CAPS_CHECK_FOOTER : LEAVE_FOOTER}
                </Typography>
                {onLeave === undefined ? null : (
                    <Button
                        data-testid="config-indexer-caps-leave"
                        onClick={leave}
                        type="button"
                        variant="outlined"
                    >
                        {LEAVE_LABEL}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
