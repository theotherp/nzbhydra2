import {z} from "zod";

import type {HistoryDimension} from "./history/filters";
import {
    requestHistoryPage,
    type HistoryPage,
    type HistoryQuery,
} from "./history/request";
import type {RecentSearch} from "./recentSearches";
import {ApiTransport} from "./transport";

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

/**
 * The route's dimensions in the shared `C-HISTORY-REQUEST` vocabulary. Every
 * dimension keeps the server column legacy's `search-history.html` filters on
 * that column with (`time`, `query`, `category_name`, `source`, `user_agent`,
 * `username`, `ip`).
 *
 * `categoryNames` come from `C-CATEGORY-CATALOG`, matching legacy's own
 * `categoriesForFiltering` (every selectable category, `search-history-
 * controller.js`); category becomes a `checkboxes` multi-select under
 * ADR-0016 rather than legacy's single-select-with-preselect-and-invert.
 *
 * `user_agent` is declared only while the route's own "Show user agents"
 * display toggle is on -- it stays a table-display control outside the bar's
 * dimension model, so its dimension simply does not exist while the column is
 * hidden.
 */
export function searchHistoryDimensions(options: {
    categoryNames: readonly string[];
    showUserAgent: boolean;
    showsUsername: boolean;
    showsIp: boolean;
}): HistoryDimension[] {
    return [
        {
            kind: "time",
            id: "time",
            column: "time",
            label: "Time",
            afterLabel: "After",
            beforeLabel: "Before",
        },
        {kind: "freetext", id: "query", column: "query", label: "Query"},
        {
            kind: "checkboxes",
            id: "category",
            column: "category_name",
            label: "Category",
            options: options.categoryNames.map((name) => ({
                value: name,
                label: name,
            })),
        },
        {
            kind: "boolean",
            id: "source",
            column: "source",
            label: "Source",
            allLabel: "All sources",
            options: [
                {value: "INTERNAL", label: "Internal"},
                {value: "API", label: "API"},
            ],
        },
        ...(options.showUserAgent
            ? ([
                  {
                      kind: "freetext",
                      id: "user-agent",
                      column: "user_agent",
                      label: "User agent",
                  },
              ] as const)
            : []),
        ...(options.showsUsername
            ? ([
                  {
                      kind: "freetext",
                      id: "username",
                      column: "username",
                      label: "Username",
                  },
              ] as const)
            : []),
        ...(options.showsIp
            ? ([
                  {
                      kind: "freetext",
                      id: "ip",
                      column: "ip",
                      label: "IP address",
                  },
              ] as const)
            : []),
    ];
}

export async function getSearchHistory(
    transport: ApiTransport,
    query: HistoryQuery,
): Promise<HistoryPage<SearchHistoryEntry>> {
    return requestHistoryPage(transport, {
        path: "internalapi/history/searches",
        label: "Search history",
        query,
        parseEntry: historyEntry,
    });
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
