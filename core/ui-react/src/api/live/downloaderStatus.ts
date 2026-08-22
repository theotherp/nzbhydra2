import {z} from "zod";

import type {LiveSubscription, LiveTransport} from "./transport";

/** `API-LIVE-DOWNLOADER-STATUS`. */
const DOWNLOADER_STATUS_TOPIC = "/topic/downloaderStatus";
/** `API-LIVE-DOWNLOADER-CONNECT`. */
const DOWNLOADER_CONNECT_DESTINATION = "/app/connectDownloaderStatus";

/**
 * The backend's `DownloaderStatus` (`shared/mapping`), including the formatted
 * strings its getters derive. Every field is optional-tolerant: the topic also
 * carries the "nothing enabled" status, whose fields are the Java defaults.
 */
export type DownloaderStatus = {
    downloaderName: string | null;
    downloaderType: string | null;
    elementsInQueue: number;
    downloadingTitle: string | null;
    downloadingTitlePercentFinished: number;
    downloadingTitleRemainingTimeFormatted: string | null;
    downloadRateFormatted: string | null;
    remainingTimeFormatted: string | null;
    downloadingRatesInKilobytes: number[];
    lastDownloadRate: number | null;
    state: string | null;
    url: string | null;
    lastUpdateForNow: boolean;
};

const nullableString = z
    .string()
    .nullish()
    .transform((value) => value ?? null);

function nullableNumber(fallback: number) {
    return z
        .number()
        .nullish()
        .transform((value) => value ?? fallback);
}

const downloaderStatusSchema: z.ZodType<DownloaderStatus> = z.object({
    downloaderName: nullableString,
    downloaderType: nullableString,
    elementsInQueue: nullableNumber(0),
    downloadingTitle: nullableString,
    downloadingTitlePercentFinished: nullableNumber(0),
    downloadingTitleRemainingTimeFormatted: nullableString,
    downloadRateFormatted: nullableString,
    remainingTimeFormatted: nullableString,
    downloadingRatesInKilobytes: z
        .array(z.number())
        .nullish()
        .transform((value) => value ?? []),
    lastDownloadRate: z
        .number()
        .nullish()
        .transform((value) => value ?? null),
    state: nullableString,
    url: nullableString,
    lastUpdateForNow: z
        .boolean()
        .nullish()
        .transform((value) => value === true),
});

export type DownloaderStatusLiveTransport = {
    subscribeDownloaderStatus(
        onStatus: (status: DownloaderStatus) => void,
        onUnavailable: (error: Error) => void,
    ): Promise<LiveSubscription>;
};

/**
 * `C-DOWNLOADER-STATUS`' message module: subscribes to the downloader-status
 * topic and then asks the backend for the state it already has. The reply to
 * `API-LIVE-DOWNLOADER-CONNECT` is `@SendTo` the very same topic
 * (`DownloaderWebSocket.connect()`), so the request is only ever sent after
 * the subscription that receives it exists — including after a reconnect.
 */
export function createDownloaderStatusLiveTransport(
    transport: LiveTransport,
): DownloaderStatusLiveTransport {
    return {
        subscribeDownloaderStatus(onStatus, onUnavailable) {
            return transport.subscribe({
                destination: DOWNLOADER_STATUS_TOPIC,
                parse: (body) => downloaderStatusSchema.parse(JSON.parse(body)),
                onMessage: onStatus,
                onReady: (send) => send(DOWNLOADER_CONNECT_DESTINATION),
                onUnavailable,
            });
        },
    };
}
