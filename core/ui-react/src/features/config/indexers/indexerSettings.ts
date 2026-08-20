import type {
    IndexerCapsCheckResult,
    IndexerValues,
} from "../../../api/config/indexers";
import type {
    ConfigFieldPath,
    SettingOption,
    SettingValidator,
} from "../components";

/**
 * `F-CONFIG-INDEXERS`' vocabulary-independent data and rules: legacy's ordering,
 * its per-search-module field sets, the state control's three disabled
 * meanings, the VIP-expiry warning, and the two rules that decide whether the
 * close sequence has to contact the indexer. Kept out of the components so the
 * parity comparison against `formly-indexers.js` is a comparison of data.
 */

/** The indexer list inside `C-CONFIG-FORM`'s whole-config form. */
export const INDEXERS_PATH: ConfigFieldPath = "indexers";

/**
 * The path the edit dialog's *draft* form binds to. Deliberately not
 * `indexers.<index>`: the draft lives in its own throwaway form (see
 * `IndexerDialog`), and reusing an index path would give the dialog's controls
 * the same `data-testid`s as the list row behind it. A new entry has no index
 * at all.
 */
export const INDEXER_DRAFT_PATH = "indexerDraft" as ConfigFieldPath;

/** `indexers.<index>.<field>` for a control in the list. */
export function indexerFieldPath(
    index: number,
    field: string,
): ConfigFieldPath {
    return `${INDEXERS_PATH}.${index}.${field}` as ConfigFieldPath;
}

/** `indexerDraft.<field>` for a control in the edit dialog. */
export function draftFieldPath(field: string): ConfigFieldPath {
    return `${INDEXER_DRAFT_PATH}.${field}` as ConfigFieldPath;
}

export function indexersOf(value: unknown): IndexerValues[] {
    return Array.isArray(value) ? (value as IndexerValues[]) : [];
}

export function asIndexer(entry: unknown): IndexerValues {
    return typeof entry === "object" && entry !== null
        ? (entry as IndexerValues)
        : {};
}

export function indexerText(value: unknown): string {
    return typeof value === "string" ? value : "";
}

export function indexerList(value: unknown): string[] {
    return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

/** The heading a row and the dialog show; legacy's `indexer-config-box.html`. */
export const UNNAMED_INDEXER = "Unnamed indexer";

export function indexerLegend(entry: IndexerValues): string {
    const name = indexerText(entry.name);
    return name === "" ? UNNAMED_INDEXER : name;
}

/**
 * `indexer-config.html:14`: `orderBy: ['-state', '-score', 'name']`. The two
 * descending keys are compared the way AngularJS' `defaultCompare` does —
 * lower-cased strings for `state` and `name`, numerically for `score` — so the
 * enum constants fall in the order the legacy list showed them: `ENABLED`,
 * `DISABLED_USER`, `DISABLED_SYSTEM_TEMPORARY`, `DISABLED_SYSTEM`.
 *
 * The result pairs each entry with the index it occupies in the configuration,
 * because that index — not the display position — is what every control in the
 * row binds to.
 */
export type OrderedIndexer = {entry: IndexerValues; index: number};

export function orderedIndexers(
    entries: readonly IndexerValues[],
): OrderedIndexer[] {
    return entries
        .map((entry, index) => ({entry, index}))
        .sort((left, right) => {
            const byState = compareText(
                indexerText(right.entry.state),
                indexerText(left.entry.state),
            );
            if (byState !== 0) {
                return byState;
            }
            const byScore = scoreOf(right.entry) - scoreOf(left.entry);
            if (byScore !== 0) {
                return byScore;
            }
            return compareText(
                indexerText(left.entry.name),
                indexerText(right.entry.name),
            );
        });
}

function compareText(left: string, right: string): number {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    return a === b ? 0 : a < b ? -1 : 1;
}

function scoreOf(entry: IndexerValues): number {
    return typeof entry.score === "number" ? entry.score : 0;
}

/**
 * `indexer-state-switch.js`: the switch reads "Enabled" while the indexer is
 * enabled and otherwise carries the *reason* it is off, which is what makes the
 * three disabled states distinguishable at a glance in the list.
 */
export const INDEXER_STATE_LABELS: Readonly<Record<string, string>> = {
    ENABLED: "Enabled",
    DISABLED_USER: "Disabled by user",
    DISABLED_SYSTEM_TEMPORARY: "Temporary disabled",
    DISABLED_SYSTEM: "Disabled by system",
};

export function indexerStateLabel(state: unknown): string {
    const value = indexerText(state);
    return INDEXER_STATE_LABELS[value] ?? INDEXER_STATE_LABELS.ENABLED;
}

/** Turning the switch off is always the *user* disabling it (`onChange`). */
export function toggledIndexerState(enabled: boolean): string {
    return enabled ? "ENABLED" : "DISABLED_USER";
}

export function isIndexerEnabled(state: unknown): boolean {
    return indexerText(state) === "ENABLED";
}

/** `getIndexerBoxFields`' `stateHelp` (`formly-indexers.js:79-86`). */
export function indexerStateHelp(state: unknown): string | undefined {
    const value = indexerText(state);
    if (value === "DISABLED_SYSTEM_TEMPORARY") {
        return "The indexer was disabled by the program due to an error. It will be reenabled automatically or you can enable it manually";
    }
    if (value === "DISABLED_SYSTEM") {
        return "The indexer was disabled by the program due to error from which it cannot recover by itself. Try checking the caps to make sure it works or just enable it and see what happens.";
    }
    return undefined;
}

/**
 * `indexer-input.js:22-40`: an expired VIP subscription, or one expiring within
 * a week, is called out next to the indexer. `Lifetime` and an unparsable date
 * never warn.
 */
export function vipExpiryWarning(
    entry: IndexerValues,
    now: Date = new Date(),
): string | undefined {
    const raw = indexerText(entry.vipExpirationDate);
    if (raw === "" || raw === "Lifetime") {
        return undefined;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) {
        return undefined;
    }
    const expiry = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
    );
    if (Number.isNaN(expiry.getTime())) {
        return undefined;
    }
    if (expiry.getTime() < now.getTime()) {
        return `VIP access expired on ${raw}`;
    }
    const week = new Date(expiry.getTime());
    week.setDate(week.getDate() - 7);
    return week.getTime() < now.getTime()
        ? `VIP access will expire on ${raw}`
        : undefined;
}

/**
 * The fields whose change makes legacy re-run the connection check before
 * closing the box — the `watcher` listeners that set `needsConnectionTest`
 * (`formly-indexers.js:145-224`). WTFNZB's password deliberately has none.
 * A brand-new entry is always checked (`IndexerCheckBeforeCloseService`'s
 * `isInitial`).
 */
export const CONNECTION_FIELDS = [
    "host",
    "apiKey",
    "apiPath",
    "username",
] as const;

export function connectionSettingsChanged(
    initial: IndexerValues,
    current: IndexerValues,
): boolean {
    return CONNECTION_FIELDS.some((field) => initial[field] !== current[field]);
}

/**
 * `checkCapsWhenClosing` (`formly-indexers.js:1395-1430`): the capability check
 * runs exactly when the entry does not yet know what it supports. A preset that
 * declares empty lists — Binsearch, NZBIndex, Torbox — is *not* checked, and
 * that difference is the whole reason `baseIndexerDraft` leaves both keys out.
 */
export function needsCapsCheck(entry: IndexerValues): boolean {
    return (
        entry.supportedSearchIds === undefined ||
        entry.supportedSearchTypes === undefined
    );
}

/**
 * `updateIndexerModel` (`formly-config.js:389-399`): the fields a completed
 * capability check writes back onto the entry being edited.
 *
 * Only these nine are copied — never the server's whole `IndexerConfig`, even
 * though legacy's *close* path resolves with it. `IndexerChecker
 * .resolveUnchangedSensitiveFields` replaces a posted `***UNCHANGED***` marker
 * with the stored credential before running the check, so the returned config
 * carries the real API key and password; copying it wholesale would pull those
 * secrets into the browser's form and break `C-SECRET-INPUT`'s invariant that
 * the marker survives untouched until the admin edits the field.
 */
export const CAPS_RESULT_FIELDS = [
    "supportedSearchIds",
    "supportedSearchTypes",
    "categoryMapping",
    "configComplete",
    "allCapsChecked",
    "hitLimit",
    "downloadLimit",
    "state",
    "backend",
] as const;

export function applyCapsCheckResult(
    entry: IndexerValues,
    checked: IndexerValues,
): IndexerValues {
    const next: IndexerValues = {...entry};
    for (const field of CAPS_RESULT_FIELDS) {
        if (Object.hasOwn(checked, field)) {
            next[field] = checked[field];
        }
    }
    return next;
}

/** What a bulk recheck changed; `matched` is 0 when nothing was merged. */
export type CapsCheckMerge = {
    entries: IndexerValues[];
    matched: number;
};

/**
 * `recheckAllCaps` (`formly-config.js:627-645`): a bulk capability check's
 * results folded back into the list *entry by entry, keyed by name*.
 *
 * This is the destructive-looking operation that must not be destructive. The
 * server answers with complete `IndexerConfig`s, but replacing an entry with
 * one of them would silently revert every unsaved edit the admin has made to
 * that indexer — and would pull the credentials the server resolved from the
 * `***UNCHANGED***` markers into the form. So each matching entry keeps its own
 * object and only `applyCapsCheckResult`'s nine capability fields are written
 * over it; an entry no result names is returned untouched, by identity.
 *
 * Matching needs a real name on both sides: an entry that has none cannot be
 * addressed by a result and must never soak up the first nameless one.
 */
export function mergeCapsCheckResults(
    entries: readonly IndexerValues[],
    results: readonly IndexerCapsCheckResult[],
): CapsCheckMerge {
    let matched = 0;
    const merged = entries.map((entry) => {
        const name = indexerText(entry.name);
        if (name === "") {
            return entry;
        }
        const result = results.find(
            (candidate) => indexerText(candidate.indexerConfig.name) === name,
        );
        if (result === undefined) {
            return entry;
        }
        matched += 1;
        return applyCapsCheckResult(entry, result.indexerConfig);
    });
    return {entries: merged, matched};
}

/**
 * The entry as it is left when the capability check could not be run at all
 * (`checkCapsWhenClosing`'s rejection branch): the capabilities go back to
 * unknown, so the next Submit checks again. Legacy still commits the entry —
 * it is simply flagged incomplete and unusable until a check succeeds.
 */
export function withUnknownCapabilities(entry: IndexerValues): IndexerValues {
    const next: IndexerValues = {...entry};
    delete next.supportedSearchIds;
    delete next.supportedSearchTypes;
    return next;
}

/** `formly-indexers.js:575-583`. */
export const SEARCH_ID_OPTIONS: readonly SettingOption[] = [
    {label: "IMDB (TV)", value: "TVIMDB"},
    {label: "TVDB", value: "TVDB"},
    {label: "TVRage", value: "TVRAGE"},
    {label: "Trakt", value: "TRAKT"},
    {label: "TVMaze", value: "TVMAZE"},
    {label: "IMDB", value: "IMDB"},
    {label: "TMDB", value: "TMDB"},
];

/** `formly-indexers.js:595-601`. */
export const SEARCH_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "Audio", value: "AUDIO"},
    {label: "Ebooks", value: "BOOK"},
    {label: "Movies", value: "MOVIE"},
    {label: "Search", value: "SEARCH"},
    {label: "TV", value: "TVSEARCH"},
];

/** `formly-indexers.js:489-495`. */
export const SEARCH_SOURCE_OPTIONS: readonly SettingOption[] = [
    {label: "Internal searches only", value: "INTERNAL"},
    {label: "API searches only", value: "API"},
    {label: "All but API update queries ", value: "ALL_BUT_RSS"},
    {label: "Only API update queries ", value: "ONLY_RSS"},
    {label: "Internal and any API searches", value: "BOTH"},
];

/**
 * `CategoriesService.getWithoutAll()` (`categories-service.js:28-31`): every
 * configured category except the first, which is the "all" catch-all. Read from
 * the *form's* categories rather than the saved ones, so a category added on
 * the Categories tab is selectable here before the config is saved.
 */
export function indexerCategoryOptions(categories: unknown): SettingOption[] {
    return (Array.isArray(categories) ? categories.slice(1) : [])
        .map((category) => indexerText(asIndexer(category).name))
        .filter((name) => name !== "")
        .map((name) => ({label: name, value: name}));
}

/**
 * `getGroupNameSuggestions` (`formly-indexers.js:26-46`): the group names the
 * *other* indexers use, without the ones this entry already carries, unique and
 * sorted case-insensitively.
 */
export function groupNameSuggestions(
    entries: readonly IndexerValues[],
    editedIndex: number | null,
    currentGroups: readonly string[],
): string[] {
    const suggestions = new Set<string>();
    entries.forEach((entry, index) => {
        if (index === editedIndex) {
            return;
        }
        for (const group of indexerList(entry.groupNames)) {
            if (group !== "" && !currentGroups.includes(group)) {
                suggestions.add(group);
            }
        }
    });
    return [...suggestions].sort((left, right) => compareText(left, right));
}

/**
 * Legacy's `uniqueName` validator (`formly-indexers.js:99-107`), applied the way
 * `F-CONFIG-DOWNLOADING` applies its own: against the *other* entries.
 *
 * Legacy's expression short-circuits for an existing indexer — it compares the
 * typed value against the model it is bound to, which two-way binding has
 * already updated — so renaming one indexer onto another's name was never
 * rejected there. Checking the other entries is what the validator was written
 * to do and what the backend's own uniqueness expectations need.
 */
export function uniqueIndexerNameValidator(
    otherNames: readonly string[],
): SettingValidator {
    return (value) => {
        const name = indexerText(value);
        return otherNames.includes(name)
            ? `Indexer "${name}" already exists`
            : true;
    };
}

/** `formly-indexers.js:108-118`. */
export const noCommaValidator: SettingValidator = (value) =>
    indexerText(value).includes(",") ? "Name may not contain a comma" : true;

/** `formly-indexers.js:538-540`, `regexValidator(..., prefixViewValue)`. */
export const vipExpirationValidator: SettingValidator = (value) => {
    const text = indexerText(value);
    if (text === "") {
        return true;
    }
    return /^(\d{4}-\d{2}-\d{2})|Lifetime$/.test(text)
        ? true
        : `${text} is no valid date (must be 'YYYY-MM-DD' or 'Lifetime')`;
};

/** `formly-indexers.js:316-324`, shared by the hit and download limits. */
export const greaterThanZeroValidator: SettingValidator = (value) =>
    typeof value === "number" && value <= 0
        ? "Value must be greater than 0"
        : true;

/** `formly-indexers.js:376-384`. */
export const greaterThanOneValidator: SettingValidator = (value) =>
    typeof value === "number" && value <= 1
        ? "Value must be greater than 1"
        : true;

/**
 * `formly-indexers.js:356-364`, with one deliberate correction: legacy's
 * expression is `value >= 0 && value <= 23` with no empty guard, so an *empty*
 * field is invalid — even though the field's own help text says "Leave empty
 * for a rolling reset counter". An empty value is accepted here; a filled one
 * still has to be an hour of the day.
 */
export const hourOfDayValidator: SettingValidator = (value) => {
    if (value === null || value === undefined || value === "") {
        return true;
    }
    return typeof value === "number" && value >= 0 && value <= 23
        ? true
        : `${String(value)} is not a valid hour of day (0-23)`;
};

/**
 * The editable fields of an indexer, in legacy's order (`getIndexerBoxFields`).
 * `IMPORT_CONFIG` — the marker type the Jackett/Prowlarr import dialogs use —
 * is not modeled here; it is FM-067's.
 */
export type IndexerField =
    | "apiKey"
    | "apiPath"
    | "attributeWhitelist"
    | "attributeWhitelistCategories"
    | "binsearchOtherGroups"
    | "color"
    | "customParameters"
    | "downloadLimit"
    | "enabledCategories"
    | "enabledForSearchSource"
    | "generalMinSize"
    | "groupNames"
    | "hitLimit"
    | "hitLimitResetTime"
    | "host"
    | "loadLimitOnRandom"
    | "minSeeders"
    | "name"
    | "password"
    | "preselect"
    | "schedule"
    | "score"
    | "state"
    | "supportedSearchIds"
    | "supportedSearchTypes"
    | "timeout"
    | "userAgent"
    | "username"
    | "vipExpirationDate";

const NEWZNAB_OR_TORZNAB = ["NEWZNAB", "TORZNAB"];

export function visibleIndexerFields(
    searchModuleType: unknown,
): readonly IndexerField[] {
    const type = indexerText(searchModuleType);
    const newznabLike = NEWZNAB_OR_TORZNAB.includes(type);
    const fields: IndexerField[] = [];
    if (newznabLike) {
        fields.push("name");
    }
    fields.push("state");
    if (["WTFNZB", ...NEWZNAB_OR_TORZNAB].includes(type)) {
        fields.push("host");
    }
    if (
        ["WTFNZB", "NZBINDEX_API", "TORBOX", ...NEWZNAB_OR_TORZNAB].includes(
            type,
        )
    ) {
        fields.push("apiKey");
    }
    if (newznabLike) {
        fields.push("apiPath", "username");
    }
    if (type === "WTFNZB") {
        fields.push("username", "password");
    }
    if (type !== "TORBOX") {
        fields.push("score", "timeout");
    }
    fields.push("schedule");
    if (newznabLike) {
        fields.push(
            "hitLimit",
            "downloadLimit",
            "hitLimitResetTime",
            "loadLimitOnRandom",
        );
    }
    if (type === "TORZNAB") {
        fields.push("minSeeders");
    }
    if (["WTFNZB", ...NEWZNAB_OR_TORZNAB].includes(type)) {
        fields.push("userAgent");
    }
    if (newznabLike) {
        fields.push(
            "customParameters",
            "attributeWhitelist",
            "attributeWhitelistCategories",
        );
    }
    fields.push("preselect");
    if (type !== "TORBOX") {
        fields.push("enabledForSearchSource");
    }
    fields.push("color", "groupNames", "vipExpirationDate");
    if (type !== "ANIZB") {
        fields.push("enabledCategories");
    }
    if (newznabLike) {
        fields.push("supportedSearchIds", "supportedSearchTypes");
    }
    if (type === "NZBINDEX") {
        fields.push("generalMinSize");
    }
    if (type === "BINSEARCH") {
        fields.push("binsearchOtherGroups");
    }
    return fields;
}

/**
 * Whether the type-specific parts that only exist for a *known* newznab or
 * torznab indexer apply: the two capability multiselects, the manual capability
 * check, and the incomplete banners are all gated on
 * `['NEWZNAB','TORZNAB'].includes(type) && !isInitial`
 * (`formly-indexers.js:58`, `:568`).
 */
export function showsCapabilityControls(
    searchModuleType: unknown,
    isNew: boolean,
): boolean {
    return !isNew && NEWZNAB_OR_TORZNAB.includes(indexerText(searchModuleType));
}

/** `formly-indexers.js:59-67`: which of the two banners the entry warrants. */
export type IndexerCompletenessBanner = "incomplete-caps" | "incomplete-config";

export function completenessBanner(
    entry: IndexerValues,
): IndexerCompletenessBanner | undefined {
    if (entry.configComplete !== true) {
        return "incomplete-config";
    }
    return entry.allCapsChecked === true ? undefined : "incomplete-caps";
}

export const INCOMPLETE_CONFIG_MESSAGE =
    "The config of this indexer is incomplete. Please click the button at the bottom to check its capabilities and complete its configuration.";

export const INCOMPLETE_CAPS_MESSAGE =
    "The capabilities of this indexer were not checked completely. Some actually supported search types or IDs may not be usable.";

export const TORZNAB_NOTE =
    "Torznab indexers can only be used for internal searches or dedicated searches using /torznab/api";
