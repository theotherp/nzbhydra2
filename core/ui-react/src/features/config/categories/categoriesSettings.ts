import type {
    ConfigFieldPath,
    SettingOption,
    SettingValidator,
} from "../components";

/**
 * `F-CONFIG-CATEGORIES`'s option lists, tooltips, and the Categories repeat
 * section's per-entry value type, transcribed from
 * `config-fields-service.js:1604-1836`. Live beside the tab rather than in
 * `C-CONFIG-FIELDS` because they are this tab's vocabulary, not the shared
 * one.
 */

export const CATEGORY_SEARCH_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "General", value: "SEARCH"},
    {label: "Audio", value: "MUSIC"},
    {label: "EBook", value: "BOOK"},
    {label: "Movie", value: "MOVIE"},
    {label: "TV", value: "TVSEARCH"},
];

/**
 * Legacy's subtype select exposes five of `Category.Subtype`'s seven values
 * (`ALL` is reserved for the synthetic `CategoriesConfig.allCategory` and
 * `MAGAZINE` has no UI affordance in legacy either) -- both stay
 * unreachable from this tab, matching legacy exactly.
 */
export const CATEGORY_SUBTYPE_OPTIONS: readonly SettingOption[] = [
    {label: "Anime", value: "ANIME"},
    {label: "Audiobook", value: "AUDIOBOOK"},
    {label: "Comic", value: "COMIC"},
    {label: "Ebook", value: "EBOOK"},
    {label: "None", value: "NONE"},
];

/**
 * `SearchSourceRestriction`'s four legacy-exposed values for "when do word
 * restrictions apply" (`applyRestrictionsType`). Same value set as
 * `IGNORE_RESULTS_FROM_OPTIONS` below, but legacy gives each select its own
 * labels, so they stay two separate constants rather than one shared list.
 */
export const APPLY_RESTRICTIONS_OPTIONS: readonly SettingOption[] = [
    {label: "All searches", value: "BOTH"},
    {label: "Internal searches", value: "INTERNAL"},
    {label: "API searches", value: "API"},
    {label: "Never", value: "NONE"},
];

/** `SearchSourceRestriction`'s four legacy-exposed values for `ignoreResultsFrom`. */
export const IGNORE_RESULTS_FROM_OPTIONS: readonly SettingOption[] = [
    {label: "For all searches", value: "BOTH"},
    {label: "For internal searches", value: "INTERNAL"},
    {label: "For API searches", value: "API"},
    {label: "Never", value: "NONE"},
];

export const IGNORE_RESULTS_FROM_TOOLTIP =
    'If you want you can entirely ignore results from categories. Results from these categories will not show in the searches. If you select "Internal" or "Always" this category will also not be selectable on the search page.';

/**
 * Legacy's newznab-categories tooltip transcribed as flowing prose: the
 * source string is an HTML fragment (`<br><br>` paragraph breaks,
 * `config-fields-service.js:1795-1798`), but `SettingProps.tooltip` is plain
 * text rendered through a MUI `Tooltip`, exactly as `F-CONFIG-AUTH`'s
 * `OIDC_TOOLTIP`/`RESTRICTIONS_TOOLTIP` already do for their own `<br>`-laden
 * source strings.
 */
export const NEWZNAB_CATEGORIES_TOOLTIP =
    'Hydra tries to map API search (newnzab) categories to its internal list of categories, going from specific to general. Example: If an API search is done with a catagory that matches those of "Movies HD" the settings for that category are used. Otherwise it checks if it matches the "Movies" category and, if yes, uses that one. If that one doesn\'t match no category settings are used. ' +
    'Related to that you must also define the newznab categories for every Hydra category, e.g. decide if the category for foreign movies (2010) is used for movie searches. This also controls the category mapping described above. You may combine newznab categories using "&" to require multiple numbers to be present in a result. For example "2010&11000" would require a search result to contain both 2010 and 11000 for that category to match. ' +
    "Note: When an API search defines categories the internal mapping is only used for the forbidden and required words. The search requests to your newznab indexers will still use the categories from the original request, not the ones configured here.";

/**
 * The two-line advanced-gated warning legacy shows above the Categories list
 * (`config-fields-service.js:1643-1652`), verbatim.
 */
export const CATEGORIES_HELP_LINES: readonly string[] = [
    "The category configuration is not validated in any way. You can seriously fuck up Hydra's results and overall behavior so take care.",
    "Restrictions will taken from a result's category, not the search request category which may not always be the same.",
];

/**
 * `Category.java`'s fields, as the shape a Categories row edits.
 * `newznabCategories` is a list of the strings the backend's
 * `NewznabCategoriesDeserializer`/`NewznabCategoriesSerializer` actually put
 * on the wire -- a bare number or several `&`-joined into one entry
 * (`config-fields-service.js:1789-1795`) -- never numbers: the generated
 * OpenAPI type claims `number[][]` because it reflects `Category.java`'s Java
 * field type, not the custom (de)serializer's actual JSON shape (ADR-0003).
 *
 * `mayBeSelected` and `preselect` are part of the persisted shape but have no
 * control on this tab (legacy has none either, `config-fields-service.js`
 * :1604-1836) -- they round-trip untouched because `C-CONFIG-FORM` submits
 * the whole config, not just the fields a control bound.
 */
export type CategoryValues = {
    applyRestrictionsType: "API" | "BOTH" | "INTERNAL" | "NONE";
    applySizeLimitsToApi: boolean;
    forbiddenRegex: string | null;
    forbiddenWords: string[];
    ignoreResultsFrom: "API" | "BOTH" | "INTERNAL" | "NONE";
    mayBeSelected: boolean;
    maxSizePreset: number | null;
    minSizePreset: number | null;
    name: string | null;
    newznabCategories: string[];
    preselect: boolean;
    requiredRegex: string | null;
    requiredWords: string[];
    searchType: "BOOK" | "MOVIE" | "MUSIC" | "SEARCH" | "TVSEARCH";
    subtype: "ANIME" | "AUDIOBOOK" | "COMIC" | "EBOOK" | "NONE";
};

/**
 * A newly added category's starting values (legacy's `defaultModel`,
 * `config-fields-service.js:1799-1815`), verbatim.
 */
export function defaultCategoryEntry(): CategoryValues {
    return {
        applyRestrictionsType: "NONE",
        applySizeLimitsToApi: false,
        forbiddenRegex: null,
        forbiddenWords: [],
        ignoreResultsFrom: "NONE",
        mayBeSelected: true,
        maxSizePreset: null,
        minSizePreset: null,
        name: null,
        newznabCategories: [],
        preselect: true,
        requiredRegex: null,
        requiredWords: [],
        searchType: "SEARCH",
        subtype: "NONE",
    };
}

/**
 * The path `CategoryDialog`'s draft form binds to. It is deliberately not
 * `categoriesConfig.categories.<index>`: the draft lives in its own throwaway
 * form (see `CategoryDialog`), the same shape `DOWNLOADER_DRAFT_PATH`
 * (`downloading/downloadingSettings.ts`) and `USER_DRAFT_PATH`
 * (`auth/authSettings.ts`) already establish, and reusing an index path would
 * give the dialog's controls the same `data-testid`s as the summary row
 * behind it.
 */
export const CATEGORY_DRAFT_PATH =
    "categoriesConfig.categoryDraft" as ConfigFieldPath;

/**
 * A category dialog field's path, e.g.
 * `categoriesConfig.categoryDraft.name`. `CategoryEntryFields` and
 * `SizePresetRow` take a path-builder of this shape (rather than a fixed
 * array index, as before FM-119) so they can bind to either a draft or -- in
 * principle -- any other single entry's fields.
 */
export function categoryDraftFieldPath(
    field: keyof CategoryValues,
): ConfigFieldPath {
    // As `draftFieldPath` in `downloading/downloadingSettings.ts`:
    // `categoriesConfig` is an unmodeled loose object (ADR-0003), so
    // react-hook-form's `FieldPath` cannot enumerate this dynamically. The
    // cast is narrow: `field` is still constrained to a real `CategoryValues`
    // key.
    return `${CATEGORY_DRAFT_PATH}.${field}` as ConfigFieldPath;
}

/** A Categories row's legend (legacy's `element.name`, blank for an unfilled new row). */
export function categoryEntryLegend(entry: CategoryValues): string {
    return entry.name !== null && entry.name.length > 0
        ? entry.name
        : "New category";
}

/**
 * The shape one `newznabCategories` entry may have, and the whole of the
 * client-side validation legacy never had ("The category configuration is not
 * validated in any way", `CATEGORIES_HELP_LINES` above).
 *
 * It is the shape `NewznabCategoriesDeserializer` parses -- `Splitter.on("&")`
 * over the entry, then `Integer::valueOf` on each piece -- narrowed on purpose
 * to digits only. `Integer.valueOf` would also take `-5` and `+5`, and a
 * newznab category is never negative, so a token the backend *would* accept is
 * refused here. That narrowing is a gate on *entry*, never a filter on stored
 * values: a `-5` already in the configuration keeps round-tripping, flagged
 * where the admin can see it (`ChipsSetting`'s `validateChip`), because
 * silently dropping it would corrupt a config the UI merely disapproves of.
 */
const NEWZNAB_CATEGORY_PATTERN = /^\d+(&\d+)*$/;

/**
 * Refuses one newznab-categories entry, naming the offending token and the
 * accepted shape. Not a form-level `validate`: it decides whether a typed entry
 * becomes a chip, not whether the config may be saved.
 */
export const newznabCategoryValidator: SettingValidator = (value) => {
    const token = String(value);
    return NEWZNAB_CATEGORY_PATTERN.test(token)
        ? true
        : `"${token}" is not a newznab category. Use a number, or several joined with "&" (for example 2010&11000).`;
};

/** A search type's label, as the Search type select spells it. */
export function categorySearchTypeLabel(entry: CategoryValues): string {
    return (
        CATEGORY_SEARCH_TYPE_OPTIONS.find(
            (option) => option.value === entry.searchType,
        )?.label ??
        // A value the select cannot offer (an older config, or one edited by
        // hand) is shown as itself rather than as an empty cell.
        String(entry.searchType)
    );
}

/**
 * The size preset pair as one summary cell. The dash is an en dash between two
 * numbers and the open ends are spelled in words, because "1 -" and "- 250"
 * are unreadable as a range; `null` on both sides has nothing to say at all.
 */
export function categorySizeSummary(entry: CategoryValues): string | null {
    const {maxSizePreset: max, minSizePreset: min} = entry;
    if (min === null && max === null) {
        return null;
    }
    if (min !== null && max !== null) {
        return `${min}–${max} MB`;
    }
    return min === null ? `up to ${String(max)} MB` : `from ${min} MB`;
}
