import type {ConfigFieldPath, SettingOption} from "../components";

/**
 * `F-CONFIG-AUTH`'s option lists, tooltips, and the Users repeat section's
 * per-entry value type, transcribed from `config-fields-service.js:2011-2375`.
 * Live beside the tab rather than in `C-CONFIG-FIELDS` because they are this
 * tab's vocabulary, not the shared one.
 */

export const AUTH_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "None", value: "NONE"},
    {label: "HTTP Basic auth", value: "BASIC"},
    {label: "Login form", value: "FORM"},
    {label: "OpenID Connect", value: "OIDC"},
];

export const AUTH_TYPE_TOOLTIP =
    'With auth type "None" all areas are unrestricted. ' +
    'With auth type "Form" the basic page is loaded and login is done via a form. ' +
    'With auth type "Basic" you login via basic HTTP authentication. With all areas restricted this is the most secure as nearly no data is loaded from the server before you auth. Logging out is not supported with basic auth. ' +
    'With auth type "OpenID Connect" users login through an external OIDC provider. The configured username claim must match a Hydra user (case insensitive).';

export const OIDC_TOOLTIP =
    "Use issuer discovery if your provider supports it. Otherwise configure all explicit provider endpoints. " +
    "The redirect URI registered at your provider must match the resolved Redirect URI below exactly. With the default value this is usually: <your Hydra URL>/login/oauth2/code/nzbhydra2. " +
    "The configured Username claim must match the username of an existing NZBHydra2 user (case insensitive). OIDC authenticates the user, but NZBHydra2 still uses the local user entry for permissions.";

export const RESTRICTIONS_TOOLTIP =
    "Select which areas/features can only be accessed by logged in users (i.e. are restricted). If you don't want to allow anonymous users to do anything just leave everything selected. " +
    "You can decide for every user if he is allowed to: view the search page at all; view the stats; access the admin area (config and control); view links for downloading NZBs and see their details; select which indexers are used for search.";

/** `UserAuthConfig.java`'s fields, as the shape a Users row edits. */
export type UserAuthConfigValues = {
    maySeeAdmin: boolean;
    maySeeDetailsDl: boolean;
    maySeeStats: boolean;
    password: string | null;
    showIndexerSelection: boolean;
    username: string | null;
};

/**
 * A newly added user's starting values (legacy's `defaultModel`,
 * `config-fields-service.js:2364-2372`). Legacy's `defaultModel` also sets a
 * `token: null` that has no counterpart on `UserAuthConfig.java` and is
 * dropped here rather than carried forward as dead JSON.
 */
export function defaultUser(): UserAuthConfigValues {
    return {
        maySeeAdmin: true,
        maySeeDetailsDl: true,
        maySeeStats: true,
        password: null,
        showIndexerSelection: true,
        username: null,
    };
}

/** A Users row's field path, e.g. `auth.users.0.username`. */
export function userFieldPath(
    index: number,
    field: keyof UserAuthConfigValues,
): ConfigFieldPath {
    // `ConfigFieldPath` is derived from `ConfigValues`, whose `auth` section is
    // an unmodeled loose object (ADR-0003) -- react-hook-form's `FieldPath`
    // therefore cannot enumerate a dynamic array index as a literal type. The
    // cast is narrow: `field` is still constrained to a real
    // `UserAuthConfigValues` key.
    return `auth.users.${index}.${field}` as ConfigFieldPath;
}
