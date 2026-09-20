import {z} from "zod";

import type {components} from "./generated/openapi";
import {ApiTransport} from "./transport";

/**
 * The generated shape of `NfoResult` (`core/.../indexers/NfoResult.java`). Every
 * property is optional in the generated contract, which is why the response is
 * validated below rather than trusted.
 */
type NfoResultResponse = components["schemas"]["NfoResult"];

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

const NAMED_CHARACTER_REFERENCES: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
};

const CHARACTER_REFERENCE = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi;

/**
 * Resolves the HTML character references an NFO arrives with.
 *
 * An ASCII-art NFO is drawn with CP437 block glyphs, and indexers HTML-escape
 * those into the newznab `<description>` the NFO is read from
 * (`Newznab.getNfo`). Escaping that description for XML in turn escapes the
 * ampersands, so unmarshalling the response peels off one level and leaves
 * text like `&#9608;` behind -- which is what the user sees instead of `█`.
 * Legacy resolved it by handing the string to `ng-bind-html`; this path
 * renders text nodes (see `getNfo` below), so it has to be resolved here.
 *
 * One pass, so `&amp;#9608;` yields the literal `&#9608;` rather than a block:
 * an ampersand that was genuinely escaped stays text, exactly as legacy's
 * single sanitiser pass left it. A reference this cannot resolve -- an unknown
 * name, a lone surrogate, a code point out of range -- is left verbatim rather
 * than guessed at or dropped.
 *
 * Decoding does not make the result markup: `<` may now appear, but callers
 * render it into a text node, where it is a visible character and nothing else.
 */
export function decodeCharacterReferences(text: string): string {
    return text.replace(CHARACTER_REFERENCE, (reference, body: string) => {
        if (!body.startsWith("#")) {
            return NAMED_CHARACTER_REFERENCES[body.toLowerCase()] ?? reference;
        }
        const hex = body[1] === "x" || body[1] === "X";
        const codePoint = Number.parseInt(
            hex ? body.slice(2) : body.slice(1),
            hex ? 16 : 10,
        );
        const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;
        if (codePoint <= 0 || codePoint > 0x10ffff || isSurrogate) {
            return reference;
        }
        return String.fromCodePoint(codePoint);
    });
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
        .transform((value) => decodeCharacterReferences(value ?? "")),
});

/**
 * `API-SEARCH-NFO`: `GET internalapi/nfo/{searchResultId}` — the NFO the
 * indexer holds for one search result. The path segment is the result's own
 * `searchResultId` (legacy's ID format, which this endpoint deliberately keeps
 * because fetching an NFO records no download).
 *
 * The returned `content` is indexer-supplied text and is never markup: callers
 * render it as text. Legacy piped it through `ng-bind-html`
 * (`search-result.js:170-175`), which is exactly the hazard not carried over —
 * only its character-reference decoding is, via
 * `decodeCharacterReferences` above.
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
