import {describe, expect, it, vi} from "vitest";

import {getNfo, MalformedNfoResponseError, parseNfoResult} from "./nfo";
import {ApiTransport} from "./transport";

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
    });
}

describe("getNfo", () => {
    it("should request the NFO of one search result through the shared transport", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(
                jsonResponse({successful: true, hasNfo: true, content: "NFO"}),
            );
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(getNfo(transport, "1234")).resolves.toEqual({
            successful: true,
            hasNfo: true,
            content: "NFO",
        });

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/nfo/1234",
            expect.objectContaining({
                credentials: "same-origin",
                method: "GET",
            }),
        );
    });

    it("should encode a result ID that is not URL-safe", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(
                jsonResponse({successful: true, hasNfo: false, content: null}),
            );
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await getNfo(transport, "a b/c");

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/nfo/a%20b%2Fc",
            expect.anything(),
        );
    });
});

describe("parseNfoResult", () => {
    it("should carry the NFO text of a successful response with an NFO", () => {
        expect(
            parseNfoResult({
                successful: true,
                hasNfo: true,
                content: "line one\nline two",
            }),
        ).toEqual({
            successful: true,
            hasNfo: true,
            content: "line one\nline two",
        });
    });

    it("should read a successful response without an NFO, whose content is null", () => {
        expect(
            parseNfoResult({successful: true, hasNfo: false, content: null}),
        ).toEqual({successful: true, hasNfo: false, content: ""});
    });

    it("should read an unsuccessful response, whose content is the error message", () => {
        expect(
            parseNfoResult({
                successful: false,
                hasNfo: false,
                content: "Indexer unreachable",
            }),
        ).toEqual({
            successful: false,
            hasNfo: false,
            content: "Indexer unreachable",
        });
    });

    it("should default absent flags rather than failing, because every field is optional in the contract", () => {
        expect(parseNfoResult({})).toEqual({
            successful: false,
            hasNfo: false,
            content: "",
        });
    });

    // The block-drawing glyphs an ASCII-art NFO is built from reach us as
    // character references: the indexer HTML-escapes the NFO into the
    // newznab `<description>`, and the XML escaping of that leaves one
    // undecoded level behind once the response is unmarshalled. Legacy
    // decoded it by handing the string to `ng-bind-html`; nothing does here,
    // so the references have to be resolved before the text is rendered.
    it("should decode the character references an ASCII-art NFO arrives with", () => {
        expect(
            parseNfoResult({
                successful: true,
                hasNfo: true,
                content: "&#9608;&#9618;&#9617; &#x2588; &amp; &lt;b&gt;",
            }).content,
        ).toBe("\u2588\u2592\u2591 \u2588 & <b>");
    });

    it("should decode exactly one level, so an escaped ampersand stays text", () => {
        expect(
            parseNfoResult({
                successful: true,
                hasNfo: true,
                content: "&amp;#9608;",
            }).content,
        ).toBe("&#9608;");
    });

    it("should leave anything that is not a resolvable reference alone", () => {
        expect(
            parseNfoResult({
                successful: true,
                hasNfo: true,
                content: "Tom & Jerry 100% &notareference; &#xD800; &#0;",
            }).content,
        ).toBe("Tom & Jerry 100% &notareference; &#xD800; &#0;");
    });

    it("should reject a response that is not an NFO result at all", () => {
        expect(() => parseNfoResult("nope")).toThrow(MalformedNfoResponseError);
        expect(() => parseNfoResult({successful: "yes"})).toThrow(
            MalformedNfoResponseError,
        );
    });
});
