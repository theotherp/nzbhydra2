import {ApiTransport} from "./transport";

/**
 * `API-USER-PREFERENCES-PUT`: replaces one section of the session user's
 * preference record (`UserPreferencesWeb`). The record itself is read with the
 * page: it arrives as the bootstrap's `userPreferences`, so there is no client
 * for `API-USER-PREFERENCES-GET`.
 *
 * Sent with `keepalive` so a write still in flight when the tab closes is not
 * dropped; the server caps a whole record at 32 KB, well below the 64 KB
 * `keepalive` budget.
 */
export async function putUserPreferenceSection(
    transport: ApiTransport,
    section: string,
    value: unknown,
): Promise<void> {
    await transport.request<unknown>(
        `internalapi/userpreferences/${encodeURIComponent(section)}`,
        {json: value, keepalive: true, method: "PUT"},
    );
}
