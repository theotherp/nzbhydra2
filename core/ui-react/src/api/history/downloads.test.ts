import {describe, expect, it, vi} from "vitest";

import {downloadHistoryDimensions, getDownloadHistory} from "./downloads";
import {historyFilterModel} from "./filters";
import {ApiTransport} from "../transport";

const allDimensions = downloadHistoryDimensions({
    indexerNames: ["Alpha", "Beta"],
    showsUsername: true,
    showsIp: true,
});

describe("downloadHistoryDimensions", () => {
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
            {
                kind: "checkboxes",
                id: "indexer",
                column: "name",
                label: "Indexer",
            },
            {kind: "freetext", id: "title", column: "title", label: "Title"},
            {
                kind: "checkboxes",
                id: "result",
                column: "status",
                label: "Result",
            },
            {
                kind: "boolean",
                id: "source",
                column: "access_source",
                label: "Source",
            },
            {kind: "numberRange", id: "age", column: "age", label: "Age"},
            {
                kind: "freetext",
                id: "username",
                column: "username",
                label: "Username",
            },
            {kind: "freetext", id: "ip", column: "ip", label: "IP address"},
        ]);
    });

    it("should offer the configured indexers and every download status as multi-select options", () => {
        const [, indexer, , result] = allDimensions;
        expect(indexer.kind === "checkboxes" && indexer.options).toEqual([
            {value: "Alpha", label: "Alpha"},
            {value: "Beta", label: "Beta"},
        ]);
        expect(
            result.kind === "checkboxes" &&
                result.options.map((option) => option.value),
        ).toContain("CONTENT_DOWNLOAD_SUCCESSFUL");
        expect(result.kind === "checkboxes" && result.options).toHaveLength(12);
    });

    it("should omit the username and IP dimensions when history user info is disabled", () => {
        expect(
            downloadHistoryDimensions({
                indexerNames: [],
                showsUsername: false,
                showsIp: false,
            }).map((dimension) => dimension.id),
        ).toEqual(["time", "indexer", "title", "result", "source", "age"]);
    });

    it("should filter indexer and result as multi-selects on their own columns", () => {
        expect(
            historyFilterModel(allDimensions, {
                indexer: {kind: "checkboxes", selected: ["Beta"]},
                result: {
                    kind: "checkboxes",
                    selected: ["NZB_ADDED", "NZB_ADD_ERROR"],
                },
                source: {kind: "boolean", value: "INTERNAL"},
                age: {kind: "numberRange", min: "2", max: "10"},
                username: {kind: "freetext", text: "user"},
                ip: {kind: "freetext", text: "127.0.0.1"},
            }),
        ).toEqual({
            name: {filterType: "checkboxes", filterValue: ["Beta"]},
            status: {
                filterType: "checkboxes",
                filterValue: ["NZB_ADDED", "NZB_ADD_ERROR"],
            },
            access_source: {filterType: "boolean", filterValue: "INTERNAL"},
            age: {
                filterType: "numberRange",
                filterValue: {min: "2", max: "10"},
            },
            username: {filterType: "freetext", filterValue: "user"},
            ip: {filterType: "freetext", filterValue: "127.0.0.1"},
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
            getDownloadHistory(
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
        ).rejects.toThrow("Download history response has an invalid format");
    });
});
