import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from "@tanstack/react-router";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {
    createHistorySearchSchema,
    NOTIFICATION_HISTORY_SORT_COLUMNS,
    SEARCH_HISTORY_SORT_COLUMNS,
    type HistorySearchParams,
} from "./historySearchParams";
import {NotificationHistoryPage} from "./NotificationHistoryPage";
import {SearchHistoryPage} from "./SearchHistoryPage";

const bootstrap = {
    username: "stats",
    authType: null,
    showLogout: true,
    maySeeSearch: true,
    adminRestricted: false,
    statsRestricted: true,
    maySeeStats: true,
    searchRestricted: false,
    maySeeDetailsDl: false,
    maySeeAdmin: false,
    authConfigured: true,
    showIndexerSelection: false,
    baseUrl: "/hydra/",
    serverTimeZone: "UTC",
    safeConfig: {
        categoriesConfig: {
            categories: [{name: "All"}, {name: "Movies"}],
            defaultCategory: "All",
            enableCategorySizes: false,
        },
        indexers: [],
        logging: {historyUserInfoType: "BOTH"},
    },
};

/**
 * FM-165: the page reads its page, sort and filters out of the route's search
 * parameters, so every case mounts it behind a real router at a real URL --
 * which is also what lets a round trip be proven by reading the location back.
 * `/` stands in for anywhere else in the application: "Repeat" navigates to it,
 * and the Back case leaves through it.
 */
function renderRouted(options: {
    path: string;
    search?: string;
    validateSearch: (input: Record<string, unknown>) => HistorySearchParams;
    component: () => ReactNode;
}) {
    const rootRoute = createRootRoute();
    const elsewhereRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        component: () => <div data-testid="elsewhere">Elsewhere</div>,
    });
    const pageRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: options.path,
        validateSearch: options.validateSearch,
        component: options.component,
    });
    const router = createRouter({
        basepath: "/hydra",
        history: createMemoryHistory({
            initialEntries: [`/hydra${options.path}${options.search ?? ""}`],
        }),
        routeTree: rootRoute.addChildren([elsewhereRoute, pageRoute]),
    });
    const result = render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                {/*
                 * FM-170: `CopyValueButton` calls `useToasts` unconditionally
                 * (before deciding whether it renders anything), so every
                 * page under test needs a real provider -- same as the
                 * production tree, which mounts one once for the whole app
                 * in `App.tsx`.
                 */}
                <ToastProvider>
                    <RouterProvider router={router} />
                </ToastProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return {...result, router};
}

function renderPage(
    fetchImplementation: typeof fetch,
    options: {bootstrap?: typeof bootstrap; search?: string} = {},
) {
    return renderRouted({
        path: "/stats/searches",
        search: options.search,
        validateSearch: createHistorySearchSchema(SEARCH_HISTORY_SORT_COLUMNS),
        component: () => (
            <SearchHistoryPage
                bootstrap={options.bootstrap ?? bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />
        ),
    });
}

function renderNotificationPage(fetchImplementation: typeof fetch) {
    return renderRouted({
        path: "/stats/notifications",
        validateSearch: createHistorySearchSchema(
            NOTIFICATION_HISTORY_SORT_COLUMNS,
        ),
        component: () => (
            <NotificationHistoryPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />
        ),
    });
}

// This project's jsdom environment configures no `url`, so its opaque origin
// has no `window.localStorage` at all -- the same limitation
// `StatsDashboardPage`'s persistence test documents. Installed by the one test
// that needs a working store and removed by `vi.unstubAllGlobals()`.
function stubWorkingLocalStorage(): Map<string, string> {
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
    return store;
}

describe("SearchHistoryPage", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("should refine through the surface while paging, sorting, and refreshing", async () => {
        const requests: RequestInit[] = [];
        const fetchImplementation = vi.fn(
            (_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) {
                    requests.push(init);
                }
                return Promise.resolve(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 30}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            },
        );
        const lastBody = () => JSON.parse(requests.at(-1)?.body as string);
        renderPage(fetchImplementation);
        await screen.findByTestId("search-history-row");
        // The refine surface is the route's only filter surface: nothing
        // above the table header filters any more.
        expect(screen.getAllByTestId("history-refine-bar")).toHaveLength(1);
        const table = screen.getByTestId("search-history-table");
        expect(within(table).queryAllByRole("textbox")).toHaveLength(0);

        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "query"},
        });
        // Deliberately synchronous from here: awaiting between the typed
        // edit and the sort click would let the filter debounce fire on its
        // own on a slow machine, and this case is about the commit the sort
        // click performs, not about the timer.
        fireEvent.click(screen.getByRole("button", {name: "Query"}));
        // Two reads, not three: the typed "Query" edit is committed by the
        // sort click rather than racing it, so the sort and the filter reach
        // the server in one request (`useHistoryFilterCriteria`).
        await waitFor(() =>
            expect(lastBody()).toMatchObject({
                page: 1,
                sortModel: {column: "query", sortMode: 1},
                filterModel: {
                    query: {filterType: "freetext", filterValue: "query"},
                },
            }),
        );
        expect(fetchImplementation).toHaveBeenCalledTimes(2);

        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
        );
        // Paging carries the sort and the filter with it: they live in the URL
        // now, and a page change rewrites only the page.
        expect(lastBody()).toMatchObject({
            page: 2,
            sortModel: {column: "query", sortMode: 1},
            filterModel: {
                query: {filterType: "freetext", filterValue: "query"},
            },
        });

        // A multi-select filter change returns to page 1.
        fireEvent.click(
            screen.getAllByTestId("history-refine-category-option")[1],
        );
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(4),
        );
        expect(lastBody()).toMatchObject({
            page: 1,
            filterModel: {
                query: {filterType: "freetext", filterValue: "query"},
                category_name: {
                    filterType: "checkboxes",
                    filterValue: ["Movies"],
                },
            },
        });
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "2 active filters",
        );

        await screen.findByTestId("search-history-refresh");
        fireEvent.click(screen.getByTestId("search-history-refresh"));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(5),
        );
    });

    it("should offer After, Before, Query, Category, and Source through the surface, with every selectable category as an option", async () => {
        renderPage(
            vi
                .fn()
                .mockResolvedValue(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 1}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                ),
        );
        await screen.findByTestId("search-history-row");
        for (const label of ["After", "Before", "Query"]) {
            expect(screen.getByLabelText(label)).toBeVisible();
        }
        expect(
            screen.getByRole("combobox", {name: "Source"}),
        ).toHaveTextContent("All sources");
        expect(
            screen
                .getAllByTestId("history-refine-category-option")
                .map((option) => option.textContent),
        ).toEqual(["All", "Movies"]);
        // The user-agent dimension is not reachable until the display toggle
        // is on.
        expect(screen.queryByLabelText("User agent")).not.toBeInTheDocument();
    });

    /*
     * The page keyed its query on the raw filter values, so every keystroke in
     * a free-text or range field was its own POST -- and each of those runs a
     * COUNT beside the page read. Typing an eight-letter title was eight round
     * trips whose first seven answers were discarded.
     *
     * Timers are faked only after the first page has arrived, so the mount and
     * its `await` run on real ones and nothing has to advance react-query's own
     * internals by hand.
     */
    it("should issue one read for a burst of typing, keeping the field responsive", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(
                new Response(
                    JSON.stringify({content: [entry()], totalElements: 1}),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        renderPage(fetchImplementation);
        await screen.findByTestId("search-history-row");
        expect(fetchImplementation).toHaveBeenCalledTimes(1);

        vi.useFakeTimers();
        const field = screen.getByLabelText("Query");
        for (const text of ["a", "av", "ave", "aven", "aveng"]) {
            fireEvent.change(field, {target: {value: text}});
        }
        // Nothing has left yet, and the field is nonetheless current.
        expect(fetchImplementation).toHaveBeenCalledTimes(1);
        expect(field).toHaveValue("aveng");
        vi.advanceTimersByTime(500);
        vi.useRealTimers();

        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(2),
        );
        expect(
            JSON.parse(
                (fetchImplementation.mock.calls.at(-1)?.[1] as RequestInit)
                    .body as string,
            ),
        ).toMatchObject({
            page: 1,
            filterModel: {
                query: {filterType: "freetext", filterValue: "aveng"},
            },
        });
    });

    /*
     * "Show user agents" is a column toggle, not a filter, and hiding the
     * column used to write `{kind: "freetext", text: ""}` into the filter
     * values whether or not anything had been typed there -- a new query key
     * for a byte-identical page, and so a full re-read plus its COUNT for a
     * click that changed nothing the server can see.
     */
    it("should not re-read the page when the user-agent column is toggled unfiltered", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(
                new Response(
                    JSON.stringify({content: [entry()], totalElements: 1}),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        renderPage(fetchImplementation);
        await screen.findByTestId("search-history-row");
        expect(fetchImplementation).toHaveBeenCalledTimes(1);

        const toggle = screen.getByLabelText("Show user agents");
        fireEvent.click(toggle);
        await screen.findByLabelText("User agent");
        fireEvent.click(toggle);
        await waitFor(() =>
            expect(screen.queryByLabelText("User agent")).toBeNull(),
        );
        // Long enough for a filter commit to have fired had one been queued.
        await new Promise((resolve) => setTimeout(resolve, 400));

        expect(fetchImplementation).toHaveBeenCalledTimes(1);
    });

    /*
     * The refresh indicator used to be inserted above the table when a fetch
     * started and removed when it ended, so every refresh moved the table down
     * and back up by the indicator's own height -- under the reader's pointer.
     * The row is now always in the layout, and only its contents come and go:
     * the assertion that it is the *same* node in both states is what would
     * fail again if the conditional came back.
     */
    it("should keep the refresh indicator's row in the layout when idle", async () => {
        let releaseRefresh: ((response: Response) => void) | undefined;
        const page = () =>
            new Response(
                JSON.stringify({content: [entry()], totalElements: 1}),
                {headers: {"Content-Type": "application/json"}},
            );
        const fetchImplementation = vi
            .fn()
            .mockImplementationOnce(() => Promise.resolve(page()))
            .mockImplementationOnce(
                () =>
                    new Promise<Response>((resolve) => {
                        releaseRefresh = resolve;
                    }),
            );
        renderPage(fetchImplementation);
        await screen.findByTestId("search-history-row");

        const slot = screen.getByRole("status");
        expect(slot).toBeEmptyDOMElement();

        fireEvent.click(screen.getByTestId("search-history-refresh"));
        await waitFor(() =>
            expect(screen.getByRole("status")).toHaveTextContent(
                "Refreshing search history…",
            ),
        );
        expect(screen.getByRole("status")).toBe(slot);

        releaseRefresh?.(page());
        await waitFor(() => expect(slot).toBeEmptyDOMElement());
        expect(screen.getByRole("status")).toBe(slot);
    });

    it("should clear every dimension and return to page 1", async () => {
        const requests: RequestInit[] = [];
        const fetchImplementation = vi.fn(
            (_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) {
                    requests.push(init);
                }
                return Promise.resolve(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 30}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            },
        );
        renderPage(fetchImplementation);
        await screen.findByTestId("search-history-row");
        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "query"},
        });
        fireEvent.click(
            screen.getAllByTestId("history-refine-category-option")[0],
        );
        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        // Two reads: the first page, then the paging click carrying both
        // pending filter edits with it.
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(2),
        );
        fireEvent.click(screen.getByTestId("history-refine-clear-all"));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
        );
        expect(JSON.parse(requests.at(-1)?.body as string)).toMatchObject({
            page: 1,
            filterModel: {},
        });
        expect(screen.getByLabelText("Query")).toHaveValue("");
        expect(
            screen.getAllByTestId("history-refine-category-option")[0],
        ).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "No active filters",
        );
    });

    it("should reach the user-agent filter only while user agents are shown, and clear it when hidden again", async () => {
        const requests: RequestInit[] = [];
        const fetchImplementation = vi.fn(
            (_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) {
                    requests.push(init);
                }
                return Promise.resolve(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 1}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            },
        );
        renderPage(fetchImplementation);
        await screen.findByTestId("search-history-row");
        expect(screen.queryByLabelText("User agent")).not.toBeInTheDocument();

        fireEvent.click(screen.getByLabelText("Show user agents"));
        fireEvent.change(await screen.findByLabelText("User agent"), {
            target: {value: "agent"},
        });
        await waitFor(() =>
            expect(JSON.parse(requests.at(-1)?.body as string)).toMatchObject({
                filterModel: {
                    user_agent: {filterType: "freetext", filterValue: "agent"},
                },
            }),
        );

        fireEvent.click(screen.getByLabelText("Show user agents"));
        expect(screen.queryByLabelText("User agent")).not.toBeInTheDocument();
        await waitFor(() =>
            expect(JSON.parse(requests.at(-1)?.body as string)).toMatchObject({
                page: 1,
                filterModel: {},
            }),
        );
    });

    it("should hide the username and IP filter dimensions when history user info is disabled", async () => {
        renderPage(
            vi
                .fn()
                .mockResolvedValue(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 1}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                ),
            {
                bootstrap: {
                    ...bootstrap,
                    safeConfig: {
                        ...bootstrap.safeConfig,
                        logging: {historyUserInfoType: "NONE"},
                    },
                },
            },
        );
        await screen.findByTestId("search-history-row");
        expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("IP address")).not.toBeInTheDocument();
    });

    it("should respect visibility controls, isolate malformed rows, show details, and repeat through canonical criteria", async () => {
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("details")
                            ? {
                                  ip: "127.0.0.1",
                                  userAgent: "agent",
                                  indexerSearches: [
                                      {
                                          indexerName: "Mock",
                                          successful: true,
                                          resultsCount: 2,
                                          responseTime: 15,
                                      },
                                      {indexerName: 3},
                                  ],
                              }
                            : {
                                  content: [entry(), {id: "bad"}],
                                  totalElements: 2,
                              },
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        const {router} = renderPage(fetchImplementation);
        const row = await screen.findByTestId("search-history-row");
        expect(
            screen.getByText(
                "1 malformed search history entries were not displayed.",
            ),
        ).toBeVisible();
        expect(
            screen.getByRole("columnheader", {name: "Username"}),
        ).toBeVisible();
        // FM-174: one line per dimension, not a Minimum/Maximum pair each.
        for (const [label, value] of [
            ["Size:", "100 MB - 500 MB"],
            ["Age:", "2 days - 10 days"],
            ["Selected indexers:", "Configured, Mock"],
        ]) {
            const term = within(row).getByText(label);
            const definition = within(row).getByText(value);
            expect(term).toBeVisible();
            expect(term.tagName).toBe("DT");
            expect(definition).toBeVisible();
            expect(definition.tagName).toBe("DD");
        }
        fireEvent.click(screen.getByLabelText("Show user agents"));
        expect(within(row).getByText("agent")).toBeVisible();
        fireEvent.click(within(row).getByTestId("search-history-details"));
        expect(
            await screen.findByRole("table", {
                name: "Related indexer searches",
            }),
        ).toHaveTextContent("15ms");
        expect(
            screen.getByText(
                "1 malformed indexer search entries were not displayed.",
            ),
        ).toBeVisible();
        const repeat = within(row).getByTestId("search-history-repeat");
        // FM-174: the Query column holds the query and nothing else, and
        // repeating is an icon-only control beside "Details" carrying legacy's
        // own tooltip sentence as its accessible name.
        expect(within(row).getByText("query").closest("td")).toHaveTextContent(
            /^query$/,
        );
        expect(repeat.closest("td")).toBe(
            within(row).getByTestId("search-history-details").closest("td"),
        );
        expect(repeat).toHaveAccessibleName(
            "Repeat this search with all currently enabled indexers.",
        );
        expect(repeat).toHaveTextContent("");
        fireEvent.click(repeat);
        // The canonical criteria reach the search route through the URL now
        // rather than through a mocked `navigate`, so this pins what a repeat
        // link actually carries.
        await screen.findByTestId("elsewhere");
        expect(router.state.location.search).toEqual({
            category: "All",
            query: "query",
            minage: "2",
            maxage: "10",
            minsize: "100",
            maxsize: "500",
            indexers: "Configured,Mock",
            repeat: "history",
        });
    });

    it("should copy each column's underlying value to the clipboard, and hide the query and additional-parameters buttons rather than copy a placeholder", async () => {
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        const bare = {
            id: 2,
            categoryName: "All",
            source: "INTERNAL",
            identifiers: [],
        };
        const fetchImplementation = vi.fn(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        content: [entry(), bare],
                        totalElements: 2,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        renderPage(fetchImplementation);
        await screen.findAllByTestId("search-history-row");
        fireEvent.click(screen.getByLabelText("Show user agents"));
        const [populated, empty] = screen.getAllByTestId("search-history-row");
        fireEvent.click(
            within(populated).getByRole("button", {name: "Copy query"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenCalledWith("query"),
        );
        fireEvent.click(
            within(populated).getByRole("button", {
                name: "Copy additional parameters",
            }),
        );
        // The assembled copy text, not the `<dt>`/`<dd>` pairs `Criteria`
        // renders it as -- proof this reads the entry's own fields rather
        // than the cell's DOM.
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenLastCalledWith(
                "Size: 100 MB - 500 MB\nAge: 2 days - 10 days\n" +
                    "Selected indexers: Configured, Mock",
            ),
        );
        fireEvent.click(
            within(populated).getByRole("button", {name: "Copy user agent"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenLastCalledWith("agent"),
        );
        fireEvent.click(
            within(populated).getByRole("button", {name: "Copy IP address"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenLastCalledWith("127.0.0.1"),
        );
        expect(
            await screen.findByText("Copied IP address to clipboard."),
        ).toBeVisible();
        // A row with no query, title, or criteria offers neither button --
        // rather than copy "Update query" or an empty string, the fallback
        // display text is not a real value.
        expect(
            within(empty).queryByRole("button", {name: "Copy query"}),
        ).not.toBeInTheDocument();
        expect(
            within(empty).queryByRole("button", {
                name: "Copy additional parameters",
            }),
        ).not.toBeInTheDocument();
    });

    it("should copy the details dialog's Host and User agent values", async () => {
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("details")
                            ? {
                                  ip: "127.0.0.1",
                                  userAgent: "agent",
                                  indexerSearches: [],
                              }
                            : {content: [entry()], totalElements: 1},
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        renderPage(fetchImplementation);
        const row = await screen.findByTestId("search-history-row");
        fireEvent.click(within(row).getByTestId("search-history-details"));
        const dialog = await screen.findByRole("table", {
            name: "Search request details",
        });
        fireEvent.click(
            within(dialog).getByRole("button", {name: "Copy host"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenCalledWith("127.0.0.1"),
        );
        fireEvent.click(
            within(dialog).getByRole("button", {name: "Copy user agent"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenLastCalledWith("agent"),
        );
    });

    /*
     * FM-174 (owner request 2026-09-01): the `<key> ID` lines left the row --
     * they made every identifier search a multi-line cell for values a reader
     * rarely needs. They are not lost: the details dialog carries the whole
     * search request, identifiers included, with the same external links the
     * row used to render.
     */
    it("should keep identifiers out of the row and reachable, still linked, in the details dialog", async () => {
        const fetchImplementation = vi.fn((url: RequestInfo | URL) =>
            Promise.resolve(
                new Response(
                    JSON.stringify(
                        String(url).includes("details")
                            ? {
                                  ip: "127.0.0.1",
                                  userAgent: "agent",
                                  indexerSearches: [],
                              }
                            : {
                                  content: [
                                      {
                                          ...entry(),
                                          query: undefined,
                                          title: "Trading Places",
                                          identifiers: [
                                              {
                                                  identifierKey: "IMDB",
                                                  identifierValue: "0086190",
                                              },
                                          ],
                                      },
                                  ],
                                  totalElements: 1,
                              },
                    ),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        renderPage(fetchImplementation);
        const row = await screen.findByTestId("search-history-row");
        expect(within(row).queryByText("IMDB ID:")).not.toBeInTheDocument();
        expect(within(row).queryByText("0086190")).not.toBeInTheDocument();

        fireEvent.click(within(row).getByTestId("search-history-details"));
        const requestDetails = await screen.findByRole("table", {
            name: "Search request details",
        });
        expect(within(requestDetails).getByText("IMDB ID")).toBeVisible();
        expect(
            within(requestDetails).getByRole("link", {name: "0086190"}),
        ).toHaveAttribute("href", "https://www.imdb.com/title/tt0086190");
        // And the criteria the row does still show are in the dialog too, so
        // one surface holds the entire request.
        for (const [label, value] of [
            ["Size", "100 MB - 500 MB"],
            ["Age", "2 days - 10 days"],
            ["Selected indexers", "Configured, Mock"],
        ]) {
            const cell = within(requestDetails).getByText(label);
            expect(cell.closest("tr")).toHaveTextContent(value);
        }
    });

    /*
     * FM-174: a bounded search used to write four row lines for two facts
     * ("Minimum size", "Maximum size", "Minimum age", "Maximum age"), and an
     * empty `selectedIndexers` -- the ordinary "searched everything enabled"
     * case -- claimed "Selected indexers: None", the opposite of what
     * happened.
     */
    it("should render size and age as one line each and omit selected indexers when none were chosen", async () => {
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        renderPage(
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        content: [
                            {
                                ...entry(),
                                id: 1,
                                maxSize: undefined,
                                minAge: undefined,
                                selectedIndexers: [],
                            },
                            {
                                ...entry(),
                                id: 2,
                                minSize: undefined,
                                maxAge: undefined,
                                selectedIndexers: undefined,
                            },
                        ],
                        totalElements: 2,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        await screen.findAllByTestId("search-history-row");
        const [openEnded, closedEnded] =
            screen.getAllByTestId("search-history-row");

        expect(within(openEnded).getByText("Size:")).toBeVisible();
        expect(within(openEnded).getByText("at least 100 MB")).toBeVisible();
        expect(within(openEnded).getByText("up to 10 days")).toBeVisible();
        expect(
            within(openEnded).queryByText("Selected indexers:"),
        ).not.toBeInTheDocument();
        expect(within(openEnded).queryByText("None")).not.toBeInTheDocument();

        expect(within(closedEnded).getByText("up to 500 MB")).toBeVisible();
        expect(within(closedEnded).getByText("at least 2 days")).toBeVisible();
        expect(
            within(closedEnded).queryByText("Selected indexers:"),
        ).not.toBeInTheDocument();

        // The copy text says exactly what the cell says.
        fireEvent.click(
            within(openEnded).getByRole("button", {
                name: "Copy additional parameters",
            }),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenLastCalledWith(
                "Size: at least 100 MB\nAge: up to 10 days",
            ),
        );
    });

    it("should provide accessible empty and failure states", async () => {
        const {unmount} = renderPage(
            vi
                .fn()
                .mockResolvedValue(
                    new Response(
                        JSON.stringify({content: [], totalElements: 0}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                ),
        );
        expect(
            await screen.findByText(
                "No search history entries match the current filters.",
            ),
        ).toBeVisible();
        unmount();
        renderPage(
            vi.fn().mockResolvedValue(new Response("failed", {status: 500})),
        );
        expect(
            await screen.findByText("Unable to load search history."),
        ).toBeVisible();
    });

    /*
     * A filtered-empty page used to be a dead end: the notice named the
     * filters but offered nothing to do about them, and on a narrow viewport
     * the refine surface that holds them is collapsed. The unfiltered empty
     * page has nothing to clear, and must not offer to.
     */
    it("should offer to clear the filters that emptied the page, and only then", async () => {
        const fetchImplementation = vi.fn(
            (_url: RequestInfo | URL, init?: RequestInit) => {
                const body = JSON.parse((init?.body ?? "{}") as string) as {
                    filterModel?: Record<string, unknown>;
                };
                const filtered = Object.keys(body.filterModel ?? {}).length > 0;
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            content: filtered ? [] : [entry()],
                            totalElements: filtered ? 0 : 1,
                        }),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            },
        );
        renderPage(fetchImplementation);
        await screen.findByTestId("search-history-row");
        // Nothing is filtered, so there is nothing to clear.
        expect(
            screen.queryByRole("button", {name: "Clear filters"}),
        ).toBeNull();

        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "nothing-matches-this"},
        });
        await screen.findByText(
            "No search history entries match the current filters.",
        );

        fireEvent.click(
            await screen.findByRole("button", {name: "Clear filters"}),
        );

        expect(await screen.findByTestId("search-history-row")).toBeVisible();
        expect(screen.getByLabelText("Query")).toHaveValue("");
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "No active filters",
        );
    });

    /**
     * ADR-0046: the three history views are one refine concept, so the docked
     * column's collapsed state is one preference under `hydra.history.refine`
     * rather than one per view. This spans two of them deliberately -- and the
     * second mount is also what a reload does, since each view reads the
     * preference when its own surface mounts.
     */
    it("should keep the docked column collapsed on another history view and across a reload", async () => {
        const store = stubWorkingLocalStorage();
        renderPage(
            vi
                .fn()
                .mockResolvedValue(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 1}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                ),
        );
        await screen.findByTestId("search-history-row");
        const collapse = screen.getByTestId("history-refine-toggle");
        expect(collapse).toHaveAttribute("aria-expanded", "true");
        fireEvent.click(collapse);
        expect(collapse).toHaveAttribute("aria-expanded", "false");
        expect(store.get("hydra.history.refine")).toBe("collapsed");
        cleanup();

        renderNotificationPage(
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        content: [notificationEntry()],
                        totalElements: 1,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        await screen.findByTestId("notification-history-row");
        expect(screen.getByTestId("history-refine-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );
        // One key, and only that one: the sub-768px drawer's open state is
        // never written, so nothing else was persisted along the way.
        expect([...store.keys()]).toEqual(["hydra.history.refine"]);
    });

    it("should carry the filter, the sort, and the page in the URL and restore them on a fresh mount", async () => {
        const requests: RequestInit[] = [];
        const respond = (collected: RequestInit[]) =>
            vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) collected.push(init);
                return Promise.resolve(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 30}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            });
        const {router} = renderPage(respond(requests));
        await screen.findByTestId("search-history-row");
        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "avengers"},
        });
        fireEvent.click(screen.getByRole("button", {name: "Query"}));
        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() =>
            expect(
                screen.getByTestId("search-history-page-status"),
            ).toHaveTextContent("Page 2 of 2"),
        );
        const href = router.history.location.href;
        const filtered = href.slice(href.indexOf("?"));
        // Legible, and only what is not at its default: no `limit`, no
        // `dir=desc`, no `page=1`.
        expect(decodeURIComponent(filtered)).toBe(
            "?sort=query&dir=asc&page=2&ft.query=avengers",
        );
        const before = JSON.parse(requests.at(-1)?.body as string);
        expect(before).toMatchObject({
            page: 2,
            sortModel: {column: "query", sortMode: 1},
            filterModel: {
                query: {filterType: "freetext", filterValue: "avengers"},
            },
        });

        // The link on its own is the whole view: a fresh mount at that URL
        // reads the same page, with a byte-identical request behind it.
        cleanup();
        const reloaded: RequestInit[] = [];
        renderPage(respond(reloaded), {search: filtered});
        await screen.findByTestId("search-history-row");
        expect(JSON.parse(reloaded[0]?.body as string)).toEqual(before);
        expect(
            screen.getByTestId("search-history-page-status"),
        ).toHaveTextContent("Page 2 of 2");
        expect(screen.getByLabelText("Query")).toHaveValue("avengers");
        expect(
            screen.getByRole("columnheader", {name: "Query"}),
        ).toHaveAttribute("aria-sort", "ascending");
    });

    it("should carry a chosen page size in the URL, resetting to page 1 in one navigation", async () => {
        const requests: RequestInit[] = [];
        const respond = (collected: RequestInit[]) =>
            vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) collected.push(init);
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            content: [entry()],
                            totalElements: 300,
                        }),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            });
        const {router} = renderPage(respond(requests), {search: "?page=4"});
        await screen.findByTestId("search-history-row");
        expect(
            screen.getByTestId("search-history-page-status"),
        ).toHaveTextContent("Page 4 of 12 · 300 searches");
        expect(JSON.parse(requests.at(-1)?.body as string)).toMatchObject({
            page: 4,
            limit: 25,
        });
        const entriesBefore = router.history.length;

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Rows per page"}),
        );
        fireEvent.click(
            within(await screen.findByRole("listbox")).getByRole("option", {
                name: "100",
            }),
        );
        await waitFor(() =>
            expect(
                screen.getByTestId("search-history-page-status"),
            ).toHaveTextContent("Page 1 of 3 · 300 searches"),
        );
        // Page 4 of 25-row pages is past the end of the same history read 100
        // at a time, so the size change returns to page 1 -- and does it in the
        // one history entry the reader can go Back over.
        const href = router.history.location.href;
        expect(decodeURIComponent(href.slice(href.indexOf("?")))).toBe(
            "?size=100",
        );
        expect(router.history.length).toBe(entriesBefore + 1);
        expect(JSON.parse(requests.at(-1)?.body as string)).toMatchObject({
            page: 1,
            limit: 100,
        });

        // The link is the whole view: a fresh mount at that URL reads the same
        // 100 rows without being told again.
        cleanup();
        const reloaded: RequestInit[] = [];
        renderPage(respond(reloaded), {search: "?size=100"});
        await screen.findByTestId("search-history-row");
        expect(JSON.parse(reloaded[0]?.body as string)).toMatchObject({
            page: 1,
            limit: 100,
        });
        expect(
            screen.getByRole("combobox", {name: "Rows per page"}),
        ).toHaveTextContent("100");
    });

    it("should fall back to the default page size for a size the UI does not offer", async () => {
        const requests: RequestInit[] = [];
        renderPage(
            vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) requests.push(init);
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            content: [entry()],
                            totalElements: 300,
                        }),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            }),
            {search: "?size=75"},
        );
        await screen.findByTestId("search-history-row");
        expect(JSON.parse(requests[0]?.body as string)).toMatchObject({
            limit: 25,
        });
        expect(
            screen.getByRole("combobox", {name: "Rows per page"}),
        ).toHaveTextContent("25");
    });

    it("should restore the filtered view when the reader comes Back to it", async () => {
        const {router} = renderPage(
            vi.fn(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 30}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                ),
            ),
        );
        await screen.findByTestId("search-history-row");
        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "avengers"},
        });
        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() =>
            expect(
                screen.getByTestId("search-history-page-status"),
            ).toHaveTextContent("Page 2 of 2"),
        );
        const filtered = router.history.location.href;

        // "Repeat" leaves for the search route; before FM-165 the whole
        // filtered, paged view was gone the moment it did.
        fireEvent.click(screen.getByTestId("search-history-repeat"));
        await screen.findByTestId("elsewhere");
        router.history.go(-1);
        await screen.findByTestId("search-history-row");
        expect(router.history.location.href).toBe(filtered);
        expect(
            screen.getByTestId("search-history-page-status"),
        ).toHaveTextContent("Page 2 of 2");
        expect(screen.getByLabelText("Query")).toHaveValue("avengers");
    });
});

function notificationEntry() {
    return {
        id: 1,
        time: "2024-01-01T00:00:00Z",
        notificationEventType: "INDEXER_DISABLED",
        messageType: "WARNING",
        title: "Indexer disabled",
        body: "NZBHydra: Indexer Mock1 was disabled.",
        urls: "json://localhost",
        displayed: false,
    };
}

function entry() {
    return {
        id: 1,
        time: "2024-01-01T00:00:00Z",
        categoryName: "All",
        source: "INTERNAL",
        query: "query",
        minAge: 2,
        maxAge: 10,
        minSize: 100,
        maxSize: 500,
        selectedIndexers: ["Configured", "Mock"],
        identifiers: [],
        userAgent: "agent",
        username: "user",
        ip: "127.0.0.1",
    };
}
