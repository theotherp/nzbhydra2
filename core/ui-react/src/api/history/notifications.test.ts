import {describe, expect, it, vi} from "vitest";

import {historyFilterModel} from "./filters";
import {
    NOTIFICATION_EVENT_LABELS,
    NOTIFICATION_EVENT_TYPES,
    getNotificationHistory,
    notificationHistoryDimensions,
} from "./notifications";
import {ApiTransport} from "../transport";

function jsonResponse(body: unknown) {
    return Promise.resolve(
        new Response(JSON.stringify(body), {
            headers: {"Content-Type": "application/json"},
        }),
    );
}

function entry(overrides: Record<string, unknown> = {}) {
    return {
        id: 7,
        time: "2024-05-04T10:11:12Z",
        notificationEventType: "RESULT_DOWNLOAD",
        messageType: "INFO",
        title: "NZB download",
        body: "NZBHydra: The result was grabbed.",
        urls: "json://localhost",
        displayed: false,
        ...overrides,
    };
}

describe("notificationHistoryDimensions", () => {
    it("should declare exactly legacy's two filter dimensions on their legacy columns", () => {
        expect(
            notificationHistoryDimensions().map((dimension) => ({
                id: dimension.id,
                kind: dimension.kind,
                column: dimension.column,
                label: dimension.label,
            })),
        ).toEqual([
            {id: "time", kind: "time", column: "time", label: "Time"},
            {
                id: "event-type",
                kind: "checkboxes",
                column: "NOTIFICATION_EVENT_TYPE",
                label: "Event type",
            },
        ]);
    });

    it("should offer the complete active event vocabulary with its legacy labels", () => {
        const eventType = notificationHistoryDimensions()[1];
        expect(eventType.kind).toBe("checkboxes");
        expect(
            eventType.kind === "checkboxes" ? eventType.options : [],
        ).toEqual([
            {value: "AUTH_FAILURE", label: "Auth failure"},
            {value: "RESULT_DOWNLOAD", label: "NZB download"},
            {
                value: "RESULT_DOWNLOAD_COMPLETION",
                label: "Download completion",
            },
            {value: "INDEXER_DISABLED", label: "Indexer disabled"},
            {
                value: "INDEXER_REENABLED",
                label: "Indexer reenabled after error",
            },
            {value: "UPDATE_INSTALLED", label: "Automatic update installed"},
            {
                value: "VIP_RENEWAL_REQUIRED",
                label: "VIP renewal required (14 day warning)",
            },
            {
                value: "EXTERNAL_TOOL_CONFIGURATION",
                label: "External tool configuration",
            },
        ]);
    });

    it("should cover every constant of NotificationEventType.java", () => {
        // Kept in sync by hand with
        // shared/mapping/.../config/notification/NotificationEventType.java --
        // an event type missing here would be unfilterable and would make its
        // entries count as malformed.
        expect(
            [...NOTIFICATION_EVENT_TYPES.map((event) => event.value)].sort(),
        ).toEqual(
            [
                "AUTH_FAILURE",
                "EXTERNAL_TOOL_CONFIGURATION",
                "INDEXER_DISABLED",
                "INDEXER_REENABLED",
                "RESULT_DOWNLOAD",
                "RESULT_DOWNLOAD_COMPLETION",
                "UPDATE_INSTALLED",
                "VIP_RENEWAL_REQUIRED",
            ].sort(),
        );
        expect(Object.keys(NOTIFICATION_EVENT_LABELS)).toHaveLength(
            NOTIFICATION_EVENT_TYPES.length,
        );
    });

    it("should send the enum constants and never the humanized labels", () => {
        const dimensions = notificationHistoryDimensions();
        expect(
            historyFilterModel(dimensions, {
                "event-type": {
                    kind: "checkboxes",
                    selected: ["INDEXER_DISABLED", "AUTH_FAILURE"],
                },
            }),
        ).toEqual({
            NOTIFICATION_EVENT_TYPE: {
                filterType: "checkboxes",
                // Declaration order, not click order.
                filterValue: ["AUTH_FAILURE", "INDEXER_DISABLED"],
            },
        });
    });

    it("should send no event-type entry for an empty selection (ADR-0016)", () => {
        const dimensions = notificationHistoryDimensions();
        expect(
            historyFilterModel(dimensions, {
                "event-type": {kind: "checkboxes", selected: []},
            }),
        ).toEqual({});
        expect(historyFilterModel(dimensions, {})).toEqual({});
    });

    it("should reject a label that is not an enum constant", () => {
        expect(
            historyFilterModel(notificationHistoryDimensions(), {
                "event-type": {
                    kind: "checkboxes",
                    selected: ["Indexer disabled"],
                },
            }),
        ).toEqual({});
    });
});

describe("getNotificationHistory", () => {
    it("should post the shared request body to the notification endpoint", async () => {
        const calls: {url: RequestInfo | URL; init?: RequestInit}[] = [];
        const fetchImplementation = vi.fn(
            (url: RequestInfo | URL, init?: RequestInit) => {
                calls.push({url, init});
                return jsonResponse({content: [entry()], totalElements: 1});
            },
        );
        const transport = new ApiTransport("/hydra/", fetchImplementation);
        const page = await getNotificationHistory(transport, {
            dimensions: notificationHistoryDimensions(),
            values: {
                "event-type": {
                    kind: "checkboxes",
                    selected: ["RESULT_DOWNLOAD"],
                },
                time: {
                    kind: "time",
                    after: "2024-05-04T00:00",
                    before: "",
                },
            },
            page: 3,
            limit: 25,
            sort: {column: "NOTIFICATION_EVENT_TYPE", sortMode: 1},
        });

        const {url, init} = calls[0];
        expect(new URL(String(url)).pathname).toBe(
            "/hydra/internalapi/history/notifications",
        );
        expect(init?.method).toBe("POST");
        const body = JSON.parse(init?.body as string);
        expect(body).toMatchObject({
            page: 3,
            limit: 25,
            distinct: false,
            onlyCurrentUser: false,
            sortModel: {column: "NOTIFICATION_EVENT_TYPE", sortMode: 1},
            filterModel: {
                NOTIFICATION_EVENT_TYPE: {
                    filterType: "checkboxes",
                    filterValue: ["RESULT_DOWNLOAD"],
                },
                time: {filterType: "time"},
            },
        });
        // The wrapper owns the whole body; the route contributes no extra key.
        expect(Object.keys(body).sort()).toEqual([
            "distinct",
            "filterModel",
            "limit",
            "onlyCurrentUser",
            "page",
            "sortModel",
        ]);
        expect(page).toEqual({
            entries: [
                {
                    id: 7,
                    time: "2024-05-04T10:11:12Z",
                    notificationEventType: "RESULT_DOWNLOAD",
                    title: "NZB download",
                    body: "NZBHydra: The result was grabbed.",
                    urls: "json://localhost",
                },
            ],
            totalElements: 1,
            malformedCount: 0,
        });
    });

    it("should count entries with an unknown or missing event type as malformed", async () => {
        const transport = new ApiTransport("/hydra/", () =>
            jsonResponse({
                content: [
                    entry(),
                    entry({id: 8, notificationEventType: "SOMETHING_NEW"}),
                    entry({id: 9, notificationEventType: undefined}),
                    entry({id: "not a number"}),
                    "nonsense",
                ],
                totalElements: 5,
            }),
        );
        const page = await getNotificationHistory(transport, {
            dimensions: notificationHistoryDimensions(),
            values: {},
            page: 1,
            limit: 25,
            sort: {column: "time", sortMode: 2},
        });
        expect(page.entries.map((found) => found.id)).toEqual([7]);
        expect(page.malformedCount).toBe(4);
        expect(page.totalElements).toBe(5);
    });

    it("should tolerate entries without title, body, or URLs", async () => {
        const transport = new ApiTransport("/hydra/", () =>
            jsonResponse({
                content: [
                    entry({title: null, body: "", urls: undefined, time: null}),
                ],
                totalElements: 1,
            }),
        );
        const page = await getNotificationHistory(transport, {
            dimensions: notificationHistoryDimensions(),
            values: {},
            page: 1,
            limit: 25,
            sort: {column: "time", sortMode: 2},
        });
        expect(page.entries).toEqual([
            {
                id: 7,
                time: undefined,
                notificationEventType: "RESULT_DOWNLOAD",
                title: undefined,
                body: undefined,
                urls: undefined,
            },
        ]);
        expect(page.malformedCount).toBe(0);
    });

    it("should reject a response that is not a paged envelope", async () => {
        const transport = new ApiTransport("/hydra/", () =>
            jsonResponse({notifications: []}),
        );
        await expect(
            getNotificationHistory(transport, {
                dimensions: notificationHistoryDimensions(),
                values: {},
                page: 1,
                limit: 25,
                sort: {column: "time", sortMode: 2},
            }),
        ).rejects.toThrow(
            "Notification history response has an invalid format",
        );
    });
});
