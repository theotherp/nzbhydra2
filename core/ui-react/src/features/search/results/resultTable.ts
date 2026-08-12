import type {SearchResult} from "../../../api/search";

export type NumericRange = {min: string; max: string};

export type ResultFilters = {
    title: string;
    indexers: string[];
    categories: string[];
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
        size: {min: "", max: ""},
        grabs: {min: "", max: ""},
        age: {min: "", max: ""},
        quickFilters: Object.fromEntries(
            quickFilters.map((filter) => [quickFilterKey(filter), false]),
        ),
    };
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

function ageInDays(result: SearchResult): number | undefined {
    if (result.epoch === undefined) {
        return undefined;
    }
    return Math.max(0, (Date.now() / 1000 - result.epoch) / 86_400);
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
