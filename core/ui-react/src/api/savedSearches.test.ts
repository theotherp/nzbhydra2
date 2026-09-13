import {describe, expect, it, vi} from "vitest";

import {
    createSavedSearch,
    deleteSavedSearch,
    getSavedSearches,
    redirectRidUrl,
} from "./savedSearches";
import {ApiTransport} from "./transport";

describe("saved searches API", () => {
    it("should validate list entries while isolating malformed data", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify([
                    {
                        categoryName: "Movies",
                        identifiers: [
                            {identifierKey: "TMDB", identifierValue: "42"},
                        ],
                        minAge: 2,
                    },
                    {categoryName: 3},
                ]),
                {headers: {"Content-Type": "application/json"}},
            ),
        );

        await expect(
            getSavedSearches(new ApiTransport("/hydra/", fetchImplementation)),
        ).resolves.toEqual({
            searches: [
                {
                    search: {
                        categoryName: "Movies",
                        identifiers: [
                            {identifierKey: "TMDB", identifierValue: "42"},
                        ],
                        minAge: 2,
                    },
                    serverIndex: 0,
                },
            ],
            malformedCount: 1,
        });
    });

    it("should create and delete through the base-aware transport", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 204}));
        const transport = new ApiTransport("/hydra/", fetchImplementation);
        await createSavedSearch(transport, {
            category: "All",
            loadAll: false,
            searchRequestId: 1,
            indexers: ["Mock"],
        });
        await deleteSavedSearch(transport, 2);

        expect(fetchImplementation).toHaveBeenNthCalledWith(
            1,
            "http://localhost:3000/hydra/internalapi/savedsearches",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    request: {
                        category: "All",
                        loadAll: false,
                        searchRequestId: 1,
                        indexers: ["Mock"],
                    },
                }),
            }),
        );
        expect(fetchImplementation).toHaveBeenNthCalledWith(
            2,
            "http://localhost:3000/hydra/internalapi/savedsearches/2",
            expect.objectContaining({method: "DELETE"}),
        );
        expect(redirectRidUrl(transport, "bad/id")).toBe(
            "http://localhost:3000/hydra/internalapi/redirectRid/bad%2Fid",
        );
        await expect(deleteSavedSearch(transport, -1)).rejects.toThrow(
            "non-negative",
        );
    });
});
