import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {ThemeProvider} from "@mui/material/styles";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {DEFAULT_QUERY_STALE_TIME_MS} from "../../../App";
import {createHydraTheme} from "../../../app/theme";
import type {StatsQuery, StatsParseResult} from "../../../api/stats/mainStats";
import {ApiTransport} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {toDateInputValue} from "./dateRange";
import {StatsDashboardPage} from "./StatsDashboardPage";

const {getStatsMock} = vi.hoisted(() => ({getStatsMock: vi.fn()}));

vi.mock("../../../api/stats/mainStats", async () => {
    const actual = await vi.importActual<
        typeof import("../../../api/stats/mainStats")
    >("../../../api/stats/mainStats");
    return {...actual, getStats: getStatsMock};
});

function bootstrap(overrides: Partial<BootstrapData> = {}): BootstrapData {
    return {
        baseUrl: "/hydra/",
        username: "stats",
        authType: null,
        showLogout: true,
        maySeeSearch: true,
        adminRestricted: true,
        statsRestricted: true,
        maySeeStats: true,
        searchRestricted: true,
        maySeeDetailsDl: false,
        maySeeAdmin: false,
        authConfigured: true,
        showIndexerSelection: false,
        safeConfig: {logging: {historyUserInfoType: "BOTH"}},
        serverTimeZone: "UTC",
        ...overrides,
    };
}

function renderPage(
    overrides: Partial<BootstrapData> = {},
    // A client carried over from an earlier render stands for the application
    // cache surviving a tab switch; by default each test starts empty.
    existingClient?: QueryClient,
) {
    const transport = new ApiTransport("/hydra/", vi.fn());
    // FM-121: the dashboard holds its reading in react-query, so it needs a
    // client. It is configured with the application's own default `staleTime`
    // rather than react-query's, so what the re-entry test below measures is
    // the real default and not a number invented here.
    const queryClient =
        existingClient ??
        new QueryClient({
            defaultOptions: {
                queries: {staleTime: DEFAULT_QUERY_STALE_TIME_MS},
            },
        });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={createHydraTheme()}>
                <StatsDashboardPage
                    bootstrap={bootstrap(overrides)}
                    transport={transport}
                />
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return {queryClient};
}

function resultOf(result: StatsParseResult["result"]): StatsParseResult {
    return {result, malformedFamilies: []};
}

/** A promise plus externally callable resolve/reject, for tests that need to
 * control exactly when an in-flight `getStats` call settles relative to a
 * later, overlapping call. */
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}

// See the identical note in `SearchResults.test.tsx`'s
// `stubWorkingLocalStorage`: this jsdom environment has no `window.localStorage`
// at all, so the dashboard's persistence layer needs a real, working `Storage`
// installed for the duration of each test.
function stubWorkingLocalStorage(): void {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) =>
            store.has(key) ? (store.get(key) as string) : null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    } satisfies Storage);
}

beforeEach(() => {
    stubWorkingLocalStorage();
    getStatsMock.mockReset();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("StatsDashboardPage", () => {
    it("loads with every family selected on the default 30-day window", async () => {
        getStatsMock.mockResolvedValue(
            resultOf({
                searchesPerDayOfWeek: [{day: "Mon", count: 4}],
                downloadsPerDayOfWeek: [{day: "Mon", count: 2}],
            }),
        );
        renderPage();
        await screen.findByTestId("stats-dashboard");
        expect(getStatsMock).toHaveBeenCalledTimes(1);
        const query = getStatsMock.mock.calls[0][1] as StatsQuery;
        expect(query.includeDisabled).toBe(false);
        expect(Object.values(query.families).every(Boolean)).toBe(true);
        expect(
            screen.getByTestId("stats-tile-total-searches"),
        ).toHaveTextContent("4");
    });

    it("re-enabling one family requests only that family and merges without discarding prior families", async () => {
        getStatsMock.mockResolvedValueOnce(
            resultOf({
                avgResponseTimes: [{indexer: "Alpha", avgResponseTime: 100}],
                indexerDownloadShares: [
                    {indexerName: "Alpha", total: 5, share: 100},
                ],
            }),
        );
        renderPage();
        await screen.findByTestId("stats-chart-response-times");

        fireEvent.click(screen.getByTestId("stats-family-menu-button"));
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Avg. response times"}),
        );
        // Deselecting clears that family's own display without a request.
        expect(getStatsMock).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(
                screen.queryByTestId("stats-chart-response-times"),
            ).not.toBeInTheDocument(),
        );
        expect(
            screen.getByTestId("stats-chart-indexer-download-shares"),
        ).toBeInTheDocument();

        getStatsMock.mockResolvedValueOnce(
            resultOf({
                avgResponseTimes: [{indexer: "Alpha", avgResponseTime: 150}],
            }),
        );
        fireEvent.click(screen.getByTestId("stats-family-menu-button"));
        fireEvent.click(screen.getByTestId("stats-family-avgResponseTimes"));

        await waitFor(() => expect(getStatsMock).toHaveBeenCalledTimes(2));
        const secondQuery = getStatsMock.mock.calls[1][1] as StatsQuery;
        expect(secondQuery.families.avgResponseTimes).toBe(true);
        expect(
            Object.entries(secondQuery.families).filter(
                ([key]) => key !== "avgResponseTimes",
            ),
        ).toSatisfy((entries: [string, boolean][]) =>
            entries.every(([, value]) => value === false),
        );
        await screen.findByTestId("stats-chart-response-times");
        // Prior family survives the single-family refresh.
        expect(
            screen.getByTestId("stats-chart-indexer-download-shares"),
        ).toBeInTheDocument();
    });

    it("keeps previously loaded families when a refresh fails, and offers retry", async () => {
        getStatsMock.mockResolvedValueOnce(
            resultOf({
                avgResponseTimes: [{indexer: "Alpha", avgResponseTime: 100}],
            }),
        );
        renderPage();
        await screen.findByTestId("stats-chart-response-times");

        getStatsMock.mockRejectedValueOnce(new Error("network down"));
        fireEvent.click(screen.getByTestId("stats-refresh-button"));

        await screen.findByText(
            "The last refresh failed; showing previously loaded statistics.",
        );
        expect(
            screen.getByTestId("stats-chart-response-times"),
        ).toBeInTheDocument();

        getStatsMock.mockResolvedValueOnce(
            resultOf({
                avgResponseTimes: [{indexer: "Alpha", avgResponseTime: 100}],
            }),
        );
        fireEvent.click(within(screen.getByRole("alert")).getByText("Retry"));
        await waitFor(() =>
            expect(
                screen.queryByText(
                    "The last refresh failed; showing previously loaded statistics.",
                ),
            ).not.toBeInTheDocument(),
        );
    });

    it("applies a date preset immediately and re-requests", async () => {
        getStatsMock.mockResolvedValue(resultOf({}));
        renderPage();
        await screen.findByTestId("stats-dashboard");
        expect(getStatsMock).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTestId("stats-date-preset-last7"));
        await waitFor(() => expect(getStatsMock).toHaveBeenCalledTimes(2));
        const query = getStatsMock.mock.calls[1][1] as StatsQuery;
        const days =
            (query.before.getTime() - query.after.getTime()) /
            (24 * 60 * 60 * 1000);
        expect(Math.round(days)).toBe(8);
    });

    // FM-121 fix: the query key is day-granular (`statsQueryKey`), but a
    // preset's range used to carry the mount's time-of-day (`new Date() - N
    // days`) while a Custom range is always midnight to midnight
    // (`dateRange.ts`'s `parseDateInput`). Entering Custom right after a
    // preset prefills from that preset's own days -- the default state a
    // user lands on -- so a preset and that freshly entered Custom range
    // hashed to the identical key while actually asking for different
    // instants: the preset's cached reading would silently stand in for the
    // wider midnight-to-midnight window Custom claims, under-reporting
    // whatever happened in the truncated hours. Fixed by truncating every
    // preset-derived range to day boundaries before it becomes `range`
    // state, so the key and the actual request always describe the same
    // window.
    it("serves a preset's own request for exactly the midnight-to-midnight window its day-granular key implies", async () => {
        vi.setSystemTime(new Date("2024-06-15T15:30:00"));
        getStatsMock.mockResolvedValue(resultOf({}));
        renderPage();
        await screen.findByTestId("stats-dashboard");
        expect(getStatsMock).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTestId("stats-date-preset-last7"));
        await waitFor(() => expect(getStatsMock).toHaveBeenCalledTimes(2));
        const presetQuery = getStatsMock.mock.calls[1][1] as StatsQuery;

        // Entering Custom right after a preset prefills from that preset's
        // own days -- confirming this is the exact default-state scenario
        // the finding describes, not a contrived one.
        fireEvent.click(screen.getByTestId("stats-date-preset-custom"));
        const afterInput = within(
            screen.getByTestId("stats-custom-after"),
        ).getByLabelText("After") as HTMLInputElement;
        expect(afterInput.value).toBe(toDateInputValue(presetQuery.after));

        // Switching to Custom on those prefilled days must not refetch (the
        // day-granular key did not change) -- so what is on screen right
        // now is the preset's own reading, unchanged.
        expect(getStatsMock).toHaveBeenCalledTimes(2);

        // For that reuse to be correct rather than a silent under-report,
        // the preset's own request must already have asked for the full
        // day -- midnight to midnight -- matching exactly what Custom's
        // `parseDateInput` would send for the same two days, not a slice
        // starting or ending partway through a day as a raw
        // `new Date() +/- N days` does.
        expect(presetQuery.after.getTime()).toBe(
            new Date(
                `${toDateInputValue(presetQuery.after)}T00:00:00`,
            ).getTime(),
        );
        expect(presetQuery.before.getTime()).toBe(
            new Date(
                `${toDateInputValue(presetQuery.before)}T00:00:00`,
            ).getTime(),
        );
    });

    it("flags an incomplete custom range inline and never sends it", async () => {
        getStatsMock.mockResolvedValue(resultOf({}));
        renderPage();
        await screen.findByTestId("stats-dashboard");
        expect(getStatsMock).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTestId("stats-date-preset-custom"));
        const after = screen.getByTestId("stats-custom-after");
        const afterInput = within(after).getByLabelText("After");
        fireEvent.change(afterInput, {target: {value: "2099-01-01"}});

        expect(
            await screen.findByText(
                "The After date must be earlier than the Before date.",
            ),
        ).toBeInTheDocument();
        // Still just the one initial request -- the invalid range was never sent.
        expect(getStatsMock).toHaveBeenCalledTimes(1);
    });

    it("ignores a stale request's late completion once a newer request has superseded it", async () => {
        getStatsMock.mockResolvedValueOnce(
            resultOf({
                avgResponseTimes: [{indexer: "Initial", avgResponseTime: 1}],
            }),
        );
        renderPage();
        await screen.findByTestId("stats-chart-response-times");

        const stale = deferred<StatsParseResult>();
        getStatsMock.mockReturnValueOnce(stale.promise);
        fireEvent.click(screen.getByTestId("stats-refresh-button"));
        await waitFor(() => expect(getStatsMock).toHaveBeenCalledTimes(2));

        const newer = deferred<StatsParseResult>();
        getStatsMock.mockReturnValueOnce(newer.promise);
        fireEvent.click(screen.getByTestId("stats-refresh-button"));
        await waitFor(() => expect(getStatsMock).toHaveBeenCalledTimes(3));

        // The newer request resolves first...
        newer.resolve(
            resultOf({
                avgResponseTimes: [{indexer: "Newer", avgResponseTime: 42}],
            }),
        );
        await waitFor(() =>
            expect(
                within(screen.getByTestId("stats-indexers-table")).getByText(
                    "Newer",
                ),
            ).toBeInTheDocument(),
        );

        // ...then the stale request completes after -- its data must not
        // overwrite what the newer request already set.
        stale.resolve(
            resultOf({
                avgResponseTimes: [{indexer: "Stale", avgResponseTime: 999}],
            }),
        );
        // A real timer-flushed `act` (not just microtask ticks) is required
        // here: this is what actually exercises the `requestIdRef` staleness
        // guard's effect on the committed render, rather than merely letting
        // the stale promise's `.then` callback run unobserved.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
        });

        expect(
            within(screen.getByTestId("stats-indexers-table")).getByText(
                "Newer",
            ),
        ).toBeInTheDocument();
        expect(screen.queryByText("Stale")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("swallows a superseded request's abort rejection without surfacing an error banner", async () => {
        getStatsMock.mockResolvedValueOnce(
            resultOf({
                avgResponseTimes: [{indexer: "Initial", avgResponseTime: 1}],
            }),
        );
        renderPage();
        await screen.findByTestId("stats-chart-response-times");

        const stale = deferred<StatsParseResult>();
        getStatsMock.mockReturnValueOnce(stale.promise);
        fireEvent.click(screen.getByTestId("stats-refresh-button"));
        await waitFor(() => expect(getStatsMock).toHaveBeenCalledTimes(2));

        getStatsMock.mockResolvedValueOnce(
            resultOf({
                avgResponseTimes: [{indexer: "Newer", avgResponseTime: 42}],
            }),
        );
        fireEvent.click(screen.getByTestId("stats-refresh-button"));
        await waitFor(() => expect(getStatsMock).toHaveBeenCalledTimes(3));
        await waitFor(() =>
            expect(
                within(screen.getByTestId("stats-indexers-table")).getByText(
                    "Newer",
                ),
            ).toBeInTheDocument(),
        );

        // Simulate what a real AbortController-driven fetch does once its
        // signal is aborted: the superseded request's promise rejects with
        // an AbortError after being superseded.
        stale.reject(new DOMException("aborted", "AbortError"));
        // See the identical note in the previous test: a real timer-flushed
        // `act` is what actually exercises the staleness guard's effect on
        // the committed render for a rejection, not just a resolution.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
        });

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(
            within(screen.getByTestId("stats-indexers-table")).getByText(
                "Newer",
            ),
        ).toBeInTheDocument();
    });

    it("shows an empty-data state when every selected family has no entries for the range", async () => {
        // A real backend response always carries `after`/`before`, so `stats`
        // never has zero keys even when every selected family came back with
        // no entries -- this reproduces that shape directly.
        getStatsMock.mockResolvedValue(
            resultOf({
                after: new Date("2024-01-01T00:00:00Z"),
                before: new Date("2024-01-02T00:00:00Z"),
            }),
        );
        renderPage();
        await screen.findByTestId("stats-dashboard");

        expect(
            await screen.findByText(
                "No statistics are available for the selected range.",
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByTestId("stats-tile-total-searches"),
        ).not.toBeInTheDocument();
    });

    // FM-121: the reading now lives in the application's query cache, which
    // outlives this component, so re-entering `/stats/stats` within the
    // default `staleTime` must show the held statistics rather than the
    // full-page "Calculating stats…" every visit used to start with.
    it("re-renders a re-entered dashboard from the cache with no refetch", async () => {
        getStatsMock.mockResolvedValue(
            resultOf({
                avgResponseTimes: [{indexer: "Alpha", avgResponseTime: 100}],
            }),
        );
        const {queryClient} = renderPage();
        await screen.findByTestId("stats-chart-response-times");
        expect(getStatsMock).toHaveBeenCalledTimes(1);

        // The tab switch away and back: this component unmounts, the cache
        // does not.
        cleanup();
        renderPage({}, queryClient);

        expect(screen.queryByText("Calculating stats\u2026")).toBeNull();
        expect(
            screen.getByTestId("stats-chart-response-times"),
        ).toBeInTheDocument();
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
        });
        expect(getStatsMock).toHaveBeenCalledTimes(1);
    });

    it("hides user/host share cards the bootstrap config says cannot exist", async () => {
        getStatsMock.mockResolvedValue(
            resultOf({
                searchSharesPerUser: [{key: "bob", count: 1, percentage: 100}],
                searchSharesPerIp: [
                    {key: "1.2.3.4", count: 1, percentage: 100},
                ],
            }),
        );
        renderPage({safeConfig: {logging: {historyUserInfoType: "NONE"}}});
        await screen.findByTestId("stats-dashboard");
        expect(
            screen.queryByTestId("stats-section-sources"),
        ).not.toBeInTheDocument();
    });
});
