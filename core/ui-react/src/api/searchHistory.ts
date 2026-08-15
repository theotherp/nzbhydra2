import {z} from "zod";

import type {RecentSearch} from "./recentSearches";
import {ApiTransport} from "./transport";

export type SearchHistoryFilters = {
    after?: string;
    before?: string;
    query?: string;
    category?: string;
    source?: "all" | "INTERNAL" | "API";
    userAgent?: string;
    username?: string;
    ip?: string;
};

export type SearchHistorySort = {
    column:
        | "time"
        | "query"
        | "user_agent"
        | "category_name"
        | "source"
        | "username"
        | "ip";
    sortMode: 1 | 2;
};

export type SearchHistoryEntry = RecentSearch & {
    id: number;
    time?: number | string;
    userAgent?: string;
    username?: string;
    ip?: string;
};
export type SearchHistoryPage = {
    searches: SearchHistoryEntry[];
    totalElements: number;
    malformedCount: number;
};
export type SearchHistoryDetails = {
    username?: string;
    ip?: string;
    userAgent?: string;
    source?: "INTERNAL" | "API";
    indexerSearches: Array<{
        indexerName: string;
        successful: boolean;
        resultsCount: number;
        responseTime?: number;
        errorMessage?: string;
    }>;
    malformedCount: number;
};

const optionalText = z
    .string()
    .min(1)
    .nullish()
    .transform((value) => value ?? undefined);
const indexerSearchSchema = z.object({
    indexerName: z.string().min(1),
    successful: z.boolean(),
    resultsCount: z.number().int().nonnegative(),
    responseTime: z
        .number()
        .finite()
        .nonnegative()
        .nullish()
        .transform((value) => value ?? undefined),
    errorMessage: optionalText,
});
const detailsSchema = z.object({
    username: optionalText,
    ip: optionalText,
    userAgent: optionalText,
    source: z
        .enum(["INTERNAL", "API"])
        .nullish()
        .transform((value) => value ?? undefined),
    indexerSearches: z
        .array(z.unknown())
        .nullish()
        .transform((value) => value ?? []),
});

export function searchHistoryRequest(
    page: number,
    limit: number,
    filters: SearchHistoryFilters,
    sort: SearchHistorySort,
) {
    const filterModel: Record<
        string,
        {filterType: string; filterValue: unknown}
    > = {};
    const text = (column: string, value: string | undefined) => {
        if (value?.trim())
            filterModel[column] = {
                filterType: "freetext",
                filterValue: value.trim(),
            };
    };
    if (filters.after || filters.before) {
        filterModel.time = {
            filterType: "time",
            filterValue: {
                after: toServerTime(filters.after),
                before: toServerTime(filters.before),
            },
        };
    }
    text("query", filters.query);
    if (filters.category)
        filterModel.category_name = {
            filterType: "checkboxes",
            filterValue: [filters.category],
        };
    if (filters.source && filters.source !== "all")
        filterModel.source = {
            filterType: "boolean",
            filterValue: filters.source,
        };
    text("user_agent", filters.userAgent);
    text("username", filters.username);
    text("ip", filters.ip);
    return {
        page,
        limit,
        filterModel,
        sortModel: sort,
        distinct: false,
        onlyCurrentUser: false,
    };
}

export async function getSearchHistory(
    transport: ApiTransport,
    page: number,
    limit: number,
    filters: SearchHistoryFilters,
    sort: SearchHistorySort,
): Promise<SearchHistoryPage> {
    const response = await transport.request<unknown>(
        "internalapi/history/searches",
        {
            method: "POST",
            json: searchHistoryRequest(page, limit, filters, sort),
        },
    );
    if (
        !response ||
        typeof response !== "object" ||
        !Array.isArray((response as {content?: unknown}).content) ||
        !Number.isInteger((response as {totalElements?: unknown}).totalElements)
    ) {
        throw new Error("Search history response has an invalid format");
    }
    const searches: SearchHistoryEntry[] = [];
    let malformedCount = 0;
    for (const entry of (response as {content: unknown[]}).content) {
        const parsed = historyEntry(entry);
        if (parsed) searches.push(parsed);
        else malformedCount++;
    }
    return {
        searches,
        totalElements: (response as {totalElements: number}).totalElements,
        malformedCount,
    };
}

function historyEntry(value: unknown): SearchHistoryEntry | undefined {
    if (!value || typeof value !== "object") return undefined;
    const entry = value as Record<string, unknown>;
    const id = Number(entry.id);
    if (
        !Number.isInteger(id) ||
        typeof entry.categoryName !== "string" ||
        !entry.categoryName
    )
        return undefined;
    const optionalTextValue = (field: string) =>
        typeof entry[field] === "string" && entry[field]
            ? entry[field]
            : undefined;
    const optionalNumber = (field: string) =>
        typeof entry[field] === "number" && Number.isInteger(entry[field])
            ? entry[field]
            : undefined;
    const identifiers = Array.isArray(entry.identifiers)
        ? entry.identifiers.flatMap((identifier) => {
              if (!identifier || typeof identifier !== "object") return [];
              const pair = identifier as Record<string, unknown>;
              return typeof pair.identifierKey === "string" &&
                  pair.identifierKey &&
                  typeof pair.identifierValue === "string" &&
                  pair.identifierValue
                  ? [
                        {
                            identifierKey: pair.identifierKey,
                            identifierValue: pair.identifierValue,
                        },
                    ]
                  : [];
          })
        : [];
    const source =
        entry.source === "INTERNAL" || entry.source === "API"
            ? entry.source
            : undefined;
    const searchType =
        entry.searchType === "BOOK" ||
        entry.searchType === "MOVIE" ||
        entry.searchType === "MUSIC" ||
        entry.searchType === "SEARCH" ||
        entry.searchType === "TVSEARCH"
            ? entry.searchType
            : undefined;
    return {
        id,
        categoryName: entry.categoryName,
        time:
            typeof entry.time === "number" || typeof entry.time === "string"
                ? entry.time
                : undefined,
        source,
        searchType,
        query: optionalTextValue("query"),
        title: optionalTextValue("title"),
        season: optionalNumber("season"),
        episode: optionalTextValue("episode"),
        author: optionalTextValue("author"),
        identifiers,
        minAge: optionalNumber("minAge"),
        maxAge: optionalNumber("maxAge"),
        minSize: optionalNumber("minSize"),
        maxSize: optionalNumber("maxSize"),
        selectedIndexers: Array.isArray(entry.selectedIndexers)
            ? entry.selectedIndexers.filter(
                  (name): name is string =>
                      typeof name === "string" && name.length > 0,
              )
            : undefined,
        userAgent: optionalTextValue("userAgent"),
        username: optionalTextValue("username"),
        ip: optionalTextValue("ip"),
    };
}

export async function getSearchHistoryDetails(
    transport: ApiTransport,
    id: number,
): Promise<SearchHistoryDetails> {
    if (!Number.isInteger(id))
        throw new Error("Search history ID must be an integer");
    const response = await transport.request<unknown>(
        `internalapi/history/searches/details/${id}`,
    );
    const parsed = detailsSchema.safeParse(response);
    if (!parsed.success)
        throw new Error(
            "Search history details response has an invalid format",
        );
    const indexerSearches: SearchHistoryDetails["indexerSearches"] = [];
    let malformedCount = 0;
    for (const entry of parsed.data.indexerSearches) {
        const indexed = indexerSearchSchema.safeParse(entry);
        if (indexed.success) indexerSearches.push(indexed.data);
        else malformedCount++;
    }
    return {...parsed.data, indexerSearches, malformedCount};
}

function toServerTime(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
