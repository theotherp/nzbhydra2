import {z} from "zod";

import type {CategoryCatalog} from "../../../domain/categories/catalog";

const numericString = z.string().regex(/^\d*$/);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- read only via `typeof` below, which derives the exported SearchFormValues type.
const searchFormSchema = z.object({
    query: z.string(),
    category: z.string().min(1),
    minage: numericString,
    maxage: numericString,
    minsize: numericString,
    maxsize: numericString,
    title: z.string(),
    additionalQuery: z.string(),
    season: numericString,
    episode: z.string(),
    imdbId: z.string(),
    tmdbId: z.string(),
    tvdbId: z.string(),
    tvmazeId: z.string(),
    tvrageId: z.string(),
    indexers: z.array(z.string()),
});

export type SearchFormValues = z.infer<typeof searchFormSchema>;

export function valuesFromSearch(
    search: Record<string, unknown>,
    catalog: CategoryCatalog,
): SearchFormValues {
    const category =
        typeof search.category === "string" &&
        catalog.categories.some((entry) => entry.name === search.category)
            ? search.category
            : catalog.defaultCategory.name;
    const field = (name: string) =>
        typeof search[name] === "string" && /^\d*$/.test(search[name])
            ? search[name]
            : "";
    const preset =
        catalog.enableCategorySizes && category === catalog.defaultCategory.name
            ? catalog.defaultCategory
            : catalog.categories.find((entry) => entry.name === category);
    return {
        query: typeof search.query === "string" ? search.query : "",
        category,
        minage: field("minage"),
        maxage: field("maxage"),
        minsize: field("minsize") || (preset?.minSizePreset?.toString() ?? ""),
        maxsize: field("maxsize") || (preset?.maxSizePreset?.toString() ?? ""),
        title:
            typeof search.title === "string"
                ? search.title
                : typeof search.query === "string"
                  ? search.query
                  : "",
        additionalQuery:
            typeof search.query === "string" && typeof search.title === "string"
                ? search.query
                : "",
        season: field("season"),
        episode: typeof search.episode === "string" ? search.episode : "",
        imdbId: fieldValue(search, "imdbId"),
        tmdbId: fieldValue(search, "tmdbId"),
        tvdbId: fieldValue(search, "tvdbId"),
        tvmazeId: fieldValue(search, "tvmazeId"),
        tvrageId: fieldValue(search, "tvrageId"),
        indexers: indexersFromSearch(search, catalog, category),
    };
}

function indexersFromSearch(
    search: Record<string, unknown>,
    catalog: CategoryCatalog,
    category: string,
): string[] {
    const eligible = new Set(
        catalog.eligibleIndexers(category).map((indexer) => indexer.name),
    );
    if (typeof search.indexers !== "string") {
        return catalog.preselectedIndexerNames(category);
    }
    return search.indexers.split(",").filter((name) => eligible.has(name));
}

function fieldValue(search: Record<string, unknown>, name: string): string {
    return typeof search[name] === "string" ? search[name] : "";
}

// The single source of truth for which form field's text a non-identifier
// search submits: the visible `search-query` input registers to `title` for
// a media category and to `query` otherwise (`mediaTypeForCategoryName`,
// mirrored from the render's own resolution at `mediaType` below), never a
// `title || query` fallback. Both `canonicalSearch` (the URL writer) and
// `SearchPage.submit()` (the request builder) call this one function so the
// address bar and the executed request can never disagree about which
// field's text was actually submitted -- see FM-051.
export function nonIdentifierQueryText(
    values: SearchFormValues,
    catalog: CategoryCatalog,
): string {
    return mediaTypeForCategoryName(catalog, values.category)
        ? values.title
        : values.query;
}

export function canonicalSearch(
    values: SearchFormValues,
    catalog: CategoryCatalog,
): Record<string, string> {
    return Object.fromEntries(
        Object.entries({
            query: hasIdentifier(values)
                ? values.additionalQuery
                : nonIdentifierQueryText(values, catalog),
            category: values.category,
            minage: values.minage,
            maxage: values.maxage,
            minsize: values.minsize,
            maxsize: values.maxsize,
            title: hasIdentifier(values) ? values.title : "",
            season: values.season,
            episode: values.episode,
            imdbId: values.imdbId,
            tmdbId: values.tmdbId,
            tvdbId: values.tvdbId,
            tvmazeId: values.tvmazeId,
            tvrageId: values.tvrageId,
            indexers: values.indexers.join(","),
        }).filter(([, value]) => value !== ""),
    );
}

export const identifierFields = [
    "imdbId",
    "tmdbId",
    "tvdbId",
    "tvmazeId",
    "tvrageId",
] as const;

export function hasIdentifier(values: SearchFormValues): boolean {
    return identifierFields.some((field) => values[field] !== "");
}

function mediaTypeForCategory(
    searchType: "BOOK" | "MOVIE" | "MUSIC" | "SEARCH" | "TVSEARCH" | undefined,
): "MOVIE" | "TV" | undefined {
    if (searchType === "MOVIE") {
        return "MOVIE";
    }
    if (searchType === "TVSEARCH") {
        return "TV";
    }
    return undefined;
}

export function mediaTypeForCategoryName(
    catalog: CategoryCatalog,
    categoryName: string,
): "MOVIE" | "TV" | undefined {
    return mediaTypeForCategory(
        catalog.categories.find((category) => category.name === categoryName)
            ?.searchType,
    );
}
