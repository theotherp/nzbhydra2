import {
    settingsIndexTab,
    SETTINGS_INDEX,
    type SettingsIndexEntry,
} from "./settingsIndex";

/**
 * `C-CONFIG-SETTINGS-INDEX`'s query side: how a typed query picks entries out
 * of the index and how the picked entries are grouped in the listbox.
 *
 * Deliberately not clever. FM-099 scopes matching to a case-insensitive
 * substring over label and help text; there is no fuzzy matching, no scoring
 * and no ranking, because a config setting is looked up by a word the admin
 * already knows is in its name or its explanation.
 */

/** Case-insensitive substring over label and help text. */
export function settingMatchesQuery(
    entry: SettingsIndexEntry,
    query: string,
): boolean {
    const needle = query.trim().toLowerCase();
    if (needle === "") {
        return true;
    }
    return (
        entry.label.toLowerCase().includes(needle) ||
        entry.helpText.toLowerCase().includes(needle)
    );
}

/**
 * The entries a query selects, in index order — which is tab order and, within
 * a tab, the order the tab renders its rows. Keeping index order is what lets
 * `Autocomplete`'s `groupBy` emit one header per tab instead of repeating a
 * header every time the group changes.
 */
export function searchSettings(
    query: string,
    index: readonly SettingsIndexEntry[] = SETTINGS_INDEX,
): SettingsIndexEntry[] {
    return index.filter((entry) => settingMatchesQuery(entry, query));
}

/** The listbox group header an entry belongs under: its tab's display name. */
export function settingsSearchGroup(entry: SettingsIndexEntry): string {
    return settingsIndexTab(entry).label;
}

/**
 * The secondary line of an option: the fieldset it lives in, or the tab's own
 * name for the handful of rows a tab renders outside any fieldset (the three
 * catalogue-wide settings on Categories).
 */
export function settingsSearchOptionDetail(entry: SettingsIndexEntry): string {
    return entry.fieldset ?? settingsIndexTab(entry).label;
}
