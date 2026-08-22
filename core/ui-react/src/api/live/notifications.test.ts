import {describe, expect, it, vi} from "vitest";

import {
    createNotificationsLiveTransport,
    notificationSeverity,
    planNotificationBatch,
} from "./notifications";
import type {LiveNotification} from "./notifications";
import type {LiveSend, LiveTransport} from "./transport";

function notification(
    overrides: Partial<LiveNotification> = {},
): LiveNotification {
    return {
        body: "Body",
        id: 1,
        messageType: "INFO",
        title: null,
        ...overrides,
    };
}

describe("notification severity mapping", () => {
    it("should map every legacy message type", () => {
        expect(notificationSeverity("INFO")).toBe("info");
        expect(notificationSeverity("SUCCESS")).toBe("success");
        expect(notificationSeverity("WARNING")).toBe("warning");
        expect(notificationSeverity("FAILURE")).toBe("error");
    });

    it("should map an unknown or missing message type to no toast", () => {
        expect(notificationSeverity("SOMETHING_ELSE")).toBeNull();
        expect(notificationSeverity(null)).toBeNull();
    });
});

describe("notification batch plan", () => {
    it("should turn a batch within the limit into one toast per notification", () => {
        const plan = planNotificationBatch(
            [
                notification({body: "First", id: 1}),
                notification({body: "Second", id: 2, messageType: "FAILURE"}),
            ],
            5,
        );

        expect(plan.overflow).toBe(false);
        expect(plan.toasts).toEqual([
            {body: "First", severity: "info"},
            {body: "Second", severity: "error"},
        ]);
        expect(plan.acknowledgeIds).toEqual([1, 2]);
    });

    it("should replace a batch exceeding the limit with the pile-up notice", () => {
        const plan = planNotificationBatch(
            [1, 2, 3].map((id) => notification({id})),
            2,
        );

        expect(plan.overflow).toBe(true);
        expect(plan.count).toBe(3);
        expect(plan.toasts).toEqual([]);
        // Legacy acknowledges the whole pile even though it shows none of them.
        expect(plan.acknowledgeIds).toEqual([1, 2, 3]);
    });

    it("should keep a batch exactly at the limit as individual toasts", () => {
        const plan = planNotificationBatch(
            [1, 2].map((id) => notification({id})),
            2,
        );

        expect(plan.overflow).toBe(false);
        expect(plan.toasts).toHaveLength(2);
    });

    it("should skip notifications without an id when acknowledging", () => {
        const plan = planNotificationBatch(
            [notification({id: undefined}), notification({id: 7})],
            5,
        );

        expect(plan.acknowledgeIds).toEqual([7]);
        expect(plan.toasts).toHaveLength(2);
    });

    it("should still acknowledge a notification whose message type shows no toast", () => {
        const plan = planNotificationBatch(
            [notification({id: 4, messageType: "UNKNOWN"})],
            5,
        );

        expect(plan.toasts).toEqual([]);
        expect(plan.acknowledgeIds).toEqual([4]);
    });
});

describe("notifications live transport", () => {
    it("should parse a batch and acknowledge over the same connection", async () => {
        const sent: {destination: string; body?: string}[] = [];
        let receive: (body: string) => void = () => undefined;
        const transport: LiveTransport = {
            subscribe: vi.fn(async (options) => {
                expect(options.destination).toBe("/topic/notifications");
                receive = (body) => options.onMessage(options.parse(body));
                const send: LiveSend = (destination, body) =>
                    sent.push({body, destination});
                options.onReady?.(send);
                return {close: vi.fn()};
            }),
        };
        const onNotifications = vi.fn(
            (
                notifications: LiveNotification[],
                acknowledge: (id: number) => void,
            ) => {
                for (const entry of notifications) {
                    if (entry.id !== undefined) acknowledge(entry.id);
                }
            },
        );

        await createNotificationsLiveTransport(
            transport,
        ).subscribeNotifications(onNotifications, vi.fn());
        receive(
            JSON.stringify([
                {body: "Hello", id: 11, messageType: "INFO"},
                {body: null, messageType: "WARNING"},
            ]),
        );

        expect(onNotifications).toHaveBeenCalledOnce();
        expect(onNotifications.mock.calls[0]?.[0]).toEqual([
            {body: "Hello", id: 11, messageType: "INFO", title: null},
            {body: "", messageType: "WARNING", title: null},
        ]);
        expect(sent).toEqual([
            {body: "11", destination: "/app/markNotificationRead"},
        ]);
    });
});
