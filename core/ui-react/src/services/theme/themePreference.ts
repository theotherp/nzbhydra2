import {ApiTransport} from "../../api/transport";
import {themePreferenceOptions, type ThemePreference} from "../../app/theme";
import {readItem, writeItem} from "../../domain/storage/browserStorage";
import {
    createServerPreferences,
    type ServerPreferences,
} from "../preferences/serverPreferences";

/**
 * `C-THEME-PREFERENCE` (ADR-0049): the user's theme choice, made durable.
 *
 * FM-154 gave the application four themes and a nav-bar selector, but the
 * choice lived in React state and a reload returned to `grey`. This module is
 * the persistence half: one typed read/write pair over `C-SERVER-PREFERENCES`
 * (`forUser=true`, so the record is the *session's own user's*), plus a
 * `C-BROWSER-STORAGE`-guarded local cache that exists only to seed the first
 * render before the server answers.
 *
 * The one thing that makes this more than a getter and a setter is the read
 * boundary. `GenericStorageWeb.put` takes the request body as a `String` and
 * stores that string JSON-encoded, so what a client PUTs is not what it GETs:
 * writing `bright` reads back as the *string* `"\"bright\""` (see
 * `API-PREFERENCES-PUT`'s note and the same asymmetry `C-SERVER-PREFERENCES`
 * interprets for its `false`). Generic storage is also writable by anything
 * else that knows the key, has held a value across upgrades, and answers
 * whatever a previous version put there -- so everything coming out of it is
 * untrusted input, normalised by `parseThemePreference` below and never
 * believed as a theme name because it happens to be a string.
 */

/**
 * The generic-storage key the preference lives under, per ADR-0049's
 * `forUser=true` record. Named as a constant because it is the contract: the
 * system test writes the same key directly to restore the shared instance's
 * default, and nothing else in this repository may invent a second spelling.
 *
 * Not prefixed with a feature namespace the way the localStorage keys below
 * are: generic-storage keys are a flat legacy vocabulary
 * (`welcomeShown`, `isGroupEpisodesHelpShown`, ...) and this one joins it.
 */
export const THEME_PREFERENCE_KEY = "themePreference";

/**
 * FM-155's original localStorage key of the startup seed, browser-scoped
 * rather than user-scoped: on a shared browser a second user's first paint
 * was briefly seeded with the previous user's cached theme until the server
 * read landed. FM-157 quarantines that data rather than migrating it -- a
 * value under this key may belong to a different user than the one now
 * loading the page, which is exactly what scoping exists to stop trusting.
 * Kept only so nothing else in this repository reintroduces the same
 * spelling; never read again, by this module or by a test that means to
 * assert the current, scoped behaviour.
 */
export const LEGACY_THEME_PREFERENCE_CACHE_KEY = "hydra.theme.preference";

/**
 * The localStorage key prefix for an authenticated user's startup seed, in
 * this UI's own `hydra.<area>.<thing>` convention (`hydra.config.showAdvanced`,
 * `hydra.search-results.table`), extended with the username so a shared
 * browser gives each authenticated user their own seed -- mirroring
 * `GenericStorageWeb`'s `key + "-" + remoteUser` scoping of the server record
 * this cache seeds from.
 */
export const THEME_PREFERENCE_CACHE_KEY_USER_PREFIX =
    "hydra.theme.preference.user.";

/**
 * The localStorage key of the startup seed shared by every anonymous
 * session, mirroring `GenericStorageWeb`'s bare-key fallback when
 * `getRemoteUser()` is null -- one record shared by all anonymous sessions,
 * never merged with the per-user shapes above regardless of what a username
 * contains (the two shapes are disjoint by the fixed `.user.` segment, not by
 * escaping, so a user literally named `shared` still lands under
 * `hydra.theme.preference.user.shared`).
 */
export const THEME_PREFERENCE_CACHE_KEY_SHARED =
    "hydra.theme.preference.shared";

/**
 * The startup seed's storage key for `username`, the single authority
 * `readCachedThemePreference`/`writeCachedThemePreference` and their callers
 * derive from. `username` is `null` for an anonymous session or an
 * absent/invalid bootstrap -- see `readBootstrapUsername`.
 *
 * This cache is deliberately *not* the source of truth -- it is a copy of the
 * last preference this browser applied for this scope, read synchronously so
 * the first paint is usually already in the right theme instead of flashing
 * the default while the server round trip is in flight. The server value wins
 * the moment it arrives.
 */
export function themePreferenceCacheKey(username: string | null): string {
    return username === null
        ? THEME_PREFERENCE_CACHE_KEY_SHARED
        : `${THEME_PREFERENCE_CACHE_KEY_USER_PREFIX}${username}`;
}

/** Read/write of the current user's stored theme preference. */
export type ThemePreferenceService = {
    /**
     * The stored preference, or `undefined` for an absent, unreadable or
     * unrecognised value. Never rejects: a theme is a convenience, and a
     * failed read simply means "no stored preference".
     */
    read: () => Promise<ThemePreference | undefined>;
    /** Stores `preference`; rejects if the request fails, so callers decide. */
    write: (preference: ThemePreference) => Promise<void>;
};

/**
 * The vocabulary, derived from the selector's own option list rather than
 * restated: a theme added to `themePreferenceOptions` is accepted here without
 * anyone remembering to widen a second list, and one removed stops being
 * accepted.
 */
function isThemePreference(value: string): value is ThemePreference {
    return themePreferenceOptions.some((option) => option.value === value);
}

/**
 * A stored value as a `ThemePreference`, or `undefined` for anything this
 * application does not recognise.
 *
 * Accepts the value both bare (`bright`, what a backend-side writer or a
 * future non-string-bodied endpoint would store) and JSON-string-encoded
 * (`"bright"`, what this application's own writes read back as). Everything
 * else -- a number, an object, `null`, an unknown theme name, a legacy
 * `main.theme`-era value this build has no palette for -- is `undefined`, not
 * an approximation: rendering an unknown theme name would throw in
 * `createHydraTheme`'s palette lookup, and guessing one would silently override
 * the choice the user actually made on another browser.
 */
export function parseThemePreference(
    value: unknown,
): ThemePreference | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    if (isThemePreference(value)) {
        return value;
    }
    // Exactly one level of unwrapping, and only of a JSON *string*: the
    // endpoint's encoding wraps `bright` as `"bright"` and nothing deeper is a
    // shape this application ever wrote.
    let decoded: unknown;
    try {
        decoded = JSON.parse(value);
    } catch {
        return undefined;
    }
    return typeof decoded === "string" && isThemePreference(decoded)
        ? decoded
        : undefined;
}

export function createThemePreferenceService(
    preferences: ServerPreferences,
): ThemePreferenceService {
    return {
        read: async () => {
            try {
                return parseThemePreference(
                    await preferences.read(THEME_PREFERENCE_KEY, true),
                );
            } catch {
                // An unreachable key, a 401 on a session that expired, an
                // offline instance: none of them are worth failing a render
                // over, and all of them mean the same thing here.
                return undefined;
            }
        },
        write: (preference) =>
            preferences.write(THEME_PREFERENCE_KEY, preference, true),
    };
}

/**
 * The service `ThemePreferenceProvider` uses when it is given none, or
 * `undefined` when this document carries no bootstrap to build a transport
 * from -- which is every focused component test, and is why the provider can
 * be mounted in jsdom without reaching for the network at all.
 *
 * The provider builds its own transport rather than being handed the router's:
 * FM-154 deliberately mounts it *above* the query client and the router (the
 * theme is a client concern that must be applied before any data exists), and
 * moving it under them to share one transport would reorder every provider in
 * the tree for a single GET and a PUT-per-click. `ApiTransport` holds no
 * connection state -- it is a base URL plus `fetch` -- so a second instance
 * costs nothing and keeps the tree as FM-154 left it.
 */
export function createDefaultThemePreferenceService():
    | ThemePreferenceService
    | undefined {
    const bootstrap: unknown = window.__NZBHYDRA_BOOTSTRAP__;
    if (
        typeof bootstrap !== "object" ||
        bootstrap === null ||
        !("baseUrl" in bootstrap) ||
        typeof bootstrap.baseUrl !== "string"
    ) {
        return undefined;
    }
    try {
        return createThemePreferenceService(
            createServerPreferences(new ApiTransport(bootstrap.baseUrl)),
        );
    } catch {
        // A base URL the transport rejects, or an environment with no
        // `fetch`: the application still renders, in the default theme.
        return undefined;
    }
}

/**
 * The authenticated username this document's bootstrap carries, or `null` for
 * an anonymous session -- and, tolerantly, for a document with no bootstrap or
 * one whose shape this application does not recognise, the same tolerance
 * `createDefaultThemePreferenceService` applies to `baseUrl`.
 *
 * Read directly from `window.__NZBHYDRA_BOOTSTRAP__` rather than through
 * `getBootstrapData`/a hook: the seed the caller derives from this must be
 * read synchronously, inside a `useState` initializer, before any provider
 * -- including whatever would supply the parsed bootstrap -- has mounted.
 */
export function readBootstrapUsername(): string | null {
    const bootstrap: unknown = window.__NZBHYDRA_BOOTSTRAP__;
    if (
        typeof bootstrap !== "object" ||
        bootstrap === null ||
        !("username" in bootstrap)
    ) {
        return null;
    }
    const {username} = bootstrap as {username: unknown};
    return typeof username === "string" ? username : null;
}

/** The last preference this browser applied for `username`'s scope, validated the same way. */
export function readCachedThemePreference(
    username: string | null,
): ThemePreference | undefined {
    return parseThemePreference(readItem(themePreferenceCacheKey(username)));
}

/** Records `preference` as this browser's startup seed for `username`'s scope. */
export function writeCachedThemePreference(
    preference: ThemePreference,
    username: string | null,
): void {
    writeItem(themePreferenceCacheKey(username), preference);
}
