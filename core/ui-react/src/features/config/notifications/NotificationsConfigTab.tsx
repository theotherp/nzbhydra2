import {Box} from "@mui/material";
import {useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {
    ChipsSetting,
    ConfigFieldset,
    FileBrowserSetting,
    HelpBlock,
    NumberSetting,
    RepeatSection,
    SelectSetting,
    SwitchSetting,
    TextSetting,
} from "../components";
import {NotificationEntryFields} from "./NotificationEntryFields";
import {
    newNotificationEntry,
    NOTIFICATION_EVENTS,
    type NotificationEntryValues,
} from "./notificationEvents";
import {
    APPRISE_API_URL,
    APPRISE_CLI_URL,
    APPRISE_TYPE_OPTIONS,
    NOTIFICATION_ENTRIES_PATH,
    notificationEntryLegend,
    NOTIFICATIONS_HELP_LINES,
} from "./notificationsSettings";

/**
 * `F-CONFIG-NOTIFICATIONS`: the Notifications configuration tab -- every field
 * of `config-fields-service.js:2376-2545`, in legacy's order, bound to
 * `C-CONFIG-FORM`'s whole-config form through the `C-CONFIG-FIELDS`
 * vocabulary.
 *
 * Legacy's `hideExpression`s become plain conditional rendering driven by
 * `useWatch`, as on the Main and Auth tabs: the shell's form is created with
 * `shouldUnregister: false`, so a hidden Apprise URL or filter list keeps its
 * value and is written back unchanged on the next save.
 *
 * The entries list is not the generic add-a-blank-row section: an entry is
 * created *from an event type* and seeded with that event's own templates
 * (`notificationEvents.ts`), which is what `RepeatSection`'s `addChoices`
 * mode expresses.
 */
export function NotificationsConfigTab({transport}: {transport: ApiTransport}) {
    const appriseType = useWatch<ConfigValues>({
        name: "notificationConfig.appriseType",
    });
    const displayNotifications = useWatch<ConfigValues>({
        name: "notificationConfig.displayNotifications",
    });

    return (
        <Box data-testid="config-notifications">
            <HelpBlock
                lines={NOTIFICATIONS_HELP_LINES}
                testId="config-notifications-help"
            />
            <ConfigFieldset label="Main">
                <SelectSetting
                    label="Apprise type"
                    name="notificationConfig.appriseType"
                    options={APPRISE_TYPE_OPTIONS}
                />
                {appriseType === "API" ? (
                    <TextSetting
                        help={[
                            "URL of ",
                            {href: APPRISE_API_URL, text: "Apprise API"},
                            " to send notifications to.",
                        ]}
                        label="Apprise API URL"
                        name="notificationConfig.appriseApiUrl"
                    />
                ) : null}
                {appriseType === "CLI" ? (
                    <FileBrowserSetting
                        // "of of" is legacy's own wording
                        // (`config-fields-service.js:2422`), kept verbatim so
                        // the two UIs read identically during the parity
                        // comparison; see the handoff's follow-up work.
                        help={[
                            "Full path of of ",
                            {href: APPRISE_CLI_URL, text: "Apprise runnable"},
                            " to execute.",
                        ]}
                        label="Apprise runnable"
                        mode="file"
                        name="notificationConfig.appriseCliPath"
                        transport={transport}
                    />
                ) : null}
                <SwitchSetting
                    help="If enabled notifications will be shown on the GUI."
                    label="Display notifications"
                    name="notificationConfig.displayNotifications"
                />
                {displayNotifications === true ? (
                    <NumberSetting
                        help="Max number of notifications to show on the GUI. If more have piled up a notification will indicate this and link to the notification history."
                        label="Show max notifications"
                        name="notificationConfig.displayNotificationsMax"
                    />
                ) : null}
                <NumberSetting
                    help="Show a warning with search results when an indexer has this many API hits or fewer remaining."
                    label="Warn when API hits left"
                    name="notificationConfig.indexerHitLimitWarningThreshold"
                />
                <NumberSetting
                    help="Show a warning with search results when an indexer has this many downloads or fewer remaining."
                    label="Warn when downloads left"
                    name="notificationConfig.indexerDownloadLimitWarningThreshold"
                />
                {displayNotifications === true ? (
                    <ChipsSetting
                        help='Apply values with return key. Surround with "/" for regex (e.g. /contains[0-9]This/). Case insensitive.'
                        label="Hide if message contains..."
                        name="notificationConfig.filterOuts"
                    />
                ) : null}
            </ConfigFieldset>
            <ConfigFieldset label="Notifications">
                <RepeatSection<NotificationEntryValues>
                    addChoices={NOTIFICATION_EVENTS.map((event) => ({
                        label: event.label,
                        value: event.eventType,
                    }))}
                    addLabel="Add new notification"
                    defaultEntry={(choice) => newNotificationEntry(choice)}
                    entryLegend={notificationEntryLegend}
                    name={NOTIFICATION_ENTRIES_PATH}
                    renderEntry={(index) => (
                        <NotificationEntryFields
                            index={index}
                            transport={transport}
                        />
                    )}
                />
            </ConfigFieldset>
        </Box>
    );
}
