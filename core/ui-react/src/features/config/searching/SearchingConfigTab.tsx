import {Box} from "@mui/material";
import {useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {
    ChipsSetting,
    ConfigFieldset,
    MultiSelectSetting,
    NumberSetting,
    SelectSetting,
    SwitchSetting,
    TextSetting,
} from "../components";
import {
    CUSTOM_MAPPINGS_HEADLINE,
    CUSTOM_MAPPINGS_TOOLTIP,
    CustomMappingsSection,
} from "./CustomMappingsSection";
import {languageOptions} from "./languages";
import {
    APPLY_RESTRICTIONS_OPTIONS,
    CACHED_QUERIES_WIKI,
    percentValidator,
    preselectQuickFilterOptions,
    SEARCH_SOURCE_OPTIONS,
} from "./searchingSettings";

/**
 * `F-CONFIG-SEARCHING`: the Searching configuration tab — every field of
 * `config-fields-service.js:737-1603`, in legacy's order and grouping, bound to
 * `C-CONFIG-FORM`'s whole-config form through the `C-CONFIG-FIELDS`
 * vocabulary. The custom-mapping list between "Result processing" and "Result
 * display" is legacy's position for it; it is the one section edited through a
 * modal transaction (`CustomMappingsSection`), wrapped here in an advanced
 * `ConfigFieldset` so the wholly-advanced section joins FM-098's disclosure
 * convention (FM-131) rather than vanishing outright while the global toggle
 * is off; `CustomMappingsSection` renders no heading of its own, so this is
 * the fieldset's `label`/`tooltip`, not a duplicate of one it already draws.
 *
 * Legacy's `hideExpression`s become plain conditional rendering driven by
 * `useWatch`. A hidden field keeps its value: the shell's form is created with
 * `shouldUnregister: false`, so unmounting a row neither clears the value nor
 * lets its validation rules block a save. That matters more here than on any
 * other tab — turning word filters off must not delete the forbidden and
 * required words behind them, which is exactly what
 * `SearchingConfigValidator` warns about instead of silently accepting.
 */
export function SearchingConfigTab({transport}: {transport: ApiTransport}) {
    const applyRestrictions = useWatch<ConfigValues>({
        name: "searching.applyRestrictions",
    });
    const restrictionsApply = applyRestrictions !== "NONE";
    const showQuickFilterButtons =
        useWatch<ConfigValues>({name: "searching.showQuickFilterButtons"}) ===
        true;
    const customQuickFilterButtons = useWatch<ConfigValues>({
        name: "searching.customQuickFilterButtons",
    });
    const language = useWatch<ConfigValues>({name: "searching.language"});

    return (
        <Box data-testid="config-searching">
            <ConfigFieldset
                advanced
                label="Indexer access"
                tooltip="Settings that control how communication with indexers is done and how to handle errors while doing that."
            >
                <NumberSetting
                    help="Any web call to an indexer taking longer than this is aborted."
                    label="Timeout when accessing indexers"
                    minimum={1}
                    name="searching.timeout"
                    unit="seconds"
                />
                <TextSetting
                    help="Used when accessing indexers."
                    label="User agent"
                    name="searching.userAgent"
                    required
                    tooltip="Some indexers don't seem to like Hydra and disable access based on the user agent. You can change it here if you want. Please leave it as it is if you have no problems. This allows indexers to gather better statistics on how their API services are used."
                />
                <ChipsSetting
                    help="Used to map the user agent from accessing services to the service names. Apply words with return key."
                    label="Map user agents"
                    name="searching.userAgents"
                />
                <SwitchSetting
                    help="When enabled load limiting defined for indexers will be ignored for internal searches."
                    label="Ignore load limiting internally"
                    name="searching.ignoreLoadLimitingForInternalSearches"
                />
                <SwitchSetting
                    help="When enabled load limiting defined for indexers will be ignored for API searches that have identifiers or a query."
                    label="Ignore load limiting for concrete API searches"
                    name="searching.ignoreLoadLimitingForConcreteApiSearches"
                />
                <SwitchSetting
                    label="Ignore temporary errors"
                    name="searching.ignoreTemporarilyDisabled"
                    tooltip="By default if access to an indexer fails the indexer is disabled for a certain amount of time (for a short while first, then increasingly longer if the problems persist). Disable this and always try these indexers."
                />
            </ConfigFieldset>
            <ConfigFieldset
                advanced
                label="Category handling"
                tooltip="Settings that control the handling of newznab categories (e.g. 2000 for Movies)."
            >
                <SwitchSetting
                    help="Map newznab categories from API searches to configured categories and use all configured newznab categories in searches."
                    label="Transform newznab categories"
                    name="searching.transformNewznabCategories"
                />
                <SwitchSetting
                    help="If disabled no categories will be included in queries to torznab indexers (trackers)."
                    label="Send categories to trackers"
                    name="searching.sendTorznabCategories"
                />
            </ConfigFieldset>
            <ConfigFieldset
                label="Media IDs / Query generation / Query processing"
                tooltip={
                    "Raw search engines like Binsearch don't support searches based on IDs (e.g. for a movie using an IMDB id). You can enable query generation for these. Hydra will then try to retrieve the movie's or show's title and generate a query, for example \"showname s01e01\". In some cases an ID based search will not provide any results. You can enable a fallback so that in such a case the search will be repeated with a query using the title of the show or movie."
                }
            >
                <SelectSetting
                    advanced
                    help="When enabled media ID conversions will always be done even when an indexer supports the already known ID(s)."
                    label="Convert media IDs for..."
                    name="searching.alwaysConvertIds"
                    options={SEARCH_SOURCE_OPTIONS}
                />
                <SelectSetting
                    help="Generate queries for indexers which do not support ID based searches."
                    label="Generate queries"
                    name="searching.generateQueries"
                    options={SEARCH_SOURCE_OPTIONS}
                />
                <SelectSetting
                    help="When no results were found for a query ID search again using a generated query (on indexer level)."
                    label="Fallback to generated queries"
                    name="searching.idFallbackToQueryGeneration"
                    options={SEARCH_SOURCE_OPTIONS}
                />
                <SelectSetting
                    help="Used for movie query generation and autocomplete only."
                    label="Language"
                    name="searching.language"
                    // A stored code this build has no label for stays in the
                    // list rather than being dropped, so the select never
                    // silently rewrites the configured language.
                    options={languageOptions(language)}
                    required
                />
                <SwitchSetting
                    help="Replace diacritics (e.g. è) and german umlauts and special characters (ä, ö, ü and ß) in external request queries."
                    label="Replace umlauts and diacritics"
                    name="searching.replaceUmlauts"
                />
            </ConfigFieldset>
            <ConfigFieldset
                label="Result filters"
                tooltip={
                    'This section allows you to define global filters which will be applied to all search results. You can define words and regexes which must or must not be matched for a search result to be matched. You can also exclude certain usenet posters and groups which are known for spamming. You can define forbidden and required words for categories in the next tab (Categories). Usually required or forbidden words are applied on a word base, so they must form a complete word in a title. Only if they contain a dash or a dot they may appear anywhere in the title. Example: "ea" matches "something.from.ea" but not "release.from.other". "web-dl" matches "title.web-dl" and "someweb-dl".'
                }
            >
                <SelectSetting
                    help="For which type of search word/regex filters will be applied"
                    label="Apply word filters"
                    name="searching.applyRestrictions"
                    options={APPLY_RESTRICTIONS_OPTIONS}
                />
                {restrictionsApply ? (
                    <ChipsSetting
                        help="Results with any of these words in the title will be ignored. Title is converted to lowercase before. Apply words with return key."
                        label="Forbidden words"
                        name="searching.forbiddenWords"
                        tooltip="One forbidden word in a result title dismisses the result."
                    />
                ) : null}
                {restrictionsApply ? (
                    <TextSetting
                        advanced
                        help="Must not be present in a title (case is ignored)."
                        label="Forbidden regex"
                        name="searching.forbiddenRegex"
                    />
                ) : null}
                {restrictionsApply ? (
                    <ChipsSetting
                        help="Only results with titles that contain *all* words will be used. Title is converted to lowercase before. Apply words with return key."
                        label="Required words"
                        name="searching.requiredWords"
                        tooltip="If any of the required words is not found anywhere in a result title it's also dismissed."
                    />
                ) : null}
                {restrictionsApply ? (
                    <TextSetting
                        advanced
                        help="Must be present in a title (case is ignored)."
                        label="Required regex"
                        name="searching.requiredRegex"
                    />
                ) : null}
                {restrictionsApply ? (
                    <ChipsSetting
                        advanced
                        help="Posts from any groups containing any of these words will be ignored. Apply words with return key."
                        label="Forbidden groups"
                        name="searching.forbiddenGroups"
                    />
                ) : null}
                {/*
                 * Legacy has no `hideExpression` on the posters list even
                 * though it is the same kind of filter as the groups list
                 * above it (`config-fields-service.js:1217-1225`), so it stays
                 * visible when word filters are off.
                 */}
                <ChipsSetting
                    advanced
                    help="Posts from any posters containing any of these words will be ignored. Apply words with return key."
                    label="Forbidden posters"
                    name="searching.forbiddenPosters"
                />
                {/*
                 * Free text, as legacy has it: the backend compares the
                 * configured entries against whatever language string an
                 * indexer returned, and there is no curated list anywhere to
                 * reproduce.
                 */}
                <ChipsSetting
                    help="If an indexer returns the language in the results only those results with configured languages will be used. Apply words with return key."
                    label="Languages to keep"
                    name="searching.languagesToKeep"
                />
                <NumberSetting
                    help="Results older than this are ignored. Can be overwritten per search. Apply words with return key."
                    label="Maximum results age"
                    name="searching.maxAge"
                    unit="days"
                />
                <NumberSetting
                    help="Torznab results with fewer seeders will be ignored."
                    label="Minimum # seeders"
                    name="searching.minSeeders"
                />
                <SwitchSetting
                    help="Not all indexers provide this information"
                    label="Ignore passworded releases"
                    name="searching.ignorePassworded"
                    tooltip="Some indexers provide information if a release is passworded. If you select to ignore these releases only those will be ignored of which I know for sure that they're actually passworded."
                />
            </ConfigFieldset>
            <ConfigFieldset label="Result processing">
                <SwitchSetting
                    advanced
                    help="When enabled accessing tools will think the search was completed successfully but without results."
                    label="Wrap API errors in empty results page"
                    name="searching.wrapApiErrors"
                    tooltip="In (hopefully) rare cases Hydra may crash when processing an API search request. You can enable to return an empty search page in these cases (if Hydra hasn't crashed altogether ). This means that the calling tool (e.g. Sonarr) will think that the indexer (Hydra) is fine but just didn't return a result. That way Hydra won't be disabled as indexer but on the downside you may not be directly notified that an error occurred."
                />
                <ChipsSetting
                    help='Removed from title if it ends with either of these. Case insensitive and disregards leading/trailing spaces. Allows wildcards ("*"). Apply words with return key.'
                    label="Remove trailing..."
                    name="searching.removeTrailing"
                    tooltip="Hydra contains a predefined list of words which will be removed if a search result title ends with them. This allows better duplicate detection and cleans up the titles. Trailing words will be removed until none of the defined strings are found at the end of the result title."
                />
                <SwitchSetting
                    advanced
                    help="Enable to use the category descriptions provided by the indexer."
                    label="Use original categories"
                    name="searching.useOriginalCategories"
                    tooltip="Hydra attempts to parse the provided newznab category IDs for results and map them to the configured categories. In some cases this may lead to category names which are not quite correct. You can select to use the original category name used by the indexer. This will only affect which category name is shown in the results."
                />
            </ConfigFieldset>
            <ConfigFieldset
                advanced
                label={CUSTOM_MAPPINGS_HEADLINE}
                tooltip={CUSTOM_MAPPINGS_TOOLTIP}
            >
                <CustomMappingsSection transport={transport} />
            </ConfigFieldset>
            <ConfigFieldset label="Result display">
                <SwitchSetting
                    advanced
                    help="Load all results already retrieved from indexers. Might make sorting / filtering a bit slower."
                    label="Display all retrieved results"
                    name="searching.loadAllCachedOnInternal"
                />
                <NumberSetting
                    advanced
                    help="Determines the number of results fetched from indexers per search request. This might also cause more API hits because indexers are queried until the number of results is matched or all indexers are exhausted. Limit is 500."
                    label="Results fetched per request"
                    maximum={500}
                    name="searching.loadLimitInternal"
                    required
                    unit="results per page"
                />
                <NumberSetting
                    help="Determines width of covers in search results (when enabled in display options)."
                    label="Cover width"
                    name="searching.coverSize"
                    required
                    unit="px"
                />
                <SwitchSetting
                    help="Analyze movie release titles and show a quality score (1-10) with details on hover."
                    label="Show movie quality indicator"
                    name="searching.showMovieQualityIndicator"
                />
            </ConfigFieldset>
            <ConfigFieldset label="Quick filters">
                <SwitchSetting
                    help="Show quick filter buttons for movie and TV results."
                    label="Show quick filters"
                    name="searching.showQuickFilterButtons"
                />
                {showQuickFilterButtons ? (
                    <SwitchSetting
                        advanced
                        help="Show all quick filter buttons for all types of searches."
                        label="Always show quick filters"
                        name="searching.alwaysShowQuickFilterButtons"
                    />
                ) : null}
                {showQuickFilterButtons ? (
                    <ChipsSetting
                        advanced
                        help="Enter in the format DisplayName=Required1,Required2. Prefix words with ! to exclude them. Surround with / to mark as a regex. Apply values with enter key."
                        label="Custom quick filters"
                        name="searching.customQuickFilterButtons"
                        tooltip='E.g. use WEB=webdl,web-dl. for a quick filter with the name "WEB" to be displayed that searches for "webdl" and "web-dl" in lowercase search results.'
                    />
                ) : null}
                {showQuickFilterButtons ? (
                    <MultiSelectSetting
                        advanced
                        help="Choose which quickfilters will be selected by default."
                        label="Preselect quickfilters"
                        name="searching.preselectQuickFilterButtons"
                        options={preselectQuickFilterOptions(
                            customQuickFilterButtons,
                        )}
                        tooltip="To select custom quickfilters you just entered please save the config first."
                    />
                ) : null}
            </ConfigFieldset>
            <ConfigFieldset
                advanced
                label="Duplicate detection"
                tooltip="Hydra tries to find duplicate results from different indexers using heuristics. You can control the parameters for that but usually the default values work quite well."
            >
                <NumberSetting
                    label="Duplicate size threshold"
                    name="searching.duplicateSizeThresholdInPercent"
                    required
                    step={0.01}
                    unit="%"
                    validate={percentValidator}
                />
                <NumberSetting
                    label="Duplicate age threshold"
                    name="searching.duplicateAgeThreshold"
                    required
                    unit="hours"
                />
            </ConfigFieldset>
            <ConfigFieldset advanced label="Other">
                <NumberSetting
                    label="Store results for ..."
                    name="searching.keepSearchResultsForDays"
                    required
                    tooltip="Found results are stored in the database for this long until they're deleted. After that any links to Hydra results still stored elsewhere become invalid. You can increase the limit if you want, the disc space needed is negligible (about 75 MB for 7 days on my server)."
                    unit="days"
                />
                <NumberSetting
                    label="recent searches in search bar"
                    name="searching.historyForSearching"
                    required
                    // Legacy's tooltip names the affordance with an inline
                    // glyphicon `<span>` (`config-fields-service.js:1585`);
                    // `tooltip` is plain text, so the icon is named instead.
                    tooltip="The number of recent searches shown in the search bar dropdown (the clock icon)."
                />
                <NumberSetting
                    help={[
                        "When set search results will be cached for this time. Any search with the same parameters will return the cached results. API cache time parameters will be preferred. See ",
                        {href: CACHED_QUERIES_WIKI, text: "wiki"},
                        ".",
                    ]}
                    label="Results cache time"
                    name="searching.globalCacheTimeMinutes"
                    unit="minutes"
                />
            </ConfigFieldset>
        </Box>
    );
}
