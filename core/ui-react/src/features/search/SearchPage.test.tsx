import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
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
import {SafeConfigContext} from "../../bootstrap";
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

// FM-051 deep-link cases: a media category with no `emby` configuration, so
// the Emby-availability check stays inert and doesn't require mocking a
// third endpoint.
const mediaBootstrap = {
    ...bootstrap,
    safeConfig: {
        ...bootstrap.safeConfig,
        categoriesConfig: {
            ...bootstrap.safeConfig.categoriesConfig,
            categories: [{name: "Movies", searchType: "MOVIE"}],
            defaultCategory: "Movies",
        },
    },
};

// A category whose size preset the form fills in, so that "the user cleared
// the range" and "the user never touched it" are distinguishable states.
const sizePresetBootstrap = {
    ...mediaBootstrap,
    safeConfig: {
        ...mediaBootstrap.safeConfig,
        categoriesConfig: {
            ...mediaBootstrap.safeConfig.categoriesConfig,
            categories: [
                {
                    name: "Movies",
                    searchType: "MOVIE",
                    minSizePreset: 500,
                    maxSizePreset: 20000,
                },
            ],
            defaultCategory: "Movies",
            enableCategorySizes: true,
        },
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
        fireEvent.change(screen.getByLabelText("Min age"), {
            target: {value: "2"},
        });
        fireEvent.change(screen.getByLabelText("Max size"), {
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

    it("should search with an indexer added to the live safe config after mount", async () => {
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
        const page = (liveConfig: Record<string, unknown>) => (
            <SafeConfigContext.Provider value={liveConfig}>
                <SearchPage
                    bootstrap={bootstrap}
                    transport={new ApiTransport("/hydra/", fetchImplementation)}
                    liveTransport={immediatelyUnavailableLiveTransport}
                />
            </SafeConfigContext.Provider>
        );
        const rendered = render(page(bootstrap.safeConfig));
        // ADR-0017: a config save invalidates the safe-config query; the page
        // must pick the new indexer up from the context without a reload.
        rendered.rerender(
            page({
                ...bootstrap.safeConfig,
                indexers: [
                    ...bootstrap.safeConfig.indexers,
                    {name: "Added", preselect: true},
                ],
            }),
        );

        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "query"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));

        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
        expect(searchRequestBody(fetchImplementation)).toMatchObject({
            indexers: ["Added", "Configured"],
        });
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
        expect(screen.getByLabelText("Min age")).toHaveValue("1");
        expect(screen.getByLabelText("Max age")).toHaveValue("2");
        expect(screen.getByLabelText("Min size")).toHaveValue("3");
        expect(screen.getByLabelText("Max size")).toHaveValue("4");
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
        expect(screen.getByLabelText("Min age")).toHaveValue("");
        expect(screen.getByLabelText("Max size")).toHaveValue("");
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

    // FM-051: submitting two distinct plain-text searches back-to-back in
    // one session must send each search's own text, not resubmit the
    // first search's stale text. This reproduces the round trip a real
    // navigation performs -- the router is mocked here, so the test feeds
    // the recorded `navigate` argument back into `router.search` and
    // re-renders to trigger the real `key={JSON.stringify(initialValues)}`
    // remount, which is what a real `navigate()` call does. Fixing this
    // defect means `AutoSubmitFromRoute` now genuinely re-fires for the
    // first search's own (now-changed) URL on that remount -- see the
    // effect's doc comment and this task's Out Of Scope. That is expected
    // and is not asserted on; every assertion below is on request/URL/box
    // *content*, never on how many requests were issued.
    it("should submit each of two consecutive searches with its own query text, not the first search's stale text", async () => {
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
        const transport = new ApiTransport("/hydra/", fetchImplementation);
        const rendered = render(
            <SearchPage
                bootstrap={bootstrap}
                transport={transport}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "fm051 first query alpha"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() => expect(router.navigate).toHaveBeenCalled());
        expect(router.navigate).toHaveBeenLastCalledWith({
            to: "/",
            search: expect.objectContaining({
                query: "fm051 first query alpha",
            }),
        });

        // Simulate what a real router does after `navigate()`: the URL now
        // carries the first search's canonical criteria, and re-rendering
        // with that as the route's `search` remounts the form via its
        // `key={JSON.stringify(initialValues)}`.
        const navigatedSearch = router.navigate.mock.calls[0]?.[0]?.search as
            | Record<string, unknown>
            | undefined;
        router.search = navigatedSearch ?? {};
        rendered.rerender(
            <SearchPage
                bootstrap={bootstrap}
                transport={transport}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        // Deep-link back-compatibility: the remounted box shows the first
        // search's own text, restored from the URL it just wrote.
        expect(screen.getByLabelText("Search")).toHaveValue(
            "fm051 first query alpha",
        );

        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "fm051 second query beta"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));

        await waitFor(() => {
            const secondRequest = searchRequestCalls(fetchImplementation).find(
                (call) =>
                    (
                        JSON.parse((call[1] as RequestInit).body as string) as {
                            query?: string;
                        }
                    ).query === "fm051 second query beta",
            );
            expect(secondRequest).toBeDefined();
        });
        expect(router.navigate).toHaveBeenLastCalledWith({
            to: "/",
            search: expect.objectContaining({
                query: "fm051 second query beta",
            }),
        });
        expect(screen.getByLabelText("Search")).toHaveValue(
            "fm051 second query beta",
        );
    });

    // FM-051 deep-link back-compatibility case 1 (non-media category) is
    // already exercised by "should execute a search encoded in a plain
    // bookmarked or typed URL..." above.

    it("should restore and execute a bare `query` deep link for a media category via the title mirror", async () => {
        // FM-051 deep-link case 2. This works only because `valuesFromSearch`
        // mirrors a bare `query` param into `title` -- the field the visible
        // box is actually registered to for a media category. If that
        // mirror were removed, this deep link would regress to an empty
        // search, which is exactly the failure mode this case pins.
        router.search = {
            query: "fm051 media deep link",
            category: "Movies",
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
                bootstrap={mediaBootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        expect(screen.getByLabelText("Search")).toHaveValue(
            "fm051 media deep link",
        );
        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
        expect(searchRequestBody(fetchImplementation)).toEqual({
            query: "fm051 media deep link",
            category: "Movies",
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
        });
    });

    it("should restore and execute an identifier deep link with a title and an additional query unchanged", async () => {
        // FM-051 deep-link case 3: `title` and `query` are both explicit, so
        // no mirroring applies -- the box shows the title, the additional
        // filter field shows the (additional) query, and the request keeps
        // carrying both exactly as it does today.
        router.search = {
            query: "fm051 identifier extra",
            title: "fm051 identifier title",
            imdbId: "tt9999999",
            category: "Movies",
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
                bootstrap={mediaBootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        expect(screen.getByLabelText("Search")).toHaveValue(
            "fm051 identifier title",
        );
        expect(screen.getByTestId("additional-query")).toHaveValue(
            "fm051 identifier extra",
        );
        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
        expect(searchRequestBody(fetchImplementation)).toEqual({
            query: "fm051 identifier extra",
            title: "fm051 identifier title",
            imdbId: "tt9999999",
            category: "Movies",
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
        });
    });

    // FM-051 deep-link case 4, first half: a Search History repeat.
    it("should repeat a history entry recording a title and a query but no identifier unchanged", async () => {
        // Explicitly Out Of Scope for FM-051: `submit()`'s leading
        // `values.additionalQuery ||` term still wins the request's query
        // over the shared derivation, and `canonicalSearch` still drops
        // `additionalQuery` from the URL for a no-identifier media search.
        // This pins that pre-existing, deliberately-preserved disagreement
        // byte-for-byte, not just the repeat mechanism.
        router.search = {
            repeat: "history",
            category: "Movies",
            title: "fm051 repeat title",
            query: "fm051 repeat query",
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
                bootstrap={mediaBootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );
        await waitFor(() =>
            expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
        );
        expect(searchRequestBody(fetchImplementation)).toEqual({
            query: "fm051 repeat query",
            category: "Movies",
            indexers: ["Configured"],
            loadAll: false,
            searchRequestId: expect.any(Number),
        });
        expect(router.navigate).toHaveBeenCalledWith({
            to: "/",
            search: {
                query: "fm051 repeat title",
                category: "Movies",
                indexers: "Configured",
            },
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
        // FM-087 moved the indexer selection into the Advanced panel, so it
        // is rendered but collapsed until the disclosure is opened; what this
        // case exists to prove -- that the permission, not the layout, gates
        // the section -- is asserted on the same element either way.
        expect(screen.getByLabelText("Indexer selection")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("search-advanced-toggle"));
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

    // FM-083: Cancel closes the dialog, releases the active submission (and
    // thus its live subscription), and leaves the page in its pre-search
    // state -- no loading indicator, no results, no error.
    it("should cancel the search, close the dialog, and return to the pre-search state", async () => {
        const close = vi.fn();
        const liveTransport: SearchLiveTransport = {
            subscribeSearchState: vi.fn(async () => ({close})),
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
        fireEvent.click(
            screen.getByRole("button", {
                name: "Cancel search and return to search mask",
            }),
        );

        await waitFor(() =>
            expect(
                screen.queryByTestId("search-status-modal"),
            ).not.toBeInTheDocument(),
        );
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("search-result-row"),
        ).not.toBeInTheDocument();
        await waitFor(() => expect(close).toHaveBeenCalledOnce());
    });

    it("should not be dismissible by backdrop click or Escape, only by Cancel", async () => {
        const fetchImplementation = vi
            .fn()
            .mockImplementation(() => new Promise<Response>(() => undefined));
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        const modal = await screen.findByTestId("search-status-modal");
        fireEvent.keyDown(modal, {key: "Escape"});
        expect(screen.getByTestId("search-status-modal")).toBeVisible();

        // The MUI backdrop is a sibling rendered in the same portal as the
        // dialog paper; simulate the click MUI itself dispatches on it.
        const backdrop = document.querySelector(".MuiBackdrop-root");
        if (backdrop) {
            fireEvent.click(backdrop);
        }
        expect(screen.getByTestId("search-status-modal")).toBeVisible();
    });

    // Reused across the two "abandoned response" tests below: an
    // `executeSearch` that only settles once the test calls `settle`.
    function deferredSearchFetch(): {
        fetchImplementation: typeof fetch;
        settle: (value: Response | Error) => void;
    } {
        let settle: (value: Response | Error) => void = () => undefined;
        const fetchImplementation = vi.fn((url: RequestInfo | URL) => {
            if (!String(url).includes("internalapi/search")) {
                return new Promise<Response>(() => undefined);
            }
            return new Promise<Response>((resolve, reject) => {
                settle = (value) =>
                    value instanceof Error ? reject(value) : resolve(value);
            });
        }) as unknown as typeof fetch;
        return {fetchImplementation, settle};
    }

    it("should ignore an abandoned search response that resolves after cancel", async () => {
        const {fetchImplementation, settle} = deferredSearchFetch();
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByTestId("search-status-modal");
        fireEvent.click(
            screen.getByRole("button", {
                name: "Cancel search and return to search mask",
            }),
        );
        await waitFor(() =>
            expect(
                screen.queryByTestId("search-status-modal"),
            ).not.toBeInTheDocument(),
        );

        await act(async () => {
            settle(
                new Response(
                    JSON.stringify({
                        ...responseEnvelope,
                        searchResults: [
                            {
                                searchResultId: "abandoned",
                                title: "Abandoned result",
                                indexer: "Mock",
                                category: "All",
                            },
                        ],
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(screen.queryByText("Abandoned result")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("search-status-modal"),
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should ignore an abandoned search error that rejects after cancel", async () => {
        const {fetchImplementation, settle} = deferredSearchFetch();
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByTestId("search-status-modal");
        fireEvent.click(
            screen.getByRole("button", {
                name: "Cancel search and return to search mask",
            }),
        );
        await waitFor(() =>
            expect(
                screen.queryByTestId("search-status-modal"),
            ).not.toBeInTheDocument(),
        );

        await act(async () => {
            settle(new Error("abandoned search failed"));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("search-status-modal"),
        ).not.toBeInTheDocument();
    });

    it("should render the new search's results and discard the cancelled one, even if it resolves last", async () => {
        let resolveFirst: (value: Response) => void = () => undefined;
        let resolveSecond: (value: Response) => void = () => undefined;
        let searchCalls = 0;
        const fetchImplementation = vi.fn((url: RequestInfo | URL) => {
            if (!String(url).includes("internalapi/search")) {
                return new Promise<Response>(() => undefined);
            }
            searchCalls += 1;
            const isFirst = searchCalls === 1;
            return new Promise<Response>((resolve) => {
                if (isFirst) {
                    resolveFirst = resolve;
                } else {
                    resolveSecond = resolve;
                }
            });
        });
        render(
            <SearchPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
                liveTransport={immediatelyUnavailableLiveTransport}
            />,
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByTestId("search-status-modal");
        fireEvent.click(
            screen.getByRole("button", {
                name: "Cancel search and return to search mask",
            }),
        );
        await waitFor(() =>
            expect(
                screen.queryByTestId("search-status-modal"),
            ).not.toBeInTheDocument(),
        );

        fireEvent.click(screen.getByTestId("search-submit"));
        await screen.findByTestId("search-status-modal");
        await waitFor(() => expect(searchCalls).toBe(2));

        // Resolve the new (second) submission first, then the abandoned
        // (first) one last -- proving discard doesn't depend on resolution
        // order, only on submission identity.
        resolveSecond(
            new Response(
                JSON.stringify({
                    ...responseEnvelope,
                    searchResults: [
                        {
                            searchResultId: "new",
                            title: "New search result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        expect(await screen.findByText("New search result")).toBeVisible();

        await act(async () => {
            resolveFirst(
                new Response(
                    JSON.stringify({
                        ...responseEnvelope,
                        searchResults: [
                            {
                                searchResultId: "old",
                                title: "Old abandoned result",
                                indexer: "Mock",
                                category: "All",
                            },
                        ],
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(
            screen.queryByText("Old abandoned result"),
        ).not.toBeInTheDocument();
        expect(screen.getByText("New search result")).toBeVisible();
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(1);
    });

    // A cleared size range survives the round trip through the canonical URL.
    // `canonicalSearch` omits the emptied field and `valuesFromSearch` refills
    // an absent one from the category preset, so re-resolving the URL a submit
    // just wrote used to hand the preset back and re-run the search with the
    // constraint the user had removed -- silently filtering their results by a
    // size range they had explicitly deleted.
    describe.each([
        [
            "clearing the Min and Max size fields",
            () => {
                fireEvent.change(screen.getByLabelText("Min size"), {
                    target: {value: ""},
                });
                fireEvent.change(screen.getByLabelText("Max size"), {
                    target: {value: ""},
                });
            },
        ],
        [
            "deleting the size constraint chip",
            () => {
                fireEvent.click(
                    within(screen.getByTestId("search-chip-size")).getByTestId(
                        "CancelIcon",
                    ),
                );
            },
        ],
    ])("when a size constraint is removed by %s", (_label, removeSize) => {
        it("should keep it out of the submitted request and of the search the resulting URL re-runs", async () => {
            const fetchImplementation = vi.fn(() =>
                Promise.resolve(searchResponse()),
            );
            const transport = new ApiTransport("/hydra/", fetchImplementation);
            const rendered = render(
                <SearchPage
                    bootstrap={sizePresetBootstrap}
                    transport={transport}
                    liveTransport={immediatelyUnavailableLiveTransport}
                />,
            );

            expect(screen.getByLabelText("Min size")).toHaveValue("500");
            removeSize();
            expect(
                screen.queryByTestId("search-chip-size"),
            ).not.toBeInTheDocument();

            fireEvent.change(screen.getByLabelText("Search"), {
                target: {value: "unconstrained"},
            });
            fireEvent.click(screen.getByTestId("search-submit"));
            await waitFor(() =>
                expect(searchRequestCalls(fetchImplementation)).toHaveLength(1),
            );
            expect(searchRequestBody(fetchImplementation)).not.toHaveProperty(
                "minsize",
            );
            expect(searchRequestBody(fetchImplementation)).not.toHaveProperty(
                "maxsize",
            );

            // What a real router does after `navigate()`: the canonical URL of
            // the search just submitted becomes the route, which the page
            // re-reads and `AutoSubmitFromRoute` re-runs.
            router.search = (router.navigate.mock.calls[0]?.[0]?.search ??
                {}) as Record<string, unknown>;
            expect(router.search).not.toHaveProperty("minsize");
            rendered.rerender(
                <SearchPage
                    bootstrap={sizePresetBootstrap}
                    transport={transport}
                    liveTransport={immediatelyUnavailableLiveTransport}
                />,
            );

            expect(
                screen.queryByTestId("search-chip-size"),
            ).not.toBeInTheDocument();
            await waitFor(() =>
                expect(
                    searchRequestCalls(fetchImplementation).length,
                ).toBeGreaterThan(0),
            );
            for (const [index] of searchRequestCalls(
                fetchImplementation,
            ).entries()) {
                const body = searchRequestBodyAt(fetchImplementation, index);
                expect(body).not.toHaveProperty("minsize");
                expect(body).not.toHaveProperty("maxsize");
            }
        });
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
