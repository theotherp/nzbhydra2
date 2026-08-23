import {z} from "zod";

import type {components} from "./generated/openapi";
import {ApiTransport} from "./transport";

/**
 * The generated shape of `NfoResult` (`core/.../indexers/NfoResult.java`). Every
 * property is optional in the generated contract, which is why the response is
 * validated below rather than trusted.
 */
export type NfoResultResponse = components["schemas"]["NfoResult"];

/**
 * `API-SEARCH-NFO`'s three states, flattened from the wire shape:
 *
 * - `successful && hasNfo` — `content` is the NFO text.
 * - `successful && !hasNfo` — the indexer has no NFO for this result; legacy
 *   showed an info growl and no content (`content` is `null` on the wire).
 * - `!successful` — `content` is the error message, not an NFO.
 */
export type NfoResult = {
    successful: boolean;
    hasNfo: boolean;
    /** The NFO text, or the error message when `successful` is false. */
    content: string;
};

export class MalformedNfoResponseError extends Error {
    constructor() {
        super("The NFO response has an invalid format");
    }
}

const nfoSchema = z.object({
    successful: z.boolean().default(false),
    hasNfo: z.boolean().default(false),
    // `NfoResult.withoutNfo()` sends a null content, and an error message can
    // legitimately be absent, so a missing value becomes the empty string
    // rather than failing the response.
    content: z
        .string()
        .nullish()
        .transform((value) => value ?? ""),
});

/**
 * `API-SEARCH-NFO`: `GET internalapi/nfo/{searchResultId}` — the NFO the
 * indexer holds for one search result. The path segment is the result's own
 * `searchResultId` (legacy's ID format, which this endpoint deliberately keeps
 * because fetching an NFO records no download).
 *
 * The returned `content` is indexer-supplied text and is never markup: callers
 * render it as text. Legacy piped it through `ng-bind-html`
 * (`search-result.js:170-175`), which is exactly the hazard not carried over.
 */
export async function getNfo(
    transport: ApiTransport,
    searchResultId: string,
): Promise<NfoResult> {
    const response = await transport.request<NfoResultResponse>(
        `internalapi/nfo/${encodeURIComponent(searchResultId)}`,
    );
    return parseNfoResult(response);
}

export function parseNfoResult(response: unknown): NfoResult {
    const parsed = nfoSchema.safeParse(response);
    if (!parsed.success) {
        throw new MalformedNfoResponseError();
    }
    return parsed.data;
}
