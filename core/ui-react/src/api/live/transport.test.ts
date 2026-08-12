import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const stomp = vi.hoisted(() => ({
    client: undefined as MockClient | undefined,
    config: undefined as MockClientConfig | undefined,
}));

type MockClientConfig = {
    reconnectDelay?: number;
};

type MockClient = {
    activate: ReturnType<typeof vi.fn>;
    deactivate: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    onConnect?: () => void;
    onStompError?: () => void;
    onWebSocketError?: () => void;
};

vi.mock("@stomp/stompjs", () => ({
    Client: vi.fn(function (this: MockClient, config: MockClientConfig) {
        this.activate = vi.fn();
        this.deactivate = vi.fn();
        this.subscribe = vi.fn();
        stomp.client = this;
        stomp.config = config;
    }),
}));

vi.mock("sockjs-client", () => ({default: vi.fn()}));

import {SockJsStompLiveTransport} from "./transport";

describe("SockJsStompLiveTransport", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        stomp.client = undefined;
        stomp.config = undefined;
    });

    afterEach(() => vi.useRealTimers());

    it("should time out, deactivate, and reject before subscribing", async () => {
        const unavailable = vi.fn();
        const subscription = new SockJsStompLiveTransport(
            "/hydra/",
            10,
        ).subscribe({
            destination: "/topic/searchState",
            parse: JSON.parse,
            onMessage: vi.fn(),
            onUnavailable: unavailable,
        });
        const rejection = expect(subscription).rejects.toThrow("timed out");

        await vi.advanceTimersByTimeAsync(10);
        await rejection;
        expect(stomp.client?.deactivate).toHaveBeenCalledWith({force: true});
        expect(unavailable).not.toHaveBeenCalled();
    });

    it("should reject connection errors and report message parser failures", async () => {
        const unavailable = vi.fn();
        const subscription = new SockJsStompLiveTransport("/hydra/").subscribe({
            destination: "/topic/searchState",
            parse: JSON.parse,
            onMessage: vi.fn(),
            onUnavailable: unavailable,
        });
        stomp.client?.onWebSocketError?.();
        await expect(subscription).rejects.toThrow("connection failed");

        const connected = new SockJsStompLiveTransport("/hydra/").subscribe({
            destination: "/topic/searchState",
            parse: JSON.parse,
            onMessage: vi.fn(),
            onUnavailable: unavailable,
        });
        const unsubscribe = vi.fn();
        stomp.client?.subscribe.mockImplementation((_destination, callback) => {
            callback({body: "not json"});
            return {unsubscribe};
        });
        stomp.client?.onConnect?.();
        await connected;
        expect(unavailable).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Live progress message was invalid",
            }),
        );
    });

    it("should resubscribe the scoped destination after reconnect and close exactly once", async () => {
        const subscription = new SockJsStompLiveTransport("/hydra/").subscribe({
            destination: "/topic/searchState",
            parse: JSON.parse,
            onMessage: vi.fn(),
            onUnavailable: vi.fn(),
        });
        const firstUnsubscribe = vi.fn();
        const replacementUnsubscribe = vi.fn();
        stomp.client?.subscribe
            .mockReturnValueOnce({unsubscribe: firstUnsubscribe})
            .mockReturnValueOnce({unsubscribe: replacementUnsubscribe});

        expect(stomp.config).toMatchObject({reconnectDelay: 1_000});
        stomp.client?.onConnect?.();
        const liveSubscription = await subscription;

        stomp.client?.onConnect?.();
        expect(firstUnsubscribe).toHaveBeenCalledOnce();
        expect(stomp.client?.subscribe).toHaveBeenCalledTimes(2);
        expect(stomp.client?.subscribe).toHaveBeenNthCalledWith(
            1,
            "/topic/searchState",
            expect.any(Function),
        );
        expect(stomp.client?.subscribe).toHaveBeenNthCalledWith(
            2,
            "/topic/searchState",
            expect.any(Function),
        );

        liveSubscription.close();
        liveSubscription.close();
        expect(replacementUnsubscribe).toHaveBeenCalledOnce();
        expect(stomp.client?.deactivate).toHaveBeenCalledOnce();
    });
});
