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
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {DownloadHistoryPage} from "./DownloadHistoryPage";
import {
    createHistorySearchSchema,
    DOWNLOAD_HISTORY_SORT_COLUMNS,
} from "./historySearchParams";

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
        indexers: [{name: "zeta"}, {name: "Alpha"}, {name: 7}],
        logging: {historyUserInfoType: "BOTH"},
        dereferer: "https://dereferer.example/?url=$s",
    },
};

/**
 * FM-165: the page reads its page, sort and filters out of the route's search
 * parameters, so every case mounts it behind a real router at a real URL --
 * which is also what lets a round trip be proven by reading the location back.
 * `/` stands in for anywhere else in the application, which the Back case
 * leaves through.
 */
function renderRouted(component: () => ReactNode, search?: string) {
    const rootRoute = createRootRoute();
    const elsewhereRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        component: () => <div data-testid="elsewhere">Elsewhere</div>,
    });
    const pageRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/stats/downloads",
        validateSearch: createHistorySearchSchema(
            DOWNLOAD_HISTORY_SORT_COLUMNS,
        ),
        component,
    });
    const router = createRouter({
        basepath: "/hydra",
        history: createMemoryHistory({
            initialEntries: [`/hydra/stats/downloads${search ?? ""}`],
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
                 * (before deciding whether it renders anything), so the page
                 * under test needs a real provider -- same as the production
                 * tree, which mounts one once for the whole app in
                 * `App.tsx`.
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
    return renderRouted(
        () => (
            <DownloadHistoryPage
                bootstrap={options.bootstrap ?? bootstrap}
                transport={new ApiTransport("/hydra/", fetchImplementation)}
            />
        ),
        options.search,
    );
}

function entry(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        time: "2024-01-01T00:00:00Z",
        status: "CONTENT_DOWNLOAD_SUCCESSFUL",
        accessSource: "INTERNAL",
        age: 3,
        username: "user",
        ip: "127.0.0.1",
        searchResult: {
            id: "42",
            title: "A title",
            indexer: {name: "Mock"},
            details: "https://example.com/nzb",
            downloadType: "NZB",
            indexerGuid: "guid",
        },
        ...overrides,
    };
}

describe("DownloadHistoryPage", () => {
    beforeEach(() => {
        // DirectDownloadActions (C-DOWNLOAD-ACTIONS) resolves its own
        // transport from the global bootstrap rather than a prop.
        window.__NZBHYDRA_BOOTSTRAP__ = {baseUrl: "/hydra/"};
    });
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        delete window.__NZBHYDRA_BOOTSTRAP__;
    });

    it("should refine through the surface while paging, sorting, and refreshing", async () => {
        const requests: RequestInit[] = [];
        const fetchImplementation = vi.fn(
            (_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) requests.push(init);
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
        await screen.findByTestId("download-history-row");
        // The bar is the route's only filter surface: nothing in or above the
        // table header filters any more.
        expect(screen.getAllByTestId("history-refine-bar")).toHaveLength(1);
        const table = screen.getByTestId("download-history-table");
        expect(within(table).queryAllByRole("textbox")).toHaveLength(0);
        expect(within(table).queryAllByRole("combobox")).toHaveLength(0);
        // The "All sources" sentinel selection must render its label, not a
        // blank control: MUI's Select hides the display for a literal
        // empty-string value unless `displayEmpty` is set.
        expect(
            screen.getByRole("combobox", {name: "Source"}),
        ).toHaveTextContent("All sources");

        fireEvent.change(screen.getByLabelText("Title"), {
            target: {value: "example"},
        });
        // Deliberately synchronous from here: awaiting between the typed
        // edit and the sort click would let the filter debounce fire on its
        // own on a slow machine, and this case is about the commit the sort
        // click performs, not about the timer.
        fireEvent.click(screen.getByRole("button", {name: "Title"}));
        // Two reads, not three: the typed "Title" edit is committed by the
        // sort click rather than racing it, so the sort and the filter reach
        // the server in one request (`useHistoryFilterCriteria`).
        await waitFor(() =>
            expect(lastBody()).toMatchObject({
                page: 1,
                sortModel: {column: "title", sortMode: 1},
                filterModel: {
                    title: {filterType: "freetext", filterValue: "example"},
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
            sortModel: {column: "title", sortMode: 1},
            filterModel: {
                title: {filterType: "freetext", filterValue: "example"},
            },
        });

        // Any filter change returns to page 1.
        fireEvent.click(
            screen.getAllByTestId("history-refine-indexer-option")[0],
        );
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(4),
        );
        expect(lastBody()).toMatchObject({
            page: 1,
            filterModel: {
                title: {filterType: "freetext", filterValue: "example"},
                name: {filterType: "checkboxes", filterValue: ["Alpha"]},
            },
        });
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "2 active filters",
        );

        fireEvent.click(screen.getByTestId("download-history-refresh"));
        await waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(5),
        );
    });

    it("should offer every declared dimension, with the configured indexers as options", async () => {
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
        await screen.findByTestId("download-history-row");
        for (const label of [
            "After",
            "Before",
            "Title",
            "Minimum age (days)",
            "Maximum age (days)",
            "Username",
            "IP address",
        ]) {
            expect(screen.getByLabelText(label)).toBeVisible();
        }
        expect(screen.getByRole("combobox", {name: "Source"})).toBeVisible();
        expect(
            screen
                .getAllByTestId("history-refine-indexer-option")
                .map((option) => option.textContent),
        ).toEqual(["Alpha", "zeta"]);
        expect(
            screen
                .getAllByTestId("history-refine-result-option")
                .map((option) => option.textContent),
        ).toContain("Content download successful");
    });

    it("should clear every dimension and return to page 1", async () => {
        const requests: RequestInit[] = [];
        const fetchImplementation = vi.fn(
            (_url: RequestInfo | URL, init?: RequestInit) => {
                if (init) requests.push(init);
                return Promise.resolve(
                    new Response(
                        JSON.stringify({content: [entry()], totalElements: 30}),
                        {headers: {"Content-Type": "application/json"}},
                    ),
                );
            },
        );
        renderPage(fetchImplementation);
        await screen.findByTestId("download-history-row");
        fireEvent.change(screen.getByLabelText("Title"), {
            target: {value: "example"},
        });
        fireEvent.click(
            screen.getAllByTestId("history-refine-result-option")[0],
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
        expect(screen.getByLabelText("Title")).toHaveValue("");
        expect(
            screen.getAllByTestId("history-refine-result-option")[0],
        ).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "No active filters",
        );
    });

    it("should show accessible status text, dereferer-transformed links, an eligible repeat action, and isolate malformed rows", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    content: [entry(), {id: "bad"}],
                    totalElements: 2,
                }),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        renderPage(fetchImplementation);
        const row = await screen.findByTestId("download-history-row");
        expect(
            screen.getByText(
                "1 malformed download history entries were not displayed.",
            ),
        ).toBeVisible();
        expect(row).toHaveTextContent("Content download successful");
        const link = screen.getByRole("link", {name: "A title"});
        expect(link).toHaveAttribute(
            "href",
            "https://dereferer.example/?url=" +
                encodeURIComponent("https://example.com/nzb"),
        );
        const nzbLink = screen.getByTestId("download-nzb");
        expect(nzbLink).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/getnzb/user/42",
        );
        // FM-160: same shared anchor as the results row's icon form — opens
        // in a disposable tab instead of navigating the app in-tab when the
        // backend answers with a cross-origin redirect to the indexer.
        expect(nzbLink).toHaveAttribute("target", "_blank");
        expect(nzbLink).toHaveAttribute("rel", "noopener");
        expect(nzbLink).not.toHaveAttribute("download");
        expect(row).toHaveTextContent("Internal");
        expect(row).toHaveTextContent("user");
        expect(row).toHaveTextContent("127.0.0.1");
        expect(row).toHaveTextContent("3 days");
    });

    it("should copy the title and IP address to the clipboard", async () => {
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    content: [entry()],
                    totalElements: 1,
                }),
                {headers: {"Content-Type": "application/json"}},
            ),
        );
        renderPage(fetchImplementation);
        const row = await screen.findByTestId("download-history-row");
        fireEvent.click(within(row).getByRole("button", {name: "Copy title"}));
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenCalledWith("A title"),
        );
        fireEvent.click(
            within(row).getByRole("button", {name: "Copy IP address"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenLastCalledWith("127.0.0.1"),
        );
        expect(
            await screen.findByText("Copied IP address to clipboard."),
        ).toBeVisible();
    });

    it("should show accessible feedback instead of a repeat action when the entry is not eligible", async () => {
        renderPage(
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        content: [
                            entry({
                                searchResult: {
                                    id: "42",
                                    title: "No guid",
                                    indexerGuid: undefined,
                                },
                            }),
                        ],
                        totalElements: 1,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        await screen.findByTestId("download-history-row");
        expect(screen.getByText("Repeat unavailable")).toBeVisible();
        expect(screen.queryByTestId("download-nzb")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("download-torrent"),
        ).not.toBeInTheDocument();
        expect(screen.getByText("No guid")).toBeVisible();
    });

    it("should render torrent entries with the torrent repeat action", async () => {
        renderPage(
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        content: [
                            entry({
                                searchResult: {
                                    id: "99",
                                    title: "A torrent",
                                    indexerGuid: "guid",
                                    downloadType: "TORRENT",
                                },
                            }),
                        ],
                        totalElements: 1,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        await screen.findByTestId("download-history-row");
        expect(screen.getByTestId("download-torrent")).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/gettorrent/user/99",
        );
    });

    it("should tolerate partial rows with only the required fields present", async () => {
        renderPage(
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        content: [
                            {
                                id: 7,
                                status: "NONE",
                                searchResult: {id: "7", title: "Minimal"},
                            },
                        ],
                        totalElements: 1,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        const row = await screen.findByTestId("download-history-row");
        expect(row).toHaveTextContent("Minimal");
        expect(row).toHaveTextContent("None");
        expect(screen.getByText("Repeat unavailable")).toBeVisible();
    });

    it("should hide the username and IP columns and their refine dimensions when history user info is disabled", async () => {
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
                        indexers: [],
                        logging: {historyUserInfoType: "NONE"},
                    },
                },
            },
        );
        await screen.findByTestId("download-history-row");
        expect(
            screen.queryByRole("columnheader", {name: "Username"}),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("columnheader", {name: "IP address"}),
        ).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("IP address")).not.toBeInTheDocument();
        // No indexer is configured in this variant, so its multi-select
        // section renders nothing rather than an empty group.
        expect(
            screen.queryAllByTestId("history-refine-indexer-option"),
        ).toHaveLength(0);
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
                "No download history entries match the current filters.",
            ),
        ).toBeVisible();
        unmount();
        renderPage(
            vi.fn().mockResolvedValue(new Response("failed", {status: 500})),
        );
        expect(
            await screen.findByText("Unable to load download history."),
        ).toBeVisible();
    });

    it("should carry the filter, the sort, and the page in the URL and restore them on a fresh mount", async () => {
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
        const requests: RequestInit[] = [];
        const {router} = renderPage(respond(requests));
        await screen.findByTestId("download-history-row");
        fireEvent.change(screen.getByLabelText("Minimum age (days)"), {
            target: {value: "10"},
        });
        fireEvent.click(screen.getByRole("button", {name: "Title"}));
        fireEvent.click(screen.getByRole("button", {name: "Next page"}));
        await waitFor(() =>
            expect(
                screen.getByTestId("download-history-page-status"),
            ).toHaveTextContent("Page 2 of 2"),
        );
        const href = router.history.location.href;
        const filtered = href.slice(href.indexOf("?"));
        // Legible, and only what is not at its default: a range writes just
        // the bound the reader filled in. The quotes around `10` are
        // TanStack's serializer keeping a filter value that reads as a number
        // a string, so it decodes back into a text field rather than a number.
        expect(decodeURIComponent(filtered)).toBe(
            '?sort=title&dir=asc&page=2&nr.age.min="10"',
        );
        const before = JSON.parse(requests.at(-1)?.body as string);
        expect(before).toMatchObject({
            page: 2,
            sortModel: {column: "title", sortMode: 1},
            filterModel: {
                age: {filterType: "numberRange", filterValue: {min: "10"}},
            },
        });

        // The link on its own is the whole view: a fresh mount at that URL
        // reads the same page, with a byte-identical request behind it.
        cleanup();
        const reloaded: RequestInit[] = [];
        renderPage(respond(reloaded), {search: filtered});
        await screen.findByTestId("download-history-row");
        expect(JSON.parse(reloaded[0]?.body as string)).toEqual(before);
        expect(
            screen.getByTestId("download-history-page-status"),
        ).toHaveTextContent("Page 2 of 2");
        expect(screen.getByLabelText("Minimum age (days)")).toHaveValue(10);
        expect(
            screen.getByRole("columnheader", {name: "Title"}),
        ).toHaveAttribute("aria-sort", "ascending");
    });
});
