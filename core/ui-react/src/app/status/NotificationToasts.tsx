import {Alert, Link, Snackbar, Stack} from "@mui/material";
import {Link as RouterLink} from "@tanstack/react-router";
import {Fragment, useCallback, useEffect, useRef, useState} from "react";

import {
    planNotificationBatch,
    type LiveNotification,
    type NotificationSeverity,
    type NotificationsLiveTransport,
} from "../../api/live/notifications";
import type {LiveSubscription} from "../../api/live/transport";
import {useSafeConfig, type BootstrapData} from "../../bootstrap";

const TOAST_LIFETIME_MS = 5_000;
const DEFAULT_DISPLAY_NOTIFICATIONS_MAX = 5;

type ShownToast = {
    key: number;
    severity: NotificationSeverity;
    body: string;
    /** Legacy's `disableCountDown` for the pile-up notice. */
    persistent: boolean;
    overflowCount?: number;
};

/**
 * The in-app half of `F-PLATFORM-LIVE-STATUS`' live surfaces: legacy's
 * `hydra-checks-footer.js:289-351` notification channel. A permanent shell
 * subscriber, gated on the reactive safe config's `displayNotifications` and
 * the session's admin permission, that acknowledges every notification it
 * handled so the server stops redelivering it.
 *
 * Notification bodies are server-authored text and are rendered as text —
 * newlines become real line breaks, never HTML. Legacy injected the body into
 * growl's HTML.
 */
export function NotificationToasts({
    bootstrap,
    liveTransport,
}: {
    bootstrap: BootstrapData;
    liveTransport: NotificationsLiveTransport;
}) {
    const safeConfig = useSafeConfig(bootstrap);
    const displayNotifications =
        asRecord(safeConfig?.notificationConfig)?.displayNotifications === true;
    const enabled = displayNotifications && bootstrap.maySeeAdmin === true;
    const displayNotificationsMax = readMax(safeConfig);
    const [toasts, setToasts] = useState<ShownToast[]>([]);
    const nextKey = useRef(0);
    // Read at delivery time so a config save changes the overflow threshold
    // without resubscribing (ADR-0017).
    const maxRef = useRef(displayNotificationsMax);
    useEffect(() => {
        maxRef.current = displayNotificationsMax;
    }, [displayNotificationsMax]);

    const dismiss = useCallback((key: number) => {
        setToasts((current) => current.filter((toast) => toast.key !== key));
    }, []);

    const receive = useCallback(
        (
            notifications: LiveNotification[],
            acknowledge: (id: number) => void,
        ) => {
            const plan = planNotificationBatch(notifications, maxRef.current);
            const added: ShownToast[] = plan.overflow
                ? [
                      {
                          body: "",
                          key: nextKey.current++,
                          overflowCount: plan.count,
                          persistent: true,
                          severity: "info",
                      },
                  ]
                : plan.toasts.map((toast) => ({
                      body: toast.body,
                      key: nextKey.current++,
                      persistent: false,
                      severity: toast.severity,
                  }));
            if (added.length > 0) {
                setToasts((current) => [...current, ...added]);
            }
            for (const id of plan.acknowledgeIds) {
                acknowledge(id);
            }
        },
        [],
    );

    useEffect(() => {
        if (!enabled) {
            return;
        }
        let cancelled = false;
        let subscription: LiveSubscription | undefined;
        liveTransport
            .subscribeNotifications(
                (notifications, acknowledge) => {
                    if (!cancelled) receive(notifications, acknowledge);
                },
                // A connection that never comes up stays quiet rather than
                // turning into a toast storm of its own.
                () => undefined,
            )
            .then((opened) => {
                if (cancelled) {
                    opened.close();
                    return;
                }
                subscription = opened;
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
            subscription?.close();
            subscription = undefined;
            // Turning notifications off in the configuration withdraws what is
            // still on screen too, rather than leaving orphaned toasts behind.
            setToasts([]);
        };
    }, [enabled, liveTransport, receive]);

    if (toasts.length === 0) {
        return null;
    }

    return (
        <Snackbar
            anchorOrigin={{horizontal: "right", vertical: "top"}}
            data-testid="notification-toasts"
            open
        >
            <Stack spacing={1} sx={{maxWidth: 420}}>
                {toasts.map((toast) => (
                    <NotificationToast
                        key={toast.key}
                        onDismiss={() => dismiss(toast.key)}
                        toast={toast}
                    />
                ))}
            </Stack>
        </Snackbar>
    );
}

function NotificationToast({
    onDismiss,
    toast,
}: {
    onDismiss: () => void;
    toast: ShownToast;
}) {
    useEffect(() => {
        if (toast.persistent) {
            return;
        }
        const timeout = window.setTimeout(onDismiss, TOAST_LIFETIME_MS);
        return () => window.clearTimeout(timeout);
    }, [onDismiss, toast.persistent]);

    return (
        <Alert
            data-testid="notification-toast"
            onClose={onDismiss}
            severity={toast.severity}
            variant="filled"
        >
            {toast.overflowCount === undefined ? (
                <NotificationBody body={toast.body} />
            ) : (
                <>
                    {toast.overflowCount} notifications have piled up.{" "}
                    <Link
                        color="inherit"
                        component={RouterLink}
                        to="/stats/notifications"
                    >
                        Go to the notification history to view them.
                    </Link>
                </>
            )}
        </Alert>
    );
}

/** Newlines become line breaks; the body itself is always a text node. */
function NotificationBody({body}: {body: string}) {
    const lines = body.split(/\r?\n/);
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

function readMax(safeConfig: Record<string, unknown> | null): number {
    const value = asRecord(
        safeConfig?.notificationConfig,
    )?.displayNotificationsMax;
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : DEFAULT_DISPLAY_NOTIFICATIONS_MAX;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : undefined;
}
