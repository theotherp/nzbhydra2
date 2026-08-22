import type {SafeConfig} from "../../bootstrap";

/**
 * Legacy's `maxEntriesHistory`: the footer graph is a rolling window of the
 * last 200 samples, and the same number bounds the buffer a hidden tab fills.
 */
export const RATE_WINDOW_SIZE = 200;

/**
 * Legacy's footer gate (`footer.js:17`): the setting alone is not enough, at
 * least one downloader has to be enabled. Read from the reactive safe config
 * (ADR-0017) so saving the downloading configuration shows or hides the footer
 * without a reload.
 */
export function showsDownloaderStatus(safeConfig: SafeConfig): boolean {
    const downloading = asRecord(safeConfig?.downloading);
    if (downloading?.showDownloaderStatus !== true) {
        return false;
    }
    const downloaders = downloading.downloaders;
    return (
        Array.isArray(downloaders) &&
        downloaders.some((downloader) => asRecord(downloader)?.enabled === true)
    );
}

/**
 * The window's growth path, matching legacy exactly: while it is not yet full
 * it is filled from the status message's own rate history at the position it
 * has reached, and only once full does each update move it forward by the
 * single latest rate.
 */
export function nextRateWindow(
    current: number[],
    status: {
        downloadingRatesInKilobytes: number[];
        lastDownloadRate: number | null;
    },
): number[] {
    if (current.length < RATE_WINDOW_SIZE) {
        return [
            ...current,
            ...status.downloadingRatesInKilobytes.slice(
                current.length,
                RATE_WINDOW_SIZE,
            ),
        ];
    }
    return [...current.slice(1), status.lastDownloadRate ?? 0];
}

/** One self-advance step: drop the oldest sample, repeat the last known rate. */
export function advancedRateWindow(current: number[], rate: number): number[] {
    return [...current.slice(1), rate];
}

/**
 * The self-advance interval's own stop condition: the window now says nothing
 * but the last known rate, so repeating it again cannot change the graph.
 */
export function isRateWindowUniform(window: number[], rate: number): boolean {
    return window.length > 0 && window.every((value) => value === rate);
}

/**
 * Applies the rates a hidden tab buffered, oldest first, in one pass — legacy's
 * `applyBufferedRates`.
 */
export function appendBufferedRates(
    current: number[],
    buffered: number[],
): number[] {
    return buffered.reduce<number[]>(
        (window, rate) =>
            window.length >= RATE_WINDOW_SIZE
                ? [...window.slice(1), rate]
                : [...window, rate],
        current,
    );
}

/** Legacy's `bufferedRates` sliding window while the tab is in the background. */
export function bufferRate(buffered: number[], rate: number): number[] {
    const next = [...buffered, rate];
    return next.length > RATE_WINDOW_SIZE ? next.slice(1) : next;
}

export type DownloaderStateKind =
    | "downloading"
    | "paused"
    | "offline"
    | "other";

export function downloaderStateKind(state: string | null): DownloaderStateKind {
    if (state === "DOWNLOADING") return "downloading";
    if (state === "PAUSED") return "paused";
    if (state === "OFFLINE") return "offline";
    return "other";
}

/**
 * Legacy's own label transform (`state.substr(0, 1) + state.substr(1)
 * .toLowerCase()`), which is what its tooltip showed.
 */
export function downloaderStateLabel(state: string | null): string {
    if (state === null || state === "") {
        return "Unknown";
    }
    return state.charAt(0) + state.slice(1).toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : undefined;
}
