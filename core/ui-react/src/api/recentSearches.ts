import {z} from "zod";

import type {components} from "./generated/openapi";
import {ApiTransport} from "./transport";

export type RecentSearch = {
    categoryName: string;
    source?: "INTERNAL" | "API";
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
    selectedIndexers?: string[];
};

type RecentSearchResponse = components["schemas"]["SearchEntityTO"][];

const recentSearchSchema = z.object({
    categoryName: z.string().min(1),
    source: z
        .enum(["INTERNAL", "API"])
        .nullish()
        .transform((value) => value ?? undefined),
    searchType: z
        .enum(["BOOK", "MOVIE", "MUSIC", "SEARCH", "TVSEARCH"])
        .nullish()
        .transform((value) => value ?? undefined),
    query: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    title: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    season: z
        .number()
        .int()
        .nullish()
        .transform((value) => value ?? undefined),
    episode: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    author: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    identifiers: z
        .array(
            z.object({
                identifierKey: z.string().min(1),
                identifierValue: z.string().min(1),
            }),
        )
        .default([]),
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
    selectedIndexers: z
        .array(z.string().min(1))
        .nullish()
        .transform((value) => value ?? undefined),
});

export async function getRecentSearches(
    transport: ApiTransport,
): Promise<RecentSearch[]> {
    const response = await transport.request<RecentSearchResponse>(
        "internalapi/history/searches/forsearching",
        {method: "POST"},
    );
    if (!Array.isArray(response)) {
        throw new Error("Recent searches response has an invalid format");
    }
    return response.flatMap((entry) => {
        const parsed = recentSearchSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
    });
}
