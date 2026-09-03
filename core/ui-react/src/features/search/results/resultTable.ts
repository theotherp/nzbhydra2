import type {SearchResult} from "../../../api/search";

export type NumericRange = {min: string; max: string};

export type ResultFilters = {
    title: string;
    indexers: string[];
    categories: string[];
    downloadTypes: string[];
    size: NumericRange;
    grabs: NumericRange;
    age: NumericRange;
    quickFilters: Record<string, boolean>;
};

export type QuickFilter = {
    group: "source" | "quality" | "other" | "custom";
    id: string;
    label: string;
    terms: string[];
};

export type GroupingOptions = {
    groupTorrentAndUsenet: boolean;
    groupEpisodes: boolean;
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
    const titleGroups = new Map<string, SearchResult[]>();
    for (const result of results) {
        const key = groupingKey(result, options);
        titleGroups.set(key, [...(titleGroups.get(key) ?? []), result]);
    }
    return [...titleGroups.entries()].map(([key, groupedResults]) => {
        const duplicates = new Map<string, SearchResult[]>();
        for (const result of groupedResults) {
            const duplicateKey =
                result.hash === undefined
                    ? `result:${result.searchResultId}`
                    : `hash:${result.hash}`;
            duplicates.set(duplicateKey, [
                ...(duplicates.get(duplicateKey) ?? []),
                result,
            ]);
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
    return `${groupKey}|${result.hash === undefined ? `result:${result.searchResultId}` : `hash:${result.hash}`}`;
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

function groupingKey(result: SearchResult, options: GroupingOptions): string {
    const episodeKey = `${result.showtitle ?? ""}|${result.season ?? ""}|${result.episode ?? ""}`;
    if (
        options.groupEpisodes &&
        !options.episodeRequested &&
        result.category.toLowerCase().includes("tv") &&
        result.showtitle !== undefined &&
        result.season !== undefined &&
        result.episode !== undefined
    ) {
        return `episode:${normalizeGroupingValue(episodeKey)}`;
    }
    const downloadType = options.groupTorrentAndUsenet
        ? ""
        : `|${result.downloadType ?? "unknown"}`;
    return `title:${normalizeGroupingValue(result.title)}${downloadType}`;
}

function normalizeGroupingValue(value: string): string {
    return value.toLocaleLowerCase().replace(/[\s._-]+/g, "");
}

export function quickFilterKey(
    filter: Pick<QuickFilter, "group" | "id">,
): string {
    return `${filter.group}|${filter.id}`;
}

const sourceFilters: QuickFilter[] = [
    {group: "source", id: "camts", label: "CAM / TS", terms: ["cam", "ts"]},
    {group: "source", id: "tv", label: "TV", terms: ["hdtv"]},
    {
        group: "source",
        id: "web",
        label: "WEB",
        terms: ["webrip", "web-dl", "webdl"],
    },
    {group: "source", id: "dvd", label: "DVD", terms: ["dvd"]},
    {
        group: "source",
        id: "bluray",
        label: "Blu-Ray",
        terms: ["bluray", "blu-ray"],
    },
];

const qualityFilters: QuickFilter[] = [480, 720, 1080, 2160].map((quality) => ({
    group: "quality",
    id: `q${quality}p`,
    label: `${quality}p`,
    terms: [`${quality}p`],
}));

const otherFilters: QuickFilter[] = [
    {group: "other", id: "q3d", label: "3D", terms: ["3d"]},
    {group: "other", id: "x265", label: "x265", terms: ["x265"]},
    {group: "other", id: "hevc", label: "HEVC", terms: ["hevc"]},
];

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
        quickFilters: Object.fromEntries(
            quickFilters.map((filter) => [quickFilterKey(filter), false]),
        ),
    };
}

/**
 * FM-181: how many of the refine surface's eight filter dimensions -- title,
 * categories, indexers, download types, size, age, grabs, quick filters --
 * currently differ from `defaultFilters(results, quickFilters)`.
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
    results: SearchResult[],
    quickFilters: QuickFilter[],
): number {
    const defaults = defaultFilters(results, quickFilters);
    const changed = [
        filters.title !== defaults.title,
        ...(["categories", "downloadTypes", "indexers"] as const).map(
            (key) => !sameValues(filters[key], defaults[key]),
        ),
        ...(["age", "grabs", "size"] as const).map(
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
        [...left].sort().join(" ") === [...right].sort().join(" ")
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

export function quickFiltersFromSafeConfig(value: unknown): QuickFilter[] {
    if (
        !isRecord(value) ||
        !isRecord(value.searching) ||
        value.searching.showQuickFilterButtons !== true
    ) {
        return [];
    }
    const custom = Array.isArray(value.searching.customQuickFilterButtons)
        ? value.searching.customQuickFilterButtons.flatMap(
              parseCustomQuickFilter,
          )
        : [];
    return [...sourceFilters, ...qualityFilters, ...otherFilters, ...custom];
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
): SearchResult[] {
    const titleMatcher = makeTitleMatcher(filters.title);
    return results.filter(
        (result) =>
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
            matchesQuickFilters(
                result.title,
                filters.quickFilters,
                quickFilters,
            ),
    );
}

function parseCustomQuickFilter(entry: unknown): QuickFilter[] {
    if (typeof entry !== "string") {
        return [];
    }
    const separator = entry.indexOf("=");
    if (separator <= 0) {
        return [];
    }
    const label = entry.slice(0, separator).trim();
    const terms = entry
        .slice(separator + 1)
        .split(",")
        .map((term) => term.trim())
        .filter(Boolean);
    return label && terms.length > 0
        ? [{group: "custom", id: label, label, terms}]
        : [];
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

function matchesQuickFilters(
    title: string,
    selected: Record<string, boolean>,
    filters: QuickFilter[],
): boolean {
    const selectedByGroup = filters
        .filter((filter) => selected[quickFilterKey(filter)])
        .reduce<Partial<Record<QuickFilter["group"], QuickFilter[]>>>(
            (groups, filter) => {
                (groups[filter.group] ??= []).push(filter);
                return groups;
            },
            {},
        );
    return Object.values(selectedByGroup).every((groupFilters) =>
        groupFilters[0].group === "custom"
            ? groupFilters.every((filter) =>
                  filter.terms.every((term) => matchesTerm(title, term)),
              )
            : groupFilters.some((filter) =>
                  filter.group === "source"
                      ? filter.terms.some((term) => matchesTerm(title, term))
                      : filter.terms.every((term) => matchesTerm(title, term)),
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
