import {Client, type StompSubscription} from "@stomp/stompjs";
import SockJS from "sockjs-client";

export type LiveSubscription = {close(): void};

/**
 * Publishes a STOMP frame on the same connection that carries the
 * subscription. Handed to `onReady` rather than exposed on
 * `LiveSubscription` so a caller can only send while the connection is
 * actually up, and so message modules that never send (search progress) keep
 * their existing shape.
 */
export type LiveSend = (destination: string, body?: string) => void;

export type LiveSubscribeOptions<T> = {
    destination: string;
    parse(body: string): T;
    onMessage(message: T): void;
    onUnavailable(error: Error): void;
    /**
     * Invoked after the destination is subscribed, on the first connect and
     * again after every reconnect — an initial-state request (legacy's
     * `/app/connectDownloaderStatus`) has to be re-sent once the topic
     * subscription that carries its reply is back in place.
     */
    onReady?(send: LiveSend): void;
};

export type LiveTransport = {
    subscribe<T>(options: LiveSubscribeOptions<T>): Promise<LiveSubscription>;
};

/**
 * One `subscribe()` call's state on the shared connection. `closed` is
 * per-subscription (a subscriber that closed, timed out, or was rejected must
 * never be resubscribed or handed a sender), while activation and the socket
 * itself belong to `SharedLiveConnection`.
 */
type LiveSubscriber = {
    destination: string;
    closed: boolean;
    /** The current STOMP subscription; replaced on every reconnect. */
    stomp: StompSubscription | undefined;
    /** A frame body for this subscriber's destination. */
    onFrame(body: string): void;
    /** Called after this subscriber's destination is (re)subscribed. */
    onConnected(send: LiveSend): void;
    /** A connection-level failure; parse failures never reach here. */
    onFailed(error: Error): void;
};

/**
 * The single SockJS/STOMP client behind every subscription that shares a base
 * URL. Consumers subscribe independently — the downloader footer and the
 * notification toasts for the session's whole lifetime, search progress only
 * while a search runs — so the client is activated for the first subscriber
 * and deactivated only when the last one closes; a later subscriber after that
 * opens a fresh connection.
 */
class SharedLiveConnection {
    private client: Client | undefined;
    private open = false;
    private readonly subscribers = new Set<LiveSubscriber>();

    constructor(
        private readonly baseUrl: string,
        private readonly onEmpty: () => void,
    ) {}

    /**
     * Whether the connection is already established, so a joining subscriber
     * can be attached at once instead of waiting (and possibly timing out) for
     * a connect that has already happened.
     */
    get connected(): boolean {
        return this.open;
    }

    add(subscriber: LiveSubscriber): void {
        this.subscribers.add(subscriber);
        if (!this.client) {
            this.client = this.createClient();
            this.client.activate();
            return;
        }
        if (this.open) this.attach(subscriber);
    }

    /**
     * Drops one subscription. The STOMP unsubscribe has to reach the server
     * even while others stay open: `NotificationsWeb` schedules its per-topic
     * work on the first subscribe and cancels it when the last subscription is
     * gone, which it can only see per destination.
     */
    remove(subscriber: LiveSubscriber): void {
        if (!this.subscribers.delete(subscriber)) return;
        subscriber.stomp?.unsubscribe();
        subscriber.stomp = undefined;
        if (this.subscribers.size > 0) return;
        const client = this.client;
        this.client = undefined;
        this.open = false;
        this.onEmpty();
        void client?.deactivate({force: true});
    }

    private attach(subscriber: LiveSubscriber): void {
        const client = this.client;
        if (!client) return;
        subscriber.stomp?.unsubscribe();
        subscriber.stomp = client.subscribe(subscriber.destination, (frame) =>
            subscriber.onFrame(frame.body),
        );
        // A real STOMP frame: a destination and a body. Legacy's downloader
        // footer passed a callback where the headers argument belongs, which
        // stomp.js serialized as the frame's headers instead of registering a
        // receipt handler.
        subscriber.onConnected((destination, body = "") => {
            if (subscriber.closed || !client.connected) return;
            client.publish({body, destination});
        });
    }

    private createClient(): Client {
        const client = new Client({
            debug: () => undefined,
            reconnectDelay: 1_000,
            webSocketFactory: () => new SockJS(`${this.baseUrl}websocket`),
        });
        // Fires on the first connect and again after every reconnect. The
        // snapshot keeps the fan-out stable while an `onReady` callback closes
        // its own subscription, and `attach` unsubscribes the stale STOMP
        // subscription first so a reconnect never leaves two behind.
        client.onConnect = () => {
            if (this.client !== client) return;
            this.open = true;
            for (const subscriber of [...this.subscribers]) {
                if (!subscriber.closed) this.attach(subscriber);
            }
        };
        client.onWebSocketClose = () => {
            if (this.client === client) this.open = false;
        };
        const fail = () => {
            if (this.client !== client) return;
            this.open = false;
            const error = new Error("Live progress connection failed");
            for (const subscriber of [...this.subscribers]) {
                if (!subscriber.closed) subscriber.onFailed(error);
            }
        };
        client.onStompError = fail;
        client.onWebSocketError = fail;
        return client;
    }
}

/**
 * One connection per base URL rather than per transport instance: the shell
 * builds its own transport for the permanent subscriptions and the search page
 * builds another for search progress, and both are meant to travel over the
 * one websocket session the server sees.
 */
const sharedConnections = new Map<string, SharedLiveConnection>();

function sharedConnection(baseUrl: string): SharedLiveConnection {
    const existing = sharedConnections.get(baseUrl);
    if (existing) return existing;
    const connection = new SharedLiveConnection(baseUrl, () =>
        sharedConnections.delete(baseUrl),
    );
    sharedConnections.set(baseUrl, connection);
    return connection;
}

export class SockJsStompLiveTransport implements LiveTransport {
    constructor(
        private readonly baseUrl: string,
        private readonly readyTimeoutMs = 1_500,
    ) {}

    subscribe<T>({
        destination,
        parse: parseMessage,
        onMessage,
        onUnavailable,
        onReady,
    }: LiveSubscribeOptions<T>): Promise<LiveSubscription> {
        return new Promise((resolve, reject) => {
            const connection = sharedConnection(this.baseUrl);
            let settled = false;
            let closed = false;
            const close = () => {
                if (closed) return;
                closed = true;
                subscriber.closed = true;
                window.clearTimeout(timeout);
                connection.remove(subscriber);
            };
            const fail = (error: Error) => {
                if (!settled) {
                    settled = true;
                    close();
                    reject(error);
                } else if (!closed) {
                    onUnavailable(error);
                }
            };
            const subscriber: LiveSubscriber = {
                closed: false,
                destination,
                onConnected: (send) => {
                    if (subscriber.closed) return;
                    if (!settled) {
                        settled = true;
                        window.clearTimeout(timeout);
                        resolve({close});
                    }
                    onReady?.(send);
                },
                onFailed: fail,
                onFrame: (body) => {
                    try {
                        onMessage(parseMessage(body));
                    } catch {
                        onUnavailable(
                            new Error("Live progress message was invalid"),
                        );
                    }
                },
                stomp: undefined,
            };
            // Only a subscriber that still has to wait for a connect can time
            // out; one joining an established connection is attached
            // synchronously by `add` below.
            const timeout = connection.connected
                ? undefined
                : window.setTimeout(() => {
                      fail(new Error("Live progress connection timed out"));
                  }, this.readyTimeoutMs);
            connection.add(subscriber);
        });
    }
}
