import {
    act,
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
import {ToastProvider} from "../../components/toasts/ToastProvider";
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

    it("should provide accessible feedback when saving an executed search fails", async () => {
        const fetchImplementation = vi.fn((url: RequestInfo | URL) => {
            if (String(url).includes("forsearching")) {
                return Promise.resolve(new Response(JSON.stringify([])));
            }
            if (String(url).includes("savedsearches")) {
                return Promise.resolve(new Response("failed", {status: 500}));
            }
            return Promise.resolve(
                new Response(
                    JSON.stringify({
                        ...responseEnvelope,
                        searchResults: [
                            {
                                searchResultId: "saved",
                                title: "Saved result",
                                indexer: "Mock",
                                category: "All",
                            },
                        ],
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        });
        render(
            <ToastProvider>
                <SearchPage
                    bootstrap={bootstrap}
                    transport={new ApiTransport("/hydra/", fetchImplementation)}
                    liveTransport={immediatelyUnavailableLiveTransport}
                />
            </ToastProvider>,
        );

        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "saved"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));
        fireEvent.click(
            await screen.findByRole("button", {name: "Save search"}),
        );
        expect(await screen.findByText("Unable to save search.")).toBeVisible();
    });

    it("should update the URL and construct a numeric configured-indexer request", async () => {
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : responseEnvelope,
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
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
        const request = searchRequestBody(fetchImplementation);
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
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                String(url).includes("forsearching")
                    ? new Response(JSON.stringify([]), {
                          headers: {"Content-Type": "application/json"},
                      })
                    : searchResponse(),
            ),
        );
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
        expect(searchRequestBody(fetchImplementation)).toEqual({
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
        expect(searchRequestCalls(fetchImplementation)).toHaveLength(0);
    });

    it("should refill and repeat complete recent criteria while reconciling unavailable indexers", async () => {
        const requests: RequestInit[] = [];
        const fetchImplementation = vi.fn(
            (url: RequestInfo | URL, init?: RequestInit) => {
                if (String(url).endsWith("/internalapi/search") && init) {
                    requests.push(init);
                }
                return Promise.resolve(
                    new Response(
                        JSON.stringify(
                            String(url).includes("forsearching")
                                ? [
                                      {
                                          categoryName: "All",
                                          source: "INTERNAL",
                                          query: "recent query",
                                          minAge: 1,
                                          maxAge: 2,
                                          minSize: 3,
                                          maxSize: 4,
                                          selectedIndexers: [
                                              "Configured",
                                              "Unavailable",
                                          ],
                                          identifiers: [],
                                      },
                                      {categoryName: 3},
                                  ]
                                : responseEnvelope,
                        ),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            },
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        await screen.findByTestId("recent-searches-trigger");
        fireEvent.click(screen.getByTestId("recent-searches-trigger"));
        await screen.findByRole("menuitem", {name: /^Repeat:/});
        expect(screen.getAllByText("Source:").at(0)).toBeVisible();
        expect(screen.getAllByText(/Internal/).at(0)).toBeVisible();
        fireEvent.click(screen.getByRole("button", {name: /^Refill:/}));
        expect(screen.getByLabelText("Search")).toHaveValue("recent query");
        expect(screen.getByLabelText("Minimum age (days)")).toHaveValue(1);
        expect(screen.getByLabelText("Maximum age (days)")).toHaveValue(2);
        expect(screen.getByLabelText("Minimum size (MB)")).toHaveValue(3);
        expect(screen.getByLabelText("Maximum size (MB)")).toHaveValue(4);
        fireEvent.click(screen.getByTestId("recent-searches-trigger"));
        fireEvent.click(
            await screen.findByRole("menuitem", {name: /^Repeat:/}),
        );
        await waitFor(() => expect(requests).toHaveLength(1));
        expect(JSON.parse(requests[0].body as string)).toEqual({
            query: "recent query",
            category: "All",
            minage: 1,
            maxage: 2,
            minsize: 3,
            maxsize: 4,
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
        });
    });

    it("should open, focus, and close the recent-search menu", async () => {
        const fetchImplementation = vi.fn(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify([
                        {
                            categoryName: "All",
                            source: "INTERNAL",
                            query: "focus query",
                            identifiers: [],
                        },
                    ]),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        const trigger = await screen.findByTestId("recent-searches-trigger");
        trigger.focus();
        fireEvent.click(trigger);
        const entry = await screen.findByRole("menuitem", {
            name: /^Repeat:/,
        });
        await waitFor(() => expect(entry).toHaveFocus());
        fireEvent.keyDown(screen.getByRole("menu"), {key: "Escape"});
        await waitFor(() =>
            expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
        );
        expect(trigger).toHaveFocus();
    });

    it("should present loading and empty recent-search menu states", async () => {
        let resolveHistory: (response: Response) => void = () => undefined;
        const fetchImplementation = vi.fn(
            () =>
                new Promise<Response>((resolve) => {
                    resolveHistory = resolve;
                }),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(await screen.findByTestId("recent-searches-trigger"));
        await waitFor(() => expect(fetchImplementation).toHaveBeenCalledOnce());
        expect(screen.getByLabelText("Loading recent searches")).toBeVisible();
        await act(async () => {
            resolveHistory(
                new Response(JSON.stringify([]), {
                    headers: {"Content-Type": "application/json"},
                }),
            );
        });
        expect(await screen.findByText("No recent searches.")).toBeVisible();
    });

    it("should present recent-search loading failures", async () => {
        let rejectHistory: (error: Error) => void = () => undefined;
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={
                    new ApiTransport(
                        "/hydra/",
                        vi.fn(
                            () =>
                                new Promise<Response>((_resolve, reject) => {
                                    rejectHistory = reject;
                                }),
                        ),
                    )
                }
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(await screen.findByTestId("recent-searches-trigger"));
        expect(screen.getByLabelText("Loading recent searches")).toBeVisible();
        await act(async () => {
            rejectHistory(new Error("unavailable"));
        });
        expect(
            await screen.findByText("Unable to load recent searches."),
        ).toBeVisible();
    });

    it("should refill a dragged recent search", async () => {
        const fetchImplementation = vi.fn(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify([
                        {
                            categoryName: "All",
                            source: "INTERNAL",
                            query: "dragged query",
                            identifiers: [],
                        },
                    ]),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(await screen.findByTestId("recent-searches-trigger"));
        fireEvent.dragStart(
            await screen.findByRole("menuitem", {name: /^Repeat:/}),
        );
        fireEvent.drop(screen.getByLabelText("Search"));
        expect(screen.getByLabelText("Search")).toHaveValue("dragged query");
    });

    it("should leave absent recent criteria to canonical defaults", async () => {
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? [
                                  {
                                      categoryName: "All",
                                      query: "default",
                                      identifiers: [],
                                  },
                              ]
                            : responseEnvelope,
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        await screen.findByTestId("recent-searches-trigger");
        fireEvent.click(screen.getByTestId("recent-searches-trigger"));
        await screen.findByRole("menuitem", {name: /^Repeat:/});
        fireEvent.click(screen.getByRole("button", {name: /^Refill:/}));
        expect(screen.getByLabelText("Minimum age (days)")).toHaveValue(null);
        expect(screen.getByLabelText("Maximum size (MB)")).toHaveValue(null);
    });

    it("should execute history repeat criteria through the canonical submission lifecycle", async () => {
        router.search = {
            repeat: "history",
            category: "All",
            query: "history query",
            minage: "2",
            indexers: "Configured",
        };
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : responseEnvelope,
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
        expect(searchRequestBody(fetchImplementation)).toEqual({
            query: "history query",
            category: "All",
            minage: 2,
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
        });
        expect(router.navigate).toHaveBeenCalledWith({
            to: "/",
            search: {
                query: "history query",
                category: "All",
                minage: "2",
                indexers: "Configured",
            },
        });
    });

    it("should execute a search encoded in a plain bookmarked or typed URL, with no repeat marker and no user interaction", async () => {
        router.search = {
            query: "1",
            category: "All",
            indexers: "Configured",
        };
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : responseEnvelope,
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
        expect(searchRequestBody(fetchImplementation)).toEqual({
            query: "1",
            category: "All",
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
        });
    });

    it("should auto-execute a history repeat with no recorded selected indexers using the default preselection", async () => {
        router.search = {
            repeat: "history",
            category: "All",
            query: "legacy history query",
        };
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : responseEnvelope,
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
        expect(searchRequestBody(fetchImplementation)).toEqual({
            query: "legacy history query",
            category: "All",
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
        });
        expect(router.navigate).toHaveBeenCalledWith({
            to: "/",
            search: {
                query: "legacy history query",
                category: "All",
                indexers: "Configured",
            },
        });
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
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : {
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
                              },
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
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
        await waitFor(() =>
            expect(screen.getAllByTestId("search-result-row")).toHaveLength(2),
        );
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

    it("should stop a non-load-all continuation that resets the paging cursor", async () => {
        const initial = {
            ...responseEnvelope,
            searchResults: [
                {
                    searchResultId: "duplicate",
                    title: "Existing result",
                    indexer: "Mock",
                    category: "All",
                },
            ],
            indexerSearchMetaDatas: [
                {
                    indexerName: "Mock",
                    wasSuccessful: true,
                    hasMoreResults: true,
                },
            ],
            numberOfAvailableResults: 3,
            numberOfProcessedResults: 1,
            offset: 0,
            limit: 1,
        };
        let searchRequests = 0;
        const fetchImplementation = vi.fn((url: RequestInfo | URL) => {
            const isSearch = String(url).includes("/internalapi/search");
            if (isSearch) {
                searchRequests++;
            }
            return Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : searchRequests === 1
                              ? initial
                              : {
                                    ...initial,
                                    offset: 0,
                                    limit: 0,
                                    numberOfProcessedResults: 1,
                                },
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        });
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByRole("button", {name: "Load more"});
        fireEvent.click(screen.getByRole("button", {name: "Load more"}));

        await screen.findByText(
            "The server did not advance the search cache position.",
        );
        const continuation = searchRequestCalls(fetchImplementation)[1];
        expect(
            JSON.parse((continuation[1] as RequestInit).body as string),
        ).toMatchObject({
            offset: 1,
            loadAll: false,
        });
        const loadMore = screen.getByRole("button", {name: "Load more"});
        const loadAll = screen.getByRole("button", {
            name: "Load all results",
        });
        expect(loadMore).toBeDisabled();
        expect(loadAll).toBeDisabled();
        fireEvent.click(loadMore);
        fireEvent.click(loadAll);
        expect(searchRequestCalls(fetchImplementation)).toHaveLength(2);
    });

    it("should accept the Searcher load-all terminal response with default paging values", async () => {
        const initial = {
            ...responseEnvelope,
            searchResults: [
                {
                    searchResultId: "one",
                    title: "First result",
                    indexer: "Mock",
                    category: "All",
                },
            ],
            indexerSearchMetaDatas: [
                {
                    indexerName: "Mock",
                    wasSuccessful: true,
                    hasMoreResults: true,
                },
            ],
            numberOfAvailableResults: 2,
            numberOfProcessedResults: 1,
            offset: 0,
            limit: 1,
        };
        let searchRequests = 0;
        const fetchImplementation = vi.fn((url: RequestInfo | URL) => {
            if (String(url).includes("/internalapi/search")) {
                searchRequests++;
            }
            return Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : searchRequests === 1
                              ? initial
                              : {
                                    ...initial,
                                    searchResults: [
                                        ...initial.searchResults,
                                        {
                                            searchResultId: "two",
                                            title: "Second result",
                                            indexer: "Mock",
                                            category: "All",
                                        },
                                    ],
                                    numberOfProcessedResults: 2,
                                    offset: 0,
                                    limit: 0,
                                },
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        });
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByRole("button", {name: "Load all results"});
        fireEvent.click(screen.getByRole("button", {name: "Load all results"}));

        await waitFor(() =>
            expect(screen.getAllByTestId("search-result-row")).toHaveLength(2),
        );
        expect(searchRequestCalls(fetchImplementation)).toHaveLength(2);
        expect(searchRequestBodyAt(fetchImplementation, 1)).toMatchObject({
            offset: 1,
            limit: 1,
            loadAll: true,
        });
        expect(screen.getByRole("button", {name: "Load more"})).toBeDisabled();
    });

    it("should not repeat offset zero for an initial zero paging cursor with more results", async () => {
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : {
                                  ...responseEnvelope,
                                  numberOfAvailableResults: 2,
                                  numberOfProcessedResults: 0,
                                  offset: 0,
                                  limit: 0,
                                  indexerSearchMetaDatas: [
                                      {
                                          indexerName: "Mock",
                                          wasSuccessful: true,
                                          hasMoreResults: true,
                                      },
                                  ],
                              },
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
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

        const loadMore = await screen.findByRole("button", {
            name: "Load more",
        });
        expect(screen.getByRole("status")).toHaveTextContent(
            "invalid paging cursor",
        );
        expect(loadMore).toBeDisabled();
        fireEvent.click(loadMore);
        expect(searchRequestCalls(fetchImplementation)).toHaveLength(1);
    });

    it("should re-enable continuation for a second search after a terminal load-all response", async () => {
        const initial = {
            ...responseEnvelope,
            searchResults: [
                {
                    searchResultId: "one",
                    title: "First result",
                    indexer: "Mock",
                    category: "All",
                },
            ],
            indexerSearchMetaDatas: [
                {
                    indexerName: "Mock",
                    wasSuccessful: true,
                    hasMoreResults: true,
                },
            ],
            numberOfAvailableResults: 2,
            numberOfProcessedResults: 1,
            offset: 0,
            limit: 1,
        };
        let searchRequests = 0;
        const fetchImplementation = vi.fn((url: RequestInfo | URL) => {
            if (String(url).includes("/internalapi/search")) {
                searchRequests++;
            }
            return Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("forsearching")
                            ? []
                            : searchRequests === 2
                              ? {
                                    ...initial,
                                    numberOfProcessedResults: 2,
                                    offset: 0,
                                    limit: 0,
                                }
                              : initial,
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        });
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByRole("button", {name: "Load all results"});
        fireEvent.click(screen.getByRole("button", {name: "Load all results"}));
        await waitFor(() =>
            expect(
                screen.getByRole("button", {name: "Load more"}),
            ).toBeDisabled(),
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() => expect(searchRequests).toBe(3));
        await waitFor(() =>
            expect(
                screen.getByRole("button", {name: "Load more"}),
            ).toBeEnabled(),
        );
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
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
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
        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
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
        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
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

function searchRequestCalls(mock: ReturnType<typeof vi.fn>) {
    return mock.mock.calls.filter(([url]) =>
        String(url).endsWith("/internalapi/search"),
    );
}

function searchRequestBody(mock: ReturnType<typeof vi.fn>): unknown {
    return searchRequestBodyAt(mock, 0);
}

function searchRequestBodyAt(
    mock: ReturnType<typeof vi.fn>,
    index: number,
): unknown {
    const request = searchRequestCalls(mock)[index];
    return JSON.parse(
        (request?.[1] as RequestInit | undefined)?.body as string,
    );
}
