import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
} from "@tanstack/react-router";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {useCallback} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {
    HistoryDimension,
    HistoryFilterValues,
} from "../../../api/history/filters";
import type {HistoryPage, HistoryQuery} from "../../../api/history/request";
import {
    createHistorySearchSchema,
    defaultHistorySort,
} from "./historySearchParams";
import {useHistoryPage} from "./useHistoryPage";

const SORT_COLUMNS = ["time", "title"] as const;
type Column = (typeof SORT_COLUMNS)[number];

const defaultSort = defaultHistorySort<Column>("time");

const titleDimension: HistoryDimension = {
    kind: "freetext",
    id: "title",
    column: "title",
    label: "Title",
};

const extraDimension: HistoryDimension = {
    kind: "freetext",
    id: "extra",
    column: "extra",
    label: "Extra",
};

type Entry = {id: number};

/**
 * The hook's whole surface, kept in a mutable box so a case can drive it (a
 * sort click, a page-size change, a filter edit) and then read what the next
 * render produced -- the same thing a page does with it, without a page.
 */
function renderHistoryPage(options: {
    fetchPage?: (
        query: HistoryQuery,
        signal: AbortSignal,
    ) => Promise<HistoryPage<Entry>>;
    /** Declares `extra` as soon as a title filter is in flight. */
    dimensionsFollowValues?: boolean;
    search?: string;
}) {
    const seen: {query: HistoryQuery; signal: AbortSignal}[] = [];
    const fetchPage =
        options.fetchPage ??
        ((query: HistoryQuery, signal: AbortSignal) => {
            seen.push({query, signal});
            return Promise.resolve({
                entries: [{id: 1}],
                totalElements: 1,
                malformedCount: 0,
            });
        });
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    function Probe() {
        const dimensions = useCallback(
            (values: HistoryFilterValues) =>
                options.dimensionsFollowValues && values.title
                    ? [titleDimension, extraDimension]
                    : [titleDimension],
            [],
        );
        const state = useHistoryPage({
            defaultSort,
            dimensions,
            fetchPage,
            queryKeyPrefix: "probe-history",
            sortColumns: SORT_COLUMNS,
        });
        return (
            <div>
                <div data-testid="phase">
                    {state.query.isPending
                        ? "pending"
                        : state.query.isFetching
                          ? "settled fetching"
                          : "settled"}
                </div>
                <div data-testid="dimensions">
                    {state.dimensions
                        .map((dimension) => dimension.id)
                        .join(",")}
                </div>
                <div data-testid="active-filters">
                    {state.activeFilterCount}
                </div>
                <div data-testid="entries">
                    {(state.query.data?.entries ?? [])
                        .map((entry) => entry.id)
                        .join(",")}
                </div>
                <button
                    data-testid="sort-title"
                    onClick={() => state.updateSort("title")}
                >
                    Sort by title
                </button>
                <button
                    data-testid="size-100"
                    onClick={() => state.changePageSize(100)}
                >
                    100 per page
                </button>
                <button data-testid="page-2" onClick={() => state.goToPage(2)}>
                    Page 2
                </button>
                <button
                    data-testid="filter-title"
                    onClick={() =>
                        state.updateFilter("title", {
                            kind: "freetext",
                            text: "avengers",
                        })
                    }
                >
                    Filter by title
                </button>
            </div>
        );
    }
    const rootRoute = createRootRoute();
    const pageRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/history",
        validateSearch: createHistorySearchSchema(SORT_COLUMNS),
        component: Probe,
    });
    const router = createRouter({
        history: createMemoryHistory({
            initialEntries: [`/history${options.search ?? ""}`],
        }),
        routeTree: rootRoute.addChildren([pageRoute]),
    });
    render(
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
    return {queryClient, router, seen};
}

describe("useHistoryPage", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("should read the route's page, size and sort and pass them to the route's own fetcher with the query's abort signal", async () => {
        const {seen} = renderHistoryPage({
            search: "?page=3&size=50&sort=title&dir=asc&ft.title=avengers",
        });
        await waitFor(() => expect(seen).toHaveLength(1));
        expect(seen[0].query).toEqual({
            dimensions: [titleDimension],
            values: {title: {kind: "freetext", text: "avengers"}},
            page: 3,
            limit: 50,
            sort: {column: "title", sortMode: 1},
        });
        // The signal comes from React Query itself (backlog item 19): a page
        // that changes its key or unmounts cancels the read in flight.
        expect(seen[0].signal).toBeInstanceOf(AbortSignal);
    });

    it("should key the query on the filter model rather than on the raw values", async () => {
        const {queryClient} = renderHistoryPage({
            search: "?ft.title=avengers",
        });
        await screen.findByText("settled");
        const [entry] = queryClient.getQueryCache().getAll();
        expect(entry.queryKey).toEqual([
            "probe-history",
            1,
            25,
            {title: {filterType: "freetext", filterValue: "avengers"}},
            {column: "time", sortMode: 2},
        ]);
    });

    it("should rebuild the dimensions from the filter values in flight", async () => {
        renderHistoryPage({dimensionsFollowValues: true});
        await screen.findByText("settled");
        expect(screen.getByTestId("dimensions")).toHaveTextContent("title");
        fireEvent.click(screen.getByTestId("filter-title"));
        // Before any commit: the dimension set follows the edit, which is what
        // lets search history's user-agent column appear with its filter.
        expect(screen.getByTestId("dimensions")).toHaveTextContent(
            "title,extra",
        );
    });

    it("should count only the committed filters as active", async () => {
        renderHistoryPage({search: "?ft.title=avengers"});
        await screen.findByText("settled");
        expect(screen.getByTestId("active-filters")).toHaveTextContent("1");
    });

    it("should toggle the sort direction into the URL and leave the default ordering out of it", async () => {
        const {router} = renderHistoryPage({});
        await screen.findByText("settled");
        fireEvent.click(screen.getByTestId("sort-title"));
        await waitFor(() =>
            expect(router.state.location.search).toEqual({
                sort: "title",
                dir: "asc",
            }),
        );
        // The second click flips to descending, which is the shared default
        // direction and so leaves no `dir` parameter behind.
        fireEvent.click(screen.getByTestId("sort-title"));
        await waitFor(() =>
            expect(router.state.location.search).toEqual({sort: "title"}),
        );
    });

    it("should return to the first page when the page size changes", async () => {
        const {router} = renderHistoryPage({search: "?page=4"});
        await screen.findByText("settled");
        fireEvent.click(screen.getByTestId("size-100"));
        await waitFor(() =>
            expect(router.state.location.search).toEqual({size: 100}),
        );
    });

    it("should keep the previous page rendered while the next key loads", async () => {
        let resolveSecond: ((page: HistoryPage<Entry>) => void) | undefined;
        let call = 0;
        const fetchPage = vi.fn(() => {
            call += 1;
            if (call === 1) {
                return Promise.resolve({
                    entries: [{id: 1}],
                    totalElements: 2,
                    malformedCount: 0,
                });
            }
            return new Promise<HistoryPage<Entry>>((resolve) => {
                resolveSecond = resolve;
            });
        });
        renderHistoryPage({fetchPage});
        await screen.findByText("settled");
        fireEvent.click(screen.getByTestId("page-2"));
        await screen.findByText("settled fetching");
        // `placeholderData: keepPreviousData`: the page keeps its rows (and so
        // its refine surface, and so keyboard focus) while the next read runs,
        // rather than falling back to the first-load spinner.
        expect(screen.getByTestId("entries")).toHaveTextContent("1");
        act(() =>
            resolveSecond?.({
                entries: [{id: 2}],
                totalElements: 2,
                malformedCount: 0,
            }),
        );
        await waitFor(() =>
            expect(screen.getByTestId("entries")).toHaveTextContent("2"),
        );
    });
});
