import SendIcon from "@mui/icons-material/Send";
import {Alert, Box, Button, FormHelperText, Stack} from "@mui/material";
import {useState} from "react";
import {useWatch} from "react-hook-form";

import {sendTestNotification} from "../../../api/config/notificationTest";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {useToasts} from "../../../components/toasts/toasts";
import {
    SelectSetting,
    settingTestId,
    TextAreaSetting,
    TextSetting,
} from "../components";
import {notificationEvent} from "./notificationEvents";
import {
    MESSAGE_TYPE_OPTIONS,
    NOTIFICATION_ENTRIES_PATH,
    notificationEntryPath,
    TEST_NOTIFICATION_GUIDANCE,
} from "./notificationsSettings";

/**
 * `F-CONFIG-NOTIFICATIONS`' per-entry fields, in legacy's order
 * (`config-fields-service.js:2489-2532`), bound to one entry of
 * `notificationConfig.entries` through `RepeatSection`.
 *
 * The entry's `eventType` is not editable -- legacy sets it once when the entry
 * is created from the "Add new notification" menu and never offers it again --
 * but it decides two things that are rendered: the heading (`RepeatSection`'s
 * legend) and the template help under the title and body fields, which legacy
 * fills per entry through `notificationTemplateHelpController`.
 */
export function NotificationEntryFields({
    index,
    transport,
}: {
    index: number;
    transport: ApiTransport;
}) {
    const eventType = useWatch<ConfigValues>({
        name: notificationEntryPath(index, "eventType"),
    });
    const event = notificationEvent(eventType);
    // An entry stored by a newer backend, whose event type this build has no
    // templates or help for. Legacy dies on it (`humanize` dereferences
    // `undefined`); here the entry stays editable and round-trips unchanged,
    // but the admin is told which entry the UI cannot fully describe rather
    // than being shown a blank heading and silently missing help.
    const templateHelp = event?.templateHelp;

    return (
        <>
            {event === undefined ? (
                <Alert
                    data-testid={`config-notification-unknown-event-${index}`}
                    severity="warning"
                    sx={{mb: 2.5}}
                >
                    This NZBHydra version does not know the event type{" "}
                    {String(eventType ?? "(none)")}. The entry is kept and saved
                    unchanged, but its templates cannot be explained here.
                </Alert>
            ) : null}
            <TextSetting
                help="One or more URLs identifying where the notification should be sent to, comma-separated."
                label="URLs"
                name={notificationEntryPath(index, "appriseUrls")}
            />
            <TextSetting
                help={templateHelp}
                label="Title template"
                name={notificationEntryPath(index, "titleTemplate")}
            />
            <TextAreaSetting
                help={templateHelp}
                label="Body template"
                name={notificationEntryPath(index, "bodyTemplate")}
                required
            />
            <SelectSetting
                help="Select the message type to use."
                label="Message type"
                name={notificationEntryPath(index, "messageType")}
                options={MESSAGE_TYPE_OPTIONS}
            />
            <TestNotificationAction
                eventType={event?.eventType}
                index={index}
                transport={transport}
            />
        </>
    );
}

/**
 * Legacy's `horizontalTestNotification` button
 * (`config.html#button-test-notification.html`): it asks the server to publish
 * a test instance of this entry's event so the admin can see whether the
 * configured transport delivers.
 *
 * It reads nothing from the form and writes nothing back -- the event type is
 * a prop, and `API-NOTIFICATIONS-TEST` is a plain GET -- so clicking it can
 * never dirty the configuration. That matters because the server sends the
 * *saved* entry, which is exactly what legacy's tooltip warns about and what
 * this action states as visible guidance.
 */
function TestNotificationAction({
    eventType,
    index,
    transport,
}: {
    eventType: string | undefined;
    index: number;
    transport: ApiTransport;
}) {
    const toasts = useToasts();
    const [sending, setSending] = useState(false);
    const testId = `config-notification-test-${settingTestId(NOTIFICATION_ENTRIES_PATH)}-${index}`;

    const send = async () => {
        if (eventType === undefined) {
            return;
        }
        setSending(true);
        try {
            await sendTestNotification(transport, eventType);
            toasts.showToast({
                message: "Test notification sent.",
                severity: "success",
            });
        } catch {
            // The endpoint answers with a status only, so there is no server
            // message to relay: it fails when the event type has no registered
            // `NotificationEvent` or when Apprise could not be reached.
            toasts.showToast({
                message: "Unable to send the test notification.",
                severity: "error",
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Box sx={{mb: 2.5}}>
            <Stack alignItems="flex-start" spacing={0.5}>
                <Button
                    data-testid={testId}
                    disabled={sending || eventType === undefined}
                    onClick={() => void send()}
                    startIcon={<SendIcon />}
                    type="button"
                    variant="outlined"
                >
                    Send test notification
                </Button>
                <FormHelperText component="div">
                    {TEST_NOTIFICATION_GUIDANCE}
                </FormHelperText>
            </Stack>
        </Box>
    );
}
