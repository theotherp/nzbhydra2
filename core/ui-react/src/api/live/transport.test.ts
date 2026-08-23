import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const stomp = vi.hoisted(() => ({
    clients: [] as MockClient[],
    unsubscribed: [] as string[],
}));

type MockClientConfig = {
    reconnectDelay?: number;
    webSocketFactory?: () => unknown;
};

type MockClient = {
    activate: ReturnType<typeof vi.fn>;
    deactivate: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
    config: MockClientConfig;
    connected: boolean;
    onConnect?: () => void;
    onWebSocketClose?: () => void;
    onStompError?: () => void;
    onWebSocketError?: () => void;
};

vi.mock("@stomp/stompjs", () => ({
    Client: vi.fn(function (this: MockClient, config: MockClientConfig) {
        this.config = config;
        this.connected = false;
        // The real client opens its socket when it is activated, which is what
        // makes "one client" and "one socket" the same claim.
        this.activate = vi.fn(() => config.webSocketFactory?.());
        this.deactivate = vi.fn(() => {
            this.connected = false;
        });
        this.subscribe = vi.fn((destination: string) => ({
            unsubscribe: vi.fn(() => stomp.unsubscribed.push(destination)),
        }));
        this.publish = vi.fn();
        stomp.clients.push(this);
    }),
}));

vi.mock("sockjs-client", () => ({default: vi.fn()}));

import SockJS from "sockjs-client";

import {SockJsStompLiveTransport} from "./transport";

const socket = vi.mocked(SockJS);

/**
 * Connections are shared per base URL, so every test uses its own to stay
 * independent of the connections other tests opened and closed.
 */
let baseUrls = 0;
const nextBaseUrl = () => `/hydra-${++baseUrls}/`;

const onlyClient = () => {
    expect(stomp.clients).toHaveLength(1);
    return stomp.clients[0];
};

function connect(client: MockClient | undefined) {
    if (!client) throw new Error("no client");
    client.connected = true;
    client.onConnect?.();
}

function drop(client: MockClient | undefined) {
    if (!client) throw new Error("no client");
    client.connected = false;
    client.onWebSocketClose?.();
}

function subscribe(
    transport: SockJsStompLiveTransport,
    destination: string,
    handlers: {
        onMessage?: () => void;
        onUnavailable?: () => void;
        onReady?: () => void;
    } = {},
) {
    return transport.subscribe({
        destination,
        onMessage: handlers.onMessage ?? vi.fn(),
        onReady: handlers.onReady,
        onUnavailable: handlers.onUnavailable ?? vi.fn(),
        parse: JSON.parse,
    });
}

describe("SockJsStompLiveTransport", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        stomp.clients = [];
        stomp.unsubscribed = [];
        socket.mockClear();
    });

    afterEach(() => vi.useRealTimers());

    it("should time out, deactivate, and reject before subscribing", async () => {
        const unavailable = vi.fn();
        const subscription = subscribe(
            new SockJsStompLiveTransport(nextBaseUrl(), 10),
            "/topic/searchState",
            {onUnavailable: unavailable},
        );
        const rejection = expect(subscription).rejects.toThrow("timed out");

        await vi.advanceTimersByTimeAsync(10);
        await rejection;
        expect(onlyClient().deactivate).toHaveBeenCalledWith({force: true});
        expect(unavailable).not.toHaveBeenCalled();
    });

    it("should reject connection errors and report message parser failures", async () => {
        const unavailable = vi.fn();
        const failing = subscribe(
            new SockJsStompLiveTransport(nextBaseUrl()),
            "/topic/searchState",
            {onUnavailable: unavailable},
        );
        onlyClient().onWebSocketError?.();
        await expect(failing).rejects.toThrow("connection failed");

        const transport = new SockJsStompLiveTransport(nextBaseUrl());
        const connected = subscribe(transport, "/topic/searchState", {
            onUnavailable: unavailable,
        });
        const client = stomp.clients[1];
        const unsubscribe = vi.fn();
        client?.subscribe.mockImplementation((_destination, callback) => {
            callback({body: "not json"});
            return {unsubscribe};
        });
        connect(client);
        await connected;
        expect(unavailable).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Live progress message was invalid",
            }),
        );
    });

    it("should resubscribe the scoped destination after reconnect and close exactly once", async () => {
        const transport = new SockJsStompLiveTransport(nextBaseUrl());
        const subscription = subscribe(transport, "/topic/searchState");
        const firstUnsubscribe = vi.fn();
        const replacementUnsubscribe = vi.fn();
        const client = onlyClient();
        client.subscribe
            .mockReturnValueOnce({unsubscribe: firstUnsubscribe})
            .mockReturnValueOnce({unsubscribe: replacementUnsubscribe});

        expect(client.config).toMatchObject({reconnectDelay: 1_000});
        connect(client);
        const liveSubscription = await subscription;

        drop(client);
        connect(client);
        expect(firstUnsubscribe).toHaveBeenCalledOnce();
        expect(client.subscribe).toHaveBeenCalledTimes(2);
        expect(client.subscribe).toHaveBeenNthCalledWith(
            1,
            "/topic/searchState",
            expect.any(Function),
        );
        expect(client.subscribe).toHaveBeenNthCalledWith(
            2,
            "/topic/searchState",
            expect.any(Function),
        );

        liveSubscription.close();
        liveSubscription.close();
        expect(replacementUnsubscribe).toHaveBeenCalledOnce();
        expect(client.deactivate).toHaveBeenCalledOnce();
    });

    it("should hand a sender to onReady only after subscribing, and refuse to send once closed", async () => {
        const order: string[] = [];
        let send: ((destination: string, body?: string) => void) | undefined;
        const subscription = new SockJsStompLiveTransport(
            nextBaseUrl(),
        ).subscribe({
            destination: "/topic/downloaderStatus",
            onMessage: vi.fn(),
            onReady: (ready) => {
                order.push("ready");
                send = ready;
            },
            onUnavailable: vi.fn(),
            parse: JSON.parse,
        });
        const client = onlyClient();
        client.subscribe.mockImplementation(() => {
            order.push("subscribe");
            return {unsubscribe: vi.fn()};
        });
        connect(client);
        const liveSubscription = await subscription;

        expect(order).toEqual(["subscribe", "ready"]);
        send?.("/app/connectDownloaderStatus");
        // A real STOMP frame: a destination and a body, not a callback in the
        // headers argument the way legacy's downloader footer sent it.
        expect(client.publish).toHaveBeenCalledWith({
            body: "",
            destination: "/app/connectDownloaderStatus",
        });

        send?.("/app/markNotificationRead", "7");
        expect(client.publish).toHaveBeenLastCalledWith({
            body: "7",
            destination: "/app/markNotificationRead",
        });

        liveSubscription.close();
        send?.("/app/markNotificationRead", "8");
        expect(client.publish).toHaveBeenCalledTimes(2);
    });

    it("should multiplex concurrent subscriptions over one client and one socket", async () => {
        const baseUrl = nextBaseUrl();
        // Two transports, as the shell and the search page build them: the
        // connection is shared per base URL, not per transport instance.
        const shell = new SockJsStompLiveTransport(baseUrl);
        const search = new SockJsStompLiveTransport(baseUrl);
        const pending = [
            subscribe(shell, "/topic/downloaderStatus"),
            subscribe(shell, "/topic/notifications"),
            subscribe(search, "/topic/searchState"),
        ];
        const client = onlyClient();
        connect(client);
        const subscriptions = await Promise.all(pending);

        expect(socket).toHaveBeenCalledOnce();
        expect(socket).toHaveBeenCalledWith(`${baseUrl}websocket`);
        expect(client.activate).toHaveBeenCalledOnce();
        expect(client.subscribe.mock.calls.map(([sent]) => sent)).toEqual([
            "/topic/downloaderStatus",
            "/topic/notifications",
            "/topic/searchState",
        ]);

        // Closing one subscription unsubscribes only its own destination and
        // leaves the shared connection up for the others.
        subscriptions[0]?.close();
        expect(stomp.unsubscribed).toEqual(["/topic/downloaderStatus"]);
        expect(client.deactivate).not.toHaveBeenCalled();

        subscriptions[1]?.close();
        subscriptions[2]?.close();
        expect(stomp.unsubscribed).toEqual([
            "/topic/downloaderStatus",
            "/topic/notifications",
            "/topic/searchState",
        ]);
        expect(client.deactivate).toHaveBeenCalledWith({force: true});
    });

    it("should deactivate the shared client whatever order its subscriptions close in", async () => {
        const orders = [
            [0, 1, 2],
            [0, 2, 1],
            [1, 0, 2],
            [1, 2, 0],
            [2, 0, 1],
            [2, 1, 0],
        ];
        for (const order of orders) {
            stomp.clients = [];
            socket.mockClear();
            const transport = new SockJsStompLiveTransport(nextBaseUrl());
            const pending = [
                subscribe(transport, "/topic/downloaderStatus"),
                subscribe(transport, "/topic/notifications"),
                subscribe(transport, "/topic/searchState"),
            ];
            const client = onlyClient();
            connect(client);
            const subscriptions = await Promise.all(pending);
            expect(socket).toHaveBeenCalledOnce();

            for (const [closed, index] of order.entries()) {
                subscriptions[index]?.close();
                expect(client.deactivate.mock.calls).toHaveLength(
                    closed === order.length - 1 ? 1 : 0,
                );
            }
            expect(client.connected).toBe(false);
        }
    });

    it("should reconnect on a later subscription after the last one closed", async () => {
        const transport = new SockJsStompLiveTransport(nextBaseUrl());
        const first = subscribe(transport, "/topic/notifications");
        connect(stomp.clients[0]);
        (await first).close();
        expect(stomp.clients[0]?.deactivate).toHaveBeenCalledOnce();

        const second = subscribe(transport, "/topic/notifications");
        expect(stomp.clients).toHaveLength(2);
        connect(stomp.clients[1]);
        await expect(second).resolves.toBeDefined();
        expect(socket).toHaveBeenCalledTimes(2);
    });

    it("should time out only the subscription that waited, and short-circuit the wait once connected", async () => {
        const baseUrl = nextBaseUrl();
        const unavailable = vi.fn();
        const timingOut = subscribe(
            new SockJsStompLiveTransport(baseUrl, 10),
            "/topic/searchState",
            {onUnavailable: unavailable},
        );
        const permanent = subscribe(
            new SockJsStompLiveTransport(baseUrl, 10_000),
            "/topic/notifications",
        );
        const client = onlyClient();
        const rejection = expect(timingOut).rejects.toThrow("timed out");
        await vi.advanceTimersByTimeAsync(10);
        await rejection;

        // Only the timed-out subscription is gone: the connection stays, and
        // the other subscription still resolves when the connect arrives.
        expect(client.deactivate).not.toHaveBeenCalled();
        expect(stomp.unsubscribed).toEqual([]);
        connect(client);
        await expect(permanent).resolves.toBeDefined();
        expect(client.subscribe.mock.calls.map(([sent]) => sent)).toEqual([
            "/topic/notifications",
        ]);
        expect(unavailable).not.toHaveBeenCalled();

        // A subscriber joining the established connection is attached at once
        // and never waits for a connect that already happened.
        const late = subscribe(
            new SockJsStompLiveTransport(baseUrl, 10),
            "/topic/downloaderStatus",
        );
        await expect(late).resolves.toBeDefined();
        await vi.advanceTimersByTimeAsync(1_000);
        await expect(late).resolves.toBeDefined();
        expect(stomp.clients).toHaveLength(1);
    });

    it("should re-ready every open subscription after a reconnect", async () => {
        const transport = new SockJsStompLiveTransport(nextBaseUrl());
        const downloaderReady = vi.fn();
        const notificationsReady = vi.fn();
        const pending = [
            subscribe(transport, "/topic/downloaderStatus", {
                onReady: downloaderReady,
            }),
            subscribe(transport, "/topic/notifications", {
                onReady: notificationsReady,
            }),
        ];
        const client = onlyClient();
        connect(client);
        const subscriptions = await Promise.all(pending);
        expect(downloaderReady).toHaveBeenCalledOnce();
        expect(notificationsReady).toHaveBeenCalledOnce();

        drop(client);
        connect(client);
        expect(downloaderReady).toHaveBeenCalledTimes(2);
        expect(notificationsReady).toHaveBeenCalledTimes(2);
        expect(client.subscribe.mock.calls.map(([sent]) => sent)).toEqual([
            "/topic/downloaderStatus",
            "/topic/notifications",
            "/topic/downloaderStatus",
            "/topic/notifications",
        ]);

        // A closed subscription is neither resubscribed nor re-readied.
        subscriptions[0]?.close();
        drop(client);
        connect(client);
        expect(downloaderReady).toHaveBeenCalledTimes(2);
        expect(notificationsReady).toHaveBeenCalledTimes(3);
        expect(client.deactivate).not.toHaveBeenCalled();
    });

    it("should deliver a parse failure only to the subscription that could not read it", async () => {
        const transport = new SockJsStompLiveTransport(nextBaseUrl());
        const searchUnavailable = vi.fn();
        const notificationsUnavailable = vi.fn();
        const notificationsMessage = vi.fn();
        const frames = new Map<string, (frame: {body: string}) => void>();
        const pending = [
            subscribe(transport, "/topic/searchState", {
                onUnavailable: searchUnavailable,
            }),
            subscribe(transport, "/topic/notifications", {
                onMessage: notificationsMessage,
                onUnavailable: notificationsUnavailable,
            }),
        ];
        const client = onlyClient();
        client.subscribe.mockImplementation((destination, callback) => {
            frames.set(destination, callback);
            return {unsubscribe: vi.fn()};
        });
        connect(client);
        await Promise.all(pending);

        frames.get("/topic/searchState")?.({body: "not json"});
        frames.get("/topic/notifications")?.({body: "[]"});
        expect(searchUnavailable).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Live progress message was invalid",
            }),
        );
        expect(notificationsUnavailable).not.toHaveBeenCalled();
        expect(notificationsMessage).toHaveBeenCalledWith([]);
    });

    it("should keep the shared connection through a transient search subscription", async () => {
        const baseUrl = nextBaseUrl();
        const shell = new SockJsStompLiveTransport(baseUrl);
        const permanent = [
            subscribe(shell, "/topic/downloaderStatus"),
            subscribe(shell, "/topic/notifications"),
        ];
        const client = onlyClient();
        connect(client);
        await Promise.all(permanent);

        // A search runs and finishes while the footer and the toasts stay
        // subscribed: no new client, no new socket, nothing deactivated.
        const search = new SockJsStompLiveTransport(baseUrl);
        const progress = await subscribe(search, "/topic/searchState");
        expect(stomp.clients).toHaveLength(1);
        expect(socket).toHaveBeenCalledOnce();
        progress.close();

        expect(stomp.unsubscribed).toEqual(["/topic/searchState"]);
        expect(client.deactivate).not.toHaveBeenCalled();
        expect(client.activate).toHaveBeenCalledOnce();

        const second = await subscribe(search, "/topic/searchState");
        expect(stomp.clients).toHaveLength(1);
        expect(socket).toHaveBeenCalledOnce();
        second.close();
        for (const subscription of await Promise.all(permanent))
            subscription.close();
        expect(client.deactivate).toHaveBeenCalledOnce();
    });
});
