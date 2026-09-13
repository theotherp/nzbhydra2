import {
    patternValidator,
    type SettingOption,
    type SettingValidator,
} from "../components";

/**
 * `F-CONFIG-SEARCHING`'s option lists and long help texts, transcribed from
 * `config-fields-service.js:737-1603`. FM-195 took the custom-mapping
 * vocabulary out of here with the section and dialog it belongs to
 * (`customMappings/customMappingSettings.ts`). Beside the tab rather than in
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
const PRESELECT_QUICK_FILTER_OPTIONS: readonly SettingOption[] = [
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
