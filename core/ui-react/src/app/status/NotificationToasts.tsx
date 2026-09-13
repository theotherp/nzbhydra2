import {useCallback, useEffect, useRef} from "react";

import {
    planNotificationBatch,
    type LiveNotification,
    type NotificationsLiveTransport,
} from "../../api/live/notifications";
import type {LiveSubscription} from "../../api/live/transport";
import {useSafeConfig, type BootstrapData} from "../../bootstrap";
import {
    useToasts,
    type DismissToast,
    type Toast,
} from "../../components/toasts/toasts";

const DEFAULT_DISPLAY_NOTIFICATIONS_MAX = 5;

/**
 * The in-app half of `F-PLATFORM-LIVE-STATUS`' live surfaces: legacy's
 * `hydra-checks-footer.js:289-351` notification channel. A permanent shell
 * subscriber, gated on the reactive safe config's `displayNotifications` and
 * the session's admin permission, that acknowledges every notification it
 * handled so the server stops redelivering it.
 *
 * Delivered notifications are raised on `C-TOAST-SERVICE`, which stacks them,
 * gives the pile-up notice its persistence, and renders every body as text —
 * newlines become real line breaks, never HTML. Legacy injected the body into
 * growl's HTML. The pile-up notice names the notification history as the
 * place to view the piled-up notifications rather than linking to it, because
 * ADR-0037 forbids interactive toast content (a link inside a persistent toast
 * would be untabbable behind any open modal's `FocusTrap`).
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
    const {showToast} = useToasts();
    // Read at delivery time so a config save changes the overflow threshold
    // without resubscribing (ADR-0017).
    const maxRef = useRef(displayNotificationsMax);
    useEffect(() => {
        maxRef.current = displayNotificationsMax;
    }, [displayNotificationsMax]);
    // Whatever this subscriber still has on screen, so it can withdraw it when
    // notifications are switched off or the shell unmounts.
    const shown = useRef(new Set<DismissToast>());

    const raise = useCallback(
        (toast: Toast) => {
            const handle: {dismiss?: DismissToast} = {};
            handle.dismiss = showToast({
                ...toast,
                onClose: () => {
                    if (handle.dismiss !== undefined) {
                        shown.current.delete(handle.dismiss);
                    }
                },
            });
            shown.current.add(handle.dismiss);
        },
        [showToast],
    );

    const receive = useCallback(
        (
            notifications: LiveNotification[],
            acknowledge: (id: number) => void,
        ) => {
            const plan = planNotificationBatch(notifications, maxRef.current);
            if (plan.overflow) {
                raise({
                    message:
                        `${plan.count} notifications have piled up. ` +
                        "View them in the notification history.",
                    // Legacy's `disableCountDown` for the pile-up notice.
                    persistent: true,
                    severity: "info",
                    testId: "notification-toast",
                });
            } else {
                for (const toast of plan.toasts) {
                    raise({
                        message: toast.body,
                        severity: toast.severity,
                        testId: "notification-toast",
                    });
                }
            }
            for (const id of plan.acknowledgeIds) {
                acknowledge(id);
            }
        },
        [raise],
    );

    useEffect(() => {
        if (!enabled) {
            return;
        }
        let cancelled = false;
        let subscription: LiveSubscription | undefined;
        const shownToasts = shown.current;
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
            for (const dismiss of [...shownToasts]) {
                dismiss();
            }
            shownToasts.clear();
        };
    }, [enabled, liveTransport, receive]);

    return null;
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
