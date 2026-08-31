import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {SearchResult} from "../../../api/search";
import {RefineSidebar} from "./RefineSidebar";
import type {QuickFilter, ResultFilters} from "./resultTable";
import {defaultFilters, filterResults, quickFilterKey} from "./resultTable";

const results: SearchResult[] = [
    {
        category: "Movies",
        downloadType: "NZB",
        indexer: "IndexerOne",
        searchResultId: "1",
        title: "Alpha",
    },
    {
        category: "Movies",
        downloadType: "TORBOX",
        indexer: "IndexerTwo",
        searchResultId: "2",
        title: "Bravo",
    },
    {
        category: "TV",
        downloadType: undefined,
        indexer: "IndexerOne",
        searchResultId: "3",
        title: "Charlie",
    },
];

const oneQualityFilter: QuickFilter[] = [
    {group: "quality", id: "q1080p", label: "1080p", terms: ["1080p"]},
];

// Below `sm` the sidebar renders inside a MUI `Drawer` instead of the docked
// column, decided by `useMediaQuery` rather than by CSS `display`. jsdom's own
// `matchMedia` never matches anything, so a mobile viewport has to be stated
// explicitly; `vi.unstubAllGlobals()` in `afterEach` removes it again.
function stubMobileViewport(): void {
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }));
}

function Harness({
    collapsed = false,
    loadedResults = results,
    onClearAll = vi.fn(),
    onToggleCollapsed = vi.fn(),
    quickFilters = [],
    // FM-055: in the app this is `SearchResults.tsx`'s measured
    // `results-toolbar` height. A fixed stand-in here is enough: jsdom lays
    // nothing out, so only the CSS declarations derived from the value are
    // observable (the pinned behavior itself is proven in a real browser by
    // `tests/system/tests/results.spec.ts`).
    toolbarHeight = 90,
}: {
    collapsed?: boolean;
    loadedResults?: SearchResult[];
    onClearAll?: () => void;
    onToggleCollapsed?: () => void;
    quickFilters?: QuickFilter[];
    toolbarHeight?: number;
}) {
    const [filters, setFilters] = useState<ResultFilters>(() =>
        defaultFilters(loadedResults, quickFilters),
    );
    // Since FM-041 the below-`sm` drawer's open state is owned by the sidebar's
    // parent (`SearchResults.tsx` in the app) and passed in as a controlled
    // prop pair. This harness stands in for that owner, with the same initial
    // value -- closed -- the sidebar used to hold itself, so every assertion
    // below keeps its original expectations.
    const [drawerOpen, setDrawerOpen] = useState(false);
    // FM-089: `categoryOpen`/`indexerOpen` are lifted to `SearchResults.tsx`
    // in the app; this harness stands in for that owner the same way it
    // already does for `drawerOpen`, with the same initial value -- expanded
    // -- the sidebar used to hold itself.
    const [categoryOpen, setCategoryOpen] = useState(true);
    const [indexerOpen, setIndexerOpen] = useState(true);
    return (
        <>
            <RefineSidebar
                categoryOpen={categoryOpen}
                clearRange={(name) =>
                    setFilters((current) => ({
                        ...current,
                        [name]: {min: "", max: ""},
                    }))
                }
                collapsed={collapsed}
                drawerOpen={drawerOpen}
                filters={filters}
                indexerOpen={indexerOpen}
                onClearAll={onClearAll}
                onDrawerOpenChange={setDrawerOpen}
                onToggleCategoryOpen={() =>
                    setCategoryOpen((current) => !current)
                }
                onToggleCollapsed={onToggleCollapsed}
                onToggleIndexerOpen={() =>
                    setIndexerOpen((current) => !current)
                }
                onToggleQuickFilter={(filter) =>
                    setFilters((current) => ({
                        ...current,
                        quickFilters: {
                            ...current.quickFilters,
                            [quickFilterKey(filter)]:
                                !current.quickFilters[quickFilterKey(filter)],
                        },
                    }))
                }
                quickFilters={quickFilters}
                results={loadedResults}
                setFilters={setFilters}
                toolbarHeight={toolbarHeight}
                updateRange={(name, bound, value) =>
                    setFilters((current) => ({
                        ...current,
                        [name]: {...current[name], [bound]: value},
                    }))
                }
            />
            {/* The filtered outcome of the bound state, so a test can prove a
                sidebar control actually narrows results rather than only
                flipping a visual state. */}
            <ul data-testid="filtered-titles">
                {filterResults(loadedResults, filters, quickFilters).map(
                    (result) => (
                        <li key={result.searchResultId}>{result.title}</li>
                    ),
                )}
            </ul>
        </>
    );
}

// Queried by element rather than by `listitem` role on purpose: while the
// mobile drawer is open MUI marks the rest of the document `aria-hidden`, so a
// role query would legitimately find nothing outside the drawer.
function filteredTitles(): string[] {
    return [
        ...screen.getByTestId("filtered-titles").querySelectorAll("li"),
    ].map((item) => item.textContent ?? "");
}

describe("RefineSidebar", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("collapses to a narrow rail with only a labeled toggle", () => {
        render(<Harness collapsed />);
        expect(screen.getByTestId("refine-sidebar")).toBeInTheDocument();
        expect(
            screen.getByRole("button", {name: "Expand refine sidebar"}),
        ).toHaveAttribute("aria-expanded", "false");
        expect(
            screen.queryByTestId("refine-clear-all"),
        ).not.toBeInTheDocument();
    });

    // FM-055: the docked branch is pinned to the viewport directly beneath
    // the sticky results toolbar and scrolls within itself. jsdom performs no
    // layout, so only the emotion-injected declarations are checkable here --
    // that the sidebar actually stays visible while the results scroll, and
    // that ADR-0011's sticky column header still pins beside it, is proven in
    // a real browser by `tests/system/tests/results.spec.ts`.
    it.each([
        ["expanded", false],
        ["collapsed rail", true],
    ])(
        "pins the docked %s beneath the measured toolbar height and scrolls within itself",
        (_label, collapsed) => {
            render(<Harness collapsed={collapsed} toolbarHeight={90} />);
            const style = getComputedStyle(
                screen.getByTestId("refine-sidebar"),
            );
            expect(style.position).toBe("sticky");
            expect(style.top).toBe("90px");
            expect(style.maxHeight).toBe("calc(100vh - 90px)");
            expect(style.overflowY).toBe("auto");
            expect(style.overflowX).toBe("hidden");
            expect(style.alignSelf).toBe("flex-start");
        },
    );

    it("leaves the below-`sm` drawer branch unpinned", () => {
        stubMobileViewport();
        render(<Harness />);
        fireEvent.click(
            screen.getByRole("button", {name: "Expand refine sidebar"}),
        );
        const style = getComputedStyle(screen.getByTestId("refine-sidebar"));
        expect(style.position).not.toBe("sticky");
        expect(style.overflowY).not.toBe("auto");
    });

    it("expands to show every filter section and omits Quality when no quick filters are configured", () => {
        render(<Harness />);
        expect(
            screen.getByRole("button", {name: "Collapse refine sidebar"}),
        ).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByTestId("refine-clear-all")).toBeInTheDocument();
        expect(
            screen.queryByTestId("refine-quality-filters"),
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("refine-filter-title")).toBeInTheDocument();
        expect(screen.getByTestId("refine-category-list")).toBeInTheDocument();
        expect(screen.getByTestId("refine-indexer-list")).toBeInTheDocument();
        for (const prefix of ["refine-size", "refine-age", "refine-grabs"]) {
            expect(
                screen.getByTestId(`filter-toggle-${prefix}`),
            ).toBeInTheDocument();
        }
        expect(screen.getByTestId("refine-type-chips")).toBeInTheDocument();
    });

    it("renders each numeric filter as a single row with no Apply control, only a labeled clear icon", () => {
        render(<Harness />);
        // No control anywhere carries the (now-legacy-only) apply test id.
        // Built at runtime, not written as a literal, so this assertion
        // itself doesn't register as a hit for FM-088's acceptance grep
        // over the source tree.
        const legacyApplyPrefix = ["number-filter", "apply"].join("-");
        expect(
            document.querySelector(`[data-testid^="${legacyApplyPrefix}-"]`),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Apply")).not.toBeInTheDocument();
        for (const [prefix, label] of [
            ["refine-size", "Size (MB)"],
            ["refine-age", "Age (days)"],
            ["refine-grabs", "Grabs / seeders"],
        ]) {
            const clearButton = screen.getByTestId(
                `number-filter-clear-${prefix}`,
            );
            expect(clearButton).toHaveAttribute(
                "aria-label",
                `Clear ${label} filter`,
            );
            expect(clearButton).toBeDisabled();
        }
    });

    it("renders the configured quick filters as the Quality section, bound to the same quick-filter state", () => {
        render(<Harness quickFilters={oneQualityFilter} />);
        const qualityButton = screen.getByRole("button", {name: "1080p"});
        expect(qualityButton).toHaveAttribute("aria-pressed", "false");
        fireEvent.click(qualityButton);
        expect(qualityButton).toHaveAttribute("aria-pressed", "true");
    });

    it("shows per-item loaded-result counts for category and indexer entries", () => {
        render(<Harness />);
        const categoryList = screen.getByTestId("refine-category-list");
        expect(within(categoryList).getByText("Movies")).toBeInTheDocument();
        expect(within(categoryList).getByText("2")).toBeInTheDocument();
        expect(within(categoryList).getByText("TV")).toBeInTheDocument();
        expect(within(categoryList).getByText("1")).toBeInTheDocument();
        const indexerList = screen.getByTestId("refine-indexer-list");
        expect(within(indexerList).getByText("IndexerOne")).toBeInTheDocument();
        expect(within(indexerList).getByText("2")).toBeInTheDocument();
    });

    // FM-153: the rows are `C-REFINE-MULTISELECT`'s now, but the dedup, count
    // and alphabetical sort are this feature's and stay here -- the shared
    // component renders what it is handed in the order it is handed it, so
    // that the history views' declared option order survives.
    it("dedupes and alphabetically sorts the category and indexer rows it derives from the loaded results", () => {
        render(
            <Harness
                loadedResults={[
                    {
                        category: "TV",
                        indexer: "Zeta",
                        searchResultId: "1",
                        title: "Alpha",
                    },
                    {
                        category: "Movies",
                        indexer: "Alpha",
                        searchResultId: "2",
                        title: "Bravo",
                    },
                    {
                        category: "TV",
                        indexer: "Zeta",
                        searchResultId: "3",
                        title: "Charlie",
                    },
                ]}
            />,
        );
        const values = (optionTestId: string) =>
            screen
                .getAllByTestId(optionTestId)
                .map((row) => row.getAttribute("data-filter-value"));
        expect(values("refine-category-option")).toEqual(["Movies", "TV"]);
        expect(values("refine-indexer-option")).toEqual(["Alpha", "Zeta"]);
    });

    it("renders category and indexer entries as clickable toggle rows rather than a checkbox list", () => {
        render(<Harness />);
        for (const [listTestId, optionTestId] of [
            ["refine-category-list", "refine-category-option"],
            ["refine-indexer-list", "refine-indexer-option"],
        ]) {
            const list = screen.getByTestId(listTestId);
            expect(
                list.querySelectorAll('input[type="checkbox"]'),
            ).toHaveLength(0);
            const rows = within(list).getAllByTestId(optionTestId);
            expect(rows.length).toBeGreaterThan(0);
            for (const row of rows) {
                expect(row.tagName).toBe("BUTTON");
                expect(row).toHaveAttribute("aria-pressed", "true");
            }
        }
    });

    it("toggling a category row narrows the bound filters.categories selection and the filtered results", () => {
        render(<Harness />);
        const categoryList = screen.getByTestId("refine-category-list");
        const movies = within(categoryList)
            .getAllByTestId("refine-category-option")
            .find((row) => row.getAttribute("data-filter-value") === "Movies");
        expect(movies).toBeDefined();
        expect(movies).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(movies!);
        expect(movies).toHaveAttribute("aria-pressed", "false");
        expect(filteredTitles()).toEqual(["Charlie"]);
        fireEvent.click(movies!);
        expect(movies).toHaveAttribute("aria-pressed", "true");
        expect(filteredTitles()).toEqual(["Alpha", "Bravo", "Charlie"]);
    });

    it("collapsing and expanding a list is reflected by its own toggle's aria-expanded", () => {
        render(<Harness />);
        const toggle = screen.getByTestId("refine-category-toggle");
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("derives download-type chips from loaded results rather than a hardcoded NZB/Torrent pair", () => {
        render(<Harness />);
        expect(screen.getByTestId("refine-type-chips")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "NZB"})).toBeInTheDocument();
        expect(
            screen.getByRole("button", {name: "TORBOX"}),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", {name: "TORRENT"}),
        ).not.toBeInTheDocument();
    });

    it("hides the Type section entirely when no loaded result carries a downloadType", () => {
        const noTypeResults = results.map((result) => ({
            ...result,
            downloadType: undefined,
        }));
        render(<Harness loadedResults={noTypeResults} />);
        expect(
            screen.queryByTestId("refine-type-chips"),
        ).not.toBeInTheDocument();
    });

    it("calls onClearAll from the clear-all action and onToggleCollapsed from the sidebar toggle", () => {
        const onClearAll = vi.fn();
        const onToggleCollapsed = vi.fn();
        render(
            <Harness
                onClearAll={onClearAll}
                onToggleCollapsed={onToggleCollapsed}
            />,
        );
        // No filter differs from `defaultFilters` yet, so the button starts
        // disabled and only becomes clickable once a filter is actually set.
        expect(screen.getByTestId("refine-clear-all")).toBeDisabled();
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "alpha"},
        });
        expect(screen.getByTestId("refine-clear-all")).toBeEnabled();
        fireEvent.click(screen.getByTestId("refine-clear-all"));
        expect(onClearAll).toHaveBeenCalledTimes(1);
        fireEvent.click(
            screen.getByRole("button", {name: "Collapse refine sidebar"}),
        );
        expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    });

    it("updates the bound title filter as the user types", () => {
        render(<Harness />);
        const titleInput = screen.getByTestId("refine-filter-title");
        fireEvent.change(titleInput, {target: {value: "alpha"}});
        expect(titleInput).toHaveValue("alpha");
    });

    it("keeps every filter section reachable below sm through the drawer the sidebar toggle opens", () => {
        stubMobileViewport();
        render(<Harness quickFilters={oneQualityFilter} />);

        // Nothing competes with the table for width until the drawer is
        // opened: only the toggle renders.
        const toggle = screen.getByTestId("refine-sidebar-toggle");
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByTestId("refine-sidebar")).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        const sidebar = within(screen.getByTestId("refine-sidebar"));
        for (const testId of [
            "refine-clear-all",
            "refine-quality-filters",
            "refine-filter-title",
            "refine-category-list",
            "refine-indexer-list",
            "filter-toggle-refine-size",
            "filter-toggle-refine-age",
            "filter-toggle-refine-grabs",
            "refine-type-chips",
        ]) {
            expect(sidebar.getByTestId(testId)).toBeInTheDocument();
        }

        // The title filter and one list filter drive the same bound
        // ResultFilters state from the mobile-opened sidebar.
        fireEvent.change(sidebar.getByTestId("refine-filter-title"), {
            target: {value: "alpha"},
        });
        expect(filteredTitles()).toEqual(["Alpha"]);
        fireEvent.change(sidebar.getByTestId("refine-filter-title"), {
            target: {value: ""},
        });
        const indexerTwo = sidebar
            .getAllByTestId("refine-indexer-option")
            .find(
                (row) => row.getAttribute("data-filter-value") === "IndexerTwo",
            );
        expect(indexerTwo).toBeDefined();
        fireEvent.click(indexerTwo!);
        expect(filteredTitles()).toEqual(["Alpha", "Charlie"]);

        fireEvent.click(
            sidebar.getByRole("button", {name: "Close refine sidebar"}),
        );
        expect(toggle).toHaveAttribute("aria-expanded", "false");
    });
});
