import {describe, expect, it, vi} from "vitest";

import {
    getSearchHistory,
    getSearchHistoryDetails,
    searchHistoryDimensions,
} from "./searchHistory";
import {historyFilterModel} from "./history/filters";
import {ApiTransport} from "./transport";

const allDimensions = searchHistoryDimensions({
    categoryNames: ["All", "Movies"],
    showUserAgent: true,
    showsUsername: true,
    showsIp: true,
});

describe("searchHistoryDimensions", () => {
    it("should declare every dimension the route ships, with its kind, column, and label", () => {
        expect(
            allDimensions.map(({kind, id, column, label}) => ({
                kind,
                id,
                column,
                label,
            })),
        ).toEqual([
            {kind: "time", id: "time", column: "time", label: "Time"},
            {kind: "freetext", id: "query", column: "query", label: "Query"},
            {
                kind: "checkboxes",
                id: "category",
                column: "category_name",
                label: "Category",
            },
            {
                kind: "boolean",
                id: "source",
                column: "source",
                label: "Source",
            },
            {
                kind: "freetext",
                id: "user-agent",
                column: "user_agent",
                label: "User agent",
            },
            {
                kind: "freetext",
                id: "username",
                column: "username",
                label: "Username",
            },
            {kind: "freetext", id: "ip", column: "ip", label: "IP address"},
        ]);
    });

    it("should offer every selectable category as a multi-select option", () => {
        const [, , category] = allDimensions;
        expect(category.kind === "checkboxes" && category.options).toEqual([
            {value: "All", label: "All"},
            {value: "Movies", label: "Movies"},
        ]);
    });

    it("should omit the user agent dimension when the display toggle is off, and username/IP when history user info is disabled", () => {
        expect(
            searchHistoryDimensions({
                categoryNames: [],
                showUserAgent: false,
                showsUsername: false,
                showsIp: false,
            }).map((dimension) => dimension.id),
        ).toEqual(["time", "query", "category", "source"]);
    });

    it("should filter category as a multi-select on category_name and every other dimension on its own column", () => {
        expect(
            historyFilterModel(allDimensions, {
                time: {
                    kind: "time",
                    after: "2024-01-01T10:00",
                    before: "2024-01-02T10:00",
                },
                query: {kind: "freetext", text: "example"},
                category: {kind: "checkboxes", selected: ["Movies"]},
                source: {kind: "boolean", value: "API"},
                "user-agent": {kind: "freetext", text: "agent"},
                username: {kind: "freetext", text: "user"},
                ip: {kind: "freetext", text: "127.0.0.1"},
            }),
        ).toEqual({
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
        });
    });

    it("should send no category_name entry for an empty category selection", () => {
        expect(
            historyFilterModel(allDimensions, {
                category: {kind: "checkboxes", selected: []},
            }),
        ).toEqual({});
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
            {
                dimensions: allDimensions,
                values: {},
                page: 1,
                limit: 25,
                sort: {column: "time", sortMode: 2},
            },
        );

        expect(page).toEqual({
            entries: [
                {
                    id: -64770922,
                    categoryName: "All",
                    identifiers: [],
                },
            ],
            totalElements: 1,
            malformedCount: 0,
        });
        expect(
            JSON.parse(
                (fetchImplementation.mock.calls[0][1] as RequestInit)
                    .body as string,
            ),
        ).toEqual({
            page: 1,
            limit: 25,
            distinct: false,
            onlyCurrentUser: false,
            sortModel: {column: "time", sortMode: 2},
            filterModel: {},
        });
    });

    it("should reject a response with a missing content array or total", async () => {
        await expect(
            getSearchHistory(
                new ApiTransport(
                    "/hydra/",
                    vi.fn().mockResolvedValue(
                        new Response(JSON.stringify({content: []}), {
                            headers: {"Content-Type": "application/json"},
                        }),
                    ),
                ),
                {
                    dimensions: allDimensions,
                    values: {},
                    page: 1,
                    limit: 25,
                    sort: {column: "time", sortMode: 2},
                },
            ),
        ).rejects.toThrow("Search history response has an invalid format");
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
