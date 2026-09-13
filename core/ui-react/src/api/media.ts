import {z} from "zod";

import {ApiTransport} from "./transport";

export type MediaSuggestion = {
    title: string;
    year?: number;
    posterUrl?: string;
    imdbId?: string;
    tmdbId?: string;
    tvdbId?: string;
    tvmazeId?: string;
    tvrageId?: string;
};

const suggestionSchema = z.object({
    title: z.string().min(1),
    year: z
        .number()
        .int()
        .nullish()
        .transform((value) => value ?? undefined),
    posterUrl: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    imdbId: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    tmdbId: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    tvdbId: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    tvmazeId: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
    tvrageId: z
        .string()
        .min(1)
        .nullish()
        .transform((value) => value ?? undefined),
});

export class MalformedAutocompleteResponseError extends Error {
    constructor() {
        super("The autocomplete response has an invalid format");
    }
}

export async function getAutocomplete(
    transport: ApiTransport,
    type: "MOVIE" | "TV",
    input: string,
): Promise<MediaSuggestion[]> {
    const response = await transport.request<unknown>(
        `internalapi/autocomplete/${type}?${new URLSearchParams({input})}`,
    );
    const parsed = z.array(suggestionSchema).safeParse(response);
    if (!parsed.success) {
        throw new MalformedAutocompleteResponseError();
    }
    return parsed.data;
}

export async function getEmbyAvailability(
    transport: ApiTransport,
    type: "MOVIE" | "TV",
    id: string,
): Promise<boolean> {
    const endpoint =
        type === "MOVIE"
            ? "internalapi/emby/isMovieAvailable"
            : "internalapi/emby/isSeriesAvailable";
    const parameter = type === "MOVIE" ? "tmdbId" : "tvdbId";
    const response = await transport.request<unknown>(
        `${endpoint}?${new URLSearchParams({[parameter]: id})}`,
    );
    const parsed = z.boolean().safeParse(response);
    if (!parsed.success) {
        throw new Error("The Emby availability response has an invalid format");
    }
    return parsed.data;
}
