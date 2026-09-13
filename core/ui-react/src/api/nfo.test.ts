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

    it("should reject a response that is not an NFO result at all", () => {
        expect(() => parseNfoResult("nope")).toThrow(MalformedNfoResponseError);
        expect(() => parseNfoResult({successful: "yes"})).toThrow(
            MalformedNfoResponseError,
        );
    });
});
