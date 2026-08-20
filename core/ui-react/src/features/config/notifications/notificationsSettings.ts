import type {ConfigFieldPath, SettingOption} from "../components";
import {
    notificationEvent,
    type NotificationEntryValues,
} from "./notificationEvents";

/**
 * `F-CONFIG-NOTIFICATIONS`' option lists, help texts, and path helpers,
 * transcribed from `config-fields-service.js:2376-2545`. Beside the tab rather
 * than in `C-CONFIG-FIELDS` because they are this tab's vocabulary; the event
 * table itself lives in `notificationEvents.ts`.
 */

/** `config-fields-service.js:2379-2386`, the intro help panel. */
export const NOTIFICATIONS_HELP_LINES: readonly string[] = [
    "NZBHydra supports sending and displaying notifications for certain events. You can enable notifications for each event by adding entries below.",
    "NZBHydra uses Apprise to communicate with the actual notification providers. You need either a) an instance of Apprise API running or b) an Apprise runnable accessible by NZBHydra. Either are not part of NZBHydra.",
    "NZBHydra will also show notifications on the GUI if enabled.",
    "Only URLs in the form of the http://../notify/<key> form will work. Each notification requires a non-null value for URL to be enabled, but always uses the Main URL.",
];

/** `NotificationConfig.AppriseType`. */
export const APPRISE_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "None", value: "NONE"},
    {label: "API", value: "API"},
    {label: "CLI", value: "CLI"},
];

/** `NotificationConfigEntry.MessageType`. */
export const MESSAGE_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "Info", value: "INFO"},
    {label: "Success", value: "SUCCESS"},
    {label: "Warning", value: "WARNING"},
    {label: "Failure", value: "FAILURE"},
];

export const APPRISE_API_URL = "https://github.com/caronc/apprise-api";
export const APPRISE_CLI_URL = "https://github.com/caronc/apprise";

/**
 * Legacy's test-notification tooltip (`config.html`
 * `button-test-notification.html`), kept as visible guidance next to the
 * action instead of a hover-only tooltip: it states a precondition the admin
 * has to know *before* clicking, because the server sends the saved entry
 * (`NotificationsWeb.testNotification`), not the one on screen.
 */
export const TEST_NOTIFICATION_GUIDANCE =
    "Send a test notification. You need to save the config first.";

/** The config path of the notification entries array. */
export const NOTIFICATION_ENTRIES_PATH =
    "notificationConfig.entries" as ConfigFieldPath;

export function notificationEntryPath(
    index: number,
    field: keyof NotificationEntryValues,
): ConfigFieldPath {
    // As `categoryFieldPath` in `categories/categoriesSettings.ts`:
    // `notificationConfig` is an unmodeled loose object (ADR-0003), so
    // react-hook-form's `FieldPath` cannot enumerate a dynamic array index as
    // a literal type. The cast is narrow -- `field` is still constrained to a
    // real entry key.
    return `${NOTIFICATION_ENTRIES_PATH}.${index}.${String(field)}` as ConfigFieldPath;
}

/**
 * An entry's heading: legacy renders `element.eventTypeReadable`
 * (`notificationRepeatSection.html`), which its `notificationTemplateHelpController`
 * fills from `NotificationService.humanize(model.eventType)`. An entry whose
 * stored event type this build does not know keeps its raw constant visible
 * rather than showing an empty heading -- see `NotificationEntryFields`.
 */
export function notificationEntryLegend(
    entry: NotificationEntryValues,
): string {
    const event = notificationEvent(entry.eventType);
    if (event !== undefined) {
        return event.label;
    }
    return entry.eventType === null || entry.eventType === undefined
        ? "Notification"
        : String(entry.eventType);
}
