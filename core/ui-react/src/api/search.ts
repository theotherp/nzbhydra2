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
};

export type SearchResponse = {
    searchResults: SearchResult[];
    malformedResultCount: number;
    indexerSearchMetaDatas: Array<{
        indexerName: string;
        wasSuccessful: boolean;
    }>;
    indexerLimitWarnings: string[];
    rejectedReasonsMap: Record<string, number>;
    notPickedIndexersWithReason: Record<string, string>;
    numberOfAvailableResults: number;
    numberOfRejectedResults: number;
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
    return {
        ...parsed.data,
        searchResults: validResults,
        malformedResultCount,
        indexerSearchMetaDatas: metadata,
    };
}

const resultSchema = z.object({
    searchResultId: z.string().min(1),
    title: z.string().min(1),
    indexer: z.string().min(1).default("Unknown"),
    category: z.string().min(1).default("Unknown"),
    size: z.number().finite().optional(),
    age: z.string().optional(),
});

const metadataSchema = z.object({
    indexerName: z.string().min(1),
    wasSuccessful: z.boolean().default(false),
});
