import {describe, expect, it, vi} from "vitest";

import {
    executeSearch,
    MalformedSearchResponseError,
    parseSearchResponse,
} from "./search";
import {ApiTransport} from "./transport";

const responseEnvelope = {
    searchResults: [],
    indexerSearchMetaDatas: [],
    indexerLimitWarnings: [],
    rejectedReasonsMap: {},
    notPickedIndexersWithReason: {},
    numberOfAvailableResults: 0,
    numberOfRejectedResults: 0,
};

describe("search API", () => {
    it("should send the basic search contract through transport", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(responseEnvelope), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        const transport = new ApiTransport("/", fetchImplementation);
        await executeSearch(transport, {
            category: "All",
            indexers: ["Mock"],
            loadAll: false,
            searchRequestId: 42,
        });
        expect(fetchImplementation).toHaveBeenCalledWith(
            expect.stringMatching(/internalapi\/search$/),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    category: "All",
                    indexers: ["Mock"],
                    loadAll: false,
                    searchRequestId: 42,
                }),
            }),
        );
    });

    it("should discard titleless entries while preserving valid results", () => {
        const response = parseSearchResponse({
            ...responseEnvelope,
            searchResults: [
                {searchResultId: "valid", title: "A result"},
                {searchResultId: "missing-title"},
            ],
        });
        expect(response.searchResults).toEqual([
            expect.objectContaining({title: "A result"}),
        ]);
        expect(response.malformedResultCount).toBe(1);
    });

    it("should reject empty response envelopes", () => {
        expect(() => parseSearchResponse({})).toThrow(
            MalformedSearchResponseError,
        );
    });

    it("should reject incomplete or wrongly typed response envelopes", () => {
        expect(() => parseSearchResponse({searchResults: []})).toThrow(
            MalformedSearchResponseError,
        );
        expect(() =>
            parseSearchResponse({
                ...responseEnvelope,
                numberOfAvailableResults: "0",
            }),
        ).toThrow(MalformedSearchResponseError);
        expect(() => parseSearchResponse("not a response")).toThrow(
            MalformedSearchResponseError,
        );
    });
});
