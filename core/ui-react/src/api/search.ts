import {z} from "zod";

import type {components} from "./generated/openapi";
import {ApiTransport} from "./transport";

export type SearchRequest = Required<
    Pick<
        components["schemas"]["SearchRequestParameters"],
        "category" | "loadAll" | "searchRequestId"
    >
> &
    Omit<
        components["schemas"]["SearchRequestParameters"],
        "category" | "loadAll" | "searchRequestId"
    >;

export type SearchResult = {
    searchResultId: string;
    title: string;
    indexer: string;
    category: string;
    size?: number;
    age?: string;
    epoch?: number;
    grabs?: number;
    seeders?: number;
    hash?: number;
    downloadType?: string;
    showtitle?: string;
    season?: string;
    episode?: string;
    downloadId?: string;
    originalCategory?: string;
    downloadedAt?: string;
};

export type SearchResponse = {
    searchResults: SearchResult[];
    malformedResultCount: number;
    indexerSearchMetaDatas: Array<{
        indexerName: string;
        wasSuccessful: boolean;
        hasMoreResults?: boolean;
        totalResultsKnown?: boolean;
    }>;
    indexerLimitWarnings: string[];
    rejectedReasonsMap: Record<string, number>;
    notPickedIndexersWithReason: Record<string, string>;
    numberOfAvailableResults: number;
    numberOfRejectedResults: number;
    numberOfProcessedResults?: number;
    numberOfAcceptedResults?: number;
    offset?: number;
    limit?: number;
    pagingState: "ready" | "partial";
};

export class MalformedSearchResponseError extends Error {
    constructor() {
        super("The search response has an invalid format");
    }
}

const responseSchema = z.object({
    searchResults: z.array(z.unknown()),
    indexerSearchMetaDatas: z.array(z.unknown()),
    indexerLimitWarnings: z.array(z.string()),
    rejectedReasonsMap: z.record(z.string(), z.number()),
    notPickedIndexersWithReason: z.record(z.string(), z.string()),
    numberOfAvailableResults: z.number().int().nonnegative(),
    numberOfRejectedResults: z.number().int().nonnegative(),
    numberOfProcessedResults: z.number().int().nonnegative().optional(),
    numberOfAcceptedResults: z.number().int().nonnegative().optional(),
    offset: z.number().int().nonnegative().optional(),
    limit: z.number().int().nonnegative().optional(),
});

export async function executeSearch(
    transport: ApiTransport,
    request: SearchRequest,
): Promise<SearchResponse> {
    const response = await transport.request<unknown>("internalapi/search", {
        method: "POST",
        json: request,
    });
    return parseSearchResponse(response);
}

export async function shortcutSearch(
    transport: ApiTransport,
    searchRequestId: number,
): Promise<void> {
    await transport.request(`internalapi/shortcutSearch/${searchRequestId}`, {
        method: "POST",
    });
}

export function parseSearchResponse(response: unknown): SearchResponse {
    const parsed = responseSchema.safeParse(response);
    if (!parsed.success) {
        throw new MalformedSearchResponseError();
    }
    const validResults: SearchResult[] = [];
    let malformedResultCount = 0;
    for (const entry of parsed.data.searchResults) {
        const result = resultSchema.safeParse(entry);
        if (result.success) {
            validResults.push(result.data);
        } else {
            malformedResultCount += 1;
        }
    }
    const metadata = parsed.data.indexerSearchMetaDatas.flatMap((entry) => {
        const result = metadataSchema.safeParse(entry);
        return result.success ? [result.data] : [];
    });
    const pagingState =
        parsed.data.offset === undefined ||
        parsed.data.limit === undefined ||
        parsed.data.numberOfProcessedResults === undefined
            ? "partial"
            : "ready";
    return {
        ...parsed.data,
        searchResults: validResults,
        malformedResultCount,
        indexerSearchMetaDatas: metadata,
        pagingState,
    };
}

const resultSchema = z.object({
    searchResultId: z.string().min(1),
    title: z.string().min(1),
    indexer: z.string().min(1).default("Unknown"),
    category: z.string().min(1).default("Unknown"),
    size: z.number().finite().optional(),
    age: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    epoch: z
        .number()
        .finite()
        .nonnegative()
        .nullish()
        .transform((value) => value ?? undefined),
    grabs: z
        .number()
        .finite()
        .nonnegative()
        .nullish()
        .transform((value) => value ?? undefined),
    seeders: z
        .number()
        .finite()
        .nonnegative()
        .nullish()
        .transform((value) => value ?? undefined),
    hash: z
        .number()
        .finite()
        .nullish()
        .transform((value) => value ?? undefined),
    downloadType: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    showtitle: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    season: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    episode: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    downloadId: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    originalCategory: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    downloadedAt: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
});

const metadataSchema = z.object({
    indexerName: z.string().min(1),
    wasSuccessful: z.boolean().default(false),
    hasMoreResults: z.boolean().optional(),
    totalResultsKnown: z.boolean().optional(),
});

export function continuationRequest(
    request: SearchRequest,
    offset: number,
    limit: number | undefined,
    loadAll: boolean,
): SearchRequest {
    return {...request, offset, limit, loadAll};
}

export function mergeSearchResponses(
    previous: SearchResponse,
    next: SearchResponse,
): SearchResponse {
    const results = new Map<string, SearchResult>();
    for (const result of previous.searchResults) {
        results.set(result.searchResultId, result);
    }
    for (const result of next.searchResults) {
        results.set(result.searchResultId, result);
    }
    return {
        ...next,
        searchResults: [...results.values()],
        malformedResultCount:
            previous.malformedResultCount + next.malformedResultCount,
        offset: Math.max(previous.offset ?? 0, next.offset ?? 0),
        limit: next.limit,
        pagingState:
            previous.pagingState === "ready" && next.pagingState === "ready"
                ? "ready"
                : "partial",
    };
}
