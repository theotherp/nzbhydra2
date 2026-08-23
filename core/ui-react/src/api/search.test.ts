import {describe, expect, it, vi} from "vitest";

import {
    executeSearch,
    MalformedSearchResponseError,
    mergeSearchResponses,
    parseSearchResponse,
    shortcutSearch,
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

    it("should request the search shortcut through the base-aware transport", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        await shortcutSearch(
            new ApiTransport("/hydra/", fetchImplementation),
            42,
        );
        expect(fetchImplementation).toHaveBeenCalledWith(
            expect.stringMatching(/hydra\/internalapi\/shortcutSearch\/42$/),
            expect.objectContaining({method: "POST"}),
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

    it("should preserve sortable fields while treating optional counts as unavailable", () => {
        const response = parseSearchResponse({
            ...responseEnvelope,
            searchResults: [
                {
                    searchResultId: "valid",
                    title: "A result",
                    age: "2 days",
                    epoch: 1_700_000_000,
                    grabs: null,
                    seeders: 4,
                },
                {
                    searchResultId: "missing-counts",
                    title: "Another result",
                    grabs: null,
                    seeders: null,
                },
            ],
        });
        expect(response.searchResults).toEqual([
            expect.objectContaining({
                age: "2 days",
                epoch: 1_700_000_000,
                seeders: 4,
            }),
            expect.objectContaining({
                searchResultId: "missing-counts",
                grabs: undefined,
                seeders: undefined,
            }),
        ]);
    });

    it("should preserve the detail-link fields the result row renders", () => {
        const response = parseSearchResponse({
            ...responseEnvelope,
            searchResults: [
                {
                    searchResultId: "detailed",
                    title: "A result",
                    grabs: 12,
                    seeders: 4,
                    peers: 9,
                    comments: 5,
                    comments_link: "https://indexer.test/details#comments",
                    details_link: "https://indexer.test/details",
                    source: "poster@example.invalid",
                    hasNfo: "YES",
                },
                {
                    searchResultId: "bare",
                    title: "Another result",
                    peers: null,
                    comments: null,
                    comments_link: null,
                    details_link: null,
                    source: null,
                    hasNfo: null,
                },
            ],
        });
        expect(response.searchResults).toEqual([
            expect.objectContaining({
                peers: 9,
                comments: 5,
                comments_link: "https://indexer.test/details#comments",
                details_link: "https://indexer.test/details",
                source: "poster@example.invalid",
                hasNfo: "YES",
            }),
            expect.objectContaining({
                searchResultId: "bare",
                peers: undefined,
                comments: undefined,
                comments_link: undefined,
                details_link: undefined,
                source: undefined,
                hasNfo: undefined,
            }),
        ]);
    });

    it("should keep only the three real hasNfo states and drop anything else", () => {
        const response = parseSearchResponse({
            ...responseEnvelope,
            searchResults: [
                {searchResultId: "yes", title: "Yes", hasNfo: "YES"},
                {searchResultId: "maybe", title: "Maybe", hasNfo: "MAYBE"},
                {searchResultId: "no", title: "No", hasNfo: "NO"},
                // Legacy also tested a `has_nfo === 0` field no response ever
                // sent; neither it nor any other value is carried over, and
                // the result itself still displays.
                {
                    searchResultId: "dead",
                    title: "Dead",
                    has_nfo: 0,
                    hasNfo: "PERHAPS",
                },
            ],
        });
        expect(response.searchResults.map((result) => result.hasNfo)).toEqual([
            "YES",
            "MAYBE",
            "NO",
            undefined,
        ]);
        expect(response.malformedResultCount).toBe(0);
    });

    it("should preserve valid optional grouping fields without rejecting the result", () => {
        const response = parseSearchResponse({
            ...responseEnvelope,
            searchResults: [
                {
                    searchResultId: "grouped",
                    title: "Example.Show.S01E02",
                    hash: 123,
                    downloadType: "TORRENT",
                    showtitle: "Example Show",
                    season: "1",
                    episode: "2",
                },
                {
                    searchResultId: "without-grouping-metadata",
                    title: "Ordinary result",
                    hash: null,
                    downloadType: null,
                    showtitle: null,
                    season: null,
                    episode: null,
                },
            ],
        });
        expect(response.searchResults).toEqual([
            expect.objectContaining({
                hash: 123,
                downloadType: "TORRENT",
                showtitle: "Example Show",
                season: "1",
                episode: "2",
            }),
            expect.objectContaining({
                hash: undefined,
                downloadType: undefined,
                showtitle: undefined,
                season: undefined,
                episode: undefined,
            }),
        ]);
    });

    it("should preserve optional download action fields and treat absent or null values as unavailable", () => {
        const response = parseSearchResponse({
            ...responseEnvelope,
            searchResults: [
                {
                    searchResultId: "present",
                    title: "Downloaded",
                    downloadId: "12.3",
                    originalCategory: "Movies",
                    downloadedAt: "2026-08-12 12:00",
                },
                {
                    searchResultId: "absent",
                    title: "Not downloaded",
                    downloadId: null,
                    originalCategory: null,
                    downloadedAt: null,
                },
            ],
        });
        expect(response.searchResults).toEqual([
            expect.objectContaining({
                downloadId: "12.3",
                originalCategory: "Movies",
                downloadedAt: "2026-08-12 12:00",
            }),
            expect.objectContaining({
                downloadId: undefined,
                originalCategory: undefined,
                downloadedAt: undefined,
            }),
        ]);
    });

    it("should preserve paging metadata and replace duplicate result identities with newer data", () => {
        const first = parseSearchResponse({
            ...responseEnvelope,
            searchResults: [{searchResultId: "same", title: "Older"}],
            offset: 0,
            limit: 10,
            numberOfProcessedResults: 10,
            numberOfAcceptedResults: 10,
            numberOfAvailableResults: 30,
            indexerSearchMetaDatas: [
                {
                    indexerName: "Mock",
                    hasMoreResults: true,
                    totalResultsKnown: false,
                },
            ],
        });
        const next = parseSearchResponse({
            ...first,
            searchResults: [
                {searchResultId: "same", title: "Updated"},
                {searchResultId: "new", title: "New result"},
            ],
            offset: 10,
            limit: 10,
            numberOfProcessedResults: 20,
        });

        expect(mergeSearchResponses(first, next)).toMatchObject({
            pagingState: "ready",
            offset: 10,
            limit: 10,
            numberOfProcessedResults: 20,
            searchResults: [
                {searchResultId: "same", title: "Updated"},
                {searchResultId: "new", title: "New result"},
            ],
        });
    });

    it("should preserve unknown-total continuation state while reconciling merged metadata", () => {
        const first = parseSearchResponse({
            ...responseEnvelope,
            searchResults: [{searchResultId: "one", title: "First"}],
            offset: 0,
            limit: 1,
            numberOfProcessedResults: 1,
            numberOfAcceptedResults: 1,
            numberOfAvailableResults: 0,
            indexerSearchMetaDatas: [
                {
                    indexerName: "Unknown total",
                    wasSuccessful: true,
                    hasMoreResults: true,
                    totalResultsKnown: false,
                },
            ],
        });
        const next = parseSearchResponse({
            ...first,
            searchResults: [{searchResultId: "two", title: "Second"}],
            offset: 1,
            limit: 1,
            numberOfProcessedResults: 2,
            numberOfAcceptedResults: 2,
            indexerSearchMetaDatas: [
                {
                    indexerName: "Unknown total",
                    wasSuccessful: true,
                    hasMoreResults: false,
                    totalResultsKnown: false,
                },
            ],
        });

        expect(mergeSearchResponses(first, next)).toMatchObject({
            offset: 1,
            limit: 1,
            numberOfProcessedResults: 2,
            numberOfAcceptedResults: 2,
            indexerSearchMetaDatas: [
                {
                    hasMoreResults: false,
                    totalResultsKnown: false,
                },
            ],
            searchResults: [{searchResultId: "one"}, {searchResultId: "two"}],
        });
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
