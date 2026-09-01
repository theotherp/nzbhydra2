import {ThemeProvider} from "@mui/material";
import {act, cleanup, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import type {
    DownloaderStatus,
    DownloaderStatusLiveTransport,
} from "../../api/live/downloaderStatus";
import {SafeConfigContext, type BootstrapData} from "../../bootstrap";
import {createHydraTheme} from "../theme";
import {DownloaderStatusFooter} from "./DownloaderStatusFooter";

/**
 * The sparkline is decorative, and rendering an SVG chart in jsdom proves
 * nothing about the rolling window. The mock exposes the exact window the
 * component holds instead, which is what the self-advance contract is about.
 */
vi.mock("@mui/x-charts/SparkLineChart", () => ({
    SparkLineChart: ({data}: {data: number[]}) => (
        <div data-rates={data.join(",")} data-testid="spark-line" />
    ),
}));

const enabledConfig = {
    downloading: {
        downloaders: [{enabled: true}],
        showDownloaderStatus: true,
    },
};

const bootstrap = {
    adminRestricted: false,
    authConfigured: false,
    authType: null,
    baseUrl: "/hydra/",
    maySeeAdmin: true,
    maySeeDetailsDl: true,
    maySeeSearch: true,
    maySeeStats: true,
    safeConfig: enabledConfig,
    searchRestricted: false,
    serverTimeZone: null,
    showIndexerSelection: false,
    showLogout: false,
    statsRestricted: false,
    username: null,
} satisfies BootstrapData;

function status(overrides: Partial<DownloaderStatus> = {}): DownloaderStatus {
    return {
        downloadRateFormatted: "1.2 MB/s",
        downloaderName: "NZBGet",
        downloaderType: "NZBGET",
        downloadingRatesInKilobytes: [1, 2, 3],
        downloadingTitle: "Some.Release",
        downloadingTitlePercentFinished: 42,
        downloadingTitleRemainingTimeFormatted: "1m",
        elementsInQueue: 3,
        lastDownloadRate: 9,
        lastUpdateForNow: false,
        remainingTimeFormatted: "2m",
        state: "DOWNLOADING",
        url: "http://localhost:6789",
        ...overrides,
    };
}

function fakeLiveTransport(options: {fail?: boolean} = {}) {
    const close = vi.fn();
    let deliver: ((next: DownloaderStatus) => void) | undefined;
    const subscribeDownloaderStatus = vi.fn(
        async (onStatus: (next: DownloaderStatus) => void) => {
            if (options.fail === true) {
                throw new Error("Live progress connection failed");
            }
            deliver = onStatus;
            return {close};
        },
    );
    return {
        close,
        deliver: (next: DownloaderStatus) =>
            act(() => {
                deliver?.(next);
            }),
        liveTransport: {
            subscribeDownloaderStatus,
        } satisfies DownloaderStatusLiveTransport,
        subscribeDownloaderStatus,
    };
}

function renderFooter(
    fake: ReturnType<typeof fakeLiveTransport>,
    safeConfig: Record<string, unknown> | null = enabledConfig,
) {
    return render(footer(fake, safeConfig));
}

function footer(
    fake: ReturnType<typeof fakeLiveTransport>,
    safeConfig: Record<string, unknown> | null,
) {
    return (
        <ThemeProvider theme={createHydraTheme("grey", false)}>
            <SafeConfigContext.Provider value={safeConfig}>
                <DownloaderStatusFooter
                    bootstrap={bootstrap}
                    liveTransport={fake.liveTransport}
                    onHeightChange={vi.fn()}
                />
            </SafeConfigContext.Provider>
        </ThemeProvider>
    );
}

/**
 * FM-163 deferred the graph into its own module behind `React.lazy`, so the
 * first read in this file resolves that module before asserting; React caches
 * the resolved component on the shared `lazy` object, so every later read is
 * already satisfied when `findBy*` first looks. The assertion itself is
 * unchanged: the exact rolling window the component holds.
 */
async function rateWindow(): Promise<string> {
    const chart = await screen.findByTestId("spark-line");
    return chart.getAttribute("data-rates") ?? "";
}

function setHidden(hidden: boolean) {
    Object.defineProperty(document, "hidden", {
        configurable: true,
        value: hidden,
    });
    act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
    });
}

afterEach(() => {
    cleanup();
    setHidden(false);
    vi.useRealTimers();
});

beforeEach(() => {
    Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
    });
});

describe("DownloaderStatusFooter", () => {
    it("should not subscribe at all while the footer is not configured to show", () => {
        const fake = fakeLiveTransport();
        renderFooter(fake, {
            downloading: {
                downloaders: [{enabled: true}],
                showDownloaderStatus: false,
            },
        });

        expect(fake.subscribeDownloaderStatus).not.toHaveBeenCalled();
        expect(
            screen.queryByTestId("downloader-status-footer"),
        ).not.toBeInTheDocument();
    });

    it("should not subscribe with the setting on but no downloader enabled", () => {
        const fake = fakeLiveTransport();
        renderFooter(fake, {
            downloading: {
                downloaders: [{enabled: false}],
                showDownloaderStatus: true,
            },
        });

        expect(fake.subscribeDownloaderStatus).not.toHaveBeenCalled();
    });

    it("should render the downloading state, queue, title, and logo link", async () => {
        const fake = fakeLiveTransport();
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );
        fake.deliver(status());

        expect(
            screen.getByTestId("downloader-status-footer"),
        ).toBeInTheDocument();
        expect(screen.getByTestId("downloader-status-state")).toHaveAttribute(
            "aria-label",
            "Downloading",
        );
        expect(screen.getByTestId("downloader-status-queue")).toHaveTextContent(
            "3 in queue",
        );
        expect(screen.getByText(/1\.2 MB\/s • 2m •/)).toBeInTheDocument();
        expect(
            screen.getByText(/Some\.Release \(42% • 1m\)/),
        ).toBeInTheDocument();
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "http://localhost:6789");
        expect(link).toHaveAttribute("target", "_blank");
        expect(screen.getByRole("img", {name: "NZBGet"})).toBeInTheDocument();
    });

    it("should hide the rate, the queue, and the graph while the downloader is offline", async () => {
        const fake = fakeLiveTransport();
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );
        fake.deliver(status({state: "OFFLINE"}));

        expect(screen.getByTestId("downloader-status-state")).toHaveAttribute(
            "aria-label",
            "Offline",
        );
        expect(
            screen.queryByTestId("downloader-status-queue"),
        ).not.toBeInTheDocument();
        // Both the graph and the box holding it are gone. The box is eager,
        // so its absence is what makes this assertion non-vacuous now that the
        // graph itself only appears once its module has loaded.
        expect(
            screen.queryByTestId("downloader-status-rates"),
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId("spark-line")).not.toBeInTheDocument();
        expect(screen.queryByText(/1\.2 MB\/s/)).not.toBeInTheDocument();
    });

    it("should show the queue but no rate while paused", async () => {
        const fake = fakeLiveTransport();
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );
        fake.deliver(status({state: "PAUSED"}));

        expect(screen.getByTestId("downloader-status-state")).toHaveAttribute(
            "aria-label",
            "Paused",
        );
        expect(screen.getByTestId("downloader-status-queue")).toBeVisible();
        expect(screen.queryByText(/1\.2 MB\/s/)).not.toBeInTheDocument();
    });

    it("should ignore a message without a downloader type", async () => {
        const fake = fakeLiveTransport();
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );
        fake.deliver(status({downloaderType: null}));

        expect(
            screen.queryByTestId("downloader-status-footer"),
        ).not.toBeInTheDocument();
    });

    it("should seed the rolling window from the message's own rate history", async () => {
        const fake = fakeLiveTransport();
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );

        fake.deliver(status({downloadingRatesInKilobytes: [1, 2, 3]}));
        expect(await rateWindow()).toBe("1,2,3");

        // Still filling: the window follows the message's own history.
        fake.deliver(status({downloadingRatesInKilobytes: [1, 2, 3, 4]}));
        expect(await rateWindow()).toBe("1,2,3,4");
    });

    it("should self-advance once per second and stop when the window is uniform", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        const fake = fakeLiveTransport();
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );
        fake.deliver(
            status({
                downloadingRatesInKilobytes: [1, 2, 3],
                lastDownloadRate: 9,
                lastUpdateForNow: true,
            }),
        );
        expect(await rateWindow()).toBe("1,2,3");

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        expect(await rateWindow()).toBe("2,3,9");
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2_000);
        });
        expect(await rateWindow()).toBe("9,9,9");

        // First stop condition: the window says nothing but the last known
        // rate, so no further tick may change it.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000);
        });
        expect(await rateWindow()).toBe("9,9,9");
        expect(vi.getTimerCount()).toBe(0);
    });

    it("should stop self-advancing as soon as fresh data arrives", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        const fake = fakeLiveTransport();
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );
        fake.deliver(
            status({
                downloadingRatesInKilobytes: [1, 2, 3],
                lastDownloadRate: 9,
                lastUpdateForNow: true,
            }),
        );
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        expect(await rateWindow()).toBe("2,3,9");

        // Second stop condition: a status that is no longer the last update
        // for now cancels the interval.
        fake.deliver(
            status({
                downloadingRatesInKilobytes: [2, 3, 9, 4],
                lastUpdateForNow: false,
            }),
        );
        expect(vi.getTimerCount()).toBe(0);
        expect(await rateWindow()).toBe("2,3,9,4");

        await act(async () => {
            await vi.advanceTimersByTimeAsync(5_000);
        });
        expect(await rateWindow()).toBe("2,3,9,4");
    });

    it("should buffer rates while the tab is hidden and apply them on becoming visible", async () => {
        const fake = fakeLiveTransport();
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );
        fake.deliver(status({downloadingRatesInKilobytes: [1, 2, 3]}));
        expect(await rateWindow()).toBe("1,2,3");

        setHidden(true);
        fake.deliver(status({elementsInQueue: 99, lastDownloadRate: 7}));
        fake.deliver(status({elementsInQueue: 99, lastDownloadRate: 8}));
        // A hidden tab neither repaints nor grows the window.
        expect(await rateWindow()).toBe("1,2,3");
        expect(screen.getByTestId("downloader-status-queue")).toHaveTextContent(
            "3 in queue",
        );

        setHidden(false);
        expect(await rateWindow()).toBe("1,2,3,7,8");
        expect(screen.getByTestId("downloader-status-queue")).toHaveTextContent(
            "99 in queue",
        );
    });

    it("should close the subscription on unmount", async () => {
        const fake = fakeLiveTransport();
        const view = renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );

        view.unmount();
        await vi.waitFor(() => expect(fake.close).toHaveBeenCalledOnce());
    });

    it("should close the subscription and hide when the saved configuration turns the footer off", async () => {
        const fake = fakeLiveTransport();
        const view = renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );
        fake.deliver(status());
        expect(
            screen.getByTestId("downloader-status-footer"),
        ).toBeInTheDocument();

        // ADR-0017: the safe config is reactive, so saving it here is the
        // whole reload legacy needed.
        view.rerender(
            footer(fake, {
                downloading: {
                    downloaders: [{enabled: true}],
                    showDownloaderStatus: false,
                },
            }),
        );

        await vi.waitFor(() => expect(fake.close).toHaveBeenCalledOnce());
        expect(
            screen.queryByTestId("downloader-status-footer"),
        ).not.toBeInTheDocument();
    });

    it("should degrade silently when the connection never comes up", async () => {
        const fake = fakeLiveTransport({fail: true});
        renderFooter(fake);
        await vi.waitFor(() =>
            expect(fake.subscribeDownloaderStatus).toHaveBeenCalled(),
        );

        expect(
            screen.queryByTestId("downloader-status-footer"),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
