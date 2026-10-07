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

/**
 * `SearchResultWebTO.hasNfo` carries the name of the backend's `HasNfo` enum.
 * Legacy's directive additionally tested a `has_nfo === 0` field
 * (`search-result.js:150`) that no response has ever contained — dead code, not
 * carried over. Only these three names are real.
 */
export type HasNfo = "YES" | "MAYBE" | "NO";

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
    /** Torrent leechers, shown beside `seeders` in the Details column. */
    peers?: number;
    /** The *number* of comments, which only gates the comments link's dimming. */
    comments?: number;
    /** The indexer's comments page for this result. */
    comments_link?: string;
    /** The indexer's details page for this result. */
    details_link?: string;
    /** The usenet poster/source string a Binsearch query is built from. */
    source?: string;
    hasNfo?: HasNfo;
    /**
     * FM-177: the indexer's cover image for this result, in one of the two
     * shapes the backend emits (`InternalSearchResultProcessor.transformSearchResults`):
     * the indexer's own absolute `http(s)` URL, or -- with `main.proxyImages`
     * on -- the base-relative, signed `cache/<url>/<signature>` path served by
     * Hydra itself. Present only when the result carried a cover and the
     * value passed the boundary check below (`isSupportedCoverUrl`).
     */
    cover?: string;
    hash?: number;
    downloadType?: string;
    showtitle?: string;
    season?: string;
    episode?: string;
    downloadId?: string;
    originalCategory?: string;
    downloadedAt?: string;
    /**
     * Movie quality indicator (`InternalSearchResultProcessor`, ~line 222):
     * both fields are populated together, only for movie-category results,
     * and only when `searching.showMovieQualityIndicator` is on -- so the
     * badge needs no config lookup of its own, just presence of `qualityRating`.
     */
    qualityRating?: number;
    qualityWarnings?: string[];
};

/**
 * One searched indexer's `IndexerSearchMetaData`.
 *
 * FM-199: every entry describes that indexer's *most recent* request only, not
 * the search as a whole. `Searcher.search` hands back the last
 * `IndexerSearchResult` of each indexer's cache entry
 * (`Iterables.getLast(...)`), so after a "Load more" or "Load all" the counts
 * and the response time are those of the latest page fetched from that
 * indexer -- or, for an indexer the continuation did not query again, still
 * those of its earlier request. `numberOfFoundResults` counts that page's
 * results that passed the acceptor; `numberOfAvailableResults` is the total
 * the indexer reported with it (a lower bound when `totalResultsKnown` is
 * false). A continuation's response replaces the whole list
 * (`mergeSearchResponses` keeps `next`'s), so nothing here is ever summed.
 */
type IndexerSearchMetaData = {
    indexerName: string;
    wasSuccessful: boolean;
    hasMoreResults?: boolean;
    totalResultsKnown?: boolean;
    didSearch?: boolean;
    errorMessage?: string;
    /** Milliseconds the latest request took. */
    responseTime?: number;
    numberOfFoundResults?: number;
    numberOfAvailableResults?: number;
};

export type SearchResponse = {
    searchResults: SearchResult[];
    malformedResultCount: number;
    indexerSearchMetaDatas: IndexerSearchMetaData[];
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

// Only used for the server's log line.
export type AbortSearchReason =
    | "newSearch"
    | "cancelled"
    | "leftPage"
    | "tabClosed";

// Stops a running internal search on the server, e.g. a "Load all" nobody is
// waiting for anymore. `keepalive` lets the request outlive a closed tab.
export async function abortSearch(
    transport: ApiTransport,
    searchRequestId: number,
    reason?: AbortSearchReason,
    keepalive?: boolean,
): Promise<void> {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
    await transport.request(
        `internalapi/abortSearch/${searchRequestId}${query}`,
        {
            method: "POST",
            ...(keepalive ? {keepalive: true} : {}),
        },
    );
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
    size: z
        .number()
        .finite()
        .nullish()
        .transform((value) => value ?? undefined),
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
    peers: z
        .number()
        .finite()
        .nonnegative()
        .nullish()
        .transform((value) => value ?? undefined),
    comments: z
        .number()
        .finite()
        .nonnegative()
        .nullish()
        .transform((value) => value ?? undefined),
    comments_link: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    details_link: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    source: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    // An unknown value is dropped rather than rejecting the whole result: a
    // result whose NFO availability cannot be classified still displays, with
    // the NFO action treated exactly like "NO" (see `nfoTooltip`).
    hasNfo: z
        .enum(["YES", "MAYBE", "NO"])
        .nullish()
        .catch(undefined)
        .transform((value) => value ?? undefined),
    hash: z
        .number()
        .finite()
        .nullish()
        .transform((value) => value ?? undefined),
    // FM-177 (ADR-0003): the cover is an indexer-supplied string that ends up
    // in an `<img src>`, so it is checked here rather than at the render site,
    // and anything that is not one of the backend's own two shapes is dropped
    // (`cover: undefined`) instead of invalidating the whole result -- a
    // result whose cover cannot be trusted still displays, just without an
    // image. `z.string().url()` cannot express this: it rejects the relative
    // `cache/...` shape and accepts `javascript:`/`data:` URLs.
    cover: z
        .string()
        .nullish()
        .transform((value) =>
            typeof value === "string" && isSupportedCoverUrl(value)
                ? value
                : undefined,
        ),
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
    qualityRating: z
        .number()
        .finite()
        .nullish()
        .transform((value) => value ?? undefined),
    qualityWarnings: z
        .array(z.string())
        .nullish()
        .transform((value) => value ?? undefined),
});

/**
 * FM-177: the backend's proxied image shape (`ProxyImageUrlSigner`) --
 * `cache/<url-safe Base64 of the original URL>/<url-safe Base64 of its HMAC>`,
 * both unpadded, which is exactly this alphabet. A base-relative path with no
 * scheme, no leading `/` and no `.`, so it can neither name another origin nor
 * climb out of the application base; `ApiTransport.browserTransferUrl`
 * re-checks the containment anyway.
 */
const PROXIED_IMAGE_PATH = /^cache\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

/**
 * Whether an image URL is the backend's base-relative proxied `cache/...`
 * path, which has to be resolved against the application base before use.
 */
export function isProxiedImagePath(url: string): boolean {
    return PROXIED_IMAGE_PATH.test(url);
}

/**
 * Whether a validated `SearchResult.cover` is the indexer's own absolute URL
 * (used as `src` verbatim) rather than the proxied `cache/...` path (which
 * has to be resolved against the application base first).
 */
export function isAbsoluteCoverUrl(cover: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(cover);
    } catch {
        return false;
    }
    // Only the two web schemes: an indexer that hands back `javascript:` or a
    // `data:` payload must never reach an `<img src>`.
    return parsed.protocol === "http:" || parsed.protocol === "https:";
}

function isSupportedCoverUrl(cover: string): boolean {
    return isAbsoluteCoverUrl(cover) || isProxiedImagePath(cover);
}

// FM-199: the per-indexer summary's fields. A `null`, missing or unusable
// value (wrong type, negative count) becomes `undefined` and leaves that cell
// blank, via `.catch` like `hasNfo` above: before this task an entry was kept
// whatever these fields held, and the entries also decide `allIndexersFailed`
// and "more results available", so these display-only fields must never be
// what drops one. An entry that fails the fields above (no `indexerName`, a
// non-boolean `wasSuccessful`) is still malformed and dropped, not fatal.
const metadataSchema = z.object({
    indexerName: z.string().min(1),
    wasSuccessful: z.boolean().default(false),
    hasMoreResults: z.boolean().optional(),
    totalResultsKnown: z.boolean().optional(),
    didSearch: z
        .boolean()
        .nullish()
        .catch(undefined)
        .transform((value) => value ?? undefined),
    errorMessage: z
        .string()
        .nullish()
        .catch(undefined)
        .transform((value) => (value ? value : undefined)),
    responseTime: z
        .number()
        .finite()
        .nonnegative()
        .nullish()
        .catch(undefined)
        .transform((value) => value ?? undefined),
    numberOfFoundResults: z
        .number()
        .int()
        .nonnegative()
        .nullish()
        .catch(undefined)
        .transform((value) => value ?? undefined),
    numberOfAvailableResults: z
        .number()
        .int()
        .nonnegative()
        .nullish()
        .catch(undefined)
        .transform((value) => value ?? undefined),
});

/**
 * FM-199: the indexers this search queried that failed -- the per-indexer
 * summary's "N failed" and the toolbar's hint while that summary is hidden.
 */
export function failedIndexerCount(response: SearchResponse): number {
    return response.indexerSearchMetaDatas.filter(
        (entry) => entry.didSearch !== false && !entry.wasSuccessful,
    ).length;
}

/**
 * How many results the indexers still hold beyond what this search has loaded:
 * the reported total, minus what was rejected, minus the cache position the
 * next continuation starts at (`offset + limit`, every accepted result loaded
 * so far). `numberOfProcessedResults` cannot stand in for the latter: the
 * server counts only the latest page's accepted results in it.
 */
export function remainingResults(response: SearchResponse): number | undefined {
    if (response.offset === undefined || response.limit === undefined) {
        return undefined;
    }
    return Math.max(
        0,
        response.numberOfAvailableResults -
            response.numberOfRejectedResults -
            (response.offset + response.limit),
    );
}

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
