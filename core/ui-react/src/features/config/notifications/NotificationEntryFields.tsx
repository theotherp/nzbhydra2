import SendIcon from "@mui/icons-material/Send";
import {Alert, Box, Button, FormHelperText, Stack} from "@mui/material";
import {useState} from "react";
import {useWatch} from "react-hook-form";

import {sendTestNotification} from "../../../api/config/notificationTest";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {SelectSetting, settingTestId, TextSetting} from "../components";
import {notificationEvent} from "./notificationEvents";
import {
    MESSAGE_TYPE_OPTIONS,
    NOTIFICATION_ENTRIES_PATH,
    notificationEntryPath,
    TEST_NOTIFICATION_GUIDANCE,
} from "./notificationsSettings";
import {NotificationTemplateEditor} from "./NotificationTemplateEditor";

/**
 * The two outcomes of a test send, worded exactly as the toasts they replace
 * worded them -- the wording is what an admin who has used this before will be
 * looking for.
 */
const TEST_SENT_MESSAGE = "Test notification sent.";
const TEST_FAILED_MESSAGE = "Unable to send the test notification.";

/**
 * `F-CONFIG-NOTIFICATIONS`' per-entry fields, in legacy's order
 * (`config-fields-service.js:2489-2532`), bound to one entry of
 * `notificationConfig.entries`.
 *
 * The entry's `eventType` is not editable -- legacy sets it once when the entry
 * is created from the "Add new notification" menu and never offers it again --
 * but it decides what the editor can say about the entry: the accordion's
 * heading, the template help under the title and body fields (which legacy
 * fills per entry through `notificationTemplateHelpController`), and, since
 * FM-106, the insertable variable chips and the sample-value preview.
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

    return (
        <>
            {event === undefined ? (
                // An entry stored by a newer backend, whose event type this
                // build has no templates or help for. Legacy dies on it
                // (`humanize` dereferences `undefined`); here the entry stays
                // editable and round-trips unchanged, but the admin is told
                // which entry the UI cannot fully describe rather than being
                // shown a blank heading and silently missing help.
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
            <NotificationTemplateEditor event={event} index={index} />
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
 *
 * The outcome is rendered here rather than in a toast (FM-106). A toast is
 * wrong for this action twice over: with several entries expanded it does not
 * say *which* entry answered, and it outlives the state it describes -- editing
 * the entry after a successful send leaves a green toast standing over
 * configuration the server has not seen. The result is therefore tied to the
 * snapshot of the entry it was sent for, and disappears the moment any of that
 * entry's fields change.
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
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{
        ok: boolean;
        snapshot: string;
    } | null>(null);
    const entry = useWatch<ConfigValues>({
        name: `${NOTIFICATION_ENTRIES_PATH}.${index}` as never,
    });
    const snapshot = JSON.stringify(entry ?? null);
    const testId = `config-notification-test-${settingTestId(NOTIFICATION_ENTRIES_PATH)}-${index}`;
    // Derived, not cleared by an effect: a stale result is simply not rendered,
    // so there is no render in which it is shown against changed fields.
    const current = result?.snapshot === snapshot ? result : null;

    const send = async () => {
        if (eventType === undefined) {
            return;
        }
        setSending(true);
        try {
            await sendTestNotification(transport, eventType);
            setResult({ok: true, snapshot});
        } catch {
            // The endpoint answers with a status only, so there is no server
            // message to relay: it fails when Apprise could not be reached or
            // the configured URLs were rejected.
            setResult({ok: false, snapshot});
        } finally {
            setSending(false);
        }
    };

    return (
        <Box sx={{mb: 2.5}}>
            <Stack alignItems="flex-start" spacing={0.5}>
                <Stack
                    alignItems={{sm: "center"}}
                    direction={{sm: "row", xs: "column"}}
                    spacing={1}
                    sx={{width: "100%"}}
                    useFlexGap
                >
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
                    {current === null ? null : (
                        <Alert
                            data-testid={`config-notification-test-result-${index}`}
                            severity={current.ok ? "success" : "error"}
                            // Density deviation from stock `Alert`, deliberate:
                            // this one sits *in the button's row*, not above a
                            // block of content. Stock vertical padding makes it
                            // ~48px against the button's ~38px, so the row grows
                            // taller the moment a result appears and everything
                            // below it shifts. Dropping the root's `py` leaves
                            // the message's own `8px 0` and lands the alert at
                            // the button's height, so the result appears in
                            // place. Row-local, so it is not a `MuiAlert` theme
                            // override: every other `Alert` stays stock.
                            sx={{py: 0}}
                        >
                            {current.ok
                                ? TEST_SENT_MESSAGE
                                : TEST_FAILED_MESSAGE}
                        </Alert>
                    )}
                </Stack>
                <FormHelperText component="div">
                    {TEST_NOTIFICATION_GUIDANCE}
                </FormHelperText>
            </Stack>
        </Box>
    );
}
