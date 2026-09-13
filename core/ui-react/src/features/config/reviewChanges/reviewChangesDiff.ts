import {UNCHANGED_SECRET_MARKER} from "../components";
import {configTabForSectionKey, countDirtyFields} from "../configFormState";
import {CONFIG_TABS} from "../configTabs";
import {
    settingsIndexTab,
    SETTINGS_INDEX,
    type SettingsIndexEntry,
} from "../settingsSearch/settingsIndex";

/**
 * `F-CONFIG-SHELL`'s review-before-save diff: what the sticky bar's "N settings
 * changed" summary actually means, as values.
 *
 * Saving rewrites the whole configuration file and can trigger a restart, so
 * the one thing this module must never do is misreport a value. Three
 * consequences shape everything below:
 *
 * - the "old" side is the form's *current* `defaultValues`, never the initial
 *   fetch: `useConfigSave` calls `form.reset(saved)` after every successful
 *   save, which re-baselines the defaults to the server's own view;
 * - a path React Hook Form flags dirty is not necessarily a change — typing
 *   into a field and typing the original value back leaves the flag on — so
 *   every row is confirmed by comparing values, and value-equal rows are
 *   dropped;
 * - a secret is never rendered, on either side (see `isHiddenSetting`).
 *
 * It reads no React state and touches no form: it is handed the dirty tree and
 * the two value trees and returns rows.
 */

/** What happened to a row, when that is not expressible as `old -> new`. */
type ReviewChangeStatus =
    /** An array-section entry present now and absent before. */
    | "added"
    /** A secret whose value cannot be shown on either side. */
    | "changed"
    /** An array-section entry present in both, differing somewhere inside. */
    | "edited"
    /** An array-section entry present before and absent now. */
    | "removed";

export type ReviewChange = {
    /**
     * Stable dotted identity: the config path for a setting row, the section
     * path plus the entry's key (or its position) for an array-entry row. Only
     * ever used to build a test id and a React key.
     */
    id: string;
    /** `"setting"` rows carry values; `"entry"` rows carry a status instead. */
    kind: "entry" | "setting";
    /** The setting's indexed label, or `"Section: legend"` for an entry row. */
    label: string;
    /** Rendered new value, or `null` for an array-entry row. */
    newText: string | null;
    /** Rendered old value, or `null` for an array-entry row. */
    oldText: string | null;
    /** `"Tab › Fieldset"`, or just the tab when the row belongs to no fieldset. */
    origin: string;
    status: ReviewChangeStatus | null;
};

/**
 * The row's `data-testid`. For a setting row this is exactly
 * `config-review-entry-${settingTestId(path)}`, so a selector for a review row
 * is predictable from the setting's own `config-setting-*` selector; an entry
 * row's key can hold anything an admin typed, so every non-alphanumeric run
 * collapses the same way a dot does.
 */
export function reviewChangeTestId(change: ReviewChange): string {
    return `config-review-entry-${change.id.replaceAll(/[^A-Za-z0-9]+/g, "-")}`;
}

/**
 * The paths edited as a list of entries rather than as fields — indexers,
 * downloaders, users, categories, notification entries, custom mappings and
 * external tools. Taken from `C-CONFIG-SETTINGS-INDEX`'s own `section` kind
 * rather than restated here, so a future list section is summarized as a list
 * the moment it is indexed, instead of exploding into one row per field.
 */
const ARRAY_SECTION_ENTRIES: ReadonlyMap<string, SettingsIndexEntry> = new Map(
    SETTINGS_INDEX.filter((entry) => entry.kind === "section").map((entry) => [
        entry.path,
        entry,
    ]),
);

const SETTING_ENTRIES: ReadonlyMap<string, SettingsIndexEntry> = new Map(
    SETTINGS_INDEX.filter((entry) => entry.kind === "row").map((entry) => [
        entry.path,
        entry,
    ]),
);

/**
 * Scalar settings rendered by a secret control whose value the backend does
 * *not* mask, so the marker test alone would not catch them
 * (`SecretInput`'s doc comment: `@HiddenInUI` covers the proxy credentials but
 * not `sslKeyStorePassword` or `oidcClientSecret`, which round-trip in clear).
 * Per-entry credentials inside a list section are covered by construction —
 * an entry row renders no values at all.
 */
const SECRET_SETTING_PATHS: ReadonlySet<string> = new Set([
    "auth.oidcClientSecret",
    "main.apiKey",
    "main.proxyPassword",
    "main.proxyUsername",
    "main.sslKeyStorePassword",
]);

/**
 * A second, deliberately over-eager net for a credential-shaped path a future
 * tab adds without anyone remembering this module. Its only failure mode is
 * hiding a value that could have been shown, which is the safe direction.
 */
const SECRET_SEGMENT = /password|secret|apikey|token|credential/i;

/** Whether a path names a secret setting, independently of its value. */
export function isSecretSettingPath(path: string): boolean {
    return (
        SECRET_SETTING_PATHS.has(path) ||
        path.split(".").some((segment) => SECRET_SEGMENT.test(segment))
    );
}

/**
 * Whether a row must render `(hidden)` instead of its values: either side
 * holding the server's `***UNCHANGED***` marker, or a path that is a secret
 * whatever it currently holds. The marker test is what catches a field the UI
 * never modelled as a secret but the backend masks anyway.
 */
export function isHiddenSetting(
    path: string,
    oldValue: unknown,
    newValue: unknown,
): boolean {
    return (
        oldValue === UNCHANGED_SECRET_MARKER ||
        newValue === UNCHANGED_SECRET_MARKER ||
        isSecretSettingPath(path)
    );
}

/** A configuration value as the panel shows it. */
export function reviewValueText(value: unknown): string {
    if (value === true) {
        return "on";
    }
    if (value === false) {
        return "off";
    }
    if (value === null || value === undefined || value === "") {
        return "(empty)";
    }
    if (Array.isArray(value)) {
        return value.length === 0
            ? "(empty)"
            : value.map((item) => reviewValueText(item)).join(", ");
    }
    if (typeof value === "object") {
        return JSON.stringify(value);
    }
    return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObjectList(value: unknown): boolean {
    return Array.isArray(value) && value.some((item) => isRecord(item));
}

/**
 * Structural equality over parsed JSON values. Written here rather than pulled
 * in as a dependency because the comparison is what decides whether a row is
 * shown at all: `undefined` and a missing key are the same absence (the config
 * round trip drops neither, but React Hook Form's defaults hold both shapes),
 * and key order is not a change.
 */
function isDeepEqual(left: unknown, right: unknown): boolean {
    if (left === right) {
        return true;
    }
    if (left === undefined || right === undefined) {
        return left === undefined && right === undefined;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right)) {
            return false;
        }
        return (
            left.length === right.length &&
            left.every((item, index) => isDeepEqual(item, right[index]))
        );
    }
    if (isRecord(left) && isRecord(right)) {
        const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
        return [...keys].every((key) => isDeepEqual(left[key], right[key]));
    }
    return false;
}

/** The display name of the tab a top-level config section belongs to. */
function sectionTabLabel(path: string): string | null {
    const tabPath = configTabForSectionKey(path.split(".")[0] ?? "");
    return CONFIG_TABS.find((tab) => tab.path === tabPath)?.label ?? null;
}

function originOf(entry: SettingsIndexEntry | undefined, path: string): string {
    if (entry === undefined) {
        // A path the index does not know: the section's own tab is still
        // derivable, and is more use than nothing next to a raw path.
        return sectionTabLabel(path) ?? "Other settings";
    }
    const tabLabel = settingsIndexTab(entry).label;
    return entry.fieldset === null
        ? tabLabel
        : `${tabLabel} › ${entry.fieldset}`;
}

function settingChange(
    path: string,
    oldValue: unknown,
    newValue: unknown,
): ReviewChange {
    const entry = SETTING_ENTRIES.get(path);
    const hidden = isHiddenSetting(path, oldValue, newValue);
    return {
        id: path,
        kind: "setting",
        label: entry?.label ?? path,
        newText: hidden ? "(hidden)" : reviewValueText(newValue),
        oldText: hidden ? "(hidden)" : reviewValueText(oldValue),
        origin: originOf(entry, path),
        status: hidden ? "changed" : null,
    };
}

/**
 * The identity `API-CONFIG-PUT` resolves an entry by: its `name`, or its
 * `username` for `auth.users`, which has no name field. `null` means this
 * entry carries neither, and the list must be compared positionally — which is
 * also the backend's own fallback: since FM-068, `findCorrespondingOldItem`
 * resolves by record identity first and only then falls back to position, and
 * only while the list length is unchanged, refusing the marker outright
 * otherwise. So the panel and the save agree about which stored record an
 * entry is.
 */
function entryKey(entry: unknown): string | null {
    if (!isRecord(entry)) {
        return null;
    }
    for (const field of ["name", "username"]) {
        const value = entry[field];
        if (typeof value === "string" && value.length > 0) {
            return value;
        }
    }
    return null;
}

/**
 * The keys of a list, or `null` when the list cannot be keyed — an entry with
 * no name (a freshly added row is blank until it is filled in) or a duplicate
 * name makes the whole list positional rather than silently pairing the wrong
 * two entries.
 */
function listKeys(entries: readonly unknown[]): string[] | null {
    const keys: string[] = [];
    for (const entry of entries) {
        const key = entryKey(entry);
        if (key === null || keys.includes(key)) {
            return null;
        }
        keys.push(key);
    }
    return keys;
}

function entryChange(
    sectionPath: string,
    section: SettingsIndexEntry | undefined,
    id: string,
    legend: string,
    status: ReviewChangeStatus,
): ReviewChange {
    const sectionLabel = section?.label ?? sectionPath;
    return {
        id: `${sectionPath}.${id}`,
        kind: "entry",
        label: `${sectionLabel}: ${legend}`,
        // An entry row never renders a value: a list entry is where the
        // per-indexer, per-downloader and per-user credentials live, and
        // "edited" is all an admin needs to decide whether to look.
        newText: null,
        oldText: null,
        origin: originOf(section, sectionPath),
        status,
    };
}

function collectListChanges(
    path: string,
    oldValue: unknown,
    newValue: unknown,
    out: ReviewChange[],
): void {
    const section = ARRAY_SECTION_ENTRIES.get(path);
    const oldList = Array.isArray(oldValue) ? oldValue : [];
    const newList = Array.isArray(newValue) ? newValue : [];
    const oldKeys = listKeys(oldList);
    const newKeys = listKeys(newList);

    if (oldKeys === null || newKeys === null) {
        const length = Math.max(oldList.length, newList.length);
        for (let index = 0; index < length; index += 1) {
            const before = oldList[index];
            const after = newList[index];
            const legend = `entry ${index + 1}`;
            if (before === undefined && after !== undefined) {
                out.push(
                    entryChange(path, section, String(index), legend, "added"),
                );
            } else if (before !== undefined && after === undefined) {
                out.push(
                    entryChange(
                        path,
                        section,
                        String(index),
                        legend,
                        "removed",
                    ),
                );
            } else if (!isDeepEqual(before, after)) {
                out.push(
                    entryChange(path, section, String(index), legend, "edited"),
                );
            }
        }
        return;
    }

    const newByKey = new Map(
        newKeys.map((key, index) => [key, newList[index]] as const),
    );
    oldKeys.forEach((key, index) => {
        if (!newByKey.has(key)) {
            out.push(entryChange(path, section, key, key, "removed"));
            return;
        }
        if (!isDeepEqual(oldList[index], newByKey.get(key))) {
            out.push(entryChange(path, section, key, key, "edited"));
        }
    });
    const oldKeySet = new Set(oldKeys);
    for (const key of newKeys) {
        if (!oldKeySet.has(key)) {
            out.push(entryChange(path, section, key, key, "added"));
        }
    }
}

function collect(
    path: string,
    dirty: unknown,
    oldValue: unknown,
    newValue: unknown,
    out: ReviewChange[],
): void {
    if (countDirtyFields(dirty) === 0) {
        return;
    }
    // The value's own shape decides how the row reads, not the dirty tree's:
    // a list of entries is summarized per entry however React Hook Form marked
    // it, and a list of plain values (a chips or multi-select field, which RHF
    // marks element by element) is one setting, not one row per element.
    if (isObjectList(oldValue) || isObjectList(newValue)) {
        collectListChanges(path, oldValue, newValue, out);
        return;
    }
    if (
        !Array.isArray(oldValue) &&
        !Array.isArray(newValue) &&
        isRecord(dirty) &&
        (isRecord(oldValue) || isRecord(newValue))
    ) {
        for (const key of Object.keys(dirty)) {
            collect(
                path === "" ? key : `${path}.${key}`,
                dirty[key],
                isRecord(oldValue) ? oldValue[key] : undefined,
                isRecord(newValue) ? newValue[key] : undefined,
                out,
            );
        }
        return;
    }
    if (isDeepEqual(oldValue, newValue)) {
        // Touched and reverted by hand: React Hook Form keeps the path in the
        // dirty tree, but there is nothing to review.
        return;
    }
    out.push(settingChange(path, oldValue, newValue));
}

/**
 * Every change the admin has made, as rows: one per changed setting, one per
 * changed entry of a list section. `previous` is the form's current
 * `defaultValues` and `current` its `getValues()`.
 */
export function computeConfigChanges({
    current,
    dirtyFields,
    previous,
}: {
    current: unknown;
    dirtyFields: unknown;
    previous: unknown;
}): ReviewChange[] {
    const changes: ReviewChange[] = [];
    if (!isRecord(dirtyFields)) {
        return changes;
    }
    collect("", dirtyFields, previous, current, changes);
    return changes;
}
