import {describe, expect, it, vi} from "vitest";

import type {HistoryDimension} from "./filters";
import {historyPage, historyRequestBody, requestHistoryPage} from "./request";
import {ApiTransport} from "../transport";

const dimensions: HistoryDimension[] = [
    {kind: "freetext", id: "title", column: "title", label: "Title"},
    {
        kind: "checkboxes",
        id: "result",
        column: "status",
        label: "Result",
        options: [{value: "NZB_ADDED", label: "NZB added"}],
    },
];

describe("historyRequestBody", () => {
    it("should build the whole HistoryRequest body from declared dimensions", () => {
        expect(
            historyRequestBody({
                dimensions,
                values: {title: {kind: "freetext", text: "example"}},
                page: 2,
                limit: 25,
                sort: {column: "title", sortMode: 1},
            }),
        ).toEqual({
            page: 2,
            limit: 25,
            distinct: false,
            onlyCurrentUser: false,
            sortModel: {column: "title", sortMode: 1},
            filterModel: {
                title: {filterType: "freetext", filterValue: "example"},
            },
        });
    });

    it("should carry the distinct and only-current-user flags a route asks for", () => {
        expect(
            historyRequestBody({
                dimensions: [],
                values: {},
                page: 1,
                limit: 10,
                sort: {column: "time", sortMode: 2},
                distinct: true,
                onlyCurrentUser: true,
            }),
        ).toMatchObject({
            distinct: true,
            onlyCurrentUser: true,
            filterModel: {},
        });
    });
});

describe("historyPage", () => {
    const parseEntry = (value: unknown) =>
        typeof value === "number" ? value : undefined;

    it("should keep valid entries and count the malformed ones", () => {
        expect(
            historyPage(
                {content: [1, "x", 3, null], totalElements: 4},
                "X",
                parseEntry,
            ),
        ).toEqual({entries: [1, 3], totalElements: 4, malformedCount: 2});
    });

    it("should reject an envelope without a content array or an integer total", () => {
        for (const response of [
            undefined,
            null,
            "content",
            {content: []},
            {content: {}, totalElements: 1},
            {content: [], totalElements: "2"},
            {content: [], totalElements: 1.5},
        ]) {
            expect(() =>
                historyPage(response, "Download history", parseEntry),
            ).toThrow("Download history response has an invalid format");
        }
    });
});

describe("requestHistoryPage", () => {
    it("should POST the built body to the endpoint and validate the envelope", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({content: [{id: 7}], totalElements: 1}),
                {
                    headers: {"Content-Type": "application/json"},
                },
            ),
        );
        const page = await requestHistoryPage(
            new ApiTransport("/hydra/", fetchImplementation),
            {
                path: "internalapi/history/downloads",
                label: "Download history",
                query: {
                    dimensions,
                    values: {
                        result: {kind: "checkboxes", selected: ["NZB_ADDED"]},
                    },
                    page: 1,
                    limit: 25,
                    sort: {column: "time", sortMode: 2},
                },
                parseEntry: (value) =>
                    value && typeof value === "object" ? value : undefined,
            },
        );
        expect(page).toEqual({
            entries: [{id: 7}],
            totalElements: 1,
            malformedCount: 0,
        });
        const [url, init] = fetchImplementation.mock.calls[0] as [
            string,
            RequestInit,
        ];
        expect(String(url)).toContain("/hydra/internalapi/history/downloads");
        expect(init.method).toBe("POST");
        expect(JSON.parse(init.body as string)).toEqual({
            page: 1,
            limit: 25,
            distinct: false,
            onlyCurrentUser: false,
            sortModel: {column: "time", sortMode: 2},
            filterModel: {
                status: {filterType: "checkboxes", filterValue: ["NZB_ADDED"]},
            },
        });
    });
});
