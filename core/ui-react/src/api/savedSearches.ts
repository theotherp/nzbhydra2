import {z} from "zod";

import type {SearchRequest} from "./search";
import {ApiTransport} from "./transport";

export type SavedSearch = {
    categoryName: string;
    searchType?: "BOOK" | "MOVIE" | "MUSIC" | "SEARCH" | "TVSEARCH";
    query?: string;
    title?: string;
    season?: number;
    episode?: string;
    author?: string;
    identifiers: Array<{identifierKey: string; identifierValue: string}>;
    minAge?: number;
    maxAge?: number;
    minSize?: number;
    maxSize?: number;
};

export type SavedSearchList = {
    searches: Array<{search: SavedSearch; serverIndex: number}>;
    malformedCount: number;
};

const optionalText = z
    .string()
    .min(1)
    .nullish()
    .transform((value) => value ?? undefined);
const savedSearchSchema = z.object({
    categoryName: z.string().min(1),
    searchType: z
        .enum(["BOOK", "MOVIE", "MUSIC", "SEARCH", "TVSEARCH"])
        .nullish()
        .transform((value) => value ?? undefined),
    query: optionalText,
    title: optionalText,
    season: z
        .number()
        .int()
        .nullish()
        .transform((value) => value ?? undefined),
    episode: optionalText,
    author: optionalText,
    identifiers: z
        .array(
            z.object({
                identifierKey: z.string().min(1),
                identifierValue: z.string().min(1),
            }),
        )
        .nullish()
        .transform((value) => value ?? []),
    minAge: z
        .number()
        .int()
        .nullish()
        .transform((value) => value ?? undefined),
    maxAge: z
        .number()
        .int()
        .nullish()
        .transform((value) => value ?? undefined),
    minSize: z
        .number()
        .int()
        .nullish()
        .transform((value) => value ?? undefined),
    maxSize: z
        .number()
        .int()
        .nullish()
        .transform((value) => value ?? undefined),
});

export async function createSavedSearch(
    transport: ApiTransport,
    request: SearchRequest,
): Promise<void> {
    await transport.request("internalapi/savedsearches", {
        method: "POST",
        json: {request},
    });
}

export async function getSavedSearches(
    transport: ApiTransport,
): Promise<SavedSearchList> {
    const response = await transport.request<unknown>(
        "internalapi/savedsearches",
    );
    if (!Array.isArray(response)) {
        throw new Error("Saved searches response has an invalid format");
    }
    const searches: SavedSearchList["searches"] = [];
    let malformedCount = 0;
    for (const [serverIndex, entry] of response.entries()) {
        const parsed = savedSearchSchema.safeParse(entry);
        if (parsed.success) {
            searches.push({search: parsed.data, serverIndex});
        } else {
            malformedCount++;
        }
    }
    return {searches, malformedCount};
}

export async function deleteSavedSearch(
    transport: ApiTransport,
    index: number,
): Promise<void> {
    if (!Number.isInteger(index) || index < 0) {
        throw new Error("Saved search index must be a non-negative integer");
    }
    await transport.request(`internalapi/savedsearches/${index}`, {
        method: "DELETE",
    });
}

export function redirectRidUrl(transport: ApiTransport, rid: string): string {
    return transport.browserTransferUrl(
        `internalapi/redirectRid/${encodeURIComponent(rid)}`,
    );
}
