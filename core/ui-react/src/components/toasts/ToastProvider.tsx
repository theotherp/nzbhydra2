import {Alert, Box, Snackbar} from "@mui/material";
import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    ToastContext,
    type DismissToast,
    type Toast,
    type ToastContextValue,
} from "./toasts";

/** Legacy growl's `globalTimeToLive` (`nzbhydra.js:783`). */
const TOAST_LIFETIME_MS = 5000;
const TOAST_MAX_WIDTH = 420;

type QueuedToast = Toast & {key: number};

/**
 * `C-TOAST-SERVICE`: the application's single toast surface. Concurrent toasts
 * stack in arrival order instead of replacing each other (legacy growl
 * stacked), each keeping its own lifetime, close button, and optional
 * persistence.
 *
 * The stack is one fixed overlay holding every alert, not one fixed overlay per
 * toast, so stacked toasts cannot overlap each other. The overlay itself is
 * transparent to pointer input (only the alerts inside it are targets), so an
 * open toast never swallows a click aimed at what is underneath it — a modal
 * dialog's actions stay usable while a toast is up (FM-065).
 */
export function ToastProvider({children}: {children: React.ReactNode}) {
    const [toasts, setToasts] = useState<QueuedToast[]>([]);
    const nextKey = useRef(0);
    // Mirrors what is on screen so a toast closed twice — its timer firing
    // after its close button, say — notifies its owner exactly once.
    const openKeys = useRef(new Set<number>());

    const close = useCallback((toast: QueuedToast) => {
        if (!openKeys.current.delete(toast.key)) {
            return;
        }
        setToasts((current) =>
            current.filter((open) => open.key !== toast.key),
        );
        toast.onClose?.();
    }, []);

    // `showToast` and the dismiss handle it returns both keep a stable
    // identity, because callers hold on to them across renders.
    const showToast = useCallback(
        (toast: Toast): DismissToast => {
            const queued: QueuedToast = {...toast, key: nextKey.current++};
            openKeys.current.add(queued.key);
            setToasts((current) => [...current, queued]);
            return () => close(queued);
        },
        [close],
    );

    const value = useMemo<ToastContextValue>(() => ({showToast}), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toasts.length > 0 ? (
                <Snackbar
                    anchorOrigin={{horizontal: "right", vertical: "top"}}
                    data-testid="toasts"
                    open
                    // Stock MUI deviation, justified: a Snackbar is a fixed
                    // overlay above modal dialogs, so its own box would
                    // otherwise intercept clicks meant for a dialog's actions.
                    // Only the alerts inside it are pointer targets.
                    sx={{pointerEvents: "none"}}
                >
                    {/*
                     * The stack's layout lives in `sx`, not in `Stack`'s
                     * `direction`/`spacing` props: `Snackbar` passes its own
                     * `ownerState` to its child element, which overrides the
                     * child's, so a `Stack` placed here renders as an
                     * unspaced row (measured in Chromium — the shape FM-081's
                     * private stack had).
                     */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            maxWidth: TOAST_MAX_WIDTH,
                            width: "100%",
                        }}
                    >
                        {toasts.map((toast) => (
                            <ToastAlert
                                key={toast.key}
                                onClose={() => close(toast)}
                                toast={toast}
                            />
                        ))}
                    </Box>
                </Snackbar>
            ) : null}
        </ToastContext.Provider>
    );
}

function ToastAlert({
    onClose,
    toast,
}: {
    onClose: () => void;
    toast: QueuedToast;
}) {
    // The lifetime belongs to the toast, not to the render: a later toast
    // joining the stack must not restart the ones already counting down.
    const latestClose = useRef(onClose);
    useEffect(() => {
        latestClose.current = onClose;
    }, [onClose]);
    const persistent = toast.persistent === true;

    useEffect(() => {
        if (persistent) {
            return;
        }
        const timeout = window.setTimeout(
            () => latestClose.current(),
            TOAST_LIFETIME_MS,
        );
        return () => window.clearTimeout(timeout);
    }, [persistent]);

    return (
        <Alert
            data-testid={toast.testId ?? "toast"}
            onClose={onClose}
            severity={toast.severity}
            sx={{overflowWrap: "anywhere", pointerEvents: "auto"}}
            variant="filled"
        >
            {toast.content === undefined ? (
                <ToastText message={toast.message ?? ""} />
            ) : (
                toast.content
            )}
        </Alert>
    );
}

/** Newlines become line breaks; the message itself stays a text node. */
function ToastText({message}: {message: string}) {
    const lines = message.split(/\r?\n/);
    return (
        <>
            {lines.map((line, index) => (
                <Fragment key={index}>
                    {index > 0 ? <br /> : null}
                    {line}
                </Fragment>
            ))}
        </>
    );
}
