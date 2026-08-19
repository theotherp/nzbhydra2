import {describe, expect, it, vi} from "vitest";

import {downloadHistoryRequest, getDownloadHistory} from "./downloads";
import {ApiTransport} from "../transport";

describe("downloadHistoryRequest", () => {
    it("should transform paging, sort, and every supported filter into the legacy request contract", () => {
        expect(
            downloadHistoryRequest(
                2,
                25,
                {
                    after: "2024-01-01T10:00",
                    before: "2024-01-02T10:00",
                    indexer: "  Mock  ",
                    title: "  example  ",
                    status: "NZB_ADDED",
                    source: "API",
                    minAge: "2",
                    maxAge: "10",
                    username: "user",
                    ip: "127.0.0.1",
                },
                {column: "title", sortMode: 1},
            ),
        ).toEqual({
            page: 2,
            limit: 25,
            distinct: false,
            onlyCurrentUser: false,
            sortModel: {column: "title", sortMode: 1},
            filterModel: {
                time: {
                    filterType: "time",
                    filterValue: {
                        after: new Date("2024-01-01T10:00").toISOString(),
                        before: new Date("2024-01-02T10:00").toISOString(),
                    },
                    isBoolean: false,
                },
                name: {
                    filterType: "freetext",
                    filterValue: "Mock",
                    isBoolean: false,
                },
                title: {
                    filterType: "freetext",
                    filterValue: "example",
                    isBoolean: false,
                },
                status: {
                    filterType: "checkboxes",
                    filterValue: ["NZB_ADDED"],
                    isBoolean: false,
                },
                access_source: {
                    filterType: "boolean",
                    filterValue: "API",
                    isBoolean: false,
                },
                age: {
                    filterType: "numberRange",
                    filterValue: {min: "2", max: "10"},
                    isBoolean: false,
                },
                username: {
                    filterType: "freetext",
                    filterValue: "user",
                    isBoolean: false,
                },
                ip: {
                    filterType: "freetext",
                    filterValue: "127.0.0.1",
                    isBoolean: false,
                },
            },
        });
    });

    it("should omit filters that are absent, blank, or set to 'all'", () => {
        expect(
            downloadHistoryRequest(
                1,
                25,
                {source: "all", status: "all", minAge: "  "},
                {column: "time", sortMode: 2},
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
});

describe("getDownloadHistory", () => {
    it("should retain valid rows with a nested search result and drop malformed entries", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    content: [
                        {
                            id: 1,
                            status: "CONTENT_DOWNLOAD_SUCCESSFUL",
                            accessSource: "INTERNAL",
                            time: "2024-01-01T00:00:00Z",
                            age: 3,
                            username: "user",
                            ip: "127.0.0.1",
                            searchResult: {
                                id: "42",
                                title: "A title",
                                indexer: {name: "Mock"},
                                details: "https://example.com",
                                downloadType: "NZB",
                                indexerGuid: "guid",
                            },
                        },
                        {id: "bad"},
                        {
                            id: 2,
                            status: "UNKNOWN_STATUS",
                            searchResult: {id: "1", title: "x"},
                        },
                        {id: 3, status: "NONE", searchResult: {id: "1"}},
                        {id: 4, status: "NONE"},
                    ],
                    totalElements: 5,
                }),
                {headers: {"Content-Type": "application/json"}},
            ),
        );

        const page = await getDownloadHistory(
            new ApiTransport("/hydra/", fetchImplementation),
            1,
            25,
            {},
            {column: "time", sortMode: 2},
        );

        expect(page).toEqual({
            downloads: [
                {
                    id: 1,
                    status: "CONTENT_DOWNLOAD_SUCCESSFUL",
                    accessSource: "INTERNAL",
                    time: "2024-01-01T00:00:00Z",
                    age: 3,
                    username: "user",
                    ip: "127.0.0.1",
                    searchResult: {
                        id: "42",
                        title: "A title",
                        indexer: "Mock",
                        details: "https://example.com",
                        downloadType: "NZB",
                        indexerGuid: "guid",
                    },
                },
            ],
            totalElements: 5,
            malformedCount: 4,
        });
    });

    it("should reject a response with a missing content array or total", async () => {
        await expect(
            getDownloadHistory(
                new ApiTransport(
                    "/hydra/",
                    vi.fn().mockResolvedValue(
                        new Response(JSON.stringify({content: []}), {
                            headers: {"Content-Type": "application/json"},
                        }),
                    ),
                ),
                1,
                25,
                {},
                {column: "time", sortMode: 2},
            ),
        ).rejects.toThrow("Download history response has an invalid format");
    });
});
