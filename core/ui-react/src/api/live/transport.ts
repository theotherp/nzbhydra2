import {Client, type StompSubscription} from "@stomp/stompjs";
import SockJS from "sockjs-client";

export type LiveSubscription = {close(): void};

export type LiveTransport = {
    subscribe<T>(options: {
        destination: string;
        parse(body: string): T;
        onMessage(message: T): void;
        onUnavailable(error: Error): void;
    }): Promise<LiveSubscription>;
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
    }: {
        destination: string;
        parse(body: string): T;
        onMessage(message: T): void;
        onUnavailable(error: Error): void;
    }): Promise<LiveSubscription> {
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
            };
            client.onStompError = () =>
                fail(new Error("Live progress connection failed"));
            client.onWebSocketError = () =>
                fail(new Error("Live progress connection failed"));
            client.activate();
        });
    }
}
