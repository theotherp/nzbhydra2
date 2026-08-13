import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const router = vi.hoisted(() => ({
    navigate: vi.fn(),
    search: {} as Record<string, unknown>,
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => router.navigate,
    useSearch: () => router.search,
}));

import {ApiTransport} from "../../api/transport";
import type {
    SearchLiveTransport,
    SearchProgress,
} from "../../api/live/searchState";
import type {LiveSubscription} from "../../api/live/transport";
import {SearchPage} from "./SearchPage";

const responseEnvelope = {
    searchResults: [],
    indexerSearchMetaDatas: [],
    indexerLimitWarnings: [],
    rejectedReasonsMap: {},
    notPickedIndexersWithReason: {},
    numberOfAvailableResults: 0,
    numberOfRejectedResults: 0,
};

const bootstrap = {
    username: null,
    authType: null,
    showLogout: false,
    maySeeSearch: true,
    adminRestricted: false,
    statsRestricted: false,
    maySeeStats: false,
    searchRestricted: false,
    maySeeDetailsDl: false,
    maySeeAdmin: false,
    authConfigured: false,
    showIndexerSelection: false,
    serverTimeZone: null,
    baseUrl: "/hydra/",
    safeConfig: {
        categoriesConfig: {
            categories: [{name: "All"}],
            defaultCategory: "All",
            enableCategorySizes: false,
        },
        indexers: [
            {name: "Configured", preselect: true},
            {name: "Not selected", preselect: false},
        ],
    },
};

const immediatelyUnavailableLiveTransport: SearchLiveTransport = {
    subscribeSearchState: vi
        .fn()
        .mockRejectedValue(new Error("Live progress is unavailable")),
};

const embyBootstrap = {
    ...bootstrap,
    safeConfig: {
        ...bootstrap.safeConfig,
        categoriesConfig: {
            ...bootstrap.safeConfig.categoriesConfig,
            categories: [{name: "Movies", searchType: "MOVIE"}],
            defaultCategory: "Movies",
        },
        emby: {embyBaseUrl: "http://emby", embyApiKey: "key"},
    },
};

function embySearch(): void {
    router.search = {category: "Movies", title: "Movie", tmdbId: "42"};
}

function searchResponse(): Response {
    return new Response(JSON.stringify(responseEnvelope), {
        headers: {"Content-Type": "application/json"},
    });
}

describe("SearchPage", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        router.navigate.mockReset();
        router.search = {};
    });

    it("should update the URL and construct a numeric configured-indexer request", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(responseEnvelope), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "query"},
        });
        fireEvent.change(screen.getByLabelText("Minimum age (days)"), {
            target: {value: "2"},
        });
        fireEvent.change(screen.getByLabelText("Maximum size (MB)"), {
            target: {value: "50"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));

        await waitFor(() => expect(router.navigate).toHaveBeenCalledOnce());
        expect(router.navigate).toHaveBeenCalledWith({
            to: "/",
            search: {
                query: "query",
                category: "All",
                minage: "2",
                maxsize: "50",
                indexers: "Configured",
            },
        });
        const request = JSON.parse(fetchImplementation.mock.calls[0][1].body);
        expect(request).toEqual({
            query: "query",
            category: "All",
            minage: 2,
            maxsize: 50,
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
        });
    });

    it("should submit typed TV season and episode criteria without an identifier", async () => {
        router.search = {category: "Series"};
        const fetchImplementation = vi.fn().mockResolvedValue(searchResponse());
        render(
            <SearchPage
                bootstrap={{
                    ...bootstrap,
                    safeConfig: {
                        ...bootstrap.safeConfig,
                        categoriesConfig: {
                            ...bootstrap.safeConfig.categoriesConfig,
                            categories: [
                                {name: "Series", searchType: "TVSEARCH"},
                            ],
                            defaultCategory: "Series",
                        },
                    },
                }}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "Example Show"},
        });
        fireEvent.change(screen.getByLabelText("Season"), {
            target: {value: "2"},
        });
        fireEvent.change(screen.getByLabelText("Episode"), {
            target: {value: "5"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));

        await waitFor(() => expect(fetchImplementation).toHaveBeenCalledOnce());
        expect(JSON.parse(fetchImplementation.mock.calls[0][1].body)).toEqual({
            query: "Example Show",
            category: "Series",
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
            season: 2,
            episode: "5",
        });
    });

    it("should not request and should announce feedback when no indexers are selected", () => {
        const fetchImplementation = vi.fn();
        render(
            <SearchPage
                bootstrap={{
                    ...bootstrap,
                    safeConfig: {...bootstrap.safeConfig, indexers: []},
                }}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        expect(screen.getByRole("alert")).toHaveTextContent(
            "No indexers are configured or enabled.",
        );
        fireEvent.click(screen.getByTestId("search-submit"));
        expect(fetchImplementation).not.toHaveBeenCalled();
    });

    it("should show indexer controls only when the bootstrap permission permits them", () => {
        const {rerender} = render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", vi.fn())}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        expect(
            screen.queryByLabelText("Indexer selection"),
        ).not.toBeInTheDocument();
        rerender(
            <SearchPage
                bootstrap={{...bootstrap, showIndexerSelection: true}}
                transport={new ApiTransport("/hydra/", vi.fn())}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        expect(screen.getByLabelText("Indexer selection")).toBeVisible();
    });

    it("should preserve a requested episode in canonical navigation and disable episode grouping", async () => {
        router.search = {episode: "3"};
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    ...responseEnvelope,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Example Show S01E03 WEB",
                            indexer: "One",
                            category: "TV",
                            showtitle: "Example Show",
                            season: "1",
                            episode: "3",
                        },
                        {
                            searchResultId: "two",
                            title: "Example Show S01E03 BluRay",
                            indexer: "Two",
                            category: "TV",
                            showtitle: "Example Show",
                            season: "1",
                            episode: "3",
                        },
                    ],
                }),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));

        await waitFor(() => expect(fetchImplementation).toHaveBeenCalledOnce());
        expect(router.navigate).toHaveBeenCalledWith({
            to: "/",
            search: {category: "All", episode: "3", indexers: "Configured"},
        });
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
    });

    it("should render request failures", async () => {
        const fetchImplementation = vi
            .fn()
            .mockRejectedValue(new Error("failed"));
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        expect(
            await screen.findByText("Unable to execute search."),
        ).toBeVisible();
    });

    it("should render malformed response envelopes as request failures", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        expect(
            await screen.findByText("Unable to execute search."),
        ).toBeVisible();
    });

    it.each([
        [true, "Available in Emby."],
        [false, "Not available in Emby."],
    ])("should show Emby availability %s", async (available, message) => {
        embySearch();
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    String(url).includes("isMovieAvailable")
                        ? JSON.stringify(available)
                        : JSON.stringify(responseEnvelope),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        render(
            <SearchPage
                bootstrap={embyBootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        fireEvent.click(screen.getByTestId("search-submit"));
        expect(await screen.findByText(message)).toBeVisible();
    });

    it("should show an Emby availability error", async () => {
        embySearch();
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            String(url).includes("isMovieAvailable")
                ? Promise.reject(new Error("Embry unavailable"))
                : Promise.resolve(searchResponse()),
        );
        render(
            <SearchPage
                bootstrap={embyBootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        fireEvent.click(screen.getByTestId("search-submit"));
        expect(
            await screen.findByText("Unable to check Emby availability."),
        ).toBeVisible();
    });

    it("should use the TV Emby endpoint and TVDB ID for a dual-ID TV selection", async () => {
        router.search = {
            category: "Series",
            title: "Example Series",
            tmdbId: "42",
            tvdbId: "7",
        };
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    String(url).includes("isSeriesAvailable")
                        ? "false"
                        : JSON.stringify(responseEnvelope),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        render(
            <SearchPage
                bootstrap={{
                    ...embyBootstrap,
                    safeConfig: {
                        ...embyBootstrap.safeConfig,
                        categoriesConfig: {
                            ...embyBootstrap.safeConfig.categoriesConfig,
                            categories: [
                                {name: "Series", searchType: "TVSEARCH"},
                            ],
                            defaultCategory: "Series",
                        },
                    },
                }}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));

        expect(await screen.findByText("Not available in Emby.")).toBeVisible();
        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/emby/isSeriesAvailable?tvdbId=7",
            expect.anything(),
        );
    });

    it("should ignore stale Emby availability from an earlier submission", async () => {
        embySearch();
        let resolveFirstAvailability: (response: Response) => void = () =>
            undefined;
        let availabilityCalls = 0;
        const fetchImplementation = vi.fn((url: RequestInfo | URL) => {
            if (!String(url).includes("isMovieAvailable")) {
                return Promise.resolve(searchResponse());
            }
            availabilityCalls++;
            return availabilityCalls === 1
                ? new Promise<Response>(
                      (resolve) => (resolveFirstAvailability = resolve),
                  )
                : Promise.resolve(
                      new Response("false", {
                          headers: {"Content-Type": "application/json"},
                      }),
                  );
        });
        render(
            <SearchPage
                bootstrap={embyBootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() => expect(availabilityCalls).toBe(1));
        fireEvent.click(screen.getByTestId("search-submit"));
        expect(await screen.findByText("Not available in Emby.")).toBeVisible();
        resolveFirstAvailability(
            new Response("true", {
                headers: {"Content-Type": "application/json"},
            }),
        );
        await waitFor(() =>
            expect(
                screen.queryByText("Available in Emby."),
            ).not.toBeInTheDocument(),
        );
    });

    it("should show scoped progress, offer early results, and release the subscription", async () => {
        let progress: (value: SearchProgress) => void = () => undefined;
        const close = vi.fn();
        const liveTransport: SearchLiveTransport = {
            subscribeSearchState: vi.fn(async (_id, onProgress) => {
                progress = onProgress;
                return {close};
            }),
        };
        let resolveSearch: (value: Response) => void = () => undefined;
        const fetchImplementation = vi
            .fn()
            .mockImplementation((url: string) =>
                url.includes("shortcutSearch")
                    ? Promise.resolve(new Response(null, {status: 200}))
                    : new Promise<Response>(
                          (resolve) => (resolveSearch = resolve),
                      ),
            );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={liveTransport}
            />,
        );
        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByTestId("search-status-modal");
        progress({
            searchRequestId: 1,
            searchFinished: false,
            indexerSelectionFinished: true,
            indexersSelected: 2,
            indexersFinished: 1,
            messages: ["Mock returned results"],
            hasResults: true,
        });
        expect(await screen.findByText("Mock returned results")).toBeVisible();
        const earlyResults = screen.getByRole("button", {
            name: "Show early results",
        });
        expect(earlyResults).toBeEnabled();
        fireEvent.click(earlyResults);
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(2),
        );
        resolveSearch(
            new Response(JSON.stringify(responseEnvelope), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        await waitFor(() => expect(close).toHaveBeenCalledOnce());
    });

    it("should continue when live progress is unavailable", async () => {
        const liveTransport: SearchLiveTransport = {
            subscribeSearchState: vi
                .fn()
                .mockRejectedValue(
                    new Error("Live progress connection timed out"),
                ),
        };
        const fetchImplementation = vi
            .fn()
            .mockImplementation(() => new Promise<Response>(() => undefined));
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={liveTransport}
            />,
        );
        fireEvent.click(screen.getByTestId("search-submit"));
        expect(
            await screen.findByText("Live progress connection timed out"),
        ).toBeVisible();
        await waitFor(() => expect(fetchImplementation).toHaveBeenCalledOnce());
    });

    it("should report parser failures without preventing the search", async () => {
        let unavailable: (error: Error) => void = () => undefined;
        const liveTransport: SearchLiveTransport = {
            subscribeSearchState: vi.fn(
                async (_id, _onProgress, onUnavailable) => {
                    unavailable = onUnavailable;
                    return {close: vi.fn()};
                },
            ),
        };
        const fetchImplementation = vi
            .fn()
            .mockImplementation(() => new Promise<Response>(() => undefined));
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={liveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() =>
            expect(liveTransport.subscribeSearchState).toHaveBeenCalledOnce(),
        );
        unavailable(new Error("Live progress message was invalid"));
        expect(await screen.findByRole("alert")).toBeVisible();
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Live progress message was invalid",
        );
        await waitFor(() => expect(fetchImplementation).toHaveBeenCalledOnce());
    });

    it("should report early-results shortcut failures", async () => {
        let progress: (value: SearchProgress) => void = () => undefined;
        const liveTransport: SearchLiveTransport = {
            subscribeSearchState: vi.fn(async (_id, onProgress) => {
                progress = onProgress;
                return {close: vi.fn()};
            }),
        };
        const fetchImplementation = vi
            .fn()
            .mockImplementation((url: string) =>
                url.includes("shortcutSearch")
                    ? Promise.reject(new Error("shortcut failed"))
                    : new Promise<Response>(() => undefined),
            );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={liveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByTestId("search-status-modal");
        progress({
            searchRequestId: 1,
            searchFinished: false,
            indexerSelectionFinished: true,
            indexersSelected: 1,
            indexersFinished: 1,
            messages: ["3 results via search from ResultIndexer"],
            hasResults: true,
        });
        await waitFor(() =>
            expect(
                screen.getByRole("button", {name: "Show early results"}),
            ).toBeEnabled(),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Show early results"}),
        );
        await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Unable to show early results.",
        );
    });

    it("should only enable early results for result-bearing progress", async () => {
        let progress: (value: SearchProgress) => void = () => undefined;
        const liveTransport: SearchLiveTransport = {
            subscribeSearchState: vi.fn(async (_id, onProgress) => {
                progress = onProgress;
                return {close: vi.fn()};
            }),
        };
        const fetchImplementation = vi
            .fn()
            .mockImplementation(() => new Promise<Response>(() => undefined));
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={liveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByTestId("search-status-modal");
        const earlyResults = screen.getByRole("button", {
            name: "Show early results",
        });
        progress({
            searchRequestId: 1,
            searchFinished: false,
            indexerSelectionFinished: true,
            indexersSelected: 2,
            indexersFinished: 1,
            messages: ["0 results via search from EmptyIndexer"],
            hasResults: false,
        });
        expect(earlyResults).toBeDisabled();
        progress({
            searchRequestId: 1,
            searchFinished: false,
            indexerSelectionFinished: true,
            indexersSelected: 2,
            indexersFinished: 2,
            messages: ["Unexpected error while searching ErrorIndexer"],
            hasResults: false,
        });
        expect(earlyResults).toBeDisabled();
        progress({
            searchRequestId: 1,
            searchFinished: false,
            indexerSelectionFinished: true,
            indexersSelected: 2,
            indexersFinished: 2,
            messages: ["12 results via search from ResultIndexer"],
            hasResults: true,
        });
        await waitFor(() => expect(earlyResults).toBeEnabled());
    });

    it("should close a subscription that resolves after unmount", async () => {
        let resolveSubscription: (value: LiveSubscription) => void = () =>
            undefined;
        const close = vi.fn();
        const liveTransport: SearchLiveTransport = {
            subscribeSearchState: vi.fn(
                () =>
                    new Promise<LiveSubscription>((resolve) => {
                        resolveSubscription = resolve;
                    }),
            ),
        };
        const {unmount} = render(
            <SearchPage
                bootstrap={bootstrap}
                transport={
                    new ApiTransport(
                        "/hydra/",
                        vi.fn(() => new Promise<Response>(() => undefined)),
                    )
                }
                liveTransport={liveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() =>
            expect(liveTransport.subscribeSearchState).toHaveBeenCalledOnce(),
        );
        unmount();
        resolveSubscription({close});
        await waitFor(() => expect(close).toHaveBeenCalledOnce());
    });

    it("should not let a stale submission close a newer subscription", async () => {
        const subscriptions: Array<(value: LiveSubscription) => void> = [];
        const firstClose = vi.fn();
        const secondClose = vi.fn();
        const liveTransport: SearchLiveTransport = {
            subscribeSearchState: vi.fn(
                () =>
                    new Promise<LiveSubscription>((resolve) => {
                        subscriptions.push(resolve);
                    }),
            ),
        };
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={
                    new ApiTransport(
                        "/hydra/",
                        vi.fn(() => new Promise<Response>(() => undefined)),
                    )
                }
                liveTransport={liveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() => expect(subscriptions).toHaveLength(1));
        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() => expect(subscriptions).toHaveLength(2));
        subscriptions[0]({close: firstClose});
        subscriptions[1]({close: secondClose});
        await waitFor(() => expect(firstClose).toHaveBeenCalledOnce());
        expect(secondClose).not.toHaveBeenCalled();
    });
});
