import {
    NOTIFICATION_EVENT_TYPES,
    type NotificationEventType,
} from "../../../api/history/notifications";

/**
 * `F-CONFIG-NOTIFICATIONS`: the notification event vocabulary, reconstructed
 * from legacy's `notifications-service.js` `eventTypesData`.
 *
 * This table is the whole reason the Notifications tab is not a plain field
 * list: a notification entry is *created from an event type*, and the event
 * type carries the defaults the new entry starts with (title template, body
 * template, message type) plus the per-event template help shown under the
 * template fields. None of that exists in `NotificationConfig` or in the
 * OpenAPI document -- the backend only ever stores what the UI seeded -- so it
 * has to live in one module here, and its completeness has to be proven rather
 * than assumed.
 *
 * Three checks keep it honest:
 *
 * - `EVENT_TEMPLATES` is a `Record<NotificationEventType, ...>` over the union
 *   `api/history/notifications.ts` already declares, so the compiler rejects a
 *   missing *or* unknown key;
 * - `notificationEvents.test.ts` reads
 *   `shared/mapping/.../notification/NotificationEventType.java` and asserts
 *   that union is exactly the backend enum, so adding a constant on the Java
 *   side fails the suite instead of silently dropping an event out of the
 *   "Add new notification" menu;
 * - `requireNotificationEvent` throws rather than returning a generic default,
 *   so a seeding path can never invent an entry with the wrong templates.
 *
 * The readable labels are not repeated here: `NOTIFICATION_EVENT_TYPES`
 * (`API-HISTORY-NOTIFICATIONS`, shared with the notification history route)
 * already carries legacy's `readable` strings and its declaration order, and
 * one label vocabulary that two surfaces read is the point.
 */

export type NotificationMessageType =
    | "INFO"
    | "SUCCESS"
    | "WARNING"
    | "FAILURE";

export type NotificationEventDefinition = {
    eventType: NotificationEventType;
    /** Legacy's `readable`, used as an entry's heading. */
    label: string;
    /** Legacy's `titleTemplate`, the seeded value -- not a fallback. */
    titleTemplate: string;
    /** Legacy's `bodyTemplate`, the seeded value -- not a fallback. */
    bodyTemplate: string;
    /** Legacy's `templateHelp`, shown under the title and body fields. */
    templateHelp: string;
    /** Legacy's `messageType`, the seeded value -- not a fallback. */
    messageType: NotificationMessageType;
};

type EventTemplates = Omit<NotificationEventDefinition, "eventType" | "label">;

/**
 * `notifications-service.js:7-64`, verbatim. Two legacy strings are copied with
 * their defects intact rather than corrected here:
 *
 * - `RESULT_DOWNLOAD` and `RESULT_DOWNLOAD_COMPLETION` write `$title` (no
 *   closing `$`) in their *help* text, while the templates and
 *   `DownloadNotificationEvent.getVariablesWithContent` both use `title`;
 * - `UPDATE_INSTALLED`'s body reads "A new version of was installed".
 *
 * The second is persisted into every entry an admin creates, so changing it
 * would change stored configuration, not just prose; both are reported as
 * follow-up work instead of being fixed inside this task.
 */
const EVENT_TEMPLATES: Record<NotificationEventType, EventTemplates> = {
    AUTH_FAILURE: {
        titleTemplate: "Auth failure",
        bodyTemplate:
            "NZBHydra: A login for username $username$ failed. IP: $ip$.",
        templateHelp: "Available variables: $username$, $ip$.",
        messageType: "FAILURE",
    },
    RESULT_DOWNLOAD: {
        titleTemplate: "NZB download",
        bodyTemplate:
            'NZBHydra: The result "$title$" was grabbed from indexer $indexerName$.',
        templateHelp:
            "Available variables: $title, $indexerName$, $source$ (NZB or torrent), $age$ ([] for torrents).",
        messageType: "INFO",
    },
    RESULT_DOWNLOAD_COMPLETION: {
        titleTemplate: "Download completion",
        bodyTemplate:
            'NZBHydra: Download of "$title$" has finished. Download result: $downloadResult$.',
        templateHelp:
            "Requires the downloading tool to be configured. Available variables: $title, $downloadResult$.",
        messageType: "INFO",
    },
    INDEXER_DISABLED: {
        titleTemplate: "Indexer disabled",
        bodyTemplate:
            "NZBHydra: Indexer $indexerName$ was disabled (state: $state$). Message:\n$message$.",
        templateHelp: "Available variables: $indexerName$, $state$, $message$.",
        messageType: "WARNING",
    },
    INDEXER_REENABLED: {
        titleTemplate: "Indexer reenabled after error",
        bodyTemplate:
            "NZBHydra: Indexer $indexerName$ was reenabled after a previous error. It had been disabled since $disabledAt$.",
        templateHelp: "Available variables: $indexerName$, $disabledAt$.",
        messageType: "SUCCESS",
    },
    UPDATE_INSTALLED: {
        titleTemplate: "Update installed",
        bodyTemplate: "NZBHydra: A new version of was installed: $version$",
        templateHelp: "Available variables: $version$.",
        messageType: "SUCCESS",
    },
    VIP_RENEWAL_REQUIRED: {
        titleTemplate: "VIP renewal required",
        bodyTemplate:
            "NZBHydra: VIP access for indexer $indexerName$ will run out soon: $expirationDate$.",
        templateHelp: "Available variables: $indexerName$, $expirationDate$.",
        messageType: "WARNING",
    },
    EXTERNAL_TOOL_CONFIGURATION: {
        titleTemplate: "External tool configuration",
        bodyTemplate: "NZBHydra: Result of external tool configuration: $body$",
        templateHelp: "Available variables: $body$",
        messageType: "INFO",
    },
};

/**
 * Every event type an entry can be created for, in legacy's declaration order
 * (`NotificationService.getAllEventTypes` yields object key order, which is
 * what fills legacy's "Add new notification" dropdown).
 */
export const NOTIFICATION_EVENTS: readonly NotificationEventDefinition[] =
    NOTIFICATION_EVENT_TYPES.map((event) => ({
        eventType: event.value,
        label: event.label,
        ...EVENT_TEMPLATES[event.value],
    }));

const EVENTS_BY_TYPE = new Map<string, NotificationEventDefinition>(
    NOTIFICATION_EVENTS.map((event) => [event.eventType, event]),
);

/** The definition for a stored `eventType`, or `undefined` if it is unknown. */
export function notificationEvent(
    eventType: unknown,
): NotificationEventDefinition | undefined {
    return typeof eventType === "string"
        ? EVENTS_BY_TYPE.get(eventType)
        : undefined;
}

export class UnknownNotificationEventError extends Error {
    constructor(readonly eventType: unknown) {
        super(`Unknown notification event type: ${String(eventType)}`);
        this.name = "UnknownNotificationEventError";
    }
}

/**
 * The definition an entry is seeded from. Deliberately throwing: seeding from
 * a generic default instead of the event's own templates is the failure this
 * table exists to prevent, and it would be invisible until the notification
 * fired with the wrong text.
 */
export function requireNotificationEvent(
    eventType: unknown,
): NotificationEventDefinition {
    const event = notificationEvent(eventType);
    if (event === undefined) {
        throw new UnknownNotificationEventError(eventType);
    }
    return event;
}

/** One `NotificationConfigEntry` as the config form holds it. */
export type NotificationEntryValues = {
    eventType: string | null;
    appriseUrls: string | null;
    titleTemplate: string | null;
    bodyTemplate: string | null;
    messageType: string | null;
    [key: string]: unknown;
};

/**
 * A new entry for `eventType`, seeded exactly as legacy's `addNew` seeds it
 * (`formly-config.js:679-693`): the section's `defaultModel` with the event's
 * own title template, body template, and message type written over it. Legacy's
 * `messageType: 'WARNING'` default is therefore never what a created entry
 * carries -- it is overwritten for every event type in the table.
 */
export function newNotificationEntry(
    eventType: unknown,
): NotificationEntryValues {
    const event = requireNotificationEvent(eventType);
    return {
        eventType: event.eventType,
        appriseUrls: null,
        titleTemplate: event.titleTemplate,
        bodyTemplate: event.bodyTemplate,
        messageType: event.messageType,
    };
}
