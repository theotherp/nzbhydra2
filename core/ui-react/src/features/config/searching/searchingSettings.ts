import type {CustomMappingValues} from "../../../api/config/customMappingTest";
import {
    patternValidator,
    type ConfigFieldPath,
    type SettingOption,
    type SettingValidator,
} from "../components";

/**
 * `F-CONFIG-SEARCHING`'s option lists, long help and tooltip texts, and the
 * custom-mapping path helpers, transcribed from
 * `config-fields-service.js:737-1603`. Beside the tab rather than in
 * `C-CONFIG-FIELDS` because they are this tab's vocabulary, not the shared
 * one; the language list is large enough to live in `languages.ts`.
 *
 * Legacy writes several of these strings as HTML fragments and renders them
 * with `ng-bind-html` (`setting-wrapper.html`). `HelpContent` is text runs and
 * links (never markup), so a `<code>` span becomes the code text itself and an
 * `<a>` becomes a `HelpLink` that goes through `C-EXTERNAL-LINKS`.
 */

/**
 * `SearchSourceRestriction` as the media-ID / query-generation selects order
 * it (`config-fields-service.js:848-853`).
 */
export const SEARCH_SOURCE_OPTIONS: readonly SettingOption[] = [
    {label: "Internal searches", value: "INTERNAL"},
    {label: "API searches", value: "API"},
    {label: "All searches", value: "BOTH"},
    {label: "Never", value: "NONE"},
];

/**
 * The same four values in the order the word-filter select uses
 * (`config-fields-service.js:1142-1147`). Legacy gives this one select its own
 * order, so it stays a separate constant rather than a reuse of the list
 * above.
 */
export const APPLY_RESTRICTIONS_OPTIONS: readonly SettingOption[] = [
    {label: "All searches", value: "BOTH"},
    {label: "Internal searches", value: "INTERNAL"},
    {label: "API searches", value: "API"},
    {label: "Never", value: "NONE"},
];

/** `config-fields-service.js:1493-1506`, the built-in quick filters. */
export const PRESELECT_QUICK_FILTER_OPTIONS: readonly SettingOption[] = [
    {label: "CAM / TS", value: "source|camts"},
    {label: "TV", value: "source|tv"},
    {label: "WEB", value: "source|web"},
    {label: "DVD", value: "source|dvd"},
    {label: "Blu-Ray", value: "source|bluray"},
    {label: "480p", value: "quality|q480p"},
    {label: "720p", value: "quality|q720p"},
    {label: "1080p", value: "quality|q1080p"},
    {label: "2160p", value: "quality|q2160p"},
    {label: "3D", value: "other|q3d"},
    {label: "x265", value: "other|qx265"},
    {label: "HEVC", value: "other|qhevc"},
];

/**
 * Legacy's `optionsFunction` (`config-fields-service.js:1507-1515`) appends one
 * option per configured custom quick filter, taking the display name from the
 * `DisplayName=Required1,Required2` entry. Reproduced here so a custom filter
 * that is already saved can be preselected; the tooltip still tells the admin
 * to save before selecting one they have only just typed, because
 * `SearchingConfigValidator.prepareForSaving` drops a preselection whose
 * custom filter does not exist in the *saved* config.
 */
export function preselectQuickFilterOptions(
    customQuickFilterButtons: unknown,
): readonly SettingOption[] {
    if (!Array.isArray(customQuickFilterButtons)) {
        return PRESELECT_QUICK_FILTER_OPTIONS;
    }
    const custom = customQuickFilterButtons
        .map((entry) => String(entry).split("=")[0])
        .filter((displayName) => displayName !== "")
        .map((displayName) => ({
            label: displayName,
            value: `custom|${displayName}`,
        }));
    return [...PRESELECT_QUICK_FILTER_OPTIONS, ...custom];
}

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

export const CACHED_QUERIES_WIKI =
    "https://github.com/theotherp/nzbhydra2/wiki/External-API,-RSS-and-cached-queries";

/**
 * `formly-config.js` `percentInput`'s `ng-pattern`: a whole number or up to two
 * decimal places. The control is a number input, so the value validated here is
 * already numeric; the pattern still rejects a negative percentage and a third
 * decimal place, exactly as legacy does.
 */
export const percentValidator: SettingValidator = patternValidator(
    /^[0-9]+(\.[0-9]{1,2})?$/,
    () => "Enter a percentage with at most two decimal places",
);

/** The config path of the custom-mapping array. */
export const CUSTOM_MAPPINGS_PATH =
    "searching.customMappings" as ConfigFieldPath;

/** The `data-testid` stem every custom-mapping selector is built from. */
export const CUSTOM_MAPPINGS_TEST_ID = "searching-customMappings";

/**
 * A new mapping's starting value — legacy's `defaultModel`
 * (`config-fields-service.js:1383-1389`), including `matchAll: true`, which is
 * *not* the Java default (`CustomQueryAndTitleMapping.matchAll` is a plain
 * `boolean`); legacy deliberately starts a new mapping as a whole-string match.
 */
export function newCustomMapping(): CustomMappingValues {
    return {
        affectedValue: null,
        from: null,
        matchAll: true,
        searchType: null,
        to: null,
    };
}

/**
 * Reads one stored entry into the dialog's editable shape. Entries come from a
 * loose config object (ADR-0003), so nothing about them is guaranteed; an
 * unusable field becomes the empty value the editor shows rather than throwing.
 */
export function customMappingValues(entry: unknown): CustomMappingValues {
    const record = (
        typeof entry === "object" && entry !== null ? entry : {}
    ) as Record<string, unknown>;
    return {
        affectedValue: optionalText(record.affectedValue),
        from: optionalText(record.from),
        matchAll: record.matchAll === true,
        searchType: optionalText(record.searchType),
        to: optionalText(record.to),
    };
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

/** `formly-config.js:363`, shown when Test is used with no example input. */
export const EMPTY_EXAMPLE_INPUT_RESULT = "Empty example data";

/**
 * Shown when Test is used with no input pattern. Legacy has no such branch and
 * sends the request anyway, which answers HTTP 500 —
 * `CustomQueryAndTitleMappingHandler.testMapping` calls `getFromPattern()`
 * outside its `try`, so a null `from` is a `NullPointerException` rather than
 * the `error` field the modal knows how to show. Refusing to send it keeps the
 * affordance honest instead of reporting a server crash as a mapping problem.
 */
export const EMPTY_INPUT_PATTERN_RESULT = "Empty input pattern";

/** `formly-config.js:376`, shown when the mapping does not apply. */
export const NO_MATCH_RESULT = "Input does not match example";

/** Shown when the request itself failed (legacy's error callback). */
export const REQUEST_FAILED_RESULT = "Unable to test the mapping";
