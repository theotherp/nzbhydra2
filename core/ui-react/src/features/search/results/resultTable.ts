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
