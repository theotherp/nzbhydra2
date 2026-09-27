import type {SearchResult} from "../../../api/search";
import {resultQualityRating} from "./qualityBadge";

export type NumericRange = {min: string; max: string};

/** The `ResultFilters` fields that are a min/max range. */
export type RangeFilterName = "age" | "grabs" | "qualityRating" | "size";

export type ResultFilters = {
    title: string;
    indexers: string[];
    categories: string[];
    downloadTypes: string[];
    size: NumericRange;
    grabs: NumericRange;
    age: NumericRange;
    // FM-201: the quality column's range, on `resultQualityRating`.
    qualityRating: NumericRange;
    quickFilters: Record<string, boolean>;
};

/**
 * One `searching.customQuickFilterButtons` entry, `[Group:]Label=term,term`.
 * `id` is everything left of the `=`, so it stays unique even when two groups
 * use the same label. Selected filters sharing a `group` are ORed; each group,
 * and each ungrouped filter, must match on its own.
 */
export type QuickFilter = {
    group: string | null;
    id: string;
    label: string;
    terms: string[];
};

export type GroupingOptions = {
    groupTorrentAndUsenet: boolean;
    groupEpisodes: boolean;
    // Owner (2026-09-18): "Group same titles", the display option that gates
    // the title grouping below. It was unconditional until then; `true` is
    // the unchanged behavior.
    groupTitles: boolean;
    episodeRequested: boolean;
};

export type ResultGroup = {
    key: string;
    duplicateGroups: SearchResult[][];
};

export function groupResults(
    results: SearchResult[],
    options: GroupingOptions,
): ResultGroup[] {
    // Both maps append with `push` rather than by rebuilding the bucket array
    // (`[...(map.get(key) ?? []), result]`), which copied every member already
    // in a group for each further member and so cost O(n^2) per group. A
    // `Map`'s insertion order and each bucket's append order are unchanged, so
    // the emitted group order and each group's member order are identical.
    const titleGroups = new Map<string, SearchResult[]>();
    for (const result of results) {
        const key = groupingKey(result, options);
        const group = titleGroups.get(key);
        if (group === undefined) {
            titleGroups.set(key, [result]);
        } else {
            group.push(result);
        }
    }
    return [...titleGroups.entries()].map(([key, groupedResults]) => {
        const duplicates = new Map<string, SearchResult[]>();
        for (const result of groupedResults) {
            const duplicateKey = duplicateIdentity(result);
            const duplicateGroup = duplicates.get(duplicateKey);
            if (duplicateGroup === undefined) {
                duplicates.set(duplicateKey, [result]);
            } else {
                duplicateGroup.push(result);
            }
        }
        return {key, duplicateGroups: [...duplicates.values()]};
    });
}

export function visibleGroupedResults(
    groups: ResultGroup[],
    expandedTitles: ReadonlySet<string>,
    expandedDuplicates: ReadonlySet<string>,
): SearchResult[] {
    return groups.flatMap((group) =>
        group.duplicateGroups.flatMap((duplicates, duplicateIndex) => {
            const duplicateKey = duplicateGroupKey(group.key, duplicates[0]);
            const titleVisible =
                duplicateIndex === 0 || expandedTitles.has(group.key);
            if (!titleVisible) {
                return [];
            }
            return duplicates.filter(
                (_, index) =>
                    index === 0 || expandedDuplicates.has(duplicateKey),
            );
        }),
    );
}

export function duplicateGroupKey(
    groupKey: string,
    result: SearchResult,
): string {
    return `${groupKey}|${duplicateIdentity(result)}`;
}

// What makes two results the same release rather than merely the same title:
// the indexer-reported hash when there is one, and otherwise the result's own
// id, which groups it with nothing. Used both for the duplicate buckets
// inside a title group and, with title grouping switched off, as the grouping
// key itself.
function duplicateIdentity(result: SearchResult): string {
    return result.hash === undefined
        ? `result:${result.searchResultId}`
        : `hash:${result.hash}`;
}

export function selectVisibleResults(
    selected: ReadonlySet<string>,
    visible: SearchResult[],
    action: "all" | "none" | "invert",
): Set<string> {
    const visibleIds = visible.map((result) => result.searchResultId);
    if (action === "all") {
        return new Set(visibleIds);
    }
    if (action === "none") {
        return new Set();
    }
    return new Set(visibleIds.filter((id) => !selected.has(id)));
}

// Tri-state summary of `selected` over the currently visible rows, driving
// the results table header's tri-state checkbox (FM-040): "all" checks it,
// "some" renders it indeterminate, "none" leaves it unchecked. An empty
// visible set (nothing rendered to select) is "none", matching an unchecked,
// non-indeterminate checkbox rather than a false "all selected" reading.
export type SelectionStatus = "all" | "none" | "some";

export function selectionStatus(
    selected: ReadonlySet<string>,
    visible: SearchResult[],
): SelectionStatus {
    if (visible.length === 0) {
        return "none";
    }
    const selectedVisibleCount = visible.filter((result) =>
        selected.has(result.searchResultId),
    ).length;
    if (selectedVisibleCount === 0) {
        return "none";
    }
    return selectedVisibleCount === visible.length ? "all" : "some";
}

export function selectionAfterClick(
    selected: ReadonlySet<string>,
    visible: SearchResult[],
    resultId: string,
    checked: boolean,
    previousResultId?: string,
    shiftKey = false,
): Set<string> {
    const next = new Set(selected);
    const clickedIndex = visible.findIndex(
        (result) => result.searchResultId === resultId,
    );
    const previousIndex = visible.findIndex(
        (result) => result.searchResultId === previousResultId,
    );
    if (shiftKey && clickedIndex >= 0 && previousIndex >= 0) {
        for (const result of visible.slice(
            Math.min(clickedIndex, previousIndex),
            Math.max(clickedIndex, previousIndex) + 1,
        )) {
            if (checked) {
                next.add(result.searchResultId);
            } else {
                next.delete(result.searchResultId);
            }
        }
        return next;
    }
    if (checked) {
        next.add(resultId);
    } else {
        next.delete(resultId);
    }
    return next;
}

/**
 * What makes two results one row, in one rule: an identity -- the episode a
 * result belongs to, else its title, else the result's own duplicate identity
 * -- qualified by the download type unless torrent and Usenet results may
 * share a group.
 *
 * Owner defect (2026-09-18): the qualifier used to be appended on the title
 * branch alone, so a TV search -- which takes the episode branch by default
 * -- grouped a torrent with an NZB however "Group torrent and Usenet results"
 * was set. Legacy had the same defect, its suffix living in the `else` of
 * `search-results-controller.js:getGroupingString`; appending it to every
 * branch is a deliberate divergence from that, on the owner's decision.
 *
 * A result without a `downloadType` groups with neither side rather than with
 * both, which is the behavior the title branch always had.
 */
function groupingKey(result: SearchResult, options: GroupingOptions): string {
    const downloadType = options.groupTorrentAndUsenet
        ? ""
        : `|${result.downloadType ?? "unknown"}`;
    const episodeKey = `${result.showtitle ?? ""}|${result.season ?? ""}|${result.episode ?? ""}`;
    if (
        options.groupEpisodes &&
        !options.episodeRequested &&
        result.category.toLowerCase().includes("tv") &&
        result.showtitle !== undefined &&
        result.season !== undefined &&
        result.episode !== undefined
    ) {
        return `episode:${normalizeGroupingValue(episodeKey)}${downloadType}`;
    }
    if (!options.groupTitles) {
        // With the option off, two results that merely share a title stay
        // separate rows. The key falls back to the duplicate identity rather
        // than to a per-result one, so the same release reported by several
        // indexers still collapses under the duplicate expand control --
        // that control is its own display option and is not what this one
        // switches off. The qualifier cannot change what this branch groups
        // (`DuplicateDetector.testForSameness` refuses any pair involving a
        // torrent, so a duplicate group is Usenet-only by construction), but
        // it keeps the guarantee a property of this function rather than of
        // that one.
        return `duplicate:${duplicateIdentity(result)}${downloadType}`;
    }
    return `title:${normalizeGroupingValue(result.title)}${downloadType}`;
}

function normalizeGroupingValue(value: string): string {
    return value.toLocaleLowerCase().replace(/[\s._-]+/g, "");
}

export function quickFilterKey(filter: Pick<QuickFilter, "id">): string {
    // The `custom|` prefix is what `searching.preselectQuickFilterButtons` has
    // always stored for configured filters.
    return `custom|${filter.id}`;
}

export function defaultFilters(
    results: SearchResult[],
    quickFilters: QuickFilter[],
): ResultFilters {
    return {
        title: "",
        indexers: unique(results.map((result) => result.indexer)),
        categories: unique(results.map((result) => result.category)),
        // downloadType is optional and its real values are derived from the
        // loaded results rather than a hardcoded NZB/Torrent pair, since
        // TORBOX (and potentially other future values) also occurs. A result
        // with an undefined downloadType is never governed by this filter
        // (see filterResults below) and so is intentionally absent from this
        // default selection set.
        downloadTypes: unique(
            results.flatMap((result) =>
                result.downloadType === undefined ? [] : [result.downloadType],
            ),
        ),
        size: {min: "", max: ""},
        grabs: {min: "", max: ""},
        age: {min: "", max: ""},
        qualityRating: {min: "", max: ""},
        quickFilters: Object.fromEntries(
            quickFilters.map((filter) => [quickFilterKey(filter), false]),
        ),
    };
}

/**
 * FM-181: how many of the refine surface's filter dimensions -- title,
 * categories, indexers, download types, size, age, grabs, quality rating
 * (FM-201), quick filters -- currently differ from `defaults`, the `defaultFilters(results,
 * quickFilters)` of the same loaded results.
 *
 * The defaults are a parameter rather than recomputed here because every call
 * site already holds the one `filterDefaults` memo for the current result set
 * (`SearchResults` computes it for its own filter state and passes it to
 * `RefineSidebar`); deriving them again here re-scanned every loaded result,
 * twice per filter change, for no new information.
 *
 * It exists because the phone toolbar's refine trigger is an icon with a
 * badge: with the sections behind a sheet, the count is the only thing that
 * tells the reader a filter is on at all. It is also the *single* answer to
 * "is anything active" -- `RefineSidebar` derives its "Clear all" disabled
 * state from `activeFilterCount(...) === 0` rather than from a second
 * comparison, so the badge and the button can never disagree about it.
 *
 * A dimension counts once however many of its values changed: "indexers" is
 * one active filter whether the reader deselected one indexer or five. The
 * array-valued dimensions are compared order-independently, because
 * `defaultFilters` derives their order by scanning the loaded results while a
 * user's own toggling produces whatever order they clicked in.
 */
export function activeFilterCount(
    filters: ResultFilters,
    defaults: ResultFilters,
): number {
    const changed = [
        filters.title !== defaults.title,
        ...(["categories", "downloadTypes", "indexers"] as const).map(
            (key) => !sameValues(filters[key], defaults[key]),
        ),
        ...(["age", "grabs", "qualityRating", "size"] as const).map(
            (key) =>
                filters[key].min !== defaults[key].min ||
                filters[key].max !== defaults[key].max,
        ),
        !sameQuickFilterSelection(filters.quickFilters, defaults.quickFilters),
    ];
    return changed.filter(Boolean).length;
}

function sameValues(left: string[], right: string[]): boolean {
    return (
        left.length === right.length &&
        [...left].sort().join(" ") === [...right].sort().join(" ")
    );
}

function sameQuickFilterSelection(
    left: Record<string, boolean>,
    right: Record<string, boolean>,
): boolean {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every(
        (key) => (left[key] ?? false) === (right[key] ?? false),
    );
}

/**
 * FM-201: the safe config's `searching.showQualityIndicator`
 * (`SafeSearchingConfig`, the `searching.showMovieQualityIndicator` setting).
 * The backend only rates results while it is on, but a result set loaded
 * before it was switched off still carries ratings, so the quality column
 * reads the flag as well as the data.
 */
export function qualityIndicatorFromSafeConfig(value: unknown): boolean {
    return (
        isRecord(value) &&
        isRecord(value.searching) &&
        value.searching.showQualityIndicator === true
    );
}

export function quickFiltersFromSafeConfig(value: unknown): QuickFilter[] {
    if (
        !isRecord(value) ||
        !isRecord(value.searching) ||
        value.searching.showQuickFilterButtons !== true
    ) {
        return [];
    }
    const filters = Array.isArray(value.searching.customQuickFilterButtons)
        ? value.searching.customQuickFilterButtons.flatMap(parseQuickFilter)
        : [];
    // Groups alphabetically, ungrouped filters after them; within a group the
    // config order is kept (the sort is stable).
    return filters.sort((first, second) =>
        first.group === second.group
            ? 0
            : first.group === null
              ? 1
              : second.group === null
                ? -1
                : first.group.localeCompare(second.group, undefined, {
                      sensitivity: "base",
                  }),
    );
}

// Legacy's stored format (`color-control.html`, `formly-config.js:290-322`):
// `rgb(r,g,b)` or `null`, never an alpha channel and never `#rrggbb`. The
// Color field is free text, so anything else -- an unfinished edit, garbage,
// a CSS name -- must render no swatch rather than a malformed style or a
// throw (FM-096 acceptance).
const RGB_PATTERN = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/;

/**
 * FM-096: `safeConfig.indexers[].{name,color}` (`SafeIndexerConfig.java`) as
 * an indexer-name -> validated CSS colour map, for the result rows' swatch.
 * Only indexers with a `rgb(r,g,b)`-shaped colour are included; a missing,
 * null, or malformed value is simply absent from the map, which is what lets
 * `SearchResults.tsx` render no swatch for them without a null-check per
 * lookup.
 */
export function indexerColorsFromSafeConfig(
    value: unknown,
): Record<string, string> {
    if (!isRecord(value) || !Array.isArray(value.indexers)) {
        return {};
    }
    const entries: [string, string][] = [];
    for (const entry of value.indexers) {
        if (
            !isRecord(entry) ||
            typeof entry.name !== "string" ||
            typeof entry.color !== "string" ||
            !RGB_PATTERN.test(entry.color.trim())
        ) {
            continue;
        }
        entries.push([entry.name, entry.color.trim()]);
    }
    return Object.fromEntries(entries);
}

export function preselectedQuickFilters(
    value: unknown,
    filters: QuickFilter[],
): Record<string, boolean> {
    if (
        !isRecord(value) ||
        !isRecord(value.searching) ||
        !Array.isArray(value.searching.preselectQuickFilterButtons)
    ) {
        return {};
    }
    const available = new Set(filters.map(quickFilterKey));
    return Object.fromEntries(
        value.searching.preselectQuickFilterButtons
            .filter(
                (entry): entry is string =>
                    typeof entry === "string" && available.has(entry),
            )
            .map((entry) => [entry, true]),
    );
}

export function filterResults(
    results: SearchResult[],
    filters: ResultFilters,
    quickFilters: QuickFilter[],
    // FM-198: legacy's `filterReasons.alreadyDownloaded` predicate
    // (`search-results-controller.js:719-722` at `3ce28441e^`) -- `true`
    // drops every result whose `downloadedAt` is a non-empty string.
    // Defaults `false` so this filter dimension is opt-in and every other
    // caller (and its tests) is unaffected.
    hideDownloaded = false,
): SearchResult[] {
    const titleMatcher = makeTitleMatcher(filters.title);
    // Both matchers are built once for the whole scan rather than per result:
    // the selected quick filters, like the title matcher, depend only on
    // `filters` and `quickFilters`, so grouping them inside the predicate
    // rebuilt the same map for every loaded result.
    const selectedQuickFilters = selectedQuickFilterGroups(
        filters.quickFilters,
        quickFilters,
    );
    return results.filter(
        (result) =>
            (!hideDownloaded || !result.downloadedAt) &&
            titleMatcher(result.title) &&
            filters.indexers.includes(result.indexer) &&
            filters.categories.includes(result.category) &&
            // A result with no downloadType is never discarded by this
            // filter dimension; only results carrying one of the derived
            // values are subject to the selection.
            (result.downloadType === undefined ||
                filters.downloadTypes.includes(result.downloadType)) &&
            inRange(
                result.size === undefined
                    ? undefined
                    : result.size / 1024 / 1024,
                filters.size,
            ) &&
            inRange(result.seeders ?? result.grabs, filters.grabs) &&
            inRange(ageInDays(result), filters.age) &&
            // FM-201: like size and grabs, an unrated result passes only
            // while neither bound is set.
            inRange(resultQualityRating(result), filters.qualityRating) &&
            matchesQuickFilters(result.title, selectedQuickFilters),
    );
}

function parseQuickFilter(entry: unknown): QuickFilter[] {
    if (typeof entry !== "string") {
        return [];
    }
    const separator = entry.indexOf("=");
    if (separator <= 0) {
        return [];
    }
    const id = entry.slice(0, separator).trim();
    const groupSeparator = id.indexOf(":");
    const group =
        groupSeparator > 0 ? id.slice(0, groupSeparator).trim() : null;
    const label = group === null ? id : id.slice(groupSeparator + 1).trim();
    const terms = entry
        .slice(separator + 1)
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean);
    return label && terms.length > 0 ? [{group, id, label, terms}] : [];
}

function makeTitleMatcher(query: string): (title: string) => boolean {
    if (query.startsWith("/") && query.endsWith("/") && query.length > 2) {
        try {
            const expression = new RegExp(query.slice(1, -1), "i");
            return (title) => expression.test(title);
        } catch {
            return () => false;
        }
    }
    const words = query
        .toLowerCase()
        .split(/[\s.-]+/)
        .filter(Boolean);
    return (title) =>
        words.every(
            (word) =>
                word === "!" ||
                (word.startsWith("!")
                    ? !title.toLowerCase().includes(word.slice(1))
                    : title.toLowerCase().includes(word)),
        );
}

/**
 * The currently selected quick filters, bucketed by their group (an ungrouped
 * filter is a bucket of its own), in config order -- the per-scan half of `matchesQuickFilters`, which depends only on the selection
 * and the configured filters and never on a result. Exported so its own
 * behavior (and the fact that it is computed once per `filterResults` call
 * rather than once per result) is directly testable.
 */
export function selectedQuickFilterGroups(
    selected: Record<string, boolean>,
    filters: QuickFilter[],
): QuickFilter[][] {
    const groups: QuickFilter[][] = [];
    const byGroup = new Map<string, QuickFilter[]>();
    for (const filter of filters) {
        if (!selected[quickFilterKey(filter)]) {
            continue;
        }
        if (filter.group === null) {
            groups.push([filter]);
            continue;
        }
        const group = byGroup.get(filter.group);
        if (group) {
            group.push(filter);
        } else {
            const created = [filter];
            byGroup.set(filter.group, created);
            groups.push(created);
        }
    }
    return groups;
}

function matchesQuickFilters(
    title: string,
    selectedByGroup: QuickFilter[][],
): boolean {
    return selectedByGroup.every((groupFilters) =>
        groupFilters.some((filter) =>
            filter.terms.every((term) => matchesTerm(title, term)),
        ),
    );
}

function matchesTerm(title: string, term: string): boolean {
    if (term.startsWith("/") && term.endsWith("/") && term.length > 2) {
        try {
            return new RegExp(term.slice(1, -1), "i").test(title);
        } catch {
            return false;
        }
    }
    const words = term.split(" ").filter(Boolean);
    return words.every((word) =>
        word.startsWith("!")
            ? !title.toLowerCase().includes(word.slice(1).toLowerCase())
            : title.toLowerCase().includes(word.toLowerCase()),
    );
}

function inRange(value: number | undefined, range: NumericRange): boolean {
    if (value === undefined) {
        return range.min === "" && range.max === "";
    }
    const min = numberOrUndefined(range.min);
    const max = numberOrUndefined(range.max);
    return (
        (min === undefined || value >= min) &&
        (max === undefined || value <= max)
    );
}

export function ageInDays(result: SearchResult): number | undefined {
    if (result.epoch === undefined) {
        return undefined;
    }
    return Math.max(0, (Date.now() / 1000 - result.epoch) / 86_400);
}

// The mock's recency threshold (`isNew = highlightRecent && r.ageDays <= 3`),
// used by the opt-in "Highlight recent" display preference (FM-041).
export const RECENT_RESULT_MAX_AGE_DAYS = 3;

// True only for a result whose age is at most `maxAgeDays` days, computed from
// the same `epoch` every other age-derived behavior uses. A result carrying no
// `epoch` has no computable age and is therefore never flagged, matching how
// `filterResults` already treats an unknown age.
export function isRecentResult(
    result: SearchResult,
    maxAgeDays: number = RECENT_RESULT_MAX_AGE_DAYS,
): boolean {
    const age = ageInDays(result);
    return age !== undefined && age <= maxAgeDays;
}

function numberOrUndefined(value: string): number | undefined {
    const number = Number(value);
    return value === "" || !Number.isFinite(number) ? undefined : number;
}

function unique(values: string[]): string[] {
    return [...new Set(values)].sort((first, second) =>
        first.localeCompare(second),
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

// Legacy renders the Size cell as `{{ ::result.size | byteFmt: 2 }}`
// (`core/ui-src/html/directives/search-result.html:51`). angular-filter's
// `byteFmt` steps in 1024s with `B`/`KB`/`MB`/... labels and concatenates a
// *number*, so `convertToDecimal`'s trailing zeros never reach the DOM --
// at most two decimals, not exactly two. Mirrored here so the React target
// shows the same string legacy does rather than the raw byte integer.
const RESULT_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

export function formatResultSize(bytes: number | null | undefined): string {
    // Legacy's byteFmt yields the string "NaN" for a non-numeric size; an
    // empty cell is friendlier than "NaN" and matches the missing-size case.
    if (typeof bytes !== "number" || !Number.isFinite(bytes)) {
        return "";
    }

    let unit = 0;
    while (unit < RESULT_SIZE_UNITS.length - 1 && bytes >= 1024 ** (unit + 1)) {
        unit++;
    }

    const value = bytes / (unit > 0 ? 1024 ** unit : 1);
    return `${Math.round(value * 100) / 100} ${RESULT_SIZE_UNITS[unit]}`;
}

// Legacy's `kify` filter (`core/ui-src/js/nzbhydra.js:317-324`): a value
// *greater than* 1000 is rendered in thousands, everything else verbatim. The
// boundary is deliberately `> 1000`, so 1000 stays "1000" and 1001 becomes
// "1k" -- reproduced exactly rather than rounded to the nearest sensible rule.
export function kify(value: number | null | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "";
    }
    return value > 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

/**
 * The Details cell legacy renders at `search-result.html:53-63`: the grab
 * count, then ` / `, then `seeders / peers` -- each part only when its value is
 * present. React previously collapsed the whole cell to `seeders ?? grabs`,
 * which showed one number and silently dropped the other two.
 *
 * The one place this is not a byte-for-byte port: legacy pipes a missing
 * `peers` through `kify` too, which renders nothing and leaves a dangling
 * "10 / " in the cell. Here a missing `peers` drops the separator with it, per
 * this task's null-safety requirement.
 */
export function formatResultDetails(result: {
    grabs?: number;
    peers?: number;
    seeders?: number;
}): string {
    const parts: string[] = [];
    if (result.grabs !== undefined) {
        parts.push(kify(result.grabs));
    }
    if (result.seeders !== undefined) {
        parts.push(
            result.peers === undefined
                ? kify(result.seeders)
                : `${kify(result.seeders)} / ${kify(result.peers)}`,
        );
    }
    return parts.join(" / ");
}

/**
 * The Actions column's track width, in px, for a given count of enabled
 * downloaders (FM-186).
 *
 * FM-175 sized the track at 140px for a fixed inventory: four 24px detail
 * icons plus the 24px direct download, i.e. 5x24 plus four 4px gaps = 136px,
 * so the icon group never wraps and the "Downloaded" chip still has a line to
 * drop to. Every enabled downloader now adds one more 24px `size="small"`
 * button and one more 4px gap to that same non-wrapping group, so the track
 * grows by exactly 28px per downloader and the 140px inventory is kept
 * whole.
 *
 * This is the single source for *both* of the table's width sets: the pixel
 * tracks used at and above the 1280px basis, and the percentages used below
 * it, which are this width over the 936px basis table. Typing either set by
 * hand would let them disagree at the basis, which is the one width where
 * they must be the same table to the pixel.
 */
export function actionsTrackWidth(downloaderCount: number): number {
    return 140 + 28 * downloaderCount;
}

/**
 * FM-200: the result columns the Display popover's "Columns" subsection can
 * switch off, by their TanStack column id -- `grabs` is the Details column.
 * Everything else (Title, Indexer, Size, Age, Actions, the checkbox) always
 * renders.
 */
export type HideableResultColumn = "category" | "grabs";

/**
 * FM-201: the columns whose absence resets a refine dimension -- the two the
 * reader can hide, plus the quality column, which exists only while the
 * quality indicator is on and some loaded result is rated.
 */
export type ConditionalResultColumn = HideableResultColumn | "quality";

/**
 * The basis table's width in px, i.e. what a 1280x800 viewport leaves beside
 * the docked refine sidebar. Every percentage track is its own pixel track
 * over this width, which is what makes the two track sets the same table at
 * the basis.
 */
const TABLE_BASIS_WIDTH = 936;

// FM-175's pixel tracks, keyed by column id rather than by position. The px
// values are the measured worst case of each column's own header label
// (uppercase 11px plus the sort glyph, plus the header cell's 8px paddings)
// rounded up: Indexer 88 -> 90, Category 96 -> 98, Size 64 -> 65, Details
// 87 -> 90, Age 51 -> 52; Details 90 is the owner's own number. Since
// 2026-09-27 the glyph sits 2px off its label (owner: the two touched), which
// the rounding already covered except for Size and Age, now 66 and 53. 2px is
// the most FM-175's 340px Title floor at 1280 leaves room for. Title has no
// entry: a track with no declared width is the only one that absorbs the
// whole remainder under `tableLayout: fixed`.
//
// FM-201: the conditional quality column's track is the wider of its header
// and its widest badge, each measured in Chromium at 1280x800 with its cell's
// 8px paddings: the header's 20px icon, sort glyph and 2px gap inside the
// button's 4px paddings needs 57.4px, the "10" badge 48px, so 58. Title pays
// for it only while the column exists.
const DATA_COLUMN_PIXEL_WIDTHS: Record<string, number> = {
    category: 98,
    epoch: 53,
    grabs: 90,
    indexer: 90,
    quality: 58,
    size: 66,
};

// The checkbox track: 40px in both sets, since it holds one fixed-size control.
const SELECT_TRACK_WIDTH = 40;

/** One rendered `<col>`, with its width in each of the table's two track sets. */
export type ColumnTrack = {
    // The `<col>`'s `data-column` value; the track rules select on it.
    id: string;
    // Used below the pixel-track breakpoint; `undefined` declares no width.
    narrowWidth: number | string | undefined;
    // Used at and above it; `undefined` declares no width.
    pixelWidth: number | undefined;
};

function percentOfBasis(width: number): string {
    return `${((width / TABLE_BASIS_WIDTH) * 100).toFixed(2)}%`;
}

/**
 * FM-200: the table's `<colgroup>`, derived from the *visible* data columns
 * rather than written out as a positional list: the checkbox, then each
 * visible data column in render order, then Actions.
 *
 * Before FM-200 both width sets were eight-entry arrays addressed by
 * `col:nth-of-type(n)`, so removing a middle column would have handed every
 * later column its left neighbour's width. Each track now carries its own
 * column id and both widths, and the table's rules select `<col>`s by that
 * id, so a hidden column takes nothing but its own track with it: every
 * other column keeps its width in both sets and Title (declared no width)
 * absorbs what the hidden one freed.
 *
 * The percentage set is each pixel track over the 936px basis, computed
 * rather than restated, so the two sets are the same table at the basis
 * whatever is hidden; the values for the default column set are the ones
 * FM-175 wrote out by hand, with Size and Age 1px wider since 2026-09-27. The Actions
 * track grows with `slotCount` (`actionsTrackWidth`).
 */
export function tableColumnTracks(
    visibleDataColumnIds: readonly string[],
    slotCount: number,
): ColumnTrack[] {
    const actionsWidth = actionsTrackWidth(slotCount);
    return [
        {
            id: "select",
            narrowWidth: SELECT_TRACK_WIDTH,
            pixelWidth: SELECT_TRACK_WIDTH,
        },
        ...visibleDataColumnIds.map((id): ColumnTrack => {
            const width = DATA_COLUMN_PIXEL_WIDTHS[id];
            return {
                id,
                narrowWidth:
                    width === undefined ? undefined : percentOfBasis(width),
                pixelWidth: width,
            };
        }),
        {
            id: "actions",
            narrowWidth: percentOfBasis(actionsWidth),
            pixelWidth: actionsWidth,
        },
    ];
}

/**
 * FM-200: `filters` as they apply while some columns are hidden -- each hidden
 * column's refine dimension at its default, `filters` itself when nothing is
 * hidden. Hiding a column already clears its filter (`clearColumnFilter`);
 * this also covers what arrives afterwards, since "Load more" can bring a
 * category the stored selection never held, and with the section hidden
 * nothing could select it. FM-201: the quality column's range follows the
 * same rule while that column is absent, so a bound nobody can see or clear
 * never drops every unrated result.
 */
export function withoutHiddenColumnFilters(
    filters: ResultFilters,
    defaults: ResultFilters,
    hidden: Record<ConditionalResultColumn, boolean>,
): ResultFilters {
    let effective = filters;
    for (const column of ["category", "grabs", "quality"] as const) {
        if (hidden[column]) {
            effective = clearColumnFilter(effective, defaults, column);
        }
    }
    return effective;
}

export function clearColumnFilter(
    filters: ResultFilters,
    defaults: ResultFilters,
    column: ConditionalResultColumn,
): ResultFilters {
    switch (column) {
        case "category":
            return {...filters, categories: defaults.categories};
        case "grabs":
            return {...filters, grabs: defaults.grabs};
        case "quality":
            return {...filters, qualityRating: defaults.qualityRating};
    }
}

/**
 * FM-187: whether any loaded result renders the row's send-to-black-hole
 * button, i.e. whether the Actions track has to reserve one more 28px slot
 * for it (`actionsTrackWidth(downloaders.length + 1)`).
 *
 * The rule per result is legacy's `save-or-send-file` gating verbatim
 * (`save-or-send-torrent.js` at `1982886e2`, rendered under
 * `search-result.html`'s `ng-if="result.downloadType!='TORBOX'"`): a TORRENT
 * shows the control when a torrent black hole *or* magnet sending is
 * configured, anything else is an NZB and shows it when an NZB black hole is,
 * and a TORBOX result never shows it at all.
 *
 * **Why this reads the results and not only the config.** `sendMagnetLinks`
 * defaults to `true` (`config/baseConfig.yml:281-283`), so a config-only slot
 * would be reserved on every stock install -- including the NZB-only ones
 * where no row can ever render the button -- and would cost Title 28px for
 * nothing. FM-176's expand slots reserve from the rendered rows for the same
 * reason.
 *
 * The caller passes the *unfiltered* loaded results, so a refine filter that
 * happens to hide every torrent does not shift the table's columns while the
 * user types.
 */
export function blackHoleSlot(
    results: Array<Pick<SearchResult, "downloadType">>,
    settings: {saveNzbs: boolean; saveTorrents: boolean; sendMagnets: boolean},
): boolean {
    return results.some((result) => {
        if (result.downloadType === "TORBOX") {
            return false;
        }
        return result.downloadType === "TORRENT"
            ? settings.saveTorrents || settings.sendMagnets
            : settings.saveNzbs;
    });
}
