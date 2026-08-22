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
            let settled = false;
            let closed = false;
            let subscription: StompSubscription | undefined;
            const timeout = window.setTimeout(() => {
                fail(new Error("Live progress connection timed out"));
            }, this.readyTimeoutMs);
            const client = new Client({
                reconnectDelay: 1_000,
                webSocketFactory: () => new SockJS(`${this.baseUrl}websocket`),
                debug: () => undefined,
            });
            const close = () => {
                if (closed) return;
                closed = true;
                window.clearTimeout(timeout);
                subscription?.unsubscribe();
                void client.deactivate({force: true});
            };
            const fail = (error: Error) => {
                if (!settled) {
                    settled = true;
                    window.clearTimeout(timeout);
                    close();
                    reject(error);
                } else if (!closed) {
                    onUnavailable(error);
                }
            };
            client.onConnect = () => {
                if (closed) return;
                subscription?.unsubscribe();
                subscription = client.subscribe(destination, (frame) => {
                    try {
                        onMessage(parseMessage(frame.body));
                    } catch {
                        onUnavailable(
                            new Error("Live progress message was invalid"),
                        );
                    }
                });
                if (!settled) {
                    settled = true;
                    window.clearTimeout(timeout);
                    resolve({close});
                }
                // A real STOMP frame: a destination and a body. Legacy's
                // downloader footer passed a callback where the headers
                // argument belongs, which stomp.js serialized as the frame's
                // headers instead of registering a receipt handler.
                onReady?.((sendDestination, body = "") => {
                    if (closed || !client.connected) return;
                    client.publish({destination: sendDestination, body});
                });
            };
            client.onStompError = () =>
                fail(new Error("Live progress connection failed"));
            client.onWebSocketError = () =>
                fail(new Error("Live progress connection failed"));
            client.activate();
        });
    }
}
