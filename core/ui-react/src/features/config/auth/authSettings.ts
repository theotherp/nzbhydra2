import {
    UNCHANGED_SECRET_MARKER,
    type ConfigFieldPath,
    type SettingOption,
} from "../components";

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

/**
 * A Users row's field path, e.g. `auth.users.0.username`.
 *
 * FM-105's table binds no control to a row, so nothing in the tab calls this
 * any more; it is kept as the documented shape of a user's path (and as the
 * cast `categoriesSettings.ts` points at for the same ADR-0003 reason) rather
 * than deleted from under that reference. Removing it and re-pointing that
 * comment is a follow-up, not this task's file set.
 */
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

/** The users array inside `C-CONFIG-FORM`'s whole-config form. */
export const USERS_PATH: ConfigFieldPath = "auth.users";

/**
 * The path `UserDialog`'s *draft* form binds to. Deliberately not
 * `auth.users.<index>`: the draft lives in the dialog's own throwaway form, and
 * reusing an index path would give its controls the same `data-testid`s as the
 * table row that opened it. Nothing ever saves this form -- it exists only so
 * the `C-CONFIG-FIELDS` controls, which bind to whichever form is nearest, have
 * somewhere to write while the transaction is open.
 */
export const USER_DRAFT_PATH = "auth.userDraft";

/** `auth.userDraft.<field>` for a control in the edit dialog. */
export function userDraftFieldPath(
    field: keyof UserAuthConfigValues,
): ConfigFieldPath {
    return `${USER_DRAFT_PATH}.${field}` as ConfigFieldPath;
}

/** Legacy's `altLegendText` for a user that has no username yet. */
const AUTHLESS_LEGEND = "Authless";

/**
 * The users array as the form holds it. `auth` is an unmodeled loose object
 * (ADR-0003), so what arrives is `unknown`; anything that is not a list of
 * records is read as "no users" rather than crashing the tab.
 */
export function usersOf(value: unknown): UserAuthConfigValues[] {
    return Array.isArray(value)
        ? (value.filter(
              (entry) => typeof entry === "object" && entry !== null,
          ) as UserAuthConfigValues[])
        : [];
}

/** The row heading legacy shows: the username, or `Authless` for a blank one. */
export function userLegend(entry: UserAuthConfigValues): string {
    const username = entry.username;
    return typeof username === "string" && username.length > 0
        ? username
        : AUTHLESS_LEGEND;
}

/** One rights chip: a stable key for its `data-testid`, and the text shown. */
export type UserRight = {key: string; label: string};

/**
 * The three individual rights, in the order `UserEntryFields` lists their
 * switches. `maySeeAdmin` is not here because it is not one of several: it
 * implies all of them and is shown alone (see `userRights`).
 */
const USER_RIGHT_FIELDS: readonly (UserRight & {
    field: keyof UserAuthConfigValues;
})[] = [
    {field: "maySeeStats", key: "maySeeStats", label: "Stats"},
    {
        field: "maySeeDetailsDl",
        key: "maySeeDetailsDl",
        label: "Details & DL",
    },
    {
        field: "showIndexerSelection",
        key: "showIndexerSelection",
        label: "Indexer selection",
    },
];

const ADMIN_RIGHT: UserRight = {key: "maySeeAdmin", label: "Admin"};
const NO_RIGHTS: UserRight = {key: "none", label: "No rights"};

/**
 * What a user is allowed to do, as chip labels.
 *
 * `maySeeAdmin` wins outright and is shown alone, mirroring the editor's own
 * implies-all hiding (`AuthUsersSection`'s `maySeeAdmin ? null : ...`): the
 * three dependent switches are not even editable while it is on, so listing
 * whatever they happen to hold underneath would describe a state the admin
 * cannot see or change. A user with nothing granted gets an explicit
 * `No rights` rather than an empty cell, so "no rights" and "not rendered" are
 * never the same picture.
 *
 * Every right is carried by its *label*. Nothing here returns a colour, which
 * is what keeps the column readable without one.
 */
export function userRights(entry: UserAuthConfigValues): readonly UserRight[] {
    if (entry.maySeeAdmin === true) {
        return [ADMIN_RIGHT];
    }
    const granted = USER_RIGHT_FIELDS.filter(
        ({field}) => entry[field] === true,
    ).map(({key, label}) => ({key, label}));
    return granted.length === 0 ? [NO_RIGHTS] : granted;
}

/**
 * What the Password column may say. Four states, no value: `stored` is the
 * server's `***UNCHANGED***` marker (a hash exists and was withheld), `unsaved`
 * is a password typed in the dialog that no save has hashed yet, `missing` is
 * an entry that would fail validation, and `unused` is the OIDC branch, where
 * the dialog shows no password field at all because the provider authenticates.
 */
export type UserPasswordState = "missing" | "stored" | "unsaved" | "unused";

export const USER_PASSWORD_STATE_LABELS: Record<UserPasswordState, string> = {
    missing: "Not set",
    stored: "Set",
    unsaved: "Set (unsaved)",
    unused: "Not used",
};

/**
 * The Password column's content for one entry.
 *
 * It answers *whether* a password exists, never what it is, and it is the only
 * thing about a password this table is ever given: the row renders
 * `USER_PASSWORD_STATE_LABELS[state]`, so no code path can put a stored hash,
 * a typed password, or even the marker itself into the table's DOM.
 */
export function userPasswordState(
    entry: UserAuthConfigValues,
    authType: unknown,
): UserPasswordState {
    if (authType === "OIDC") {
        return "unused";
    }
    const password = entry.password;
    if (password === UNCHANGED_SECRET_MARKER) {
        return "stored";
    }
    return typeof password === "string" && password.length > 0
        ? "unsaved"
        : "missing";
}
