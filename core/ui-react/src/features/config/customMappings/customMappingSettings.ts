import type {CustomMappingValues} from "../../../api/config/customMappingTest";
import type {ConfigFieldPath, SettingOption} from "../components";

/**
 * The Custom Mappings tab's vocabulary — option lists, legends, help prose and
 * the path helpers for `searching.customMappings`, transcribed from
 * `config-fields-service.js:1309-1391` and `custom-mapping-help.html`.
 *
 * FM-195 lifted these out of `searching/searchingSettings.ts` together with the
 * section and the dialog they belong to. The *configuration* path did not move
 * with them: mappings are still stored under `searching.customMappings`
 * (ADR-0003 writes the whole file back), and this is only where the UI that
 * edits them lives.
 */

/** `config-fields-service.js:1317`, the tab's own headline. */
export const CUSTOM_MAPPINGS_HEADLINE =
    "Custom mappings of queries, search titles and result titles";

/** `config-fields-service.js:1314`, the headline's explanation. */
export const CUSTOM_MAPPINGS_TOOLTIP =
    "Here you can define mappings to modify either queries or titles for search requests or to dynamically change the titles of found results. The former allows you, for example,  to change requests made by external tools, the latter to clean up results by indexers in a more advanced way.";

/**
 * FM-194 made the list ordered and stoppable: the backend applies every
 * relevant mapping top to bottom and stops after the first applied mapping
 * that matches the whole string. That is the one rule an admin has to know to
 * read the list, so it is stated under it.
 */
export const CUSTOM_MAPPINGS_ORDER_HELP =
    "Mappings run top to bottom. A whole-string mapping that matches stops the list.";

/** `AffectedValue` (`config-fields-service.js:1325-1329`). */
export const AFFECTED_VALUE_OPTIONS: readonly SettingOption[] = [
    {label: "Query", value: "QUERY"},
    {label: "Search title", value: "TITLE"},
    {label: "Result title", value: "RESULT_TITLE"},
];

/** `SearchType` as the mapping editor offers it (`config-fields-service.js:1340-1346`). */
export const MAPPING_SEARCH_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "General", value: "SEARCH"},
    {label: "Audio", value: "MUSIC"},
    {label: "EBook", value: "BOOK"},
    {label: "Movie", value: "MOVIE"},
    {label: "TV", value: "TVSEARCH"},
];

/** The config path of the custom-mapping array. Unchanged by FM-195's move. */
export const CUSTOM_MAPPINGS_PATH =
    "searching.customMappings" as ConfigFieldPath;

/**
 * The `data-testid` stem every custom-mapping selector is built from. Derived
 * from the *config* path, not from the tab's URL segment, which is why it is
 * still `searching-customMappings` after the move: `settingsIndex.ts` builds
 * this section's search anchor from the same path, and every existing selector
 * in the suite names it.
 */
export const CUSTOM_MAPPINGS_TEST_ID = "searching-customMappings";

/**
 * A new mapping's starting value — legacy's `defaultModel`
 * (`config-fields-service.js:1383-1389`), including `matchAll: true`, which is
 * *not* the Java default (`CustomQueryAndTitleMapping.matchAll` is a plain
 * `boolean`); legacy deliberately starts a new mapping as a whole-string match.
 * `enabled` starts true, as the Java field's own initializer does.
 */
export function newCustomMapping(): CustomMappingValues {
    return {
        affectedValue: null,
        enabled: true,
        examples: [],
        from: null,
        matchAll: true,
        name: null,
        searchType: null,
        to: null,
    };
}

/**
 * Reads one stored entry into the dialog's editable shape. Entries come from a
 * loose config object (ADR-0003), so nothing about them is guaranteed; an
 * unusable field becomes the empty value the editor shows rather than throwing.
 *
 * `enabled` is true when absent, which is what FM-194's `enabled = true` field
 * initializer means for a configuration written before that field existed.
 */
export function customMappingValues(entry: unknown): CustomMappingValues {
    const record = (
        typeof entry === "object" && entry !== null ? entry : {}
    ) as Record<string, unknown>;
    return {
        affectedValue: optionalText(record.affectedValue),
        enabled: record.enabled !== false,
        examples: Array.isArray(record.examples)
            ? record.examples.filter(
                  (example): example is string => typeof example === "string",
              )
            : [],
        from: optionalText(record.from),
        matchAll: record.matchAll === true,
        name: optionalText(record.name),
        searchType: optionalText(record.searchType),
        to: optionalText(record.to),
    };
}

/**
 * How a mapping is named wherever one has to be referred to — an entry's
 * legend and the "applied" column of the test table. `config-fields-service.js
 * :1316`'s bare "Mapping" plus the position, unless the admin named it.
 */
export function customMappingLegend(
    name: string | null,
    index: number,
): string {
    return name === null || name.trim() === "" ? `Mapping ${index + 1}` : name;
}

function optionalText(value: unknown): string | null {
    return typeof value === "string" && value !== "" ? value : null;
}

/** The label an option list gives a stored value, or the raw value. */
export function optionLabel(
    options: readonly SettingOption[],
    value: unknown,
): string {
    const text = typeof value === "string" ? value : "";
    return options.find((option) => option.value === text)?.label ?? text;
}

/**
 * Legacy's modal help (`custom-mapping-help.html`), as prose. "The input must
 * completely match ..." describes `matchAll`; the class name that leaks into
 * the first and last bullet is legacy's own wording and is kept verbatim so the
 * two UIs read identically during the parity comparison (see the handoff's
 * follow-up work).
 */
export const CUSTOM_MAPPING_HELP: readonly string[] = [
    "The input must completely match the title or query for the customQueryAndTitleMapping to be effective. The matching is case insensitive.",
    'You may use regular expressions anywhere (e.g. [a-z] or .*). You may use named groups to reference them in the output pattern (e.g. {title:.*} can be referenced using {title}) but they must not start with digits. Brackets ("{}") may not be used in regexes.',
    "The following meta groups are available: {season:0}, {season:00}, {episode:0}, {episode:00} (with and without leading zeroes, respectively). The data will be taken from the search request's or title's metadata. If it's not available the customQueryAndTitleMapping will not be used.",
];

/** `formly-config.js:363`, shown when Test is used with no example lines. */
export const EMPTY_EXAMPLE_INPUT_RESULT = "Empty example data";

/**
 * Shown when Test is used with no input pattern. Legacy has no such branch and
 * sends the request anyway. FM-194 made the endpoint answer a per-line `error`
 * for a null pattern rather than HTTP 500, so this guard is no longer there to
 * avoid a crash — it is there because "null" is not a useful answer to give an
 * admin who has only just opened a blank dialog.
 */
export const EMPTY_INPUT_PATTERN_RESULT = "Empty input pattern";

/** What the "this mapping" column says when the mapping does not apply. */
export const NO_MATCH_RESULT = "No match";

/**
 * The "this mapping" column for a response that carried no `thisMapping` at
 * all. The dialog always sends a valid `mappingIndex`, so the server has no
 * reason to omit it (`CustomQueryAndTitleMappingHandler.testMapping` answers
 * `null` only for an index outside the list) — this is what is shown if it
 * does anyway, rather than an empty cell that reads as "no match".
 */
export const NO_SINGLE_ANSWER_RESULT = "Not evaluated";

/** The "applied" column when the whole list left the line alone. */
export const NO_MAPPING_APPLIED = "None";

/** Shown when the request itself failed (legacy's error callback). */
export const REQUEST_FAILED_RESULT = "Unable to test the mapping";
