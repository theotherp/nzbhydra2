import {describe, expect, it, vi} from "vitest";

import {createDownloaderStatusLiveTransport} from "./downloaderStatus";
import type {LiveSend, LiveTransport} from "./transport";

function fakeTransport() {
    const sent: {destination: string; body?: string}[] = [];
    let receive: (body: string) => void = () => undefined;
    let ready: () => void = () => undefined;
    let destination = "";
    const close = vi.fn();
    const transport: LiveTransport = {
        subscribe: vi.fn(async (options) => {
            destination = options.destination;
            receive = (body) => options.onMessage(options.parse(body));
            const send: LiveSend = (sendDestination, body) =>
                sent.push({body, destination: sendDestination});
            ready = () => options.onReady?.(send);
            ready();
            return {close};
        }),
    };
    return {
        close,
        get destination() {
            return destination;
        },
        reconnect: () => ready(),
        receive: (body: string) => receive(body),
        sent,
        transport,
    };
}

const status = {
    downloadRateFormatted: "1.2 MB/s",
    downloaderName: "NZBGet",
    downloaderType: "NZBGET",
    downloadingRatesInKilobytes: [1, 2, 3],
    downloadingTitle: "Some.Release",
    downloadingTitlePercentFinished: 42,
    downloadingTitleRemainingTimeFormatted: "1m",
    elementsInQueue: 3,
    lastDownloadRate: 3,
    lastUpdateForNow: false,
    remainingTimeFormatted: "2m",
    state: "DOWNLOADING",
    url: "http://localhost:6789",
};

describe("downloader status live transport", () => {
    it("should request the initial state with a real STOMP frame once the topic is subscribed", async () => {
        const fake = fakeTransport();
        await createDownloaderStatusLiveTransport(
            fake.transport,
        ).subscribeDownloaderStatus(vi.fn(), vi.fn());

        expect(fake.destination).toBe("/topic/downloaderStatus");
        // Legacy passed a callback where the STOMP headers belong; the reply
        // to this send is `@SendTo` the topic above, so what matters is a
        // proper frame sent after the subscription exists.
        expect(fake.sent).toEqual([
            {body: undefined, destination: "/app/connectDownloaderStatus"},
        ]);
    });

    it("should re-request the initial state after a reconnect", async () => {
        const fake = fakeTransport();
        await createDownloaderStatusLiveTransport(
            fake.transport,
        ).subscribeDownloaderStatus(vi.fn(), vi.fn());
        fake.reconnect();

        expect(fake.sent).toHaveLength(2);
    });

    it("should deliver the initial-state reply arriving on the topic", async () => {
        const fake = fakeTransport();
        const onStatus = vi.fn();
        await createDownloaderStatusLiveTransport(
            fake.transport,
        ).subscribeDownloaderStatus(onStatus, vi.fn());

        fake.receive(JSON.stringify(status));

        expect(onStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                downloaderType: "NZBGET",
                downloadingRatesInKilobytes: [1, 2, 3],
                elementsInQueue: 3,
                lastUpdateForNow: false,
                state: "DOWNLOADING",
            }),
        );
    });

    it("should tolerate the nothing-enabled status whose fields are server defaults", async () => {
        const fake = fakeTransport();
        const onStatus = vi.fn();
        await createDownloaderStatusLiveTransport(
            fake.transport,
        ).subscribeDownloaderStatus(onStatus, vi.fn());

        fake.receive(
            JSON.stringify({
                downloaderName: null,
                downloaderType: null,
                downloadingRatesInKilobytes: [],
                elementsInQueue: 0,
                lastDownloadRate: 1,
                state: "NONE_ENABLED",
            }),
        );

        expect(onStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                downloadRateFormatted: null,
                downloaderType: null,
                lastUpdateForNow: false,
                state: "NONE_ENABLED",
                url: null,
            }),
        );
    });
});
