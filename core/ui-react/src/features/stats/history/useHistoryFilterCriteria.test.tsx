import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    RouterProvider,
    useNavigate,
} from "@tanstack/react-router";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import type {HistoryFilterValues} from "../../../api/history/filters";
import {
    createHistorySearchSchema,
    defaultHistorySort,
    historyFilterParams,
    historyFilterValuesFromSearch,
    historyPageFromSearch,
    historySortFromSearch,
    withHistoryCriteria,
    withHistorySort,
    SEARCH_HISTORY_SORT_COLUMNS,
} from "./historySearchParams";
import {useHistoryFilterCriteria} from "./useHistoryFilterCriteria";

const defaultSort = defaultHistorySort("time");
const validateSearch = createHistorySearchSchema(SEARCH_HISTORY_SORT_COLUMNS);

/**
 * A stand-in for the three history pages: the same six members of the hook's
 * contract, driven through controls rather than through a table, so what is
 * being proven here is the mechanism and not any one page's markup.
 */
function Probe() {
    const {
        clearFilters,
        commitFilters,
        criteria,
        goToPage,
        updateFilter,
        values,
    } = useHistoryFilterCriteria();
    const navigate = useNavigate();
    const query = values.query;
    return (
        <div>
            <output data-testid="criteria">{JSON.stringify(criteria)}</output>
            <output data-testid="values">{JSON.stringify(values)}</output>
            <input
                aria-label="Query"
                onChange={(event) =>
                    updateFilter("query", {
                        kind: "freetext",
                        text: event.target.value,
                    })
                }
                value={query?.kind === "freetext" ? query.text : ""}
            />
            <button onClick={clearFilters}>Clear</button>
            <button onClick={() => commitFilters()}>Commit</button>
            <button onClick={() => goToPage(2)}>Page 2</button>
            <button onClick={() => goToPage(1)}>Page 1</button>
            <button
                onClick={() =>
                    commitFilters((previous) =>
                        withHistorySort(
                            previous,
                            {column: "query", sortMode: 1},
                            defaultSort,
                        ),
                    )
                }
            >
                Sort by query
            </button>
            <button onClick={() => void navigate({to: "/"})}>Leave</button>
        </div>
    );
}

function renderProbe(search = "") {
    const rootRoute = createRootRoute();
    const elsewhereRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        component: () => <div data-testid="elsewhere">Elsewhere</div>,
    });
    const pageRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/stats/searches",
        validateSearch,
        component: Probe,
    });
    const router = createRouter({
        basepath: "/hydra",
        history: createMemoryHistory({
            initialEntries: [`/hydra/stats/searches${search}`],
        }),
        routeTree: rootRoute.addChildren([elsewhereRoute, pageRoute]),
    });
    render(<RouterProvider router={router} />);
    return {router};
}

function criteriaOf() {
    return JSON.parse(screen.getByTestId("criteria").textContent ?? "") as {
        page: number;
        values: HistoryFilterValues;
    };
}

/** The raw query string, as a reader would read it out of the address bar. */
function urlOf(router: ReturnType<typeof renderProbe>["router"]) {
    return decodeURIComponent(router.history.location.href).replace(
        "/hydra/stats/searches",
        "",
    );
}

async function typeQuery(text: string) {
    fireEvent.change(screen.getByLabelText("Query"), {target: {value: text}});
    await waitFor(() =>
        expect(criteriaOf().values).toEqual({
            query: {kind: "freetext", text},
        }),
    );
}

describe("history search parameters", () => {
    afterEach(cleanup);

    it("should render a link with no parameters exactly as it did before", async () => {
        const {router} = renderProbe();
        await screen.findByTestId("criteria");
        // The whole point of omitting defaults: an unparameterized URL is
        // still the pristine first page, and it stays unparameterized.
        expect(criteriaOf()).toEqual({page: 1, values: {}});
        expect(
            historySortFromSearch(
                router.state.location.search,
                SEARCH_HISTORY_SORT_COLUMNS,
                defaultSort,
            ),
        ).toEqual(defaultSort);
        expect(urlOf(router)).toBe("");
    });

    it("should fall back per parameter instead of rejecting a stale URL", async () => {
        const {router} = renderProbe(
            "?page=nonsense&sort=no_such_column&dir=sideways" +
                "&ft.=&nr.age.middle=3&zz.mystery=1&cb.gone=",
        );
        await screen.findByTestId("criteria");
        // Every parameter above is unusable in a different way -- an
        // out-of-vocabulary sort column, a direction that is neither, a range
        // bound that names no end, a prefix from no filter kind, an empty
        // selection. None of them is an error; each falls back to its default.
        expect(criteriaOf()).toEqual({page: 1, values: {}});
        expect(
            historySortFromSearch(
                router.state.location.search,
                SEARCH_HISTORY_SORT_COLUMNS,
                defaultSort,
            ),
        ).toEqual(defaultSort);
    });

    it("should keep the page, sort, and filter it wrote, and drop them again at their defaults", async () => {
        const {router} = renderProbe();
        await screen.findByTestId("criteria");
        await typeQuery("avengers");
        fireEvent.click(screen.getByRole("button", {name: "Sort by query"}));
        await waitFor(() =>
            expect(router.state.location.search).toMatchObject({
                sort: "query",
                dir: "asc",
            }),
        );
        fireEvent.click(screen.getByRole("button", {name: "Page 2"}));
        await waitFor(() => expect(criteriaOf().page).toBe(2));
        expect(urlOf(router)).toBe(
            "?sort=query&dir=asc&page=2&ft.query=avengers",
        );

        // Back to page 1: the parameter leaves rather than being written as
        // its own default.
        fireEvent.click(screen.getByRole("button", {name: "Page 1"}));
        await waitFor(() => expect(criteriaOf().page).toBe(1));
        expect(urlOf(router)).toBe("?sort=query&dir=asc&ft.query=avengers");
        fireEvent.click(screen.getByRole("button", {name: "Clear"}));
        await waitFor(() => expect(criteriaOf().values).toEqual({}));
        expect(urlOf(router)).toBe("?sort=query&dir=asc");
    });

    it("should leave one history entry for a burst of typing, and one per deliberate act", async () => {
        const {router} = renderProbe();
        await screen.findByTestId("criteria");
        const start = router.history.length;

        // Three keystrokes, each committed on its own: a debounced commit
        // replaces, so the reader has one entry to go Back past rather than
        // one per character.
        await typeQuery("a");
        await typeQuery("av");
        await typeQuery("ave");
        expect(router.history.length).toBe(start);

        // Each of the deliberate acts is its own entry.
        fireEvent.click(screen.getByRole("button", {name: "Page 2"}));
        await waitFor(() => expect(criteriaOf().page).toBe(2));
        expect(router.history.length).toBe(start + 1);
        fireEvent.click(screen.getByRole("button", {name: "Sort by query"}));
        await waitFor(() =>
            expect(router.state.location.search).toMatchObject({sort: "query"}),
        );
        expect(router.history.length).toBe(start + 2);
        fireEvent.click(screen.getByRole("button", {name: "Clear"}));
        await waitFor(() => expect(criteriaOf().values).toEqual({}));
        expect(router.history.length).toBe(start + 3);
    });

    it("should not push an entry for a commit that changes nothing", async () => {
        const {router} = renderProbe();
        await screen.findByTestId("criteria");
        const start = router.history.length;
        fireEvent.click(screen.getByRole("button", {name: "Commit"}));
        fireEvent.click(screen.getByRole("button", {name: "Clear"}));
        await waitFor(() => expect(criteriaOf().values).toEqual({}));
        expect(router.history.length).toBe(start);
    });

    it("should restore the filtered view when the reader comes Back to it", async () => {
        const {router} = renderProbe();
        await screen.findByTestId("criteria");
        await typeQuery("avengers");
        fireEvent.click(screen.getByRole("button", {name: "Page 2"}));
        await waitFor(() => expect(criteriaOf().page).toBe(2));
        const filtered = urlOf(router);

        fireEvent.click(screen.getByRole("button", {name: "Leave"}));
        await screen.findByTestId("elsewhere");

        router.history.go(-1);
        await screen.findByTestId("criteria");
        await waitFor(() =>
            expect(criteriaOf()).toEqual({
                page: 2,
                values: {query: {kind: "freetext", text: "avengers"}},
            }),
        );
        expect(urlOf(router)).toBe(filtered);
        // The controls follow the URL back, not just the query key.
        expect(screen.getByLabelText("Query")).toHaveValue("avengers");
    });

    /*
     * FM-165's draft/arrival guard, pinned branch by branch. `external` is
     * `search !== draft.from && !historySearchEqual(committedParams,
     * draft.base)`, and each half decides a different render:
     *
     *   - the identity half owns the render *between* a commit and the router
     *     answering it, where the search has not moved yet but the draft's
     *     base already names what was written;
     *   - the content half owns a real arrival, where the search moved to
     *     filters this hook did not write.
     */
    it("should keep a just-committed edit while the router catches up", async () => {
        const {router} = renderProbe();
        await screen.findByTestId("criteria");
        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "avengers"},
        });

        // No await, deliberately. `commit` writes the draft's new base
        // synchronously while its navigation is still in flight, so the render
        // this click produces reads a search object that still carries the
        // *previous* (empty) filters against a base that names the new ones.
        // Only `external`'s identity clause tells that render apart from an
        // arrival -- on content alone the edit would be rolled back to nothing
        // for as long as the router took to answer.
        fireEvent.click(screen.getByRole("button", {name: "Commit"}));
        expect(screen.getByLabelText("Query")).toHaveValue("avengers");

        await waitFor(() => expect(urlOf(router)).toBe("?ft.query=avengers"));
        expect(screen.getByLabelText("Query")).toHaveValue("avengers");
    });

    it("should roll a pending edit back when the reader arrives from outside", async () => {
        const {router} = renderProbe();
        await screen.findByTestId("criteria");
        await typeQuery("avengers");
        // Clearing is a *push*, so Back from here returns to filters this hook
        // is no longer holding -- which is what makes the arrival external in
        // the sense `external` means: the URL's filters are not the ones the
        // draft was written against.
        fireEvent.click(screen.getByRole("button", {name: "Clear"}));
        await waitFor(() => expect(criteriaOf().values).toEqual({}));

        // Typed but not committed: the debounce is still running when the
        // reader goes Back.
        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "batman"},
        });
        expect(screen.getByLabelText("Query")).toHaveValue("batman");
        router.history.go(-1);

        // The URL that arrived wins over the edit in progress.
        await waitFor(() =>
            expect(criteriaOf().values).toEqual({
                query: {kind: "freetext", text: "avengers"},
            }),
        );
        expect(screen.getByLabelText("Query")).toHaveValue("avengers");

        // And the keystroke left behind does not carry the reader forward
        // again once its debounce would have elapsed (275ms; waited out twice
        // over, since the claim is that nothing happens).
        await new Promise((resolve) => setTimeout(resolve, 600));
        expect(criteriaOf().values).toEqual({
            query: {kind: "freetext", text: "avengers"},
        });
        expect(urlOf(router)).toBe("?ft.query=avengers");
    });

    it("should flush a pending edit into the page change rather than racing it", async () => {
        const {router} = renderProbe();
        await screen.findByTestId("criteria");
        fireEvent.change(screen.getByLabelText("Query"), {
            target: {value: "avengers"},
        });
        // No await: the point is that the page change carries the edit that
        // has not committed yet, in one navigation.
        fireEvent.click(screen.getByRole("button", {name: "Page 2"}));
        await waitFor(() =>
            expect(criteriaOf()).toEqual({
                page: 2,
                values: {query: {kind: "freetext", text: "avengers"}},
            }),
        );
        expect(urlOf(router)).toBe("?page=2&ft.query=avengers");
    });
});

describe("historySearchParams", () => {
    const values: HistoryFilterValues = {
        query: {kind: "freetext", text: "avengers"},
        category: {kind: "checkboxes", selected: ["Movies", "TV"]},
        source: {kind: "boolean", value: "API"},
        age: {kind: "numberRange", min: "10", max: "20"},
        time: {
            kind: "time",
            after: "2024-01-01T00:00",
            before: "2024-02-01T00:00",
        },
    };

    it("should round-trip every filter kind", () => {
        const params = historyFilterParams(values);
        expect(params).toEqual({
            "ft.query": "avengers",
            "cb.category": ["Movies", "TV"],
            "bo.source": "API",
            "nr.age.min": "10",
            "nr.age.max": "20",
            "tm.time.after": "2024-01-01T00:00",
            "tm.time.before": "2024-02-01T00:00",
        });
        expect(historyFilterValuesFromSearch(params)).toEqual(values);
    });

    it("should read a parameter the URL parser already turned into a number or a boolean", () => {
        // `?ft.query=2024&bo.source=true` decodes to a number and a boolean
        // before any of this sees it.
        expect(
            historyFilterValuesFromSearch({
                "ft.query": 2024,
                "bo.source": true,
                "nr.age.min": 10,
            }),
        ).toEqual({
            query: {kind: "freetext", text: "2024"},
            source: {kind: "boolean", value: "true"},
            age: {kind: "numberRange", min: "10", max: ""},
        });
    });

    it("should write no parameter for a filter that filters nothing", () => {
        // The same predicate `historyFilterModel` uses: whitespace, an empty
        // selection and a `boolean` left on "all" are not filters, so they are
        // not URL parameters either (ADR-0016).
        expect(
            historyFilterParams({
                query: {kind: "freetext", text: "   "},
                category: {kind: "checkboxes", selected: []},
                source: {kind: "boolean", value: "all"},
                age: {kind: "numberRange", min: "", max: ""},
            }),
        ).toEqual({});
    });

    it("should survive anything at all in the search object", () => {
        for (const search of [
            undefined,
            null,
            "not an object",
            [],
            {"ft.query": {nested: true}},
            {"cb.category": [1, null, "TV"]},
            {"nr.age": "10"},
            {"tm..after": "2024-01-01T00:00"},
        ]) {
            expect(() => historyFilterValuesFromSearch(search)).not.toThrow();
            expect(() => historyPageFromSearch(search)).not.toThrow();
        }
        expect(
            historyFilterValuesFromSearch({"cb.category": [1, null, "TV"]}),
        ).toEqual({category: {kind: "checkboxes", selected: ["1", "TV"]}});
        expect(historyPageFromSearch({page: 0})).toBe(1);
        expect(historyPageFromSearch({page: 2.5})).toBe(1);
        expect(historyPageFromSearch({page: 3})).toBe(3);
    });

    it("should normalize a URL through the route schema without ever throwing", () => {
        expect(validateSearch({page: 1, sort: "time", dir: "desc"})).toEqual({
            sort: "time",
            dir: "desc",
        });
        expect(
            validateSearch({
                page: "4",
                sort: "no_such_column",
                dir: "sideways",
                "ft.query": "avengers",
                "xx.junk": "1",
            }),
        ).toEqual({"ft.query": "avengers"});
        expect(validateSearch({page: 4, sort: "query", dir: "asc"})).toEqual({
            page: 4,
            sort: "query",
            dir: "asc",
        });
    });

    it("should rewrite only the half of the search it owns", () => {
        const previous = {
            sort: "query",
            dir: "asc",
            page: 5,
            "ft.query": "old",
        };
        expect(
            withHistoryCriteria(previous, {
                page: 1,
                values: {title: {kind: "freetext", text: "new"}},
            }),
        ).toEqual({sort: "query", dir: "asc", "ft.title": "new"});
        expect(
            withHistorySort(
                previous,
                {column: "time", sortMode: 2},
                defaultSort,
            ),
        ).toEqual({page: 5, "ft.query": "old"});
    });
});
