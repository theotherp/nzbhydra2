import {z} from "zod";

import type {LiveSubscription, LiveTransport} from "./transport";

/** `API-LIVE-NOTIFICATIONS`. */
const NOTIFICATIONS_TOPIC = "/topic/notifications";
/** `API-LIVE-NOTIFICATION-READ`. */
const NOTIFICATION_READ_DESTINATION = "/app/markNotificationRead";

/**
 * The backend's `NotificationEntity`, reduced to what the toast surface reads.
 * `id` stays optional because legacy explicitly guards against undefined ones
 * — an unidentified notification can be shown but never acknowledged.
 */
export type LiveNotification = {
    id?: number;
    messageType: string | null;
    title: string | null;
    body: string;
};

const notificationSchema: z.ZodType<LiveNotification> = z.object({
    id: z.number().int().optional(),
    messageType: z
        .string()
        .nullish()
        .transform((value) => value ?? null),
    title: z
        .string()
        .nullish()
        .transform((value) => value ?? null),
    body: z
        .string()
        .nullish()
        .transform((value) => value ?? ""),
});

const notificationsSchema = z.array(notificationSchema);

/** Matches `C-TOAST-SERVICE`'s severities without depending on its module. */
export type NotificationSeverity = "success" | "info" | "warning" | "error";

const SEVERITIES: Record<string, NotificationSeverity> = {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    FAILURE: "error",
};

/**
 * Legacy's `showUnreadNotifications` switch. An unknown message type produces
 * no toast there (the switch has no default) and produces none here either,
 * while still being acknowledged — otherwise it would be redelivered every
 * second forever.
 */
export function notificationSeverity(
    messageType: string | null,
): NotificationSeverity | null {
    return messageType === null ? null : (SEVERITIES[messageType] ?? null);
}

export type NotificationBatchPlan = {
    /** `true` when the batch exceeds `displayNotificationsMax`. */
    overflow: boolean;
    /** Empty on overflow: legacy shows the pile-up notice instead. */
    toasts: {body: string; severity: NotificationSeverity}[];
    /** Every notification carrying an id, overflow or not. */
    acknowledgeIds: number[];
    count: number;
};

export function planNotificationBatch(
    notifications: LiveNotification[],
    displayNotificationsMax: number,
): NotificationBatchPlan {
    const acknowledgeIds = notifications
        .map((notification) => notification.id)
        .filter((id): id is number => id !== undefined);
    const overflow = notifications.length > displayNotificationsMax;
    if (overflow) {
        return {
            acknowledgeIds,
            count: notifications.length,
            overflow,
            toasts: [],
        };
    }
    const toasts = notifications.flatMap((notification) => {
        const severity = notificationSeverity(notification.messageType);
        return severity === null ? [] : [{body: notification.body, severity}];
    });
    return {acknowledgeIds, count: notifications.length, overflow, toasts};
}

export type NotificationsLiveTransport = {
    subscribeNotifications(
        onNotifications: (
            notifications: LiveNotification[],
            acknowledge: (id: number) => void,
        ) => void,
        onUnavailable: (error: Error) => void,
    ): Promise<LiveSubscription>;
};

/**
 * The notification channel's message module. The acknowledgement is handed to
 * the consumer rather than sent here, because only the consumer knows which
 * notifications it actually handled; it publishes the bare id as the frame
 * body, which is what `NotificationsWeb.markRead(int id)` binds.
 */
export function createNotificationsLiveTransport(
    transport: LiveTransport,
): NotificationsLiveTransport {
    return {
        subscribeNotifications(onNotifications, onUnavailable) {
            let acknowledge: (id: number) => void = () => undefined;
            return transport.subscribe({
                destination: NOTIFICATIONS_TOPIC,
                parse: (body) => notificationsSchema.parse(JSON.parse(body)),
                onMessage: (notifications) =>
                    onNotifications(notifications, (id) => acknowledge(id)),
                onReady: (send) => {
                    acknowledge = (id) =>
                        send(NOTIFICATION_READ_DESTINATION, String(id));
                },
                onUnavailable,
            });
        },
    };
}
