import {describe, expect, it} from "vitest";

import {
    advancedRateWindow,
    appendBufferedRates,
    bufferRate,
    downloaderStateKind,
    downloaderStateLabel,
    isRateWindowUniform,
    nextRateWindow,
    RATE_WINDOW_SIZE,
    showsDownloaderStatus,
} from "./downloaderFooter";

describe("downloader footer visibility", () => {
    it("should show the footer only with the setting on and a downloader enabled", () => {
        expect(
            showsDownloaderStatus({
                downloading: {
                    downloaders: [{enabled: true}],
                    showDownloaderStatus: true,
                },
            }),
        ).toBe(true);
    });

    it("should hide the footer with the setting off", () => {
        expect(
            showsDownloaderStatus({
                downloading: {
                    downloaders: [{enabled: true}],
                    showDownloaderStatus: false,
                },
            }),
        ).toBe(false);
    });

    it("should hide the footer with no enabled downloader", () => {
        expect(
            showsDownloaderStatus({
                downloading: {
                    downloaders: [{enabled: false}],
                    showDownloaderStatus: true,
                },
            }),
        ).toBe(false);
        expect(
            showsDownloaderStatus({
                downloading: {downloaders: [], showDownloaderStatus: true},
            }),
        ).toBe(false);
    });

    it("should hide the footer without a safe configuration", () => {
        expect(showsDownloaderStatus(null)).toBe(false);
        expect(showsDownloaderStatus({})).toBe(false);
    });
});

describe("rolling rate window", () => {
    it("should fill from the message's own history until it is full", () => {
        expect(nextRateWindow([], seed([1, 2, 3]))).toEqual([1, 2, 3]);
        expect(nextRateWindow([1, 2, 3], seed([1, 2, 3, 4, 5]))).toEqual([
            1, 2, 3, 4, 5,
        ]);
    });

    it("should never grow beyond the window size while filling", () => {
        const history = Array.from({length: 260}, (_, index) => index);
        expect(nextRateWindow([], seed(history))).toHaveLength(
            RATE_WINDOW_SIZE,
        );
    });

    it("should move forward by the latest rate once full", () => {
        const full = Array.from({length: RATE_WINDOW_SIZE}, () => 1);
        const moved = nextRateWindow(full, {
            downloadingRatesInKilobytes: [9, 9, 9],
            lastDownloadRate: 42,
        });
        expect(moved).toHaveLength(RATE_WINDOW_SIZE);
        expect(moved.at(-1)).toBe(42);
        expect(moved.at(0)).toBe(1);
    });

    it("should treat a missing latest rate as zero", () => {
        const full = Array.from({length: RATE_WINDOW_SIZE}, () => 1);
        expect(
            nextRateWindow(full, {
                downloadingRatesInKilobytes: [],
                lastDownloadRate: null,
            }).at(-1),
        ).toBe(0);
    });

    it("should advance by repeating the last known rate", () => {
        expect(advancedRateWindow([1, 2, 3], 7)).toEqual([2, 3, 7]);
    });

    it("should recognise a window filled with the last known rate", () => {
        expect(isRateWindowUniform([7, 7, 7], 7)).toBe(true);
        expect(isRateWindowUniform([7, 1, 7], 7)).toBe(false);
        expect(isRateWindowUniform([], 7)).toBe(false);
    });
});

describe("hidden tab buffering", () => {
    it("should bound the buffer at the window size, keeping the newest rates", () => {
        let buffered: number[] = [];
        for (let rate = 0; rate < RATE_WINDOW_SIZE + 10; rate++) {
            buffered = bufferRate(buffered, rate);
        }
        expect(buffered).toHaveLength(RATE_WINDOW_SIZE);
        expect(buffered.at(-1)).toBe(RATE_WINDOW_SIZE + 9);
        expect(buffered.at(0)).toBe(10);
    });

    it("should apply buffered rates oldest first without growing the window", () => {
        expect(appendBufferedRates([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
        const full = Array.from({length: RATE_WINDOW_SIZE}, () => 1);
        const applied = appendBufferedRates(full, [5, 6]);
        expect(applied).toHaveLength(RATE_WINDOW_SIZE);
        expect(applied.slice(-2)).toEqual([5, 6]);
    });
});

describe("downloader state", () => {
    it("should map the states legacy gave their own icon", () => {
        expect(downloaderStateKind("DOWNLOADING")).toBe("downloading");
        expect(downloaderStateKind("PAUSED")).toBe("paused");
        expect(downloaderStateKind("OFFLINE")).toBe("offline");
        expect(downloaderStateKind("IDLE")).toBe("other");
        expect(downloaderStateKind(null)).toBe("other");
    });

    it("should label a state the way legacy's tooltip did", () => {
        expect(downloaderStateLabel("DOWNLOADING")).toBe("Downloading");
        expect(downloaderStateLabel("NONE_ENABLED")).toBe("None_enabled");
        expect(downloaderStateLabel(null)).toBe("Unknown");
    });
});

function seed(downloadingRatesInKilobytes: number[]) {
    return {downloadingRatesInKilobytes, lastDownloadRate: null};
}
