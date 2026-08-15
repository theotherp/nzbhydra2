import {describe, expect, it, vi} from "vitest";

import {
    getSearchHistory,
    getSearchHistoryDetails,
    searchHistoryRequest,
} from "./searchHistory";
import {ApiTransport} from "./transport";

describe("searchHistoryRequest", () => {
    it("should transform paging, sort, and every supported filter into the legacy request contract", () => {
        expect(
            searchHistoryRequest(
                2,
                25,
                {
                    after: "2024-01-01T10:00",
                    before: "2024-01-02T10:00",
                    query: "  example  ",
                    category: "Movies",
                    source: "API",
                    userAgent: "agent",
                    username: "user",
                    ip: "127.0.0.1",
                },
                {column: "query", sortMode: 1},
            ),
        ).toEqual({
            page: 2,
            limit: 25,
            distinct: false,
            onlyCurrentUser: false,
            sortModel: {column: "query", sortMode: 1},
            filterModel: {
                time: {
                    filterType: "time",
                    filterValue: {
                        after: new Date("2024-01-01T10:00").toISOString(),
                        before: new Date("2024-01-02T10:00").toISOString(),
                    },
                },
                query: {filterType: "freetext", filterValue: "example"},
                category_name: {
                    filterType: "checkboxes",
                    filterValue: ["Movies"],
                },
                source: {filterType: "boolean", filterValue: "API"},
                user_agent: {filterType: "freetext", filterValue: "agent"},
                username: {filterType: "freetext", filterValue: "user"},
                ip: {filterType: "freetext", filterValue: "127.0.0.1"},
            },
        });
    });
});

describe("getSearchHistory", () => {
    it("should retain valid rows with signed Java integer identifiers", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    content: [
                        {
                            id: -64770922,
                            categoryName: "All",
                            identifiers: [],
                        },
                    ],
                    totalElements: 1,
                }),
                {headers: {"Content-Type": "application/json"}},
            ),
        );

        const page = await getSearchHistory(
            new ApiTransport("/hydra/", fetchImplementation),
            1,
            25,
            {},
            {column: "time", sortMode: 2},
        );

        expect(page).toEqual({
            searches: [
                {
                    id: -64770922,
                    categoryName: "All",
                    identifiers: [],
                },
            ],
            totalElements: 1,
            malformedCount: 0,
        });
    });
});

describe("getSearchHistoryDetails", () => {
    it("should request details for signed Java integer identifiers", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({indexerSearches: []}), {
                headers: {"Content-Type": "application/json"},
            }),
        );

        await expect(
            getSearchHistoryDetails(
                new ApiTransport("/hydra/", fetchImplementation),
                -64770922,
            ),
        ).resolves.toMatchObject({indexerSearches: [], malformedCount: 0});
        expect(fetchImplementation).toHaveBeenCalledWith(
            expect.stringMatching(
                /\/hydra\/internalapi\/history\/searches\/details\/-64770922$/,
            ),
            expect.any(Object),
        );
    });
});
