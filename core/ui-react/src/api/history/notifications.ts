import type {HistoryDimension} from "./filters";
import {
    requestHistoryPage,
    type HistoryPage,
    type HistoryQuery,
} from "./request";
import {ApiTransport} from "../transport";

/**
 * `API-HISTORY-NOTIFICATIONS` as a consumer of `C-HISTORY-REQUEST`: this module
 * declares the route's dimensions and parses one `NotificationEntityTO`;
 * `request.ts` builds the whole `HistoryRequest` body and validates the paged
 * envelope, so the route adds no third history request path.
 */

export type NotificationHistorySort = {
    column: "time" | "NOTIFICATION_EVENT_TYPE";
    sortMode: 1 | 2;
};

/**
 * The complete active event vocabulary: every constant of
 * `org.nzbhydra.config.notification.NotificationEventType`, with the readable
 * label legacy shows for it (`notifications-service.js` `eventTypesData[...]
 * .readable`, surfaced through `NotificationService.humanize`). Order follows
 * legacy's own declaration order, which is what `getAllEventTypes()` yields for
 * the filter list.
 *
 * The label is presentation only. Filtering and sorting run on the enum
 * constants -- legacy keeps both halves as well
 * (`notification-history-controller.js:44-48` pairs `humanize(key)` with
 * `id: key`), because the server compares the `NOTIFICATION_EVENT_TYPE` column
 * against the stored enum name.
 */
export const NOTIFICATION_EVENT_TYPES = [
    {value: "AUTH_FAILURE", label: "Auth failure"},
    {value: "RESULT_DOWNLOAD", label: "NZB download"},
    {value: "RESULT_DOWNLOAD_COMPLETION", label: "Download completion"},
    {value: "INDEXER_DISABLED", label: "Indexer disabled"},
    {value: "INDEXER_REENABLED", label: "Indexer reenabled after error"},
    {value: "UPDATE_INSTALLED", label: "Automatic update installed"},
    {
        value: "VIP_RENEWAL_REQUIRED",
        label: "VIP renewal required (14 day warning)",
    },
    {
        value: "EXTERNAL_TOOL_CONFIGURATION",
        label: "External tool configuration",
    },
] as const;

export type NotificationEventType =
    (typeof NOTIFICATION_EVENT_TYPES)[number]["value"];

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> =
    Object.fromEntries(
        NOTIFICATION_EVENT_TYPES.map((event) => [event.value, event.label]),
    ) as Record<NotificationEventType, string>;

const EVENT_TYPE_VALUES: ReadonlySet<string> = new Set(
    NOTIFICATION_EVENT_TYPES.map((event) => event.value),
);

export type NotificationHistoryEntry = {
    id: number;
    time?: number | string;
    notificationEventType: NotificationEventType;
    title?: string;
    body?: string;
    urls?: string;
};

/**
 * The route's dimensions in the shared vocabulary. Legacy offers exactly these
 * two (`notification-history.html`: `time-filter column="time"` and
 * `checkboxes-filter column="NOTIFICATION_EVENT_TYPE"`), and both keep their
 * legacy server column so the generated SQL is unchanged.
 *
 * Legacy's `preselect="true" show-invert="true"` model is deliberately not
 * carried forward (ADR-0016): the shared bar starts with nothing selected, and
 * an empty selection sends no `NOTIFICATION_EVENT_TYPE` entry at all.
 */
export function notificationHistoryDimensions(): HistoryDimension[] {
    return [
        {
            kind: "time",
            id: "time",
            column: "time",
            label: "Time",
            afterLabel: "After",
            beforeLabel: "Before",
        },
        {
            kind: "checkboxes",
            id: "event-type",
            column: "NOTIFICATION_EVENT_TYPE",
            label: "Event type",
            options: NOTIFICATION_EVENT_TYPES.map((event) => ({
                value: event.value,
                label: event.label,
            })),
        },
    ];
}

export async function getNotificationHistory(
    transport: ApiTransport,
    query: HistoryQuery,
): Promise<HistoryPage<NotificationHistoryEntry>> {
    return requestHistoryPage(transport, {
        path: "internalapi/history/notifications",
        label: "Notification history",
        query,
        parseEntry: notificationHistoryEntry,
    });
}

/**
 * One `org.nzbhydra.notifications.NotificationEntityTO`. An entry whose event
 * type is not part of the active vocabulary is rejected rather than rendered
 * with a raw constant, exactly as download history rejects an unknown status:
 * the type column would otherwise show a value the filter cannot select, and
 * `historyPage` reports the count instead of dropping it silently.
 */
function notificationHistoryEntry(
    value: unknown,
): NotificationHistoryEntry | undefined {
    if (!value || typeof value !== "object") return undefined;
    const entry = value as Record<string, unknown>;
    const id = Number(entry.id);
    if (!Number.isInteger(id)) return undefined;
    if (
        typeof entry.notificationEventType !== "string" ||
        !EVENT_TYPE_VALUES.has(entry.notificationEventType)
    ) {
        return undefined;
    }
    const optionalText = (field: string) =>
        typeof entry[field] === "string" && entry[field]
            ? (entry[field] as string)
            : undefined;
    return {
        id,
        time:
            typeof entry.time === "number" || typeof entry.time === "string"
                ? entry.time
                : undefined,
        notificationEventType:
            entry.notificationEventType as NotificationEventType,
        title: optionalText("title"),
        body: optionalText("body"),
        urls: optionalText("urls"),
    };
}
