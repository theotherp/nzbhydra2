import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({useNavigate: () => navigate}));

import {ApiTransport} from "../../../api/transport";
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

function renderPage(fetchImplementation: typeof fetch) {
    return render(
        <QueryClientProvider
            client={
                new QueryClient({defaultOptions: {queries: {retry: false}}})
            }
        >
            <SearchHistoryPage
                bootstrap={bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />
        </QueryClientProvider>,
    );
}

describe("SearchHistoryPage", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        navigate.mockReset();
    });

    it("should refine through the bar while paging, sorting, and refreshing", async () => {
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
        // The bar is the route's only filter surface: nothing above the
        // table header filters any more.
        expect(screen.getAllByTestId("history-refine-bar")).toHaveLength(1);
        const table = screen.getByTestId("search-history-table");
        expect(within(table).queryAllByRole("textbox")).toHaveLength(0);

        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "query"},
        });
        await screen.findByRole("button", {name: "Query"});
        fireEvent.click(screen.getByRole("button", {name: "Query"}));
        await screen.findByRole("button", {name: "Next page"});
        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(4),
        );
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
            expect(fetchImplementation).toHaveBeenCalledTimes(5),
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
        expect(
            screen.getByTestId("history-refine-toggle"),
        ).toHaveAccessibleName("Refine 2 active filters");

        await screen.findByTestId("search-history-refresh");
        fireEvent.click(screen.getByTestId("search-history-refresh"));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(6),
        );
    });

    it("should offer After, Before, Query, Category, and Source through the bar, with every selectable category as an option", async () => {
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
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(4),
        );
        fireEvent.click(screen.getByTestId("history-refine-clear-all"));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(5),
        );
        expect(JSON.parse(requests.at(-1)?.body as string)).toMatchObject({
            page: 1,
            filterModel: {},
        });
        expect(screen.getByLabelText("Query")).toHaveValue("");
        expect(
            screen.getAllByTestId("history-refine-category-option")[0],
        ).toHaveAttribute("aria-pressed", "false");
        expect(
            screen.getByTestId("history-refine-toggle"),
        ).toHaveAccessibleName("Refine No active filters");
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
        render(
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                <SearchHistoryPage
                    bootstrap={{
                        ...bootstrap,
                        safeConfig: {
                            ...bootstrap.safeConfig,
                            logging: {historyUserInfoType: "NONE"},
                        },
                    }}
                    transport={
                        new ApiTransport(
                            "/hydra/",
                            vi.fn().mockResolvedValue(
                                new Response(
                                    JSON.stringify({
                                        content: [entry()],
                                        totalElements: 1,
                                    }),
                                    {
                                        headers: {
                                            "Content-Type": "application/json",
                                        },
                                    },
                                ),
                            ),
                        )
                    }
                />
            </QueryClientProvider>,
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
        renderPage(fetchImplementation);
        const row = await screen.findByTestId("search-history-row");
        expect(
            screen.getByText(
                "1 malformed search history entries were not displayed.",
            ),
        ).toBeVisible();
        expect(
            screen.getByRole("columnheader", {name: "Username"}),
        ).toBeVisible();
        for (const [label, value] of [
            ["Minimum age:", "2 days"],
            ["Maximum age:", "10 days"],
            ["Minimum size:", "100 MB"],
            ["Maximum size:", "500 MB"],
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
        fireEvent.click(within(row).getByTestId("search-history-repeat"));
        expect(navigate).toHaveBeenCalledWith({
            to: "/",
            search: {
                category: "All",
                query: "query",
                minage: "2",
                maxage: "10",
                minsize: "100",
                maxsize: "500",
                indexers: "Configured,Mock",
                repeat: "history",
            },
        });
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
});

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
