import {getPreference, putPreference} from "../../api/preferences";
import {ApiTransport} from "../../api/transport";

/**
 * `C-SERVER-PREFERENCES` (legacy `generic-storage-service.js`): server-backed
 * acknowledgements and UI preferences, global or per user.
 *
 * Every show-once startup check reads and clears its flag through this
 * component, which is also where the storage endpoint's one asymmetry is
 * interpreted: a backend writer stores a real JSON value
 * (`GenericStorage.save("belowJava17", true)`), while a *client* write goes
 * through `GenericStorageWeb.put`, which takes the request body as a `String`
 * and stores it JSON-encoded — so the `false` this component writes to clear a
 * flag reads back as the string `"false"`, not as a boolean.
 */
export type ServerPreferences = {
    /** Writes `false`, the value legacy cleared a one-shot flag with. */
    clear: (key: string, forUser?: boolean) => Promise<void>;
    /** The stored record, untyped; `undefined` when the key holds nothing. */
    read: (key: string, forUser?: boolean) => Promise<unknown>;
    /** `true` only for a stored value that actually means "true". */
    readFlag: (key: string, forUser?: boolean) => Promise<boolean>;
    write: (key: string, value: unknown, forUser?: boolean) => Promise<void>;
};

/**
 * Legacy tested a stored flag as `response.data !== "" && response.data`,
 * which is why a cleared flag — stored as the *string* `"false"` — stayed
 * truthy and made every one-shot warning reappear on every load. Only a value
 * that means `true` is a raised flag here.
 */
export function isRaisedFlag(value: unknown): boolean {
    return value === true || value === "true";
}

export function createServerPreferences(
    transport: ApiTransport,
): ServerPreferences {
    return {
        clear: (key, forUser = false) =>
            putPreference(transport, key, false, forUser),
        read: (key, forUser = false) => getPreference(transport, key, forUser),
        readFlag: async (key, forUser = false) =>
            isRaisedFlag(await getPreference(transport, key, forUser)),
        write: (key, value, forUser = false) =>
            putPreference(transport, key, value, forUser),
    };
}
