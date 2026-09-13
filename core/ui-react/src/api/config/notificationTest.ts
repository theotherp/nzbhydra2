import {ApiTransport} from "../transport";

/**
 * `API-NOTIFICATIONS-TEST`: asks the server to publish a test instance of one
 * notification event, so the admin can see whether the configured Apprise
 * transport and the entry's templates actually deliver
 * (`NotificationsWeb.testNotification`, legacy
 * `notifications-service.js:90-92`).
 *
 * It sends the *saved* configuration's entry, not the form's -- the server
 * reads `NotificationConfig` from disk -- which is why the affordance carries
 * legacy's "you need to save the config first" guidance.
 *
 * The response has no body: the endpoint returns `void`, and a failure (an
 * event type with no registered `NotificationEvent`, or a transport error
 * reaching Apprise) arrives as an HTTP error status that `C-API-TRANSPORT`
 * turns into a thrown `ApiError`. Nothing is parsed, so `APIS.yaml` keeps this
 * record at `generated_weak`.
 */
export async function sendTestNotification(
    transport: ApiTransport,
    eventType: string,
): Promise<void> {
    await transport.request<unknown>(
        `internalapi/notifications/test/${encodeURIComponent(eventType)}`,
    );
}
