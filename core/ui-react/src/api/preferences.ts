import {ApiTransport} from "./transport";

const PREFERENCES_PATH = "internalapi/genericstorage";

/**
 * Legacy's `GenericStorageService` always sent `forUser` (`forUser === true`),
 * never omitted it, and the backend reads it as a plain `boolean` request
 * parameter, so the flag is spelled out on every call here as well. With
 * `forUser=true` the backend suffixes the key with the remote user's name, so
 * the same key addresses a different record per session.
 */
function preferencePath(key: string, forUser: boolean): string {
    return `${PREFERENCES_PATH}/${encodeURIComponent(key)}?forUser=${forUser}`;
}

/**
 * `API-PREFERENCES-GET`: the stored record, or `undefined` when the key holds
 * nothing (`GenericStorageWeb.get` answers `null` with an empty body).
 *
 * The value is deliberately returned untyped: generic storage holds whatever
 * the writer put there — a JSON boolean written by a backend detector, an
 * object written by the backup service, or the raw request body a *client*
 * write stored as a JSON string. Every caller validates what it expects.
 */
export function getPreference(
    transport: ApiTransport,
    key: string,
    forUser = false,
): Promise<unknown> {
    return transport.request<unknown>(preferencePath(key, forUser));
}

/**
 * `API-PREFERENCES-PUT`: stores `value` under `key`.
 *
 * `GenericStorageWeb.put` takes the request body as a `String` and stores that
 * string JSON-encoded, so a client-written `false` comes back from
 * `API-PREFERENCES-GET` as the *string* `"false"`, not as a boolean.
 * `C-SERVER-PREFERENCES` is where that asymmetry is interpreted.
 */
export async function putPreference(
    transport: ApiTransport,
    key: string,
    value: unknown,
    forUser = false,
): Promise<void> {
    await transport.request<unknown>(preferencePath(key, forUser), {
        json: value,
        method: "PUT",
    });
}
