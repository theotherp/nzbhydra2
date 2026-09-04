import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import type {MockedFunction} from "vitest";
import {afterEach, describe, expect, it, vi} from "vitest";

import {SafeConfigContext} from "../../../bootstrap";
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {FILTER_COMMIT_DELAY_MS} from "./filterControls";
import {SearchResults} from "./SearchResults";

const response = {
    searchResults: [],
    malformedResultCount: 0,
    indexerSearchMetaDatas: [],
    indexerLimitWarnings: [],
    rejectedReasonsMap: {},
    notPickedIndexersWithReason: {},
    numberOfAvailableResults: 0,
    numberOfRejectedResults: 0,
    pagingState: "partial" as const,
};

function renderResults(ui: React.ReactNode) {
    return render(
        <DialogProvider>
            <ToastProvider>{ui}</ToastProvider>
        </DialogProvider>,
    );
}

// This project's jsdom environment has no explicit `url` configured (see
// vite.config.ts), which leaves `window.localStorage` completely
// unavailable in every test in this file (`typeof window.localStorage ===
// "undefined"`, a jsdom "opaque origin" limitation, not a polyfill this
// project ships) -- `getStorage()`'s `window.localStorage` access in
// SearchResults.tsx resolves to `undefined` rather than throwing, so
// `getStorage()?.setItem(...)` silently no-ops. A real round trip through
// persisted state therefore needs a real, working `Storage` for the
// duration of a single test; `vi.stubGlobal("localStorage", ...)` installs
// one and the existing `afterEach`'s `vi.unstubAllGlobals()` removes it
// again automatically.
// The refine sidebar's free-text and numeric filter fields keep the typed
// value local and commit it into the shared `ResultFilters` state on a
// debounce, so the whole filter / sort / group / persist pipeline runs once
// per burst of typing instead of once per keystroke. A test that types into
// one and then asserts on the table has to let that pending commit land.
async function settleFilterCommits(): Promise<void> {
    await act(async () => {
        await new Promise((resolve) =>
            setTimeout(resolve, FILTER_COMMIT_DELAY_MS + 5),
        );
    });
}

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

describe("SearchResults", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        window.localStorage?.clear();
        delete window.__NZBHYDRA_BOOTSTRAP__;
    });

    it("should expose a disabled save action only for an executed search", async () => {
        const onSaveSearch = vi.fn().mockResolvedValue(undefined);
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    searchResults: [
                        {
                            searchResultId: "saved",
                            title: "Saved result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
                onSaveSearch={onSaveSearch}
            />,
        );
        const save = screen.getByRole("button", {name: "Save search"});
        fireEvent.click(save);
        expect(save).toBeEnabled();
        expect(onSaveSearch).toHaveBeenCalledTimes(1);
    });

    it("should render no-picked, all-failed, empty, warning, and rejected states", () => {
        const {rerender} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    notPickedIndexersWithReason: {Mock: "disabled"},
                }}
            />,
        );
        expect(
            screen.getByText("No indexers were picked for this search"),
        ).toBeVisible();
        rerender(
            <SearchResults
                data={{
                    ...response,
                    indexerSearchMetaDatas: [
                        {indexerName: "Mock", wasSuccessful: false},
                    ],
                }}
            />,
        );
        expect(screen.getByText(/Unable to search any indexer/)).toBeVisible();
        rerender(
            <SearchResults
                data={{
                    ...response,
                    indexerSearchMetaDatas: [
                        {indexerName: "Mock", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: ["Near limit"],
                    numberOfRejectedResults: 2,
                }}
            />,
        );
        expect(
            screen.getByText("No results were found for this search"),
        ).toBeVisible();
        expect(screen.getByTestId("indexer-limit-warnings")).toBeVisible();
        // FM-055: the standalone `Rejected N results.` Alert is replaced by
        // the `results-rejected-trigger` inside `search-results-summary` (see
        // the dedicated test below), so no such Alert renders any more.
        expect(screen.queryByText(/^Rejected \d+ results\.$/)).toBeNull();

        // FM-055 review fix: the backend includes rejected items in
        // `numberOfAvailableResults`, so an all-rejected response reports it
        // as `> 0` -- the same value as `numberOfRejectedResults` here --
        // which means the "No results were found" Alert above does *not*
        // fire in this state either (it only fires at exactly 0). With no
        // loaded results and no such Alert, the rejection breakdown is the
        // only information on the page about what happened, so it must stay
        // reachable even though `hasResults` is false.
        rerender(
            <SearchResults
                data={{
                    ...response,
                    indexerSearchMetaDatas: [
                        {indexerName: "Mock", wasSuccessful: true},
                    ],
                    numberOfAvailableResults: 2,
                    numberOfRejectedResults: 2,
                    rejectedReasonsMap: {"Duplicate of another result": 2},
                }}
            />,
        );
        expect(
            screen.queryByText("No results were found for this search"),
        ).toBeNull();
        const allRejectedSummary = screen.getByTestId("search-results-summary");
        const allRejectedTrigger = within(allRejectedSummary).getByTestId(
            "results-rejected-trigger",
        );
        expect(allRejectedTrigger).toHaveTextContent("2 rejected");
        fireEvent.click(allRejectedTrigger);
        expect(
            within(screen.getByTestId("results-rejected-popover")).getByText(
                "Duplicate of another result",
            ),
        ).toBeVisible();
    });

    // FM-055: restores the rejection-reason parity legacy had on the same
    // summary badge (a click-triggered tooltip, `search-results.html:170-190`)
    // and React never rendered.
    it("should open the rejected-reason breakdown from the summary, sorted by count descending", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    numberOfRejectedResults: 98,
                    rejectedReasonsMap: {
                        "Forbidden word: x264": 13,
                        "Duplicate of another result": 61,
                        "Too small: 12 MB < 50 MB": 24,
                    },
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const summary = screen.getByTestId("search-results-summary");
        const trigger = within(summary).getByTestId("results-rejected-trigger");
        expect(trigger).toHaveTextContent("98 rejected");
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(
            screen.queryByTestId("results-rejected-popover"),
        ).not.toBeInTheDocument();

        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute("aria-expanded", "true");
        const popover = screen.getByTestId("results-rejected-popover");
        expect(
            [...popover.querySelectorAll("li")].map((item) => item.textContent),
        ).toEqual([
            "61Duplicate of another result",
            "24Too small: 12 MB < 50 MB",
            "13Forbidden word: x264",
        ]);
    });

    it("should report an empty rejected-reason map without hiding the count", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    numberOfRejectedResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(screen.getByTestId("results-rejected-trigger"));
        expect(
            within(screen.getByTestId("results-rejected-popover")).getByText(
                "No rejection reasons were reported.",
            ),
        ).toBeVisible();
    });

    it("should disable incomplete paging and report continuation failures without concurrent requests", async () => {
        const loadMore = vi.fn().mockRejectedValue(new Error("request failed"));
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    pagingState: "ready",
                    offset: 0,
                    limit: 1,
                    numberOfProcessedResults: 1,
                    numberOfAvailableResults: 2,
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
                }}
                onLoadMore={loadMore}
            />,
        );

        fireEvent.click(screen.getByRole("button", {name: "Load more"}));
        fireEvent.click(screen.getByRole("button", {name: /Loading more/}));
        await screen.findByRole("alert");
        expect(loadMore).toHaveBeenCalledOnce();
        expect(screen.getByText("request failed")).toBeVisible();
    });

    it("should render paging feedback and safe controls without valid result rows", async () => {
        const loadMore = vi.fn().mockRejectedValue(new Error("request failed"));
        const {rerender} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    pagingState: "partial",
                    malformedResultCount: 1,
                }}
                onLoadMore={loadMore}
            />,
        );

        expect(
            screen.getByText("1 malformed result entries were not displayed."),
        ).toBeVisible();
        expect(screen.getByText(/incomplete paging information/)).toBeVisible();
        expect(screen.getByRole("button", {name: "Load more"})).toBeDisabled();

        rerender(
            <SearchResults
                data={{
                    ...response,
                    pagingState: "ready",
                    offset: 0,
                    limit: 1,
                    numberOfProcessedResults: 1,
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Unknown total",
                            wasSuccessful: true,
                            hasMoreResults: true,
                            totalResultsKnown: false,
                        },
                    ],
                }}
                onLoadMore={loadMore}
            />,
        );
        fireEvent.click(screen.getByRole("button", {name: "Load more"}));
        expect(await screen.findByText("request failed")).toBeVisible();
        expect(loadMore).toHaveBeenCalledOnce();
    });

    it("should disable an initial zero paging cursor that claims more results", () => {
        const loadMore = vi.fn();
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    pagingState: "ready",
                    offset: 0,
                    limit: 0,
                    numberOfProcessedResults: 0,
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Mock",
                            wasSuccessful: true,
                            hasMoreResults: true,
                        },
                    ],
                }}
                onLoadMore={loadMore}
            />,
        );

        expect(screen.getByRole("status")).toHaveTextContent(
            "invalid paging cursor",
        );
        const loadMoreButton = screen.getByRole("button", {
            name: "Load more",
        });
        expect(loadMoreButton).toBeDisabled();
        fireEvent.click(loadMoreButton);
        expect(loadMore).not.toHaveBeenCalled();
    });

    it("should preserve result selectors for valid entries", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        expect(screen.getByTestId("search-results-table")).toBeVisible();
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Result",
        );
    });

    it("should alert when malformed rows were skipped", () => {
        renderResults(
            <SearchResults data={{...response, malformedResultCount: 1}} />,
        );
        expect(
            screen.getByText("1 malformed result entries were not displayed."),
        ).toBeVisible();
    });

    it("should sort and filter rows with accessible controls", async () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Zulu WEB",
                            indexer: "One",
                            category: "Movies",
                            size: 5 * 1024 * 1024,
                            grabs: 3,
                            epoch: 1_700_000_000,
                            age: "2 days",
                        },
                        {
                            searchResultId: "2",
                            title: "Alpha BluRay",
                            indexer: "Two",
                            category: "TV",
                            size: 2 * 1024 * 1024,
                            seeders: 8,
                            epoch: 1_600_000_000,
                            age: "3 years",
                        },
                    ],
                }}
            />,
        );
        const titleSort = screen.getByTestId("sort-title");
        expect(titleSort).toHaveAttribute("data-sort-direction", "none");
        fireEvent.click(titleSort);
        expect(titleSort).toHaveAttribute("data-sort-direction", "asc");
        expect(titleSort).toHaveAttribute("aria-label", "Title (ascending)");
        expect(
            screen.getAllByTestId("search-result-title")[0],
        ).toHaveTextContent("Alpha BluRay");
        fireEvent.click(titleSort);
        expect(titleSort).toHaveAttribute("aria-label", "Title (descending)");
        fireEvent.click(titleSort);

        expandRefineSidebar();
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "!web"},
        });
        await settleFilterCommits();
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "/[/"},
        });
        await settleFilterCommits();
        expect(
            screen.queryByTestId("search-result-row"),
        ).not.toBeInTheDocument();

        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: ""},
        });
        await settleFilterCommits();
        expect(
            screen.getByTestId("number-filter-clear-refine-size"),
        ).toBeDisabled();
        fireEvent.change(screen.getByTestId("number-filter-min-refine-size"), {
            target: {value: "4"},
        });
        await settleFilterCommits();
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Zulu WEB",
        );
        expect(
            screen.getByTestId("number-filter-clear-refine-size"),
        ).toBeEnabled();
        fireEvent.click(screen.getByTestId("number-filter-clear-refine-size"));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
        expect(
            screen.getByTestId("number-filter-clear-refine-size"),
        ).toBeDisabled();

        fireEvent.click(refineOption("refine-indexer-option", "One"));
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
    });

    it("should render no inline column-header filter control beside a sortable header", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Zulu WEB",
                            indexer: "One",
                            category: "Movies",
                            size: 5 * 1024 * 1024,
                            grabs: 3,
                            epoch: 1_700_000_000,
                            age: "2 days",
                        },
                        {
                            searchResultId: "2",
                            title: "Alpha BluRay",
                            indexer: "Two",
                            category: "TV",
                            size: 2 * 1024 * 1024,
                            seeders: 8,
                            epoch: 1_600_000_000,
                            age: "3 years",
                        },
                    ],
                }}
            />,
        );

        // FM-034's inline per-column-header filter popovers are removed
        // (ADR-0009: the refine-sidebar is the sole filter surface). No
        // `header-filter-*` or header-scoped `number-filter-*` control
        // survives anywhere in the tree.
        expect(
            document.querySelectorAll(
                '[data-testid^="header-filter-"], [data-testid*="-header-"]',
            ),
        ).toHaveLength(0);
        // Nor do the mobile-only toolbar filter rows the sidebar replaces.
        for (const testId of [
            "results-filters",
            "results-quick-filters",
            "freetext-filter-title",
            "filter-toggle-indexer",
            "filter-toggle-category",
            "number-filter-min-size",
            "number-filter-min-grabs",
            "number-filter-min-age",
        ]) {
            expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        }

        // Each sortable header cell keeps exactly its sort button, its
        // aria-sort state, and its accessible name.
        for (const column of [
            "title",
            "indexer",
            "category",
            "size",
            "grabs",
            "epoch",
        ]) {
            const sort = screen.getByTestId(`sort-${column}`);
            const headerCell = sort.closest("th");
            expect(headerCell).not.toBeNull();
            // The default sort is epoch-descending, so only the accessible
            // sort state's presence is asserted here, not one fixed value.
            expect(headerCell).toHaveAttribute("aria-sort");
            expect(sort).toHaveAttribute("aria-label");
            expect(
                within(headerCell as HTMLElement).getAllByRole("button"),
            ).toHaveLength(1);
        }
    });

    it("should visibly sort every sortable column", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha",
                            indexer: "Beta",
                            category: "TV",
                            size: 5 * 1024 * 1024,
                            seeders: 10,
                            epoch: 3,
                        },
                        {
                            searchResultId: "2",
                            title: "Bravo",
                            indexer: "Alpha",
                            category: "Movies",
                            size: 2 * 1024 * 1024,
                            grabs: 3,
                            epoch: 1,
                        },
                        {
                            searchResultId: "3",
                            title: "Charlie",
                            indexer: "Gamma",
                            category: "Movies",
                            size: 7 * 1024 * 1024,
                            seeders: 7,
                            epoch: 2,
                        },
                    ],
                }}
            />,
        );

        for (const [column, direction, firstTitle] of [
            ["title", "asc", "Alpha"],
            ["indexer", "asc", "Bravo"],
            ["category", "asc", "Bravo"],
            ["size", "desc", "Charlie"],
            ["grabs", "desc", "Alpha"],
            ["epoch", "desc", "Alpha"],
        ]) {
            const sort = screen.getByTestId(`sort-${column}`);
            fireEvent.click(sort);
            expect(sort).toHaveAttribute("data-sort-direction", direction);
            expect(sort.getAttribute("aria-label")).toContain(
                `(${direction === "asc" ? "ascending" : "descending"})`,
            );
            expect(
                screen.getAllByTestId("search-result-title")[0],
            ).toHaveTextContent(firstTitle);
        }
    });

    it("should render configured preselected quick filters", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            safeConfig: {
                searching: {
                    showQuickFilterButtons: true,
                    preselectQuickFilterButtons: ["source|web"],
                },
            },
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "WEB-DL release",
                            indexer: "One",
                            category: "Movies",
                        },
                        {
                            searchResultId: "2",
                            title: "BluRay release",
                            indexer: "Two",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );

        // The preselection already narrows the rows before any surface is
        // opened; the quick-filter controls themselves now live only in the
        // sidebar's Quality section (the mobile-only `results-quick-filters`
        // row is gone).
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "WEB-DL release",
        );
        expandRefineSidebar();
        expect(
            within(screen.getByTestId("refine-quality-filters")).getByRole(
                "button",
                {name: "WEB"},
            ),
        ).toHaveAttribute("aria-pressed", "true");
    });

    it("should expand groups and support keyboard bulk and shift selection", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Example release",
                            indexer: "One",
                            category: "TV",
                            hash: 1,
                        },
                        {
                            searchResultId: "two",
                            title: "Example release",
                            indexer: "Two",
                            category: "TV",
                            hash: 1,
                        },
                        {
                            searchResultId: "three",
                            title: "Other release",
                            indexer: "Three",
                            category: "TV",
                            hash: 2,
                        },
                    ],
                }}
            />,
        );
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
        toggleDuplicateControls();
        const expandDuplicates = screen.getByRole("button", {
            name: "Expand duplicates",
        });
        expandDuplicates.focus();
        fireEvent.keyDown(expandDuplicates, {key: "Enter"});
        const rows = screen.getAllByTestId("search-result-row");
        expect(rows).toHaveLength(3);
        // Scoped to each row's own checkbox: `getAllByRole("checkbox", {name:
        // /Select/})` would also match the header/toolbar tri-state
        // select-all checkboxes ("Select all visible results...").
        const checkboxes = rows.map((row) => within(row).getByRole("checkbox"));
        checkboxes[0].focus();
        fireEvent.keyDown(checkboxes[0], {code: "Space", key: " "});
        checkboxes[2].focus();
        fireEvent.keyDown(checkboxes[2], {
            code: "Space",
            key: " ",
            shiftKey: true,
        });
        expect(checkboxes).toHaveLength(3);
        checkboxes.forEach((checkbox) => expect(checkbox).toBeChecked());
        // Deselect via the header's tri-state checkbox/caret menu (FM-040),
        // which replaced the old flat "Deselect all" toolbar button.
        const headerMenu = screen.getByTestId("header-selection-menu");
        expect(
            within(headerMenu).getByRole("checkbox", {
                name: "Select all visible results",
            }),
        ).toBeChecked();
        fireEvent.click(
            within(headerMenu).getByRole("button", {
                name: "Selection options",
            }),
        );
        fireEvent.click(screen.getByRole("menuitem", {name: "Deselect all"}));
        checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
        expect(
            within(headerMenu).getByRole("checkbox", {
                name: "Select all visible results",
            }),
        ).not.toBeChecked();
    });

    it("should render an indeterminate tri-state header checkbox on partial selection and a fully accessible caret menu", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "First",
                            indexer: "One",
                            category: "All",
                        },
                        {
                            searchResultId: "two",
                            title: "Second",
                            indexer: "Two",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const headerMenu = screen.getByTestId("header-selection-menu");
        const headerCheckbox = within(headerMenu).getByRole("checkbox", {
            name: "Select all visible results",
        });
        expect(headerCheckbox).not.toBeChecked();
        expect(headerCheckbox).toHaveAttribute("data-indeterminate", "false");

        const rows = screen.getAllByTestId("search-result-row");
        fireEvent.click(within(rows[0]).getByRole("checkbox"));
        // Partial selection: indeterminate, not checked. (MUI's Checkbox
        // deliberately does not set the native DOM `.indeterminate`
        // property -- it renders `data-indeterminate` on the input instead;
        // see @mui/material/Checkbox's own doc comment.)
        expect(headerCheckbox).toHaveAttribute("data-indeterminate", "true");
        expect(headerCheckbox).not.toBeChecked();

        fireEvent.click(within(rows[1]).getByRole("checkbox"));
        // Full selection: checked, not indeterminate.
        expect(headerCheckbox).toHaveAttribute("data-indeterminate", "false");
        expect(headerCheckbox).toBeChecked();

        const caret = within(headerMenu).getByRole("button", {
            name: "Selection options",
        });
        expect(caret).toHaveAttribute("aria-haspopup", "menu");
        expect(caret).not.toHaveAttribute("aria-expanded");
        fireEvent.click(caret);
        expect(caret).toHaveAttribute("aria-expanded", "true");
        const menu = screen.getByRole("menu");
        const items = within(menu).getAllByRole("menuitem");
        expect(items.map((item) => item.textContent)).toEqual([
            "Select all",
            "Deselect all",
            "Invert selection",
        ]);
        // Each item has a distinct accessible name.
        expect(new Set(items.map((item) => item.textContent)).size).toBe(3);

        // "Invert selection" produces exactly selectVisibleResults's
        // "invert" outcome, asserted by the resulting selection state, not
        // by the entry merely existing.
        fireEvent.click(
            within(menu).getByRole("menuitem", {name: "Invert selection"}),
        );
        expect(within(rows[0]).getByRole("checkbox")).not.toBeChecked();
        expect(within(rows[1]).getByRole("checkbox")).not.toBeChecked();
    });

    it("should also select visible rows from the toolbar's mobile-reachable selection menu", () => {
        stubMobileViewport();
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "First",
                            indexer: "One",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        // Below 768px the responsive card layout hides `thead` entirely (see
        // the table's `sx` in SearchResults.tsx), so the header's selection
        // menu is unreachable there; the toolbar carries a second,
        // functionally-identical copy so bulk selection stays reachable at
        // that viewport. FM-181 moved it from row 2 (which now exists only
        // while something is selected -- it could not have been the way to
        // make the first selection) into row 1, and put it on the same
        // JavaScript branch as the card layout instead of a CSS switch.
        const toolbarMenu = within(
            screen.getByTestId("results-toolbar"),
        ).getByTestId("toolbar-selection-menu");
        fireEvent.click(
            within(toolbarMenu).getByRole("button", {
                name: "Selection options (mobile)",
            }),
        );
        fireEvent.click(screen.getByRole("menuitem", {name: "Select all"}));
        const row = screen.getByTestId("search-result-row");
        expect(within(row).getByRole("checkbox")).toBeChecked();
        expect(
            within(toolbarMenu).getByRole("checkbox", {
                name: "Select all visible results (mobile)",
            }),
        ).toBeChecked();
    });

    it("should gate the bulk-actions bar's primary actions on selection and report loaded/filtered/selected counts", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {downloaders: [{name: "SAB", enabled: true}]},
                searching: {showResultsAsZipButton: true},
            },
        };
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        const bar = screen.getByTestId("results-bulk-actions");
        // FM-055: the counts this row used to restate
        // (`results-bulk-actions-summary`, `results-selected-count`) are gone;
        // `search-results-summary` is now the single place they render.
        expect(
            within(bar).queryByTestId("results-bulk-actions-summary"),
        ).not.toBeInTheDocument();
        expect(
            within(bar).queryByTestId("results-selected-count"),
        ).not.toBeInTheDocument();
        const send = within(bar).getByTestId("send-to-downloader");
        const zip = within(bar).getByRole("button", {
            name: "Download selected NZBs as ZIP",
        });
        // Disabled (not toast-blocked) with no selection.
        expect(send).toBeDisabled();
        expect(zip).toBeDisabled();
        const summary = screen.getByTestId("search-results-summary");
        // The one count phrase: no filtered, rejected, or selected clause is
        // present while each of those counts is zero.
        expect(summary).toHaveTextContent("1 of 1 loaded");
        expect(summary).not.toHaveTextContent("filtered");
        expect(summary).not.toHaveTextContent("rejected");
        expect(summary).not.toHaveTextContent("selected");

        fireEvent.click(
            within(screen.getByTestId("search-result-row")).getByRole(
                "checkbox",
            ),
        );
        expect(send).toBeEnabled();
        expect(zip).toBeEnabled();
        expect(summary).toHaveTextContent("· 1 selected");
    });

    it("should hide the downloader select when only one downloader is configured, and order the downloader/category selects before the send button", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {downloaders: [{name: "SAB", enabled: true}]},
            },
        };
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        const bar = screen.getByTestId("results-bulk-actions");
        expect(bar.querySelector('[aria-label="Downloader"]')).toBeNull();
        const category = bar.querySelector(
            '[aria-label="Downloader category"]',
        );
        expect(category).not.toBeNull();
        // Empty selection ("use downloader default") still shows its label
        // rather than a blank box (MUI's `Select` needs `displayEmpty` for
        // that when the selected value is "").
        expect(category).toHaveTextContent("Use downloader default");
        const send = within(bar).getByTestId("send-to-downloader");
        expect(
            category!.compareDocumentPosition(send) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it("should show the downloader select, ordered before the category select and the send button, when multiple downloaders are configured", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {name: "SAB", enabled: true},
                        {name: "NZBGet", enabled: true},
                    ],
                },
            },
        };
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        const bar = screen.getByTestId("results-bulk-actions");
        const downloaderSelect = bar.querySelector('[aria-label="Downloader"]');
        const categorySelect = bar.querySelector(
            '[aria-label="Downloader category"]',
        );
        const send = within(bar).getByTestId("send-to-downloader");
        expect(downloaderSelect).not.toBeNull();
        expect(categorySelect).not.toBeNull();
        expect(
            downloaderSelect!.compareDocumentPosition(categorySelect!) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(
            categorySelect!.compareDocumentPosition(send) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    // FM-159 (ADR-0017): a downloader added, removed, or edited in
    // Config -> Downloading reaches already-rendered results through the live
    // safe config, without a remount. Each case rerenders the same tree with a
    // new `SafeConfigContext` value, which is exactly what a post-save query
    // invalidation does.
    it("should offer a downloader added to the live safe config after mount", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {downloading: {downloaders: []}},
        };
        const fetchImplementation = vi.fn(liveDownloaderFetch());
        vi.stubGlobal("fetch", fetchImplementation);
        const rendered = render(liveDownloaderTree({downloaders: []}));
        expect(
            screen.getByText(
                "No downloader is configured for selected-result sends.",
            ),
        ).toBeVisible();
        expect(screen.queryByTestId("send-to-downloader")).toBeNull();

        rendered.rerender(
            liveDownloaderTree({
                downloaders: [{name: "SAB", enabled: true}],
            }),
        );

        expect(screen.getByTestId("send-to-downloader")).toBeVisible();
        expect(
            screen.queryByText(
                "No downloader is configured for selected-result sends.",
            ),
        ).toBeNull();
        expect(await sendToFirstDownloader(fetchImplementation)).toBe("SAB");
    });

    it("should fall back to the first downloader when the selected one is removed from the live safe config", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {downloading: {downloaders: []}},
        };
        const fetchImplementation = vi.fn(liveDownloaderFetch());
        vi.stubGlobal("fetch", fetchImplementation);
        const rendered = render(
            liveDownloaderTree({
                downloaders: [
                    {name: "SAB", enabled: true},
                    {name: "NZBGet", enabled: true},
                ],
            }),
        );
        chooseDownloader("NZBGet");

        rendered.rerender(
            liveDownloaderTree({
                downloaders: [{name: "SAB", enabled: true}],
            }),
        );

        // The single-downloader layout: no downloader select at all.
        expect(
            screen
                .getByTestId("results-bulk-actions")
                .querySelector('[aria-label="Downloader"]'),
        ).toBeNull();
        expect(await sendToFirstDownloader(fetchImplementation)).toBe("SAB");
    });

    it("should keep an explicitly selected downloader across an unrelated live-config change", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {downloading: {downloaders: []}},
        };
        const fetchImplementation = vi.fn(liveDownloaderFetch());
        vi.stubGlobal("fetch", fetchImplementation);
        const downloaders = [
            {name: "SAB", enabled: true},
            {name: "NZBGet", enabled: true},
        ];
        const rendered = render(liveDownloaderTree({downloaders}));
        chooseDownloader("NZBGet");

        // A save that touches something else entirely still hands down a
        // freshly built config object, so the downloader list is referentially
        // new while naming the same two downloaders.
        rendered.rerender(
            liveDownloaderTree(
                {downloaders: downloaders.map((value) => ({...value}))},
                {dereferer: "https://dereferer.test/?$s"},
            ),
        );

        expect(screen.getByTestId("results-bulk-actions")).toHaveTextContent(
            "NZBGet",
        );
        expect(await sendToFirstDownloader(fetchImplementation)).toBe("NZBGet");
    });

    // FM-055: the packet's exact phrase, including the `>` prefix the
    // available-count clause inherits from the pre-existing rule and the
    // `" · "` separator between clauses.
    it("should render one summary phrase with every non-zero clause", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 500,
                    numberOfProcessedResults: 2,
                    numberOfRejectedResults: 98,
                    rejectedReasonsMap: {"Duplicate of another result": 98},
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Mock",
                            wasSuccessful: true,
                            hasMoreResults: true,
                            totalResultsKnown: false,
                        },
                    ],
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Kept result",
                            indexer: "Mock",
                            category: "All",
                        },
                        {
                            searchResultId: "2",
                            title: "Filtered result",
                            indexer: "Other",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        expandRefineSidebar();
        fireEvent.click(refineOption("refine-indexer-option", "Other"));
        expect(screen.getByTestId("search-results-summary")).toHaveTextContent(
            "1 of 2 loaded (>500 available) · 1 filtered · 98 rejected",
        );
    });

    // The available-count clause disappears once nothing more can be loaded,
    // matching legacy's own "Loaded all N results" branch.
    it("should omit the available clause when no more results can be loaded", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    numberOfProcessedResults: 1,
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Mock",
                            wasSuccessful: true,
                            hasMoreResults: false,
                        },
                    ],
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Only result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const summary = screen.getByTestId("search-results-summary");
        expect(summary).toHaveTextContent("1 of 1 loaded");
        expect(summary).not.toHaveTextContent("available");
    });

    it("should reconcile merged rows without losing active sort, filter, grouping, or valid selection", async () => {
        const initial = {
            ...response,
            numberOfAvailableResults: 3,
            searchResults: [
                {
                    searchResultId: "alpha-one",
                    title: "Alpha release",
                    indexer: "One",
                    category: "TV",
                    hash: 1,
                },
                {
                    searchResultId: "alpha-two",
                    title: "Alpha release",
                    indexer: "Two",
                    category: "TV",
                    hash: 1,
                },
                {
                    searchResultId: "zulu",
                    title: "Zulu release",
                    indexer: "Three",
                    category: "TV",
                    hash: 2,
                },
            ],
        };
        const {rerender} = renderResults(<SearchResults data={initial} />);

        fireEvent.click(screen.getByTestId("sort-title"));
        expandRefineSidebar();
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "Alpha"},
        });
        await settleFilterCommits();
        toggleDuplicateControls();
        fireEvent.click(
            screen.getByRole("button", {name: "Expand duplicates"}),
        );
        fireEvent.click(
            screen.getAllByRole("checkbox", {name: "Select Alpha release"})[0],
        );

        rerender(
            <DialogProvider>
                <ToastProvider>
                    <SearchResults
                        data={{
                            ...initial,
                            numberOfAvailableResults: 4,
                            searchResults: [
                                ...initial.searchResults,
                                {
                                    searchResultId: "alpha-three",
                                    title: "Alpha release",
                                    indexer: "One",
                                    category: "TV",
                                    hash: 1,
                                },
                            ],
                        }}
                    />
                </ToastProvider>
            </DialogProvider>,
        );

        expect(screen.getByTestId("sort-title")).toHaveAttribute(
            "data-sort-direction",
            "asc",
        );
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("Alpha");
        expect(
            screen.getByRole("button", {name: "Collapse duplicates"}),
        ).toBeVisible();
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(3);
        expect(
            screen.getAllByRole("checkbox", {name: "Select Alpha release"})[0],
        ).toBeChecked();
    });

    // FM-128: the bulk send's row feedback, pinned at the id forms the real
    // backend actually uses. `searchResultId` is a 64-bit hash
    // (`InternalSearchResultProcessor`), the request carries `downloadId`'s
    // `guid.searchId` form, and the response's `addedIds` are bare guids --
    // so both the `.split(".")[0]` bridge in `SearchResults.tsx` and the
    // response schema's tolerance of ids outside JavaScript's safe-integer
    // range are load-bearing. Two of three selected rows are added; exactly
    // those two must raise the chip and lose their selection.
    it("should mark exactly the added rows as downloaded after a bulk send", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [{name: "SAB", enabled: true}],
                },
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(["movies"]), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({reasonRequired: false}), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                // Wire text rather than numeric literals: these ids exceed
                // `Number.MAX_SAFE_INTEGER`, so a literal would be rounded by
                // the source itself and hide the `JSON.parse` step whose
                // rounding `SearchResults.tsx:942` has to match.
                new Response(
                    '{"successful":true,"addedIds":[-4934754469460477069,8654321098765432101],"missedIds":[],"invalidIds":[]}',
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "-4934754469460477069",
                            downloadId: "-4934754469460477069.-64770922",
                            title: "Added first",
                            indexer: "Mock",
                            category: "Movies HD",
                        },
                        {
                            searchResultId: "8654321098765432101",
                            downloadId: "8654321098765432101.12345678",
                            title: "Added second",
                            indexer: "Mock",
                            category: "Movies HD",
                        },
                        {
                            searchResultId: "-1122334455667788990",
                            downloadId: "-1122334455667788990.-98765432",
                            title: "Not added",
                            indexer: "Mock",
                            category: "Movies HD",
                        },
                    ],
                }}
            />,
        );
        for (const title of ["Added first", "Added second", "Not added"]) {
            fireEvent.click(
                screen.getByRole("checkbox", {name: `Select ${title}`}),
            );
        }
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
        );
        const rowFor = (title: string) =>
            screen.getByText(title).closest("tr") as HTMLElement;
        await vi.waitFor(() => {
            expect(
                within(rowFor("Added first")).getByText("Downloaded"),
            ).toBeVisible();
        });
        expect(
            within(rowFor("Added second")).getByText("Downloaded"),
        ).toBeVisible();
        expect(
            within(rowFor("Not added")).queryByText("Downloaded"),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("checkbox", {name: "Select Added first"}),
        ).not.toBeChecked();
        expect(
            screen.getByRole("checkbox", {name: "Select Added second"}),
        ).not.toBeChecked();
        expect(
            screen.getByRole("checkbox", {name: "Select Not added"}),
        ).toBeChecked();
    });

    it("should confirm duplicate downloader sends before causing the send side effect", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {name: "SAB", enabled: true, defaultCategory: "movies"},
                    ],
                },
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(["movies"]), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({reasonRequired: true}), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({successful: true, addedIds: [1]}),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Movie",
                            indexer: "Mock",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(screen.getByRole("checkbox", {name: "Select Movie"}));
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        expect(
            await screen.findByRole("dialog", {
                name: "Duplicate movie download",
            }),
        ).toBeVisible();
        expect(fetchImplementation).toHaveBeenCalledTimes(2);
        fireEvent.click(screen.getByRole("button", {name: "Send"}));
        await vi.waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
        );
        expect(fetchImplementation.mock.calls[2][0]).toMatch(/addNzbs$/);
    });

    // FM-114: the bulk send resolves an unset category choice to the
    // downloader's configured `defaultCategory`, exactly as legacy's
    // `NzbDownloadService.download` did (`var category =
    // downloader.defaultCategory;`, consulting no fetched list). The fetched
    // list is a convenience for picking, never the authority for what is sent.
    it("should send the configured default category when it is in the fetched list", async () => {
        const request = await bulkSendCategoryRequest({
            defaultCategory: "movies",
            fetchedCategories: ["*", "movies", "series"],
        });
        expect(request.category).toBe("movies");
    });

    // The regression this case exists for: the mock downloader's `get_cats`
    // deliberately does not contain the configured default, so a default that
    // *is* in the list passes against the defect. Only this shape is red
    // before the fix.
    it("should send the configured default category when it is absent from the fetched list", async () => {
        const request = await bulkSendCategoryRequest({
            defaultCategory: "Deterministic Category",
            fetchedCategories: ["*", "movies", "series", "tv"],
        });
        expect(request.category).toBe("Deterministic Category");
    });

    it("should send no category when the downloader has no configured default", async () => {
        const request = await bulkSendCategoryRequest({
            fetchedCategories: ["*", "movies"],
        });
        expect(request.category).toBeNull();
    });

    // The three sentinels are interpreted by the server
    // (`Downloader.addBySearchResultIds`), so the client must forward them
    // verbatim rather than translating or dropping them; none of them appears
    // in a downloader's own category list.
    it("should send a sentinel default category verbatim", async () => {
        const request = await bulkSendCategoryRequest({
            defaultCategory: "Use no category",
            fetchedCategories: ["*", "movies"],
        });
        expect(request.category).toBe("Use no category");
    });

    it("should send an explicitly chosen category instead of the configured default", async () => {
        const request = await bulkSendCategoryRequest({
            defaultCategory: "movies",
            fetchedCategories: ["*", "movies", "series"],
            chooseCategory: "series",
        });
        expect(request.category).toBe("series");
    });

    // Choosing "Use downloader default" explicitly and never touching the
    // select must send the same value -- the empty option means the
    // downloader's configured default, not "no category".
    it("should send the configured default when 'Use downloader default' is chosen explicitly", async () => {
        const request = await bulkSendCategoryRequest({
            defaultCategory: "Deterministic Category",
            fetchedCategories: ["*", "movies"],
            chooseCategory: "Use downloader default",
        });
        expect(request.category).toBe("Deterministic Category");
    });

    // The duplicate probe deliberately carries `null` (legacy built its own
    // request with an explicit null category, and the server's
    // `checkDuplicateMovieDownload` expects that); only the add request
    // carries the resolved category.
    it("should keep the duplicate-download probe free of the resolved category", async () => {
        const request = await bulkSendCategoryRequest({
            defaultCategory: "Deterministic Category",
            fetchedCategories: ["*", "movies"],
        });
        expect(request.duplicateCheckCategory).toBeNull();
        expect(request.category).toBe("Deterministic Category");
    });

    // A category-load failure must not lose the configured default: the list
    // was never the authority, so the select keeps showing what a send would
    // transmit rather than reading as "Use downloader default".
    it("should keep showing the configured default when the category list fails to load", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {
                            name: "SAB",
                            enabled: true,
                            defaultCategory: "Deterministic Category",
                        },
                    ],
                },
            },
        };
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("nope")));
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        expect(
            await screen.findByText(
                "Unable to load downloader categories. Choose another downloader or try again.",
            ),
        ).toBeVisible();
        expect(categorySelect()).toHaveTextContent("Deterministic Category");
    });

    it("should show a configured default that the fetched list does not contain", async () => {
        const select = await renderCategorySelect({
            defaultCategory: "Deterministic Category",
            fetchedCategories: ["*", "movies", "series", "tv"],
        });
        expect(select).toHaveTextContent("Deterministic Category");
        expect(select).not.toHaveTextContent("Use downloader default");
    });

    it("should render one base-aware direct torrent action using the preferred download ID and fallback", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {baseUrl: "/hydra/"};
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "NZB",
                            indexer: "Mock",
                            category: "Movies",
                        },
                        {
                            searchResultId: "2",
                            title: "Torrent",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "TORRENT",
                            downloadId: "torrent-download-id",
                        },
                        {
                            searchResultId: "torrent-result-id",
                            title: "Torrent fallback",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "TORRENT",
                        },
                    ],
                }}
            />,
        );
        const rows = screen.getAllByTestId("search-result-row");
        expect(within(rows[0]).getAllByTestId("download-nzb")).toHaveLength(1);
        const preferredTorrentActions = within(rows[1]).getAllByTestId(
            "download-torrent",
        );
        expect(preferredTorrentActions).toHaveLength(1);
        expect(preferredTorrentActions[0]).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/gettorrent/user/torrent-download-id",
        );
        const fallbackTorrentActions = within(rows[2]).getAllByTestId(
            "download-torrent",
        );
        expect(fallbackTorrentActions).toHaveLength(1);
        expect(fallbackTorrentActions[0]).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/gettorrent/user/torrent-result-id",
        );
    });

    it("should present a compact toolbar region before the results table with a dedicated actions column", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const toolbar = screen.getByTestId("results-toolbar");
        const table = screen.getByTestId("search-results-table");
        expect(toolbar).toBeVisible();
        expect(
            toolbar.compareDocumentPosition(table) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(
            within(toolbar).getByTestId("results-bulk-actions"),
        ).toBeVisible();
        expect(
            within(table).getByText("Actions", {selector: "th"}),
        ).toBeVisible();
        // FM-055: the toolbar is exactly two rows -- the summary/paging/
        // display row and the single merged action row. The regions the
        // former three-row layout carried are gone, their contents folded
        // into these two.
        for (const removed of [
            "results-bulk-actions-summary",
            "results-selected-count",
            "results-selection-actions",
            "results-download-actions",
        ]) {
            expect(screen.queryByTestId(removed)).not.toBeInTheDocument();
        }
        const rows = [...(toolbar.firstElementChild?.children ?? [])];
        expect(rows).toHaveLength(2);
        expect(
            within(rows[0] as HTMLElement).getByTestId(
                "search-results-summary",
            ),
        ).toBeVisible();
        expect(
            within(rows[0] as HTMLElement).getByTestId(
                "display-options-toggle",
            ),
        ).toBeVisible();
        expect(rows[1]).toHaveAttribute("data-testid", "results-bulk-actions");
    });

    // FM-055: the paging controls moved from their own non-sticky row above
    // the toolbar into the toolbar's first row, keeping their accessible
    // names and `requestContinuation` semantics, and gaining stable ids.
    it("should render the paging controls inside the toolbar's first row", () => {
        const loadMore = vi.fn().mockResolvedValue(undefined);
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    pagingState: "ready",
                    offset: 0,
                    limit: 1,
                    numberOfProcessedResults: 1,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
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
                }}
                onLoadMore={loadMore}
            />,
        );
        const toolbar = screen.getByTestId("results-toolbar");
        const more = within(toolbar).getByTestId("results-load-more");
        const all = within(toolbar).getByTestId("results-load-all");
        expect(more).toHaveAccessibleName("Load more");
        expect(all).toHaveAccessibleName("Load all results");
        expect(more).toBeEnabled();
        expect(all).toBeEnabled();
        fireEvent.click(more);
        expect(loadMore).toHaveBeenCalledWith(false);
    });

    // A response can report more available results while carrying none of its
    // own; the continuation controls must not disappear with the rest of the
    // toolbar in that state.
    it("should keep the paging controls reachable with no loaded results", () => {
        const loadMore = vi.fn().mockResolvedValue(undefined);
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    pagingState: "ready",
                    offset: 0,
                    limit: 1,
                    numberOfProcessedResults: 1,
                    numberOfAvailableResults: 2,
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Mock",
                            wasSuccessful: true,
                            hasMoreResults: true,
                        },
                    ],
                }}
                onLoadMore={loadMore}
            />,
        );
        const toolbar = screen.getByTestId("results-toolbar");
        expect(within(toolbar).getByTestId("results-load-more")).toBeEnabled();
        expect(within(toolbar).getByTestId("results-load-all")).toBeEnabled();
        expect(
            screen.queryByTestId("search-results-summary"),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("results-bulk-actions"),
        ).not.toBeInTheDocument();
    });

    // FM-042: `position: sticky` is applied to the whole `results-toolbar`
    // container (matching the mock's own `position:sticky;top:0` toolbar
    // div) and to every table header cell, matching the mock's own
    // `position:sticky;top:51px` header row. It is deliberately *not*
    // applied to the toolbar's individual children (summary,
    // results-bulk-actions): `position: sticky`
    // only remains pinned for as long as the element's own containing block
    // (its nearest block-level DOM ancestor) keeps overlapping the
    // viewport, and `results-toolbar`'s individual children have a much
    // shorter containing block than `results-toolbar` itself (which shares
    // the outer `search-results` Stack with the table below) -- a real
    // browser scroll caught this during development; jsdom cannot lay out
    // the page or resolve scroll-driven geometry (this task's contract is
    // asserted for real in `tests/system/tests/results.spec.ts` instead,
    // per its Verification), but it does apply emotion's injected
    // stylesheet, so the static `position`/`z-index` CSS this task adds is
    // checkable here.
    it("should mark results-toolbar and every header cell as sticky", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const toolbar = screen.getByTestId("results-toolbar");
        expect(getComputedStyle(toolbar).position).toBe("sticky");
        for (const testId of [
            "search-results-summary",
            "results-bulk-actions",
        ]) {
            expect(
                getComputedStyle(screen.getByTestId(testId)).position,
            ).not.toBe("sticky");
        }
        const headerCells = screen
            .getByTestId("search-results-table")
            .querySelectorAll("thead th");
        expect(headerCells.length).toBeGreaterThan(0);
        headerCells.forEach((cell) => {
            expect(getComputedStyle(cell).position).toBe("sticky");
        });
    });

    // FM-042 (ADR-0011): every header cell's sticky bottom edge is drawn as
    // a `box-shadow` on the `<th>` rather than relying on the collapsed
    // table's own border, which does not travel with a sticky cell. The
    // table itself stays `border-collapse: collapse` (switching to
    // `separate` would disturb FM-041's inset recency stripe, which is
    // drawn as it is precisely because `collapse` suppresses a `<tr>`'s own
    // box shadow). jsdom applies emotion's injected stylesheet but performs
    // no layout, so this is the static declaration only -- whether the
    // shadow actually stays visible while pinned under this Chromium
    // build's collapsed-table rendering is verified for real in
    // `tests/system/tests/results.spec.ts`, per this task's Verification.
    it("should draw every header cell's sticky bottom edge as a box-shadow and keep the table border-collapsed", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const table = screen.getByTestId("search-results-table");
        expect(getComputedStyle(table).borderCollapse).toBe("collapse");
        const headerCells = table.querySelectorAll("thead th");
        expect(headerCells.length).toBeGreaterThan(0);
        headerCells.forEach((cell) => {
            expect(getComputedStyle(cell).boxShadow).not.toBe("none");
        });
    });

    // FM-042 (ADR-0011, sub-decision E-title (i)): the title cell wraps a
    // long, unbroken (dot-separated, no spaces) release name via
    // `overflow-wrap: anywhere` -- legacy's `.text-break` -- rather than
    // ellipsizing or clamping it. This is the static CSS declaration jsdom
    // can check; the resulting multi-line rendered geometry (no layout in
    // jsdom) is verified for real in `tests/system/tests/results.spec.ts`.
    it("should apply overflow-wrap:anywhere to the title cell only, with no title= attribute or tooltip", () => {
        const longTitle =
            "Some.Long.Dot.Separated.Release.Name.That.Never.Contains.A.Space.1080p.WEB-DL.x265-GROUP";
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: longTitle,
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const titleCell = screen.getByTestId("search-result-title");
        expect(getComputedStyle(titleCell).overflowWrap).toBe("anywhere");
        expect(titleCell).not.toHaveAttribute("title");
        const nonTitleCells = Array.from(
            screen
                .getByTestId("search-results-table")
                .querySelectorAll("tbody td"),
        ).filter(
            (cell) =>
                cell !== titleCell &&
                cell.getAttribute("data-label") !== "Select",
        );
        expect(nonTitleCells.length).toBeGreaterThan(0);
        nonTitleCells.forEach((cell) => {
            expect(getComputedStyle(cell).overflowWrap).not.toBe("anywhere");
        });
    });

    it("should pair every result cell with a metadata label for responsive presentation", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const row = screen.getByTestId("search-result-row");
        const labels = within(row)
            .getAllByRole("cell")
            .map((cell) => cell.getAttribute("data-label"));
        expect(labels).toEqual([
            "Select",
            "Title",
            "Indexer",
            "Category",
            "Size",
            "Details",
            "Age",
            "Actions",
        ]);
    });

    it("should indent and mark nested duplicate rows distinctly from their parent", () => {
        // FM-176: the one case that pins the persisted option instead of
        // clicking it, which also proves `showDuplicateControls` is restored
        // on mount the way `compactRows` is.
        stubWorkingLocalStorage();
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({showDuplicateControls: true}),
        );
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Duplicated release",
                            indexer: "One",
                            category: "TV",
                            hash: 1,
                        },
                        {
                            searchResultId: "two",
                            title: "Duplicated release",
                            indexer: "Two",
                            category: "TV",
                            hash: 1,
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Expand duplicates"}),
        );
        const rows = screen.getAllByTestId("search-result-row");
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveAttribute("data-nesting-level", "0");
        expect(rows[1]).toHaveAttribute("data-nesting-level", "1");
    });

    it("should render the full Details cell and the row's detail links for a permitted session", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            maySeeDetailsDl: true,
            safeConfig: {dereferer: "https://dereferer.test/?$s"},
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                            grabs: 12_000,
                            seeders: 4,
                            peers: 9,
                            comments: 5,
                            comments_link: "https://indexer.test/d#comments",
                            details_link: "https://indexer.test/d",
                            source: "poster",
                            hasNfo: "YES",
                        },
                    ],
                }}
            />,
        );
        expect(screen.getByTestId("search-result-details")).toHaveTextContent(
            "12k / 4 / 9",
        );
        expect(screen.getByTestId("result-nfo")).toBeEnabled();
        expect(screen.getByTestId("result-binsearch-link")).toHaveAttribute(
            "href",
            `https://dereferer.test/?${encodeURIComponent("http://binsearch.info/?q=poster&max=100&adv_age=3000&server=")}`,
        );
        expect(screen.getByTestId("result-comments-link")).toBeEnabled();
        expect(screen.getByTestId("result-details-link")).toBeEnabled();
    });

    it("should render a swatch only beside an indexer with a valid configured colour", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                indexers: [
                    {name: "Coloured", color: "rgb(200,50,10)"},
                    {name: "Malformed", color: "not-a-colour"},
                ],
            },
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result 1",
                            indexer: "Coloured",
                            category: "All",
                        },
                        {
                            searchResultId: "2",
                            title: "Result 2",
                            indexer: "Uncoloured",
                            category: "All",
                        },
                        {
                            searchResultId: "3",
                            title: "Result 3",
                            indexer: "Malformed",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const rows = screen.getAllByTestId("search-result-row");
        const colouredSwatch = within(rows[0]).getByTestId(
            "search-result-indexer-swatch",
        );
        expect(colouredSwatch).toHaveAttribute("aria-hidden");
        expect(colouredSwatch).toHaveStyle({
            backgroundColor: "rgb(200, 50, 10)",
        });
        expect(
            within(rows[1]).queryByTestId("search-result-indexer-swatch"),
        ).not.toBeInTheDocument();
        expect(
            within(rows[2]).queryByTestId("search-result-indexer-swatch"),
        ).not.toBeInTheDocument();
        // The indexer name text is never dropped -- colour decorates, never
        // replaces, the row's actual carrier of the information.
        ["Coloured", "Uncoloured", "Malformed"].forEach((name, index) => {
            expect(rows[index]).toHaveTextContent(name);
        });
    });

    it("should leave row background, recency stripe, and cell styles unchanged when an indexer colour is configured", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                indexers: [{name: "Coloured", color: "rgb(200,50,10)"}],
            },
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Coloured",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const row = screen.getByTestId("search-result-row");
        // The row itself never carries the indexer colour -- only the
        // bounded swatch inside the Indexer cell does.
        expect(row).not.toHaveStyle({backgroundColor: "rgb(200, 50, 10)"});
        expect(row.style.backgroundColor).toBe("");
    });

    it("should keep the NFO action but drop the external links without the details permission", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            maySeeDetailsDl: false,
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                            details_link: "https://indexer.test/d",
                            source: "poster",
                            hasNfo: "MAYBE",
                        },
                    ],
                }}
            />,
        );
        expect(screen.getByTestId("result-nfo")).toBeEnabled();
        expect(screen.queryByTestId("result-binsearch-link")).toBeNull();
        expect(screen.queryByTestId("result-comments-link")).toBeNull();
        expect(screen.queryByTestId("result-details-link")).toBeNull();
    });

    it("should render a perceivable downloaded indicator distinct from the direct-download control", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {baseUrl: "/"};
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        expect(screen.queryByText("Downloaded")).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId("download-nzb"));
        expect(screen.getByText("Downloaded")).toBeVisible();
    });

    it("should preserve state and avoid sending when duplicate confirmation is cancelled", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {downloaders: [{name: "SAB", enabled: true}]},
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify([]), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({reasonRequired: true}), {
                    headers: {"Content-Type": "application/json"},
                }),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Movie",
                            indexer: "Mock",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(screen.getByRole("checkbox", {name: "Select Movie"}));
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        fireEvent.click(await screen.findByRole("button", {name: "Cancel"}));
        expect(fetchImplementation).toHaveBeenCalledTimes(2);
        await vi.waitFor(() =>
            expect(
                screen.getByRole("checkbox", {name: "Select Movie"}),
            ).toBeChecked(),
        );
    });

    it("should provide accessible category-load failure feedback", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {downloaders: [{name: "SAB", enabled: true}]},
            },
        };
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response("broken", {status: 500})),
        );
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Movie",
                            indexer: "Mock",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );
        expect(
            await screen.findByText(/Unable to load downloader categories/),
        ).toBeVisible();
        expect(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        ).toBeDisabled();
    });

    it("should send TORBOX results only to a TORBOX downloader", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {
                            name: "Torbox",
                            enabled: true,
                            downloaderType: "TORBOX",
                        },
                    ],
                },
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify([]), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({reasonRequired: false}), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({successful: true, addedIds: [1]}),
                    {
                        headers: {"Content-Type": "application/json"},
                    },
                ),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults data={downloadActionResponse("TORBOX")} />,
        );
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select TORBOX result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
        );
        expect(fetchImplementation.mock.calls[2][1].body).toContain(
            '"searchResultId":"1"',
        );
    });

    it("should not send TORBOX results to an incompatible downloader", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {name: "SAB", enabled: true, downloaderType: "SABNZBD"},
                    ],
                },
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify([])));
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults data={downloadActionResponse("TORBOX")} />,
        );
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select TORBOX result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        expect(
            await screen.findByText(/None of the selected results can be sent/),
        ).toBeVisible();
        expect(fetchImplementation).toHaveBeenCalledTimes(1);
    });

    it("should exclude an all-TORBOX selection from ZIP and NZB black-hole actions", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {saveNzbsTo: "/blackhole"},
                searching: {showResultsAsZipButton: true},
            },
        };
        const fetchImplementation = vi.fn();
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults data={downloadActionResponse("TORBOX")} />,
        );
        const selection = screen.getByRole("checkbox", {
            name: "Select TORBOX result",
        });
        fireEvent.click(selection);

        expect(
            screen.getByRole("button", {name: "Download selected NZBs as ZIP"}),
        ).toBeDisabled();
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to black hole"}),
        );

        expect(fetchImplementation).not.toHaveBeenCalled();
        expect(selection).toBeChecked();
    });

    it("should save selected NZBs to the black hole", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/hydra/",
            safeConfig: {
                downloading: {
                    saveNzbsTo: "/blackhole",
                },
            },
        };
        const fetchImplementation = vi.fn().mockResolvedValueOnce(
            new Response(JSON.stringify({successful: true, addedIds: [1]}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to black hole"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation.mock.calls[0][0]).toMatch(
                /saveNzbsToBlackhole$/,
            ),
        );
    });

    it("should save selected torrents or magnets", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {downloading: {saveTorrentsTo: "/torrents"}},
        };
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({successful: true, addedIds: [1]}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults data={downloadActionResponse("TORRENT")} />,
        );
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select TORRENT result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to black hole"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation.mock.calls[0][0]).toMatch(
                /saveOrSendTorrents$/,
            ),
        );
    });

    it("should prepare and transfer a ZIP, then copy selected links", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/hydra/",
            safeConfig: {searching: {showResultsAsZipButton: true}},
        };
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        successful: true,
                        addedIds: [1],
                        zipFilepath: "zip-1",
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            )
            .mockResolvedValueOnce(new Response("zip contents"));
        vi.stubGlobal("fetch", fetchImplementation);
        vi.stubGlobal(
            "URL",
            Object.assign(URL, {
                createObjectURL: vi.fn().mockReturnValue("blob:zip"),
                revokeObjectURL: vi.fn(),
            }),
        );
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, "click")
            .mockImplementation(() => {});
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Download selected NZBs as ZIP"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(2),
        );
        expect(fetchImplementation.mock.calls[1][0]).toMatch(/nzbzipDownload$/);
        expect(click).toHaveBeenCalled();
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Copy selected links"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenCalledWith(
                "http://localhost:3000/hydra/getnzb/user/1",
            ),
        );
        click.mockRestore();
    });

    it("should reject a successful ZIP preparation response without a file path", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {searching: {showResultsAsZipButton: true}},
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(
                new Response(JSON.stringify({successful: true, addedIds: [1]})),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Download selected NZBs as ZIP"}),
        );
        expect(
            await screen.findByText("Unable to complete the download action."),
        ).toBeVisible();
        expect(fetchImplementation).toHaveBeenCalledTimes(1);
        expect(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        ).toBeChecked();
        expect(
            screen.queryByText("Prepared NZB ZIP download."),
        ).not.toBeInTheDocument();
    });

    it("should drive every filter dimension from the refine-sidebar as the single filter surface", async () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Zulu WEB",
                            indexer: "One",
                            category: "Movies",
                        },
                        {
                            searchResultId: "2",
                            title: "Alpha BluRay",
                            indexer: "Two",
                            category: "TV",
                            size: 2 * 1024 * 1024,
                            seeders: 8,
                            epoch: Math.floor(Date.now() / 1000) - 86_400,
                            downloadType: "TORRENT",
                        },
                    ],
                }}
            />,
        );
        expandRefineSidebar();

        // Title.
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "alpha"},
        });
        await settleFilterCommits();
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: ""},
        });
        await settleFilterCommits();
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        // Indexer.
        fireEvent.click(refineOption("refine-indexer-option", "One"));
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
        fireEvent.click(refineOption("refine-indexer-option", "One"));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        // Category.
        fireEvent.click(refineOption("refine-category-option", "Movies"));
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
        fireEvent.click(refineOption("refine-category-option", "Movies"));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        // Size, grabs/seeders, and age ranges.
        for (const [fieldTestId, value, clearTestId] of [
            [
                "number-filter-max-refine-size",
                "3",
                "number-filter-clear-refine-size",
            ],
            [
                "number-filter-min-refine-grabs",
                "5",
                "number-filter-clear-refine-grabs",
            ],
            [
                "number-filter-max-refine-age",
                "2",
                "number-filter-clear-refine-age",
            ],
        ]) {
            fireEvent.change(screen.getByTestId(fieldTestId), {
                target: {value},
            });
            await settleFilterCommits();
            expect(screen.getByTestId("search-result-row")).toHaveTextContent(
                "Alpha BluRay",
            );
            fireEvent.click(screen.getByTestId(clearTestId));
            expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
        }

        // Download type.
        fireEvent.click(
            within(screen.getByTestId("refine-type-chips")).getByRole(
                "button",
                {name: "TORRENT"},
            ),
        );
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Zulu WEB",
        );
    });

    it("should reset every result-side filter via refine-clear-all while leaving sorting, grouping, and selection untouched", async () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Zulu WEB",
                            indexer: "One",
                            category: "Movies",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "2",
                            title: "Alpha BluRay",
                            indexer: "Two",
                            category: "TV",
                            downloadType: "TORBOX",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(screen.getByTestId("refine-sidebar-toggle"));
        expect(screen.getByTestId("refine-clear-all")).toBeDisabled();

        fireEvent.click(screen.getByTestId("sort-title"));
        // "Group TV episodes" defaults checked (useState(true)); flip it off
        // so the test can prove clear-all leaves this explicit choice alone.
        // Since FM-041 it lives in the display-options popover, which has to
        // be closed again before the role queries below can see the rest of
        // the document (see `openDisplayOptions`).
        expect(displayOption("Group TV episodes")).toBeChecked();
        fireEvent.click(displayOption("Group TV episodes"));
        expect(displayOption("Group TV episodes")).not.toBeChecked();
        closeDisplayOptions();
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select Alpha BluRay"}),
        );

        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "alpha"},
        });
        await settleFilterCommits();
        fireEvent.click(refineOption("refine-indexer-option", "One"));
        fireEvent.click(screen.getByRole("button", {name: "NZB"}));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(1);
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );

        expect(screen.getByTestId("refine-clear-all")).toBeEnabled();
        fireEvent.click(screen.getByTestId("refine-clear-all"));
        expect(screen.getByTestId("refine-clear-all")).toBeDisabled();

        expect(screen.getByTestId("refine-filter-title")).toHaveValue("");
        expect(refineOption("refine-indexer-option", "One")).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
        // Sorting, grouping, and selection are untouched by clear-all.
        expect(screen.getByTestId("sort-title")).toHaveAttribute(
            "data-sort-direction",
            "asc",
        );
        expect(
            screen.getByRole("checkbox", {name: "Select Alpha BluRay"}),
        ).toBeChecked();
        expect(displayOption("Group TV episodes")).not.toBeChecked();
    });

    it("should reset a typed title filter, a size range, and a toggled quick filter on a new search while keeping them across onLoadMore", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            safeConfig: {searching: {showQuickFilterButtons: true}},
        };
        const {rerender: rerenderRoot} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Zulu WEB-DL",
                            indexer: "One",
                            category: "Movies",
                            size: 5 * 1024 * 1024,
                        },
                        {
                            searchResultId: "2",
                            title: "Alpha BluRay",
                            indexer: "Two",
                            category: "TV",
                            size: 2 * 1024 * 1024,
                        },
                    ],
                }}
                searchRequestId={1}
            />,
        );
        // `renderResults`' own `rerender` would replace the provider wrapper
        // and so remount `SearchResults`; a new search instead re-renders the
        // mounted component with new props.
        const rerenderResults = (ui: React.ReactNode) =>
            rerenderRoot(
                <DialogProvider>
                    <ToastProvider>{ui}</ToastProvider>
                </DialogProvider>,
            );
        expandRefineSidebar();
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "zulu"},
        });
        fireEvent.change(screen.getByTestId("number-filter-min-refine-size"), {
            target: {value: "4"},
        });
        fireEvent.click(screen.getByRole("button", {name: "WEB"}));
        await settleFilterCommits();
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("zulu");
        expect(screen.getByTestId("number-filter-min-refine-size")).toHaveValue(
            4,
        );
        expect(screen.getByRole("button", {name: "WEB"})).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(1);
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Zulu WEB-DL",
        );

        // `onLoadMore` keeps the same `searchRequestId`: every pinned filter
        // survives it.
        rerenderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Zulu WEB-DL",
                            indexer: "One",
                            category: "Movies",
                            size: 5 * 1024 * 1024,
                        },
                        {
                            searchResultId: "2",
                            title: "Alpha BluRay",
                            indexer: "Two",
                            category: "TV",
                            size: 2 * 1024 * 1024,
                        },
                        {
                            searchResultId: "3",
                            title: "Zulu Extra",
                            indexer: "One",
                            category: "Movies",
                            size: 6 * 1024 * 1024,
                        },
                    ],
                }}
                searchRequestId={1}
            />,
        );
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("zulu");
        expect(screen.getByTestId("number-filter-min-refine-size")).toHaveValue(
            4,
        );
        expect(screen.getByRole("button", {name: "WEB"})).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(1);
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Zulu WEB-DL",
        );

        // A new search (a new `searchRequestId`) resets every one of them.
        rerenderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "4",
                            title: "Charlie WEB-DL",
                            indexer: "One",
                            category: "Movies",
                            size: 3 * 1024 * 1024,
                        },
                        {
                            searchResultId: "5",
                            title: "Delta BluRay",
                            indexer: "Two",
                            category: "TV",
                            size: 1 * 1024 * 1024,
                        },
                    ],
                }}
                searchRequestId={2}
            />,
        );
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("");
        expect(
            screen.getByTestId("number-filter-clear-refine-size"),
        ).toBeDisabled();
        expect(screen.getByRole("button", {name: "WEB"})).toHaveAttribute(
            "aria-pressed",
            "false",
        );
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
    });

    it("should persist the refine-sidebar collapsed state in the existing search-results-table localStorage payload alongside sorting, while the title filter does not survive a fresh mount", async () => {
        // See `stubWorkingLocalStorage`: this environment's `window.localStorage`
        // is otherwise unavailable, so a genuine unmount/remount persistence
        // round trip needs a real, working `Storage` installed first.
        stubWorkingLocalStorage();
        const searchResults = [
            {
                searchResultId: "1",
                title: "Alpha Result",
                indexer: "Mock",
                category: "All",
            },
            {
                searchResultId: "2",
                title: "Bravo Result",
                indexer: "Mock",
                category: "All",
            },
        ];
        const {unmount} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults,
                }}
            />,
        );
        const toggle = screen.getByTestId("refine-sidebar-toggle");
        // Defaults collapsed in this non-browser test environment (matching
        // the below-`sm` default).
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        fireEvent.click(screen.getByTestId("sort-title"));
        // FM-178: a typed title filter is scoped to this search's results and
        // is never written to the persisted payload.
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "alpha"},
        });
        await settleFilterCommits();
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha Result",
        );
        unmount();

        // A fresh mount reads the same `hydra.search-results.table`
        // localStorage payload the sidebar's collapsed state shares with
        // sorting -- both come back -- but starts with a clean title filter,
        // since `filters` is no longer part of that payload.
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults,
                }}
            />,
        );
        expect(screen.getByTestId("refine-sidebar-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(screen.getByTestId("sort-title")).toHaveAttribute(
            "data-sort-direction",
            "asc",
        );
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("");
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
    });

    it("should persist the refine sidebar's Category/Indexer collapse state in the existing search-results-table payload, independently of each other", () => {
        // See `stubWorkingLocalStorage`: a genuine unmount/remount
        // persistence round trip needs a real, working `Storage` installed
        // first.
        stubWorkingLocalStorage();
        const searchResults = [
            {
                searchResultId: "1",
                title: "Alpha Result",
                indexer: "Mock",
                category: "All",
            },
        ];
        const {unmount} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults,
                }}
            />,
        );
        // The sidebar itself defaults collapsed in this non-browser test
        // environment (matching the below-`sm` default); expand it first so
        // its sections render at all.
        fireEvent.click(screen.getByTestId("refine-sidebar-toggle"));
        // Both sections default to expanded (today's behavior) with no
        // stored preference yet.
        expect(screen.getByTestId("refine-category-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(screen.getByTestId("refine-indexer-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        fireEvent.click(screen.getByTestId("refine-category-toggle"));
        expect(screen.getByTestId("refine-category-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );
        expect(screen.getByTestId("refine-indexer-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(storedChoices()).toMatchObject({
            refineCategoryOpen: false,
            refineIndexerOpen: true,
        });
        // Collapse the docked sidebar itself back to its own default before
        // unmounting, so only `categoryOpen`/`indexerOpen` -- not
        // `sidebarCollapsed`, out of this assertion's scope -- differ from
        // the fresh mount below.
        fireEvent.click(screen.getByTestId("refine-sidebar-toggle"));
        unmount();

        // A fresh mount over the same storage: Category stays collapsed while
        // Indexer stays expanded.
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults,
                }}
            />,
        );
        fireEvent.click(screen.getByTestId("refine-sidebar-toggle"));
        expect(screen.getByTestId("refine-category-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );
        expect(screen.getByTestId("refine-indexer-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
    });

    it("should load an old-shape stored payload lacking the refine collapse keys with both sections defaulting to expanded", () => {
        stubWorkingLocalStorage();
        // A payload written before this task's two keys existed (or a
        // hand-edited one) still loads cleanly through `loadChoices`.
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({sidebarCollapsed: false}),
        );
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        expect(screen.getByTestId("refine-category-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(screen.getByTestId("refine-indexer-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
    });

    it("should render both refine sections expanded without throwing when storage is unavailable", () => {
        // No `stubWorkingLocalStorage()`: this file's jsdom environment
        // leaves `window.localStorage` unavailable by default (see that
        // helper's own comment above), which stands in for a genuinely
        // blocked `Storage`.
        expect(() =>
            renderResults(
                <SearchResults
                    data={{
                        ...response,
                        numberOfAvailableResults: 1,
                        searchResults: [
                            {
                                searchResultId: "1",
                                title: "Alpha Result",
                                indexer: "Mock",
                                category: "All",
                            },
                        ],
                    }}
                />,
            ),
        ).not.toThrow();
        fireEvent.click(screen.getByTestId("refine-sidebar-toggle"));
        expect(screen.getByTestId("refine-category-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(screen.getByTestId("refine-indexer-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
    });

    it("should never persist any refine filter, ignoring a stale stored one and resetting everything -- including the title filter -- on a fresh mount", () => {
        // See `stubWorkingLocalStorage`: a genuine persistence round trip
        // needs a real, working `Storage` installed first.
        stubWorkingLocalStorage();
        // A payload written by an older build (or by a hand-edited
        // localStorage entry) still carries a `filters` key -- including an
        // indexer/category selection and a title, both scoped to the results
        // of the search they were made in -- which must be ignored entirely
        // on mount; only the collapse state below is restored.
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                filters: {
                    categories: ["Movies"],
                    indexers: ["Mock"],
                    title: "result",
                },
            }),
        );
        const searchResults = [
            {
                searchResultId: "1",
                title: "Alpha Result",
                indexer: "Mock",
                category: "Movies",
            },
            {
                searchResultId: "2",
                title: "Bravo Result",
                indexer: "Other",
                category: "TV",
            },
        ];
        const {unmount} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults,
                }}
            />,
        );
        fireEvent.click(screen.getByTestId("refine-sidebar-toggle"));
        // The stale stored title and selection are entirely ignored: every
        // filter starts at its own default, not the stored one.
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("");
        expect(selectedFilterValues("refine-indexer-option")).toEqual([
            "Mock",
            "Other",
        ]);
        expect(selectedFilterValues("refine-category-option")).toEqual([
            "Movies",
            "TV",
        ]);
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        // Typing a title and deselecting within this search still filters,
        // but none of it is ever written to the persisted payload.
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "result"},
        });
        fireEvent.click(
            screen
                .getAllByTestId("refine-indexer-option")
                .filter(
                    (option) =>
                        option.getAttribute("data-filter-value") === "Other",
                )[0],
        );
        fireEvent.click(
            screen
                .getAllByTestId("refine-category-option")
                .filter(
                    (option) =>
                        option.getAttribute("data-filter-value") === "TV",
                )[0],
        );
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(1);
        const stored: Record<string, unknown> = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? "{}",
        );
        expect(stored).not.toHaveProperty("filters");
        unmount();

        // A fresh mount starts every filter at its default again -- no
        // title, every indexer and category selected -- since `filters` is
        // no longer part of the persisted payload.
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults,
                }}
            />,
        );
        // The sidebar itself comes back expanded from the same payload, so it
        // needs no second click here.
        expect(screen.getByTestId("refine-sidebar-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("");
        expect(selectedFilterValues("refine-indexer-option")).toEqual([
            "Mock",
            "Other",
        ]);
        expect(selectedFilterValues("refine-category-option")).toEqual([
            "Movies",
            "TV",
        ]);
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
    });

    it("should reselect every indexer and category when a new search arrives without discarding the other refine filters", () => {
        // `renderResults`' own `rerender` would replace the provider wrapper
        // too and so remount `SearchResults` from scratch, which is exactly
        // what this test must *not* do: a new search re-renders the mounted
        // component with new `data`/`searchRequestId` props.
        const {rerender: rerenderRoot} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha Result",
                            indexer: "Mock",
                            category: "Movies",
                        },
                        {
                            searchResultId: "2",
                            title: "Bravo Result",
                            indexer: "Other",
                            category: "TV",
                        },
                    ],
                }}
                searchRequestId={1}
            />,
        );
        const rerenderResults = (ui: React.ReactNode) =>
            rerenderRoot(
                <DialogProvider>
                    <ToastProvider>{ui}</ToastProvider>
                </DialogProvider>,
            );
        fireEvent.click(screen.getByTestId("refine-sidebar-toggle"));
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "result"},
        });
        fireEvent.click(
            screen
                .getAllByTestId("refine-indexer-option")
                .filter(
                    (option) =>
                        option.getAttribute("data-filter-value") === "Other",
                )[0],
        );
        fireEvent.click(
            screen
                .getAllByTestId("refine-category-option")
                .filter(
                    (option) =>
                        option.getAttribute("data-filter-value") === "TV",
                )[0],
        );
        expect(selectedFilterValues("refine-indexer-option")).toEqual(["Mock"]);
        expect(selectedFilterValues("refine-category-option")).toEqual([
            "Movies",
        ]);

        // Loading more results into the *same* search must not undo that
        // deselection.
        rerenderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha Result",
                            indexer: "Mock",
                            category: "Movies",
                        },
                        {
                            searchResultId: "2",
                            title: "Bravo Result",
                            indexer: "Other",
                            category: "TV",
                        },
                        {
                            searchResultId: "3",
                            title: "Charlie Result",
                            indexer: "Other",
                            category: "TV",
                        },
                    ],
                }}
                searchRequestId={1}
            />,
        );
        expect(selectedFilterValues("refine-indexer-option")).toEqual(["Mock"]);
        expect(selectedFilterValues("refine-category-option")).toEqual([
            "Movies",
        ]);

        // A new search does: every indexer and category of the new results is
        // selected, including ones the previous search never returned, while
        // the title filter the user typed survives.
        rerenderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "4",
                            title: "Delta Result",
                            indexer: "Mock",
                            category: "Movies",
                        },
                        {
                            searchResultId: "5",
                            title: "Echo Result",
                            indexer: "Third",
                            category: "Audio",
                        },
                    ],
                }}
                searchRequestId={2}
            />,
        );
        expect(selectedFilterValues("refine-indexer-option")).toEqual([
            "Mock",
            "Third",
        ]);
        expect(selectedFilterValues("refine-category-option")).toEqual([
            "Audio",
            "Movies",
        ]);
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("result");
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
    });

    it("should never persist the refine download-type selection or title filter, and reselect every type -- while resetting the title -- on a new search", async () => {
        // See `stubWorkingLocalStorage`: a genuine persistence round trip
        // needs a real, working `Storage` installed first.
        stubWorkingLocalStorage();
        // The download-type chips are derived from the loaded results exactly
        // like the indexer and category lists, so a stored selection has the
        // same failure mode: a search that returned only NZBs would hide
        // every torrent of the next search. The stored title is likewise
        // ignored: FM-178 scopes every refine filter to one search.
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                filters: {downloadTypes: ["NZB"], title: "result"},
            }),
        );
        const {rerender: rerenderRoot} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha Result",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "2",
                            title: "Bravo Result",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "TORRENT",
                        },
                    ],
                }}
                searchRequestId={1}
            />,
        );
        // `renderResults`' own `rerender` would replace the provider wrapper
        // and so remount `SearchResults`; a new search instead re-renders the
        // mounted component with new props.
        const rerenderResults = (ui: React.ReactNode) =>
            rerenderRoot(
                <DialogProvider>
                    <ToastProvider>{ui}</ToastProvider>
                </DialogProvider>,
            );
        fireEvent.click(screen.getByTestId("refine-sidebar-toggle"));
        // The stored title and download-type selection are both ignored.
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("");
        expect(selectedTypeChips()).toEqual(["NZB", "TORRENT"]);
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        // Typing a title and deselecting within this search still filters,
        // but neither is ever written to the persisted payload.
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "alpha"},
        });
        await settleFilterCommits();
        fireEvent.click(typeChip("TORRENT"));
        expect(selectedTypeChips()).toEqual(["NZB"]);
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha Result",
        );
        const stored: Record<string, unknown> = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? "{}",
        );
        expect(stored).not.toHaveProperty("filters");

        // Loading more into the *same* search keeps both the typed title and
        // the deselected type.
        rerenderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha Result",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "NZB",
                        },
                        {
                            searchResultId: "2",
                            title: "Bravo Result",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "TORRENT",
                        },
                        {
                            searchResultId: "3",
                            title: "Alpha Charlie",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "NZB",
                        },
                    ],
                }}
                searchRequestId={1}
            />,
        );
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("alpha");
        expect(selectedTypeChips()).toEqual(["NZB"]);
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        // A new search selects every download type of the new results,
        // including one the previous search never returned, and clears the
        // typed title.
        rerenderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "4",
                            title: "Charlie Result",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "TORRENT",
                        },
                        {
                            searchResultId: "5",
                            title: "Delta Result",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "TORBOX",
                        },
                    ],
                }}
                searchRequestId={2}
            />,
        );
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("");
        expect(selectedTypeChips()).toEqual(["TORBOX", "TORRENT"]);
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
    });

    it("should gather every display preference into one accessible display-options popover", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: duplicateAcrossDownloadTypes,
                }}
            />,
        );
        const toggle = screen.getByTestId("display-options-toggle");
        expect(toggle).toHaveAttribute("aria-haspopup", "true");
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByTestId("display-options")).not.toBeInTheDocument();

        const popover = openDisplayOptions();
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        // Every entry is a real checkbox with an accessible name and a
        // queryable checked state; the two grouping toggles keep the exact
        // labels and defaults they had in the toolbar before this task.
        expect(
            within(popover)
                .getAllByRole("checkbox")
                .map((entry) => [
                    entry.getAttribute("aria-label") ??
                        entry.closest("label")?.textContent,
                    (entry as HTMLInputElement).checked,
                ]),
        ).toEqual([
            ["Group torrent and Usenet results", false],
            ["Group TV episodes", true],
            ["Compact rows", false],
            ["Highlight recent", false],
            ["Show duplicate expand controls", false],
            ["Show covers", false],
            ["Show refine sidebar", false],
        ]);
    });

    it("should keep the relocated grouping toggles driving the same grouping behavior", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: duplicateAcrossDownloadTypes,
                }}
            />,
        );
        // Ungrouped download types keep the same title in two separate title
        // groups, so both rows render on their own.
        closeDisplayOptions();
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        fireEvent.click(displayOption("Group torrent and Usenet results"));
        expect(displayOption("Group torrent and Usenet results")).toBeChecked();
        closeDisplayOptions();
        // Grouped, the pair becomes one title group with a collapsed second
        // member reachable through the existing expansion control.
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(1);
        fireEvent.click(screen.getByRole("button", {name: "Expand group"}));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
    });

    it("should tighten row density only while compact rows is enabled", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const table = screen.getByTestId("search-results-table");
        // Defaults off, so the default row density -- and every accepted
        // default-state geometry baseline measured against it -- is untouched.
        // The rendered padding/height reduction itself is asserted in the
        // browser (`results.spec.ts`), which jsdom cannot measure.
        expect(table).toHaveAttribute("data-compact-rows", "false");

        fireEvent.click(displayOption("Compact rows"));
        expect(displayOption("Compact rows")).toBeChecked();
        closeDisplayOptions();
        expect(table).toHaveAttribute("data-compact-rows", "true");

        fireEvent.click(displayOption("Compact rows"));
        closeDisplayOptions();
        expect(table).toHaveAttribute("data-compact-rows", "false");
    });

    it("should flag recent results with two independent properties only while highlight recent is enabled", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: agedResults(),
                }}
            />,
        );
        const stripe = (title: string) =>
            getComputedStyle(
                resultRow(title).querySelector('td[data-label="Select"]')!,
            ).boxShadow;
        const ageColor = (title: string) =>
            getComputedStyle(
                resultRow(title).querySelector('td[data-label="Age"]')!,
            ).color;

        // Defaults off: nothing is flagged, so the default rendering is
        // unchanged even for a one-day-old result.
        expect(stripe("Recent release")).toBe(stripe("Older release"));
        expect(ageColor("Recent release")).toBe(ageColor("Older release"));

        fireEvent.click(displayOption("Highlight recent"));
        expect(displayOption("Highlight recent")).toBeChecked();
        closeDisplayOptions();

        // The flag combines two properties, so it does not depend on hue
        // alone: a left-edge inset stripe the older row does not draw, and a
        // distinct age-column text color.
        expect(stripe("Recent release")).toContain("inset");
        expect(stripe("Older release")).not.toContain("inset");
        expect(ageColor("Recent release")).not.toBe(ageColor("Older release"));
        // A result with no `epoch` has no computable age and is never flagged.
        expect(stripe("Ageless release")).not.toContain("inset");
        expect(ageColor("Ageless release")).toBe(ageColor("Older release"));
    });

    it("should render a cover tile only while show covers is enabled, framed at the configured maximum width and resolved against the application base", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/hydra/",
            safeConfig: {searching: {coverSize: 140}},
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Absolute cover",
                            indexer: "Mock",
                            category: "Movies",
                            cover: "https://artworks.thetvdb.com/banners/poster.jpg",
                        },
                        {
                            searchResultId: "2",
                            title: "Proxied cover",
                            indexer: "Mock",
                            category: "Movies",
                            cover: "cache/aHR0cHM6Ly9leGFtcGxlLmNvbS9wLmpwZw==",
                        },
                        {
                            searchResultId: "3",
                            title: "Coverless result",
                            indexer: "Mock",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );
        // Off by default (the owner's choice; legacy defaulted this on), so
        // neither a tile nor an image renders for the two results that carry
        // a cover.
        closeDisplayOptions();
        expect(
            screen.queryAllByTestId("search-result-cover-tile"),
        ).toHaveLength(0);
        expect(screen.queryAllByTestId("search-result-cover")).toHaveLength(0);

        fireEvent.click(displayOption("Show covers"));
        expect(displayOption("Show covers")).toBeChecked();
        closeDisplayOptions();

        expect(screen.getAllByTestId("search-result-cover-tile")).toHaveLength(
            2,
        );
        const tile = within(resultRow("Absolute cover")).getByTestId(
            "search-result-cover-tile",
        );
        // FM-179: the reserved footprint. Height is fixed and the width has a
        // floor, both stated before the image exists, so nothing about this
        // box depends on the response arriving -- and the ceiling is
        // `searching.coverSize` (ADR-0054), which is also the width the
        // full-size preview renders at.
        const tileStyle = getComputedStyle(tile);
        expect(tileStyle.height).toBe("56px");
        expect(tileStyle.minWidth).toBe("38px");
        expect(tileStyle.maxWidth).toBe("140px");
        expect(tileStyle.boxSizing).toBe("border-box");
        expect(tileStyle.overflow).toBe("hidden");
        expect(tileStyle.borderStyle).toBe("solid");
        expect(tileStyle.borderWidth).toBe("1px");
        // The frame's three visual values are read from the theme, not
        // authored: these are MUI's *default* theme (no `ThemeProvider` in
        // this test), so `shape.borderRadius` is 4 and the two palette roles
        // are the light-mode ones. The application theme's own 8px radius and
        // dark tokens are what the browser gate shows.
        expect(tileStyle.borderRadius).toBe("4px");
        expect(tileStyle.borderColor).toBe("rgba(0, 0, 0, 0.12)");
        expect(tileStyle.backgroundColor).toBe("rgba(0, 0, 0, 0.04)");
        expect(tile).toHaveAttribute("data-cover-state", "loading");

        const absolute = within(tile).getByTestId("search-result-cover");
        // The indexer's own URL is used verbatim; the proxied path is resolved
        // through the transport, so it stays under a non-root application base
        // instead of becoming a root path.
        expect(absolute).toHaveAttribute(
            "src",
            "https://artworks.thetvdb.com/banners/poster.jpg",
        );
        expect(absolute).toHaveAttribute("alt", "");
        expect(absolute).toHaveAttribute("loading", "lazy");
        // Height-driven inside the frame: the tile decides the size, the
        // aspect ratio decides the width.
        expect(getComputedStyle(absolute).height).toBe("100%");
        expect(getComputedStyle(absolute).width).toBe("auto");
        expect(getComputedStyle(absolute).display).toBe("block");

        fireEvent.load(absolute);
        expect(tile).toHaveAttribute("data-cover-state", "loaded");

        expect(
            within(resultRow("Proxied cover")).getByTestId(
                "search-result-cover",
            ),
        ).toHaveAttribute(
            "src",
            "http://localhost:3000/hydra/cache/aHR0cHM6Ly9leGFtcGxlLmNvbS9wLmpwZw==",
        );
        // A result without a cover renders neither tile nor image and
        // reserves nothing.
        expect(
            within(resultRow("Coverless result")).queryByTestId(
                "search-result-cover-tile",
            ),
        ).not.toBeInTheDocument();
        expect(
            within(resultRow("Coverless result")).queryByTestId(
                "search-result-cover",
            ),
        ).not.toBeInTheDocument();

        // The tile sits between the expand slots and the title text, in the
        // title cell's own row stack, so the title still follows it.
        expect(
            [...tile.parentElement!.children].map(
                (element) =>
                    element.getAttribute("data-testid") ?? element.textContent,
            ),
        ).toEqual(["search-result-cover-tile", "Absolute cover"]);

        fireEvent.click(displayOption("Show covers"));
        closeDisplayOptions();
        expect(
            screen.queryAllByTestId("search-result-cover-tile"),
        ).toHaveLength(0);
        expect(screen.queryAllByTestId("search-result-cover")).toHaveLength(0);
    });

    it("should cap the cover tile at 100px when the configuration carries no usable cover size", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {searching: {coverSize: 0}},
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Absolute cover",
                            indexer: "Mock",
                            category: "Movies",
                            cover: "https://artworks.thetvdb.com/banners/poster.jpg",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(displayOption("Show covers"));
        closeDisplayOptions();
        expect(
            getComputedStyle(screen.getByTestId("search-result-cover-tile"))
                .maxWidth,
        ).toBe("100px");
    });

    it("should middle-align only the rows that render a cover tile", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {searching: {coverSize: 120}},
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Absolute cover",
                            indexer: "Mock",
                            category: "Movies",
                            cover: "https://artworks.thetvdb.com/banners/poster.jpg",
                        },
                        {
                            searchResultId: "2",
                            title: "Coverless result",
                            indexer: "Mock",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );
        // Nothing is flagged while the option is off, not even for the result
        // that has a cover: the flag says "this row renders a tile".
        closeDisplayOptions();
        expect(resultRow("Absolute cover")).not.toHaveAttribute(
            "data-has-cover",
        );

        fireEvent.click(displayOption("Show covers"));
        closeDisplayOptions();

        // FM-179: the attribute the table's `verticalAlign: middle` rule is
        // keyed on (the rule itself is a descendant selector in the table's
        // `sx`, which a jsdom cascade cannot resolve -- the browser gate
        // measures the rendered alignment).
        expect(resultRow("Absolute cover")).toHaveAttribute("data-has-cover");
        expect(resultRow("Coverless result")).not.toHaveAttribute(
            "data-has-cover",
        );
        // The title cell's own stack follows the same split: centred on the
        // tile where there is one, FM-175's top alignment where there is not.
        const titleStack = (title: string) =>
            getComputedStyle(
                within(resultRow(title)).getByTestId("search-result-title")
                    .firstElementChild!,
            ).alignItems;
        expect(titleStack("Absolute cover")).toBe("center");
        expect(titleStack("Coverless result")).toBe("flex-start");
    });

    it("should turn a cover that fails to load into a quiet empty tile with no image and no trigger", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {searching: {coverSize: 120}},
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Broken cover",
                            indexer: "Mock",
                            category: "Movies",
                            cover: "https://artworks.thetvdb.com/banners/gone.jpg",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(displayOption("Show covers"));
        closeDisplayOptions();

        fireEvent.error(screen.getByTestId("search-result-cover"));

        const tile = screen.getByTestId("search-result-cover-tile");
        expect(tile).toHaveAttribute("data-cover-state", "failed");
        // The image is *removed*, not hidden: a hidden element with a failed
        // `src` is what paints a broken-image glyph.
        expect(
            screen.queryByTestId("search-result-cover"),
        ).not.toBeInTheDocument();
        expect(tile.querySelector("img")).toBeNull();
        // The footprint is unchanged, so the row does not move when a cover
        // turns out to be unreachable.
        expect(getComputedStyle(tile).height).toBe("56px");
        expect(getComputedStyle(tile).minWidth).toBe("38px");
        // Nothing to show, so nothing to operate: not a button, not in the
        // accessibility tree, and inert.
        expect(tile.tagName).toBe("DIV");
        expect(tile).toHaveAttribute("aria-hidden");
        expect(tile).not.toHaveAttribute("aria-label");
        fireEvent.pointerEnter(tile);
        fireEvent.click(tile);
        expect(
            screen.queryByTestId("search-result-cover-popover"),
        ).not.toBeInTheDocument();
    });

    it("should preview the full-size cover on hover, on focus, and on tap, without ever taking focus off the trigger", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {searching: {coverSize: 140}},
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Absolute cover",
                            indexer: "Mock",
                            category: "Movies",
                            cover: "https://artworks.thetvdb.com/banners/poster.jpg",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(displayOption("Show covers"));
        closeDisplayOptions();

        const tile = screen.getByTestId("search-result-cover-tile");
        // The trigger's own anatomy: a real button whose accessible name is
        // this action, advertising the surface it opens and its state. The
        // thumbnail inside keeps `alt=""`, so the name is the button's only
        // text and the row's title stays the row's accessible content.
        expect(tile.tagName).toBe("BUTTON");
        expect(tile).toHaveAttribute("type", "button");
        expect(tile).toHaveAttribute(
            "aria-label",
            "Show cover for Absolute cover",
        );
        expect(tile).toHaveAttribute("aria-haspopup", "dialog");
        expect(tile).toHaveAttribute("aria-expanded", "false");
        expect(
            screen.queryByTestId("search-result-cover-popover"),
        ).not.toBeInTheDocument();

        // Hover.
        fireEvent.pointerEnter(tile, {pointerType: "mouse"});
        const popover = screen.getByTestId("search-result-cover-popover");
        expect(tile).toHaveAttribute("aria-expanded", "true");
        // The same image, at the configured full-size width -- the size the
        // thumbnail is a thumbnail *of*.
        const preview = popover.querySelector("img")!;
        expect(preview).toHaveAttribute(
            "src",
            within(tile).getByTestId("search-result-cover").getAttribute("src"),
        );
        expect(preview).toHaveAttribute("alt", "");
        expect(getComputedStyle(preview).width).toBe("140px");
        expect(getComputedStyle(preview).height).toBe("auto");
        // The preview floats over an untouched page: MUI's `Modal` scroll
        // lock is disabled, so opening it takes away neither the document's
        // scrollbar nor the width that scrollbar occupied.
        expect(document.body.style.overflow).toBe("");
        expect(document.body.style.paddingRight).toBe("");

        fireEvent.pointerLeave(tile);
        // The popover leaves the DOM at the end of MUI's own exit transition,
        // so every close below is awaited rather than asserted synchronously.
        await popoverClosed();

        // A touch tap, in the order a browser really emits: the synthesized
        // hover arrives *and leaves* again, and the button takes focus, all
        // before the click. Measured in Chromium touch emulation:
        // `pointerenter:touch -> pointerleave:touch -> mouseenter -> focus ->
        // click`. The first tap has to open the preview -- legacy's
        // tap-to-enlarge -- which it only does if neither the synthesized
        // leave closes it nor the trailing click undoes what focus opened.
        fireEvent.pointerEnter(tile, {pointerType: "touch"});
        expect(
            screen.queryByTestId("search-result-cover-popover"),
        ).not.toBeInTheDocument();
        fireEvent.pointerLeave(tile, {pointerType: "touch"});
        fireEvent.pointerDown(tile, {pointerType: "touch"});
        act(() => tile.focus());
        // A pointer's click carries its click count; only a keyboard
        // synthesized click reports `detail: 0`.
        fireEvent.click(tile, {detail: 1});
        expect(
            screen.getByTestId("search-result-cover-popover"),
        ).toBeInTheDocument();
        expect(tile).toHaveAttribute("aria-expanded", "true");
        // A second tap -- the same sequence, minus the focus the trigger
        // already holds -- closes it again.
        fireEvent.pointerEnter(tile, {pointerType: "touch"});
        fireEvent.pointerLeave(tile, {pointerType: "touch"});
        fireEvent.pointerDown(tile, {pointerType: "touch"});
        fireEvent.click(tile, {detail: 1});
        await popoverClosed();
        act(() => tile.blur());

        // Keyboard focus, then a *mouse* click: the focus opened the preview,
        // but the click is a new gesture (there was no pointer press before
        // the focus), so it closes -- the same as clicking a hover-opened
        // thumbnail (FM-179 review finding: the first mouse click used to be
        // swallowed after a Tab).
        act(() => tile.focus());
        expect(
            screen.getByTestId("search-result-cover-popover"),
        ).toBeInTheDocument();
        fireEvent.pointerDown(tile, {pointerType: "mouse"});
        fireEvent.click(tile, {detail: 1});
        await popoverClosed();
        act(() => tile.blur());

        // Keyboard: Enter and Space on the focused trigger both reach it as a
        // click, arriving after the focus that already opened the preview.
        // Neither may close it.
        act(() => tile.focus());
        expect(
            screen.getByTestId("search-result-cover-popover"),
        ).toBeInTheDocument();
        fireEvent.keyDown(tile, {key: "Enter"});
        fireEvent.click(tile);
        expect(
            screen.getByTestId("search-result-cover-popover"),
        ).toBeInTheDocument();
        expect(tile).toHaveAttribute("aria-expanded", "true");
        act(() => tile.blur());
        await popoverClosed();

        act(() => tile.focus());
        fireEvent.keyDown(tile, {key: " "});
        fireEvent.keyUp(tile, {key: " "});
        fireEvent.click(tile);
        expect(
            screen.getByTestId("search-result-cover-popover"),
        ).toBeInTheDocument();
        act(() => tile.blur());
        await popoverClosed();

        // Keyboard: focusing the trigger opens the preview and leaving it
        // closes it again.
        // A real `focus()`, not a synthetic focus event: what this asserts is
        // that the *focused* element is the trigger, before and after Escape.
        act(() => tile.focus());
        expect(document.activeElement).toBe(tile);
        expect(
            screen.getByTestId("search-result-cover-popover"),
        ).toBeInTheDocument();
        act(() => tile.blur());
        await popoverClosed();

        // Escape closes it with the trigger still focused: the popover is
        // `pointerEvents: none` and disables MUI's focus management, so it
        // never became the focused element to escape *from*.
        act(() => tile.focus());
        expect(
            screen.getByTestId("search-result-cover-popover"),
        ).toBeInTheDocument();
        fireEvent.keyDown(tile, {key: "Escape"});
        await popoverClosed();
        expect(document.activeElement).toBe(tile);
        expect(tile).toHaveAttribute("aria-expanded", "false");
    });

    it("should persist compact rows, highlight recent, and the duplicate-controls option in the existing search-results-table payload without persisting the mobile drawer", () => {
        stubWorkingLocalStorage();
        const searchResults = [
            {
                searchResultId: "1",
                title: "Alpha Result",
                indexer: "Mock",
                category: "All",
            },
        ];
        const {unmount} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults,
                }}
            />,
        );
        fireEvent.click(displayOption("Compact rows"));
        fireEvent.click(displayOption("Highlight recent"));
        fireEvent.click(displayOption("Show duplicate expand controls"));
        fireEvent.click(displayOption("Show covers"));
        closeDisplayOptions();
        const stored = storedChoices();
        expect(stored).toMatchObject({
            compactRows: true,
            highlightRecent: true,
            showCovers: true,
            showDuplicateControls: true,
        });
        // The sidebar shortcut adds no key of its own, and the below-`sm`
        // drawer's transient open state is deliberately not persisted.
        expect(Object.keys(stored).sort()).toEqual([
            "compactRows",
            "highlightRecent",
            "refineCategoryOpen",
            "refineIndexerOpen",
            "showCovers",
            "showDuplicateControls",
            "sidebarCollapsed",
            "sorting",
        ]);
        unmount();

        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults,
                }}
            />,
        );
        expect(displayOption("Compact rows")).toBeChecked();
        expect(displayOption("Highlight recent")).toBeChecked();
        expect(displayOption("Show duplicate expand controls")).toBeChecked();
        expect(displayOption("Show covers")).toBeChecked();
    });

    it("should drive the persisted docked-sidebar preference from the display-options shortcut at sm and up", () => {
        stubWorkingLocalStorage();
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        // The docked branch is the live one here (jsdom's own `matchMedia`
        // matches nothing, so `down("sm")` is false), and it starts collapsed.
        const sidebarToggle = screen.getByTestId("refine-sidebar-toggle");
        expect(sidebarToggle).toHaveAttribute("aria-expanded", "false");
        expect(displayOption("Show refine sidebar")).not.toBeChecked();

        fireEvent.click(displayOption("Show refine sidebar"));
        expect(sidebarToggle).toHaveAttribute("aria-expanded", "true");
        expect(storedChoices().sidebarCollapsed).toBe(false);
        expect(displayOption("Show refine sidebar")).toBeChecked();
        expect(screen.getByTestId("refine-filter-title")).toBeInTheDocument();

        fireEvent.click(displayOption("Show refine sidebar"));
        expect(screen.getByTestId("refine-sidebar-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );
        expect(storedChoices().sidebarCollapsed).toBe(true);
        expect(displayOption("Show refine sidebar")).not.toBeChecked();
    });

    it("should drive the unpersisted mobile drawer from the same shortcut below sm without reopening it from a stored preference", () => {
        stubMobileViewport();
        stubWorkingLocalStorage();
        // A stored *expanded* docked preference must not pop the drawer open
        // over the results when the same user opens the page on a phone: the
        // two mechanisms are deliberately separate (see `RefineSidebar.tsx`).
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({sidebarCollapsed: false}),
        );
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        const drawerTrigger = screen.getByTestId("refine-sidebar-toggle");
        expect(drawerTrigger).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByTestId("refine-sidebar")).not.toBeInTheDocument();
        expect(displayOption("Show refine sidebar")).not.toBeChecked();

        // The shortcut opens the same drawer FM-045's trigger opens, and
        // closes the popover behind it rather than stacking two overlays.
        fireEvent.click(displayOption("Show refine sidebar"));
        expect(screen.getByTestId("display-options-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );
        expect(drawerTrigger).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByTestId("refine-sidebar")).toBeInTheDocument();
        expect(displayOption("Show refine sidebar")).toBeChecked();
        closeDisplayOptions();

        // FM-045's own close control and trigger keep working unchanged. The
        // drawer's own exit transition never completes without timers in
        // jsdom, so the closed state is read from the trigger's own
        // `aria-expanded` rather than from the drawer content's removal, the
        // same way `RefineSidebar.test.tsx` reads it.
        fireEvent.click(screen.getByTestId("refine-sidebar-close"));
        expect(drawerTrigger).toHaveAttribute("aria-expanded", "false");
        fireEvent.click(drawerTrigger);
        expect(drawerTrigger).toHaveAttribute("aria-expanded", "true");
        expect(displayOption("Show refine sidebar")).toBeChecked();
        closeDisplayOptions();
        fireEvent.click(drawerTrigger);
        expect(drawerTrigger).toHaveAttribute("aria-expanded", "false");

        // Still nothing about the drawer in the persisted payload.
        expect(storedChoices()).not.toHaveProperty("drawerOpen");
        expect(storedChoices().sidebarCollapsed).toBe(false);
    });

    describe("group-episodes help dialog (FM-091, FM-162)", () => {
        function tvResultsData() {
            return {
                ...response,
                numberOfAvailableResults: 1,
                searchResults: [
                    {
                        searchResultId: "1",
                        title: "TV Show S01E01",
                        indexer: "Mock",
                        category: "TV SD",
                    },
                ],
            };
        }

        function genericStorageFetch(stored: boolean) {
            const puts: {body: unknown; forUser: string | null}[] = [];
            const fetchImplementation = vi.fn(
                (input: RequestInfo | URL, init?: RequestInit) => {
                    const url = new URL(String(input), "http://localhost");
                    const method = init?.method ?? "GET";
                    if (
                        url.pathname.includes(
                            "internalapi/genericstorage/isGroupEpisodesHelpShown",
                        )
                    ) {
                        if (method === "PUT") {
                            puts.push({
                                body: init?.body
                                    ? JSON.parse(String(init.body))
                                    : undefined,
                                forUser: url.searchParams.get("forUser"),
                            });
                            return Promise.resolve(new Response(null));
                        }
                        return Promise.resolve(
                            new Response(JSON.stringify(stored), {
                                headers: {"Content-Type": "application/json"},
                            }),
                        );
                    }
                    return Promise.resolve(new Response("nope", {status: 500}));
                },
            );
            vi.stubGlobal("fetch", fetchImplementation);
            return {fetchImplementation, puts};
        }

        it("shows the help dialog for an eligible unraised search and writes the flag only after it closes", async () => {
            const {fetchImplementation, puts} = genericStorageFetch(false);
            renderResults(
                <SearchResults
                    data={tvResultsData()}
                    searchedCategory={{name: "TV SD", searchType: "TVSEARCH"}}
                />,
            );

            const dialog = await screen.findByTestId(
                "group-episodes-help-dialog",
            );
            expect(
                within(dialog).getByText("Sorting of TV episodes"),
            ).toBeVisible();
            expect(
                within(dialog).getByText(/automatically grouped by episodes/),
            ).toBeVisible();
            // Not written yet: the dialog is still open.
            expect(puts).toEqual([]);

            fireEvent.click(within(dialog).getByRole("button", {name: "OK"}));

            await vi.waitFor(() => expect(puts).toHaveLength(1));
            expect(puts[0]).toEqual({body: true, forUser: "true"});
            expect(
                screen.queryByTestId("group-episodes-help-dialog"),
            ).not.toBeInTheDocument();
            expect(fetchImplementation).toHaveBeenCalled();
        });

        it("shows nothing and writes nothing when the flag is already raised", async () => {
            const {puts} = genericStorageFetch(true);
            renderResults(
                <SearchResults
                    data={tvResultsData()}
                    searchedCategory={{name: "TV SD", searchType: "TVSEARCH"}}
                />,
            );

            await vi.waitFor(() =>
                expect(
                    screen.queryByTestId("group-episodes-help-dialog"),
                ).not.toBeInTheDocument(),
            );
            expect(puts).toEqual([]);
        });

        it("shows nothing for a non-TV, ineligible search", async () => {
            const {puts} = genericStorageFetch(false);
            renderResults(
                <SearchResults
                    data={{
                        ...response,
                        numberOfAvailableResults: 1,
                        searchResults: [
                            {
                                searchResultId: "1",
                                title: "Movie",
                                indexer: "Mock",
                                category: "Movies",
                            },
                        ],
                    }}
                    searchedCategory={{name: "Movies", searchType: "MOVIE"}}
                />,
            );

            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(
                screen.queryByTestId("group-episodes-help-dialog"),
            ).not.toBeInTheDocument();
            expect(puts).toEqual([]);
        });

        // FM-162: eligibility follows the *searched* category, as legacy's own
        // predicate did, so incidental TV results in a broader search no
        // longer trigger the dialog and a TV category the installation renamed
        // still does.
        it('shows nothing for an "All" search that merely returned TV results', async () => {
            const {puts} = genericStorageFetch(false);
            renderResults(
                <SearchResults
                    data={tvResultsData()}
                    searchedCategory={{name: "All", searchType: "SEARCH"}}
                />,
            );

            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(
                screen.queryByTestId("group-episodes-help-dialog"),
            ).not.toBeInTheDocument();
            expect(puts).toEqual([]);
        });

        it('shows the dialog for a renamed TV category whose name contains no "tv"', async () => {
            genericStorageFetch(false);
            renderResults(
                <SearchResults
                    data={{
                        ...response,
                        numberOfAvailableResults: 1,
                        searchResults: [
                            {
                                searchResultId: "1",
                                title: "Anime Show 01",
                                indexer: "Mock",
                                category: "Anime",
                            },
                        ],
                    }}
                    searchedCategory={{name: "Anime", searchType: "TVSEARCH"}}
                />,
            );

            expect(
                await screen.findByTestId("group-episodes-help-dialog"),
            ).toBeVisible();
        });
    });

    // FM-162. The table body is window-virtualized, so the assertions here are
    // about two things at once: that only a bounded window of rows is ever
    // mounted, and that everything which is *not* per-row DOM -- selection,
    // expansion, the counts in the toolbar -- is completely unaffected by a
    // row having been unmounted.
    describe("window virtualization (FM-162)", () => {
        // jsdom lays nothing out (every box measures 0) and has no
        // `ResizeObserver`, so a row's height here is the component's own
        // `ESTIMATED_ROW_HEIGHT` fallback and the viewport is jsdom's fixed
        // 768px-tall window. Both are stable, which is what makes a bounded
        // rendered-row count assertable at all; the real heights are covered
        // in the browser by `tests/system/tests/results.spec.ts`.
        const JSDOM_WINDOW_HEIGHT = 768;

        function manyResults(count: number, sharedTitleForFirstTwo = false) {
            return Array.from({length: count}, (_, index) => ({
                searchResultId: `result-${index}`,
                title:
                    sharedTitleForFirstTwo && index === 1
                        ? "Result 000"
                        : `Result ${String(index).padStart(3, "0")}`,
                indexer: "Mock",
                category: "All",
                hash: index,
            }));
        }

        function manyResultsData(count: number, sharedTitle = false) {
            return {
                ...response,
                numberOfAvailableResults: count,
                searchResults: manyResults(count, sharedTitle),
            };
        }

        function scrollWindowTo(offset: number) {
            Object.defineProperty(window, "scrollY", {
                configurable: true,
                value: offset,
                writable: true,
            });
            Object.defineProperty(window, "pageYOffset", {
                configurable: true,
                value: offset,
                writable: true,
            });
            act(() => {
                fireEvent.scroll(window);
            });
        }

        function renderedTitles(): string[] {
            return screen
                .getAllByTestId("search-result-row")
                .map((row) => row.getAttribute("data-result-title") ?? "");
        }

        function selectedCount(): number {
            const summary = screen.getByTestId(
                "search-results-summary",
            ).textContent;
            return Number(/(\d+) selected/.exec(summary ?? "")?.[1] ?? 0);
        }

        afterEach(() => {
            scrollWindowTo(0);
        });

        it("mounts only a bounded window of rows for a result set of ~2000", () => {
            renderResults(<SearchResults data={manyResultsData(2000)} />);

            const rendered = screen.getAllByTestId("search-result-row");
            expect(rendered.length).toBeGreaterThan(0);
            // The bound is a constant of the viewport and the overscan, not a
            // function of the result count: at most one row per estimated row
            // height across the window, plus overscan on both sides, with room
            // to spare. 2000 rows unvirtualized would be 2000 nodes here.
            expect(rendered.length).toBeLessThanOrEqual(
                JSDOM_WINDOW_HEIGHT / 20,
            );
            // The full row set is still what the table stands for.
            expect(screen.getByTestId("search-results-table")).toHaveAttribute(
                "data-row-count",
                "2000",
            );
            // The unrendered rows below are carried by a spacer row's height,
            // inside `<tbody>` -- no transform, no absolute positioning, so
            // the <768px card layout keeps working (asserted in the browser).
            const spacer = screen.getByTestId("results-virtual-spacer-bottom");
            expect(spacer.tagName).toBe("TR");
            expect(spacer.parentElement?.tagName).toBe("TBODY");
            const spacerHeight = parseFloat(
                (spacer.firstElementChild as HTMLElement).style.height,
            );
            expect(spacerHeight).toBeGreaterThan((2000 - rendered.length) * 20);
            // Nothing has scrolled yet, so there is no space above the window.
            expect(
                screen.queryByTestId("results-virtual-spacer-top"),
            ).not.toBeInTheDocument();
        });

        it("renders the window around the scroll position and keeps the row count bounded", () => {
            renderResults(<SearchResults data={manyResultsData(2000)} />);
            expect(renderedTitles()).toContain("Result 000");

            scrollWindowTo(20000);

            const scrolled = renderedTitles();
            expect(scrolled).not.toContain("Result 000");
            expect(scrolled.length).toBeGreaterThan(0);
            expect(scrolled.length).toBeLessThanOrEqual(
                JSDOM_WINDOW_HEIGHT / 20,
            );
            // Both spacers now carry the space above and below the window.
            expect(
                screen.getByTestId("results-virtual-spacer-top"),
            ).toBeInTheDocument();
            expect(
                screen.getByTestId("results-virtual-spacer-bottom"),
            ).toBeInTheDocument();
        });

        it("keeps a shift-range selection anchored on a row that has since been unmounted", () => {
            renderResults(<SearchResults data={manyResultsData(2000)} />);

            const anchorRow = screen
                .getAllByTestId("search-result-row")
                .find(
                    (row) =>
                        row.getAttribute("data-result-title") === "Result 002",
                );
            expect(anchorRow).toBeDefined();
            fireEvent.click(
                within(anchorRow as HTMLElement).getByRole("checkbox"),
            );
            expect(selectedCount()).toBe(1);

            // Scroll the anchor out of the rendered window entirely.
            scrollWindowTo(2000);
            expect(renderedTitles()).not.toContain("Result 002");

            const rows = screen.getAllByTestId("search-result-row");
            const target = rows[rows.length - 1];
            const targetIndex = Number(
                /Result (\d+)/.exec(
                    target.getAttribute("data-result-title") ?? "",
                )?.[1] ?? "0",
            );
            fireEvent.click(within(target).getByRole("checkbox"), {
                shiftKey: true,
            });

            // The whole range from the unmounted anchor to the clicked row is
            // selected, exactly as it would be with every row mounted.
            expect(selectedCount()).toBe(targetIndex - 2 + 1);

            // And the anchor itself comes back still selected.
            scrollWindowTo(0);
            const anchorAgain = screen
                .getAllByTestId("search-result-row")
                .find(
                    (row) =>
                        row.getAttribute("data-result-title") === "Result 002",
                );
            expect(
                within(anchorAgain as HTMLElement).getByRole("checkbox"),
            ).toBeChecked();
        });

        it("applies select-all, deselect-all and invert to every row, mounted or not", () => {
            renderResults(<SearchResults data={manyResultsData(2000)} />);

            scrollWindowTo(20000);
            const headerMenu = screen.getByTestId("header-selection-menu");
            const openSelectionMenu = () => {
                fireEvent.click(
                    within(headerMenu).getByRole("button", {
                        name: "Selection options",
                    }),
                );
            };

            openSelectionMenu();
            fireEvent.click(screen.getByRole("menuitem", {name: "Select all"}));
            expect(selectedCount()).toBe(2000);
            expect(
                within(headerMenu).getByRole("checkbox", {
                    name: "Select all visible results",
                }),
            ).toBeChecked();

            openSelectionMenu();
            fireEvent.click(
                screen.getByRole("menuitem", {name: "Invert selection"}),
            );
            expect(selectedCount()).toBe(0);

            // A single mounted row, then invert again: the 1999 unmounted rows
            // flip too.
            fireEvent.click(
                within(screen.getAllByTestId("search-result-row")[0]).getByRole(
                    "checkbox",
                ),
            );
            expect(selectedCount()).toBe(1);
            openSelectionMenu();
            fireEvent.click(
                screen.getByRole("menuitem", {name: "Invert selection"}),
            );
            expect(selectedCount()).toBe(1999);

            openSelectionMenu();
            fireEvent.click(
                screen.getByRole("menuitem", {name: "Deselect all"}),
            );
            expect(selectedCount()).toBe(0);
        });

        it("keeps a title expansion open while its row is scrolled out of the window", () => {
            renderResults(<SearchResults data={manyResultsData(2000, true)} />);
            const table = screen.getByTestId("search-results-table");
            // Two of the 2000 results share a title, so they collapse into one
            // expandable row.
            expect(table).toHaveAttribute("data-row-count", "1999");

            fireEvent.click(screen.getByRole("button", {name: "Expand group"}));
            expect(table).toHaveAttribute("data-row-count", "2000");

            scrollWindowTo(20000);
            expect(renderedTitles()).not.toContain("Result 000");
            expect(table).toHaveAttribute("data-row-count", "2000");

            scrollWindowTo(0);
            expect(table).toHaveAttribute("data-row-count", "2000");
            expect(
                screen.getByRole("button", {name: "Collapse group"}),
            ).toBeVisible();
        });
    });

    // FM-162: "Load all results" commits to every remaining page in one go,
    // so above a threshold it asks first. "Load more" never does.
    describe("load-all confirmation (FM-162)", () => {
        function pagingData(numberOfAvailableResults: number) {
            return {
                ...response,
                pagingState: "ready" as const,
                offset: 0,
                limit: 1,
                numberOfProcessedResults: 1,
                numberOfAvailableResults,
                searchResults: [
                    {
                        searchResultId: "1",
                        title: "Result",
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
            };
        }

        it("loads without asking below the threshold", async () => {
            const loadMore = vi.fn().mockResolvedValue(undefined);
            renderResults(
                <SearchResults data={pagingData(200)} onLoadMore={loadMore} />,
            );

            fireEvent.click(screen.getByTestId("results-load-all"));

            await vi.waitFor(() => expect(loadMore).toHaveBeenCalledWith(true));
            expect(
                screen.queryByTestId("results-load-all-confirmation"),
            ).not.toBeInTheDocument();
        });

        it("asks before loading everything above the threshold and names the available count", async () => {
            const loadMore = vi.fn().mockResolvedValue(undefined);
            renderResults(
                <SearchResults data={pagingData(4200)} onLoadMore={loadMore} />,
            );

            fireEvent.click(screen.getByTestId("results-load-all"));

            const dialog = await screen.findByTestId(
                "results-load-all-confirmation",
            );
            expect(within(dialog).getByText(/4200 results/)).toBeVisible();
            expect(loadMore).not.toHaveBeenCalled();

            fireEvent.click(
                within(dialog).getByRole("button", {name: "Load all results"}),
            );
            await vi.waitFor(() => expect(loadMore).toHaveBeenCalledWith(true));
        });

        it("leaves the table untouched when the confirmation is dismissed", async () => {
            const loadMore = vi.fn().mockResolvedValue(undefined);
            renderResults(
                <SearchResults data={pagingData(4200)} onLoadMore={loadMore} />,
            );

            fireEvent.click(screen.getByTestId("results-load-all"));
            const dialog = await screen.findByTestId(
                "results-load-all-confirmation",
            );
            fireEvent.click(
                within(dialog).getByRole("button", {name: "Cancel"}),
            );

            await vi.waitFor(() =>
                expect(
                    screen.queryByTestId("results-load-all-confirmation"),
                ).not.toBeInTheDocument(),
            );
            expect(loadMore).not.toHaveBeenCalled();
            expect(screen.getAllByTestId("search-result-row")).toHaveLength(1);
            expect(screen.getByTestId("results-load-all")).toBeEnabled();
        });

        it('prefixes the named count with ">" when the total is a lower bound', async () => {
            const loadMore = vi.fn().mockResolvedValue(undefined);
            renderResults(
                <SearchResults
                    data={{
                        ...pagingData(4200),
                        indexerSearchMetaDatas: [
                            {
                                indexerName: "Mock",
                                wasSuccessful: true,
                                hasMoreResults: true,
                                totalResultsKnown: false,
                            },
                        ],
                    }}
                    onLoadMore={loadMore}
                />,
            );

            fireEvent.click(screen.getByTestId("results-load-all"));

            const dialog = await screen.findByTestId(
                "results-load-all-confirmation",
            );
            expect(within(dialog).getByText(/>4200 results/)).toBeVisible();
        });

        it('never asks for "Load more"', () => {
            const loadMore = vi.fn().mockResolvedValue(undefined);
            renderResults(
                <SearchResults data={pagingData(4200)} onLoadMore={loadMore} />,
            );

            fireEvent.click(screen.getByTestId("results-load-more"));

            expect(loadMore).toHaveBeenCalledWith(false);
            expect(
                screen.queryByTestId("results-load-all-confirmation"),
            ).not.toBeInTheDocument();
        });
    });

    // FM-150. The expand controls are icons in the title cell, so a row that
    // has none would otherwise start its title further left than a row that
    // has one -- the ragged left edge the owner asked to remove. Every row
    // reserves the widest control set any *rendered* row carries, so the proof
    // is per result set, not per row.
    // Maintenance fix: the sticky toolbar's own text carries the "N of M
    // loaded / N filtered / N selected" counters, so its `MutationObserver`
    // fires on every checkbox click -- and the callback reads layout, which
    // forces a synchronous reflow. The re-measure still has to happen (the
    // toolbar's `<Select>`s populate asynchronously); it just has to happen
    // once per frame instead of once per mutation.
    it("coalesces toolbar re-measurements into one animation frame per burst", async () => {
        const frames: (FrameRequestCallback | undefined)[] = [];
        vi.stubGlobal(
            "requestAnimationFrame",
            (callback: FrameRequestCallback) => frames.push(callback),
        );
        vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
            frames[handle - 1] = undefined;
        });
        const measured = vi.fn();
        const realRect = Element.prototype.getBoundingClientRect;
        vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
            function (this: Element) {
                if (this.getAttribute("data-testid") === "results-toolbar") {
                    measured();
                }
                return realRect.call(this);
            },
        );
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha Result",
                            indexer: "Mock",
                            category: "All",
                        },
                        {
                            searchResultId: "2",
                            title: "Bravo Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        measured.mockClear();

        // Two separate selections, so the toolbar's counter text changes
        // twice and the observer delivers twice.
        await act(async () => {
            fireEvent.click(
                screen.getByRole("checkbox", {name: "Select Alpha Result"}),
            );
        });
        await act(async () => {
            fireEvent.click(
                screen.getByRole("checkbox", {name: "Select Bravo Result"}),
            );
        });
        // Nothing has read layout yet: both deliveries only queued a frame,
        // and the second cancelled the first.
        expect(measured).not.toHaveBeenCalled();

        await act(async () => {
            for (const frame of frames) {
                frame?.(0);
            }
        });
        expect(measured).toHaveBeenCalledTimes(1);
    });

    describe("expand-control width reservation", () => {
        it("should reserve nothing when no rendered row can expand anything", () => {
            renderResults(<SearchResults data={mixedExpandData([])} />);

            expect(
                screen.queryAllByTestId("search-result-expand-spacer"),
            ).toHaveLength(0);
            expect(
                screen.queryAllByRole("button", {
                    name: /^(Expand|Collapse) (group|duplicates)$/,
                }),
            ).toHaveLength(0);
        });

        // FM-176: with the option off the duplicate control is not merely
        // hidden -- it does not exist, reserves no width, and its group stays
        // collapsed under its first row, which is exactly legacy's behavior
        // when `duplicatesDisplayed` was false.
        it("should render no duplicate control and reserve no width for one while the option is off", () => {
            renderResults(
                <SearchResults data={mixedExpandData(["duplicate"])} />,
            );

            expect(
                screen.queryAllByTestId("search-result-expand-spacer"),
            ).toHaveLength(0);
            expect(
                screen.queryAllByRole("button", {
                    name: /^(Expand|Collapse) duplicates$/,
                }),
            ).toHaveLength(0);
            expect(document.body.textContent).not.toContain(
                "Expand duplicates",
            );
            expect(document.body.textContent).not.toContain(
                "Collapse duplicates",
            );
            // Both duplicates of "Alpha release" stay folded into one row.
            expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
        });

        it("should reserve one slot on the bare rows when the widest row carries one control", () => {
            renderResults(
                <SearchResults data={mixedExpandData(["duplicate"])} />,
            );
            toggleDuplicateControls();

            expect(expandSlotsByRow()).toEqual([
                ["Alpha release", ["Expand duplicates"]],
                ["Zulu release", ["spacer"]],
            ]);
        });

        it("should reserve two slots when the widest row carries both controls", () => {
            renderResults(
                <SearchResults
                    data={mixedExpandData(["duplicate", "title"])}
                />,
            );
            toggleDuplicateControls();

            expect(expandSlotsByRow()).toEqual([
                ["Alpha release", ["Expand group", "Expand duplicates"]],
                ["Zulu release", ["spacer", "spacer"]],
            ]);
        });

        // FM-176: the slots are positional, so a row that can only expand
        // duplicates leaves the group slot empty rather than sliding its
        // duplicate control into the x where the neighbouring row shows its
        // group control.
        it("should keep the group slot left and the duplicate slot right on a duplicate-only row", () => {
            renderResults(<SearchResults data={groupAndDuplicateOnlyRows()} />);
            toggleDuplicateControls();

            expect(expandSlotsByRow()).toEqual([
                ["Alpha release", ["Expand group", "spacer"]],
                ["Bravo release", ["spacer", "Expand duplicates"]],
            ]);
        });

        it("should keep every row's reservation equal while a group is expanded", () => {
            renderResults(
                <SearchResults
                    data={mixedExpandData(["duplicate", "title"])}
                />,
            );
            toggleDuplicateControls();

            fireEvent.click(screen.getByRole("button", {name: "Expand group"}));

            // The revealed row carries no control of its own, so it spends
            // both slots on spacers -- in the same positions.
            expect(expandSlotsByRow()).toEqual([
                ["Alpha release", ["Collapse group", "Expand duplicates"]],
                ["Alpha release", ["spacer", "spacer"]],
                ["Zulu release", ["spacer", "spacer"]],
            ]);
        });

        // FM-176: turning the option off while a duplicate group is expanded
        // must not leave that group expanded with no control to collapse it.
        it("should collapse an expanded duplicate group when the option is switched off", () => {
            renderResults(
                <SearchResults data={mixedExpandData(["duplicate"])} />,
            );
            toggleDuplicateControls();
            fireEvent.click(
                screen.getByRole("button", {name: "Expand duplicates"}),
            );
            expect(screen.getAllByTestId("search-result-row")).toHaveLength(3);

            toggleDuplicateControls();

            expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
            expect(
                screen.queryAllByRole("button", {
                    name: /^(Expand|Collapse) duplicates$/,
                }),
            ).toHaveLength(0);
            expect(
                screen.queryAllByTestId("search-result-expand-spacer"),
            ).toHaveLength(0);

            // Switching it back on starts from the collapsed state.
            toggleDuplicateControls();
            expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
            expect(
                screen.getByRole("button", {name: "Expand duplicates"}),
            ).toBeInTheDocument();
        });

        it("should render both expand controls as icon buttons that keep their accessible names", () => {
            renderResults(
                <SearchResults
                    data={mixedExpandData(["duplicate", "title"])}
                />,
            );
            toggleDuplicateControls();

            const group = screen.getByRole("button", {name: "Expand group"});
            const duplicates = screen.getByRole("button", {
                name: "Expand duplicates",
            });
            for (const control of [group, duplicates]) {
                expect(control).toHaveClass("MuiIconButton-root");
                expect(control).toHaveAttribute("aria-expanded", "false");
                expect(control).toHaveTextContent("");
            }

            fireEvent.click(group);
            fireEvent.click(duplicates);
            expect(
                screen.getByRole("button", {name: "Collapse group"}),
            ).toHaveAttribute("aria-expanded", "true");
            expect(
                screen.getByRole("button", {name: "Collapse duplicates"}),
            ).toHaveAttribute("aria-expanded", "true");
        });
    });

    // FM-150: the results row opts into `DirectDownloadActions`' icon form so
    // the download sits on the detail-links line. The download history page
    // keeps the text form (asserted in `DownloadHistoryPage.test.tsx`).
    it("should render the row's download control as an icon anchor beside the detail links", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "NZB result",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "NZB",
                        },
                    ],
                }}
            />,
        );

        const download = screen.getByTestId("download-nzb");
        expect(download.tagName).toBe("A");
        expect(download).toHaveClass("MuiIconButton-root");
        expect(download).toHaveAttribute("aria-label", "Download NZB");
        // FM-160: `target="_blank"`/no `download` so a cross-origin indexer
        // redirect opens in a disposable tab instead of navigating the app
        // in-tab (the `download` attribute is dropped on cross-origin
        // redirects).
        expect(download).toHaveAttribute("target", "_blank");
        expect(download).toHaveAttribute("rel", "noopener");
        expect(download).not.toHaveAttribute("download");
        expect(download).toHaveTextContent("");
        // Same Actions stack as the NFO/detail icons, which is what puts them
        // on one line.
        const links = screen.getByTestId("result-links");
        expect(links.parentElement).toBe(download.parentElement);
    });
});

// --- FM-181: the phone chrome ------------------------------------------
//
// Every difference between the phone and desktop renderings is one
// JavaScript branch (`useCompactRefineSurface`, below 768px), so these cases
// state a viewport width rather than relying on a CSS media query jsdom does
// not evaluate. The geometry itself -- bar heights, the footer sitting under
// the last card -- is asserted in a real browser by
// `tests/system/tests/results.spec.ts`.
describe("SearchResults phone chrome", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    const phoneData = {
        ...response,
        numberOfAvailableResults: 2,
        searchResults: [
            {
                searchResultId: "1",
                title: "Phone One",
                indexer: "Alpha",
                category: "Movies",
                downloadType: "NZB",
            },
            {
                searchResultId: "2",
                title: "Phone Two",
                indexer: "Beta",
                category: "TV",
                downloadType: "NZB",
            },
        ],
    };

    function renderPhone(
        node: React.ReactNode = <SearchResults data={phoneData} />,
        width = 390,
    ) {
        stubViewportWidth(width);
        return renderResults(node);
    }

    function selectFirstRow(): void {
        fireEvent.click(
            within(screen.getAllByTestId("search-result-row")[0]).getByRole(
                "checkbox",
            ),
        );
    }

    it("should carry every row-1 control exactly once, in order, with no paging button", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {baseUrl: "/"};
        renderPhone(
            <SearchResults
                data={phoneData}
                onLoadMore={vi.fn()}
                onSaveSearch={vi.fn()}
            />,
        );
        const row = screen.getByTestId("results-toolbar").firstElementChild
            ?.firstElementChild as HTMLElement;
        // `save-search` is an `id`, not a `data-testid` -- the compatibility
        // contract `search.spec.ts` and `focus-indication.spec.ts` query.
        const selectors = [
            '[data-testid="toolbar-selection-menu"]',
            '[data-testid="search-results-summary"]',
            '[data-testid="results-sort-toggle"]',
            '[data-testid="display-options-toggle"]',
            '[data-testid="refine-sidebar-toggle"]',
            "#save-search",
        ];
        for (const selector of selectors) {
            expect(document.querySelectorAll(selector)).toHaveLength(1);
            expect(row).toContainElement(
                document.querySelector(selector) as HTMLElement,
            );
        }
        // Row order, left to right. FM-182: the Sort toggle sits between the
        // count and Display, same as the mock orders the equivalent controls.
        expect(
            [...row.querySelectorAll(selectors.join(", "))].map(
                (element) => element.getAttribute("data-testid") ?? element.id,
            ),
        ).toEqual([
            "toolbar-selection-menu",
            "search-results-summary",
            "results-sort-toggle",
            "display-options-toggle",
            "refine-sidebar-toggle",
            "save-search",
        ]);
        // The two-number count, and nothing else the desktop phrase carries.
        const summary = screen.getByTestId("search-results-summary");
        expect(summary).toHaveTextContent(/^2 \/ 2$/);
        // Paging is in the footer, not the sticky bar.
        expect(row).not.toContainElement(
            screen.getByTestId("results-load-more"),
        );
        expect(screen.getAllByTestId("results-load-more")).toHaveLength(1);
    });

    it("should render the row-1 icon controls with their labels and states", () => {
        renderPhone(
            <SearchResults
                data={phoneData}
                onSaveSearch={vi.fn()}
                savingSearch
            />,
        );
        const display = screen.getByTestId("display-options-toggle");
        expect(display).toHaveClass("MuiIconButton-root");
        expect(display).toHaveAccessibleName("Display options");
        // The same popover, with the same entries.
        fireEvent.click(display);
        expect(
            within(screen.getByTestId("display-options")).getByRole(
                "checkbox",
                {
                    name: "Show refine sidebar",
                },
            ),
        ).toBeInTheDocument();
        fireEvent.click(display);

        const refine = screen.getByTestId("refine-sidebar-toggle");
        expect(refine).toHaveAccessibleName("Expand refine sidebar");
        expect(refine).toHaveAttribute("aria-expanded", "false");
        expect(refine).toHaveAttribute("aria-haspopup", "dialog");

        const save = document.querySelector("#save-search") as HTMLElement;
        expect(save).toHaveClass("MuiIconButton-root");
        expect(save).toHaveAccessibleName("Save search");
        expect(save).toHaveAttribute("aria-busy", "true");
        expect(save).toBeDisabled();
    });

    it("should badge the refine trigger with the active-filter count and open the sheet", async () => {
        renderPhone();
        const refine = screen.getByTestId("refine-sidebar-toggle");
        // Nothing active: MUI hides a zero badge.
        expect(
            refine.parentElement?.querySelector(".MuiBadge-badge"),
        ).toHaveClass("MuiBadge-invisible");

        fireEvent.click(refine);
        expect(refine).toHaveAttribute("aria-expanded", "true");
        const sheet = within(screen.getByTestId("refine-sidebar"));
        expect(sheet.getByTestId("refine-clear-all")).toBeDisabled();
        expect(screen.getByTestId("refine-sidebar-done")).toHaveTextContent(
            "Show 2 results",
        );

        // "two", not "one": every title here contains "Phone", which
        // contains "one".
        fireEvent.change(sheet.getByTestId("refine-filter-title"), {
            target: {value: "two"},
        });
        await settleFilterCommits();
        // The filters apply live -- no draft state -- so the footer's count
        // and the badge both move before the sheet is dismissed.
        expect(screen.getByTestId("refine-sidebar-done")).toHaveTextContent(
            "Show 1 result",
        );
        expect(sheet.getByTestId("refine-clear-all")).toBeEnabled();
        expect(
            refine.parentElement?.querySelector(".MuiBadge-badge"),
        ).toHaveTextContent("1");

        fireEvent.click(screen.getByTestId("refine-sidebar-done"));
        expect(refine).toHaveAttribute("aria-expanded", "false");
        await waitFor(() =>
            expect(
                screen.queryByTestId("refine-sidebar"),
            ).not.toBeInTheDocument(),
        );
    });

    it("should render row 2 only while something is selected", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {downloaders: [{name: "SAB", enabled: true}]},
            },
        };
        renderPhone();
        const toolbarRows = () =>
            screen.getByTestId("results-toolbar").firstElementChild
                ?.childElementCount;
        expect(toolbarRows()).toBe(1);
        expect(
            screen.queryByTestId("results-bulk-actions"),
        ).not.toBeInTheDocument();

        selectFirstRow();
        expect(toolbarRows()).toBe(2);
        const bar = within(screen.getByTestId("results-bulk-actions"));
        expect(bar.getByTestId("results-selection-count")).toHaveTextContent(
            "1 selected",
        );
        // The desktop summary's `· N selected` fragment does not also render.
        expect(
            screen.getByTestId("search-results-summary"),
        ).not.toHaveTextContent("selected");

        fireEvent.click(
            within(screen.getAllByTestId("search-result-row")[0]).getByRole(
                "checkbox",
            ),
        );
        expect(toolbarRows()).toBe(1);
    });

    it("should offer the desktop row's downloader, category, and secondary actions through row 2's two menus", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {name: "SAB", enabled: true},
                        {name: "NZBGet", enabled: true},
                    ],
                    saveTorrentsTo: "/tmp",
                },
                searching: {showResultsAsZipButton: true},
            },
        };
        renderPhone();
        selectFirstRow();
        const bar = within(screen.getByTestId("results-bulk-actions"));
        const send = bar.getByTestId("send-to-downloader");
        expect(send).toHaveTextContent("Send to downloader");
        expect(send).toBeEnabled();
        // No `Select` survives into this row: the two selects' values are the
        // menu's own radio groups.
        expect(bar.queryByRole("combobox")).not.toBeInTheDocument();

        const options = bar.getByTestId("send-to-downloader-options");
        expect(options).toHaveAccessibleName("Send options");
        expect(options).toHaveAttribute("aria-haspopup", "menu");
        fireEvent.click(options);
        const menu = within(screen.getByTestId("send-to-downloader-menu"));
        expect(menu.getByText("Downloader")).toBeInTheDocument();
        expect(menu.getByText("Category")).toBeInTheDocument();
        const sab = menu.getByRole("menuitemradio", {name: "SAB"});
        expect(sab).toHaveAttribute("aria-checked", "true");
        expect(
            menu.getByRole("menuitemradio", {name: "NZBGet"}),
        ).toHaveAttribute("aria-checked", "false");
        expect(
            menu.getByRole("menuitemradio", {name: "Use downloader default"}),
        ).toHaveAttribute("aria-checked", "true");
        fireEvent.click(menu.getByRole("menuitemradio", {name: "NZBGet"}));
        fireEvent.click(bar.getByTestId("send-to-downloader-options"));
        expect(
            within(screen.getByTestId("send-to-downloader-menu")).getByRole(
                "menuitemradio",
                {name: "NZBGet"},
            ),
        ).toHaveAttribute("aria-checked", "true");
        fireEvent.keyDown(screen.getByTestId("send-to-downloader-menu"), {
            key: "Escape",
        });

        const more = bar.getByTestId("results-more-actions");
        expect(more).toHaveAccessibleName("More actions");
        fireEvent.click(more);
        const overflow = within(
            screen.getByTestId("results-more-actions-menu"),
        );
        for (const name of [
            "Download selected NZBs as ZIP",
            "Send selected to black hole",
            "Copy selected links",
        ]) {
            expect(overflow.getByRole("menuitem", {name})).toBeInTheDocument();
        }
        // The ZIP entry keeps the desktop button's own gating: enabled here
        // because the selected result is an NZB.
        expect(
            overflow.getByRole("menuitem", {
                name: "Download selected NZBs as ZIP",
            }),
        ).not.toHaveAttribute("aria-disabled", "true");
    });

    it("should render the paging footer under the table, even with nothing loaded", () => {
        const {rerender} = renderPhone(
            <SearchResults data={phoneData} onLoadMore={vi.fn()} />,
        );
        const footer = screen.getByTestId("results-paging-footer");
        const results = screen.getByTestId("search-results");
        // Last child of the results region -- after the table, not inside the
        // sticky toolbar.
        expect(results.lastElementChild).toBe(footer);
        expect(screen.getByTestId("results-toolbar").contains(footer)).toBe(
            false,
        );
        expect(
            within(footer).getByTestId("results-load-more"),
        ).toBeInTheDocument();
        expect(
            within(footer).getByTestId("results-load-all"),
        ).toBeInTheDocument();

        // The available-results phrase the desktop summary carries instead.
        rerender(
            <DialogProvider>
                <ToastProvider>
                    <SearchResults
                        data={{
                            ...phoneData,
                            searchResults: [],
                            numberOfAvailableResults: 500,
                            numberOfProcessedResults: 0,
                            pagingState: "ready" as const,
                            indexerSearchMetaDatas: [
                                {
                                    indexerName: "Alpha",
                                    wasSuccessful: true,
                                    hasMoreResults: true,
                                    totalResultsKnown: false,
                                },
                            ],
                        }}
                        onLoadMore={vi.fn()}
                    />
                </ToastProvider>
            </DialogProvider>,
        );
        expect(screen.getByTestId("results-paging-footer")).toHaveTextContent(
            ">500 available",
        );
    });

    it("should keep select-all reachable between 600px and the 768px stacking breakpoint", () => {
        renderPhone(<SearchResults data={phoneData} />, 700);
        // The gap FM-181 closes: `thead` is already hidden at 700px while the
        // toolbar copy used to be hidden from 600px up, leaving no select-all
        // at all between the two.
        expect(screen.getAllByTestId("toolbar-selection-menu")).toHaveLength(1);
        fireEvent.click(
            within(screen.getByTestId("toolbar-selection-menu")).getByRole(
                "button",
                {name: "Selection options (mobile)"},
            ),
        );
        fireEvent.click(screen.getByRole("menuitem", {name: "Select all"}));
        expect(
            within(screen.getByTestId("toolbar-selection-menu")).getByRole(
                "checkbox",
                {name: "Select all visible results (mobile)"},
            ),
        ).toBeChecked();
    });

    it("should render none of the phone controls at desktop width", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {baseUrl: "/"};
        stubViewportWidth(1280);
        renderResults(
            <SearchResults
                data={phoneData}
                onLoadMore={vi.fn()}
                onSaveSearch={vi.fn()}
            />,
        );
        for (const testId of [
            "toolbar-selection-menu",
            "results-paging-footer",
            "results-selection-count",
            "results-more-actions",
            "send-to-downloader-options",
            // FM-182: no hidden desktop copy of the phone's sort menu.
            "results-sort-toggle",
            "results-sort-menu",
        ]) {
            expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        }
        // And the desktop chrome is what it always was.
        expect(screen.getByTestId("display-options-toggle")).toHaveTextContent(
            "Display",
        );
        expect(screen.getByTestId("search-results-summary")).toHaveTextContent(
            "2 of 2 loaded",
        );
        expect(
            screen
                .getByTestId("results-toolbar")
                .contains(screen.getByTestId("results-load-more")),
        ).toBe(true);
    });
});

// FM-182: the phone Sort menu writes the same `sorting` state the desktop
// headers write (`onSortingChange: setSorting` in `SearchResults.tsx`), so a
// pick made here is exactly the same state change a header click makes --
// there is no parallel state to keep in sync by hand.
describe("SearchResults phone sort menu", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    const sortData = {
        ...response,
        numberOfAvailableResults: 2,
        searchResults: [
            {
                searchResultId: "1",
                title: "Bravo release",
                indexer: "Beta",
                category: "Movies",
                size: 200,
                grabs: 2,
                age: "2d",
                epoch: 200,
                downloadType: "NZB",
            },
            {
                searchResultId: "2",
                title: "Alpha release",
                indexer: "Alpha",
                category: "TV",
                size: 100,
                grabs: 1,
                age: "1d",
                epoch: 100,
                downloadType: "NZB",
            },
        ],
    };

    function renderSortPhone(choices?: Record<string, unknown>) {
        stubWorkingLocalStorage();
        if (choices) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
        }
        stubViewportWidth(390);
        return renderResults(<SearchResults data={sortData} />);
    }

    function openMenu(): void {
        fireEvent.click(screen.getByTestId("results-sort-toggle"));
    }

    it("should list the six sortable columns in table order with none checked while sorting is empty", () => {
        renderSortPhone({sorting: []});
        openMenu();
        const menu = within(screen.getByTestId("results-sort-menu"));
        const items = menu.getAllByRole("menuitemradio");
        expect(items.map((item) => item.textContent)).toEqual([
            "Title",
            "Indexer",
            "Category",
            "Size",
            "Details",
            "Age",
            "Ascending",
            "Descending",
        ]);
        for (const label of [
            "Title",
            "Indexer",
            "Category",
            "Size",
            "Details",
            "Age",
        ]) {
            expect(
                menu.getByRole("menuitemradio", {name: label}),
            ).toHaveAttribute("aria-checked", "false");
        }
        const ascending = menu.getByRole("menuitemradio", {
            name: "Ascending",
        });
        const descending = menu.getByRole("menuitemradio", {
            name: "Descending",
        });
        expect(ascending).toHaveAttribute("aria-checked", "false");
        expect(descending).toHaveAttribute("aria-checked", "false");
        // `MenuItem` renders an `<li>`, which carries no native `disabled`
        // attribute -- MUI expresses it as `aria-disabled` instead.
        expect(ascending).toHaveAttribute("aria-disabled", "true");
        expect(descending).toHaveAttribute("aria-disabled", "true");
    });

    it("should check the active column and its direction, both enabled, when a sort is active", () => {
        renderSortPhone({sorting: [{id: "size", desc: true}]});
        openMenu();
        const menu = within(screen.getByTestId("results-sort-menu"));
        expect(menu.getByRole("menuitemradio", {name: "Size"})).toHaveAttribute(
            "aria-checked",
            "true",
        );
        for (const label of [
            "Title",
            "Indexer",
            "Category",
            "Details",
            "Age",
        ]) {
            expect(
                menu.getByRole("menuitemradio", {name: label}),
            ).toHaveAttribute("aria-checked", "false");
        }
        const ascending = menu.getByRole("menuitemradio", {
            name: "Ascending",
        });
        const descending = menu.getByRole("menuitemradio", {
            name: "Descending",
        });
        expect(ascending).toHaveAttribute("aria-checked", "false");
        expect(descending).toHaveAttribute("aria-checked", "true");
        expect(ascending).not.toHaveAttribute("aria-disabled");
        expect(descending).not.toHaveAttribute("aria-disabled");
    });

    it("should sort by a column's own auto direction when picked with no sort active, and close the menu", () => {
        const {rerender} = renderSortPhone({sorting: []});
        openMenu();
        // Size is numeric: `column.getAutoSortDir()` is "desc".
        fireEvent.click(
            within(screen.getByTestId("results-sort-menu")).getByRole(
                "menuitemradio",
                {name: "Size"},
            ),
        );
        // Every pick closes the menu (the toggle no longer reports it open).
        expect(screen.getByTestId("results-sort-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );

        openMenu();
        expect(
            within(screen.getByTestId("results-sort-menu")).getByRole(
                "menuitemradio",
                {name: "Size"},
            ),
        ).toHaveAttribute("aria-checked", "true");
        expect(
            within(screen.getByTestId("results-sort-menu")).getByRole(
                "menuitemradio",
                {name: "Descending"},
            ),
        ).toHaveAttribute("aria-checked", "true");
        fireEvent.keyDown(screen.getByTestId("results-sort-menu"), {
            key: "Escape",
        });

        // Trap: `column.getAutoSortDir()` reads off the column instance
        // (`table.getColumn(id)`), not the column def -- a string column's
        // instance reports "asc".
        stubWorkingLocalStorage();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({sorting: []}));
        rerender(<SearchResults data={sortData} />);
        openMenu();
        fireEvent.click(
            within(screen.getByTestId("results-sort-menu")).getByRole(
                "menuitemradio",
                {name: "Indexer"},
            ),
        );
        openMenu();
        expect(
            within(screen.getByTestId("results-sort-menu")).getByRole(
                "menuitemradio",
                {name: "Ascending"},
            ),
        ).toHaveAttribute("aria-checked", "true");
    });

    it("should keep the current sort's direction when picking a different column while a sort is active", () => {
        renderSortPhone({sorting: [{id: "size", desc: true}]});
        openMenu();
        // Title is a string column (auto direction "asc"), but a sort is
        // already active -- the current descending direction survives.
        fireEvent.click(
            within(screen.getByTestId("results-sort-menu")).getByRole(
                "menuitemradio",
                {name: "Title"},
            ),
        );
        openMenu();
        const menu = within(screen.getByTestId("results-sort-menu"));
        expect(
            menu.getByRole("menuitemradio", {name: "Title"}),
        ).toHaveAttribute("aria-checked", "true");
        expect(
            menu.getByRole("menuitemradio", {name: "Descending"}),
        ).toHaveAttribute("aria-checked", "true");
    });

    it("should keep the column and change only the direction when a direction is picked, and close the menu", () => {
        renderSortPhone({sorting: [{id: "title", desc: false}]});
        openMenu();
        fireEvent.click(
            within(screen.getByTestId("results-sort-menu")).getByRole(
                "menuitemradio",
                {name: "Descending"},
            ),
        );
        // Every pick closes the menu (the toggle no longer reports it open).
        expect(screen.getByTestId("results-sort-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );

        openMenu();
        const menu = within(screen.getByTestId("results-sort-menu"));
        expect(
            menu.getByRole("menuitemradio", {name: "Title"}),
        ).toHaveAttribute("aria-checked", "true");
        expect(
            menu.getByRole("menuitemradio", {name: "Ascending"}),
        ).toHaveAttribute("aria-checked", "false");
        expect(
            menu.getByRole("menuitemradio", {name: "Descending"}),
        ).toHaveAttribute("aria-checked", "true");
    });

    it("should write the same `sorting` state the desktop header reads, agreeing after a viewport change", () => {
        const {rerender} = renderSortPhone({sorting: []});
        openMenu();
        fireEvent.click(
            within(screen.getByTestId("results-sort-menu")).getByRole(
                "menuitemradio",
                {name: "Indexer"},
            ),
        );

        // Unstub to a desktop width and re-render the same tree: this is the
        // same `SearchResults` instance and the same `sorting` state the pick
        // just wrote, not a fresh mount reading persisted storage back.
        stubViewportWidth(1280);
        rerender(<SearchResults data={sortData} />);
        expect(
            screen.queryByTestId("results-sort-toggle"),
        ).not.toBeInTheDocument();
        const indexerSort = screen.getByTestId("sort-indexer");
        expect(indexerSort).toHaveAttribute("data-sort-direction", "asc");
        expect(indexerSort.closest("th")).toHaveAttribute(
            "aria-sort",
            "ascending",
        );
    });
});

/**
 * FM-150 fixture: "Alpha release" plus an unrelated "Zulu release" that can
 * never expand anything, with the alpha group shaped to carry the requested
 * controls -- a second same-hash result gives it "Expand duplicates", a
 * different-hash result gives it "Expand group".
 */
function mixedExpandData(controls: ("duplicate" | "title")[]) {
    const alpha = [
        {
            searchResultId: "alpha-one",
            title: "Alpha release",
            indexer: "One",
            category: "TV",
            hash: 1,
        },
    ];
    if (controls.includes("duplicate")) {
        alpha.push({
            searchResultId: "alpha-two",
            title: "Alpha release",
            indexer: "Two",
            category: "TV",
            hash: 1,
        });
    }
    if (controls.includes("title")) {
        alpha.push({
            searchResultId: "alpha-three",
            title: "Alpha release",
            indexer: "Three",
            category: "TV",
            hash: 2,
        });
    }
    const searchResults = [
        ...alpha,
        {
            searchResultId: "zulu",
            title: "Zulu release",
            indexer: "Four",
            category: "TV",
            hash: 9,
        },
    ];
    return {
        ...response,
        numberOfAvailableResults: searchResults.length,
        searchResults,
    };
}

/**
 * FM-176 fixture: a title-group-only row ("Alpha release", two differently
 * hashed results under one title) above a duplicate-only row ("Bravo
 * release", two same-hash results). The pair is what makes a positional slot
 * observable -- with the slots padded rather than positional, Bravo's
 * duplicate control renders in the x Alpha spends on its group control.
 */
function groupAndDuplicateOnlyRows() {
    const searchResults = [
        {
            searchResultId: "alpha-one",
            title: "Alpha release",
            indexer: "One",
            category: "TV",
            hash: 1,
        },
        {
            searchResultId: "alpha-two",
            title: "Alpha release",
            indexer: "Two",
            category: "TV",
            hash: 2,
        },
        {
            searchResultId: "bravo-one",
            title: "Bravo release",
            indexer: "Three",
            category: "TV",
            hash: 3,
        },
        {
            searchResultId: "bravo-two",
            title: "Bravo release",
            indexer: "Four",
            category: "TV",
            hash: 3,
        },
    ];
    return {
        ...response,
        numberOfAvailableResults: searchResults.length,
        searchResults,
    };
}

/**
 * Every rendered row's title paired with what occupies its expand slots, both
 * in render order: a control's accessible name, or "spacer" for the invisible
 * placeholder that reserves the same box. Asserting the sequence (not a
 * count) is what pins FM-176's rule that slot 1 is always the title-group
 * control and slot 2 always the duplicate one.
 */
function expandSlotsByRow(): [string, string[]][] {
    return screen.getAllByTestId("search-result-row").map((row) => {
        const title = row.getAttribute("data-result-title") ?? "";
        const slots = [
            ...(row
                .querySelector('td[data-label="Title"]')
                ?.querySelectorAll(".MuiIconButton-root") ?? []),
        ].map((button) =>
            button.getAttribute("data-testid") === "search-result-expand-spacer"
                ? "spacer"
                : (button.getAttribute("aria-label") ?? ""),
        );
        return [title, slots];
    });
}

const STORAGE_KEY = "hydra.search-results.table";

// The `data-filter-value`s currently selected in one of the refine sidebar's
// toggle-row lists, in the list's own (alphabetical) render order.
function selectedFilterValues(optionTestId: string): string[] {
    return screen
        .getAllByTestId(optionTestId)
        .filter((option) => option.getAttribute("aria-pressed") === "true")
        .map((option) => option.getAttribute("data-filter-value") ?? "");
}

// The same, for the refine sidebar's download-type chip group, which carries
// no per-chip test id and is addressed by accessible name instead.
function selectedTypeChips(): string[] {
    return within(screen.getByTestId("refine-type-chips"))
        .getAllByRole("button")
        .filter((chip) => chip.getAttribute("aria-pressed") === "true")
        .map((chip) => chip.textContent ?? "");
}

function typeChip(label: string): HTMLElement {
    return within(screen.getByTestId("refine-type-chips")).getByRole("button", {
        name: label,
    });
}

// The same title from two download types: ungrouped they are two title groups,
// grouped they become one.
const duplicateAcrossDownloadTypes = [
    {
        searchResultId: "1",
        title: "Shared Release",
        indexer: "One",
        category: "Movies",
        downloadType: "NZB",
    },
    {
        searchResultId: "2",
        title: "Shared Release",
        indexer: "Two",
        category: "Movies",
        downloadType: "TORRENT",
    },
];

// One result inside the mock's three-day recency window, one well outside it,
// and one with no `epoch` at all (no computable age, so never flagged).
function agedResults() {
    const now = Math.floor(Date.now() / 1_000);
    return [
        {
            searchResultId: "recent",
            title: "Recent release",
            indexer: "Mock",
            category: "All",
            epoch: now - 86_400,
            age: "1 day",
        },
        {
            searchResultId: "old",
            title: "Older release",
            indexer: "Mock",
            category: "All",
            epoch: now - 40 * 86_400,
            age: "40 days",
        },
        {
            searchResultId: "ageless",
            title: "Ageless release",
            indexer: "Mock",
            category: "All",
        },
    ];
}

function resultRow(title: string): HTMLElement {
    const row = screen
        .getAllByTestId("search-result-row")
        .find((element) => element.getAttribute("data-result-title") === title);
    if (!row) {
        throw new Error(`No result row titled ${title}`);
    }
    return row;
}

// FM-179: the cover preview is a MUI `Popover`, which stays mounted through
// its own exit transition -- "closed" is therefore awaited, not asserted on
// the next line.
async function popoverClosed(): Promise<void> {
    await waitFor(() =>
        expect(
            screen.queryByTestId("search-result-cover-popover"),
        ).not.toBeInTheDocument(),
    );
}

function storedChoices(): Record<string, unknown> {
    return JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as Record<string, unknown>;
}

// Below `sm` the refine surface renders as a temporary `Drawer` instead of the
// docked column, decided by `useMediaQuery` rather than by CSS `display`.
// jsdom's own `matchMedia` never matches anything, so a mobile viewport has to
// be stated explicitly; `vi.unstubAllGlobals()` in `afterEach` removes it
// again. Mirrors `RefineSidebar.test.tsx`'s identical helper.
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

// FM-181: the same stub, but width-aware, because two of the phone chrome's
// cases turn on *which* width is compact rather than merely that one is: the
// 600-767px band (where the table already stacks but the old CSS switch had
// already hidden the toolbar's select-all) and the 1280px desktop control.
function stubViewportWidth(width: number): void {
    vi.stubGlobal("matchMedia", (query: string) => {
        const max = /max-width:\s*([\d.]+)px/.exec(query);
        const min = /min-width:\s*([\d.]+)px/.exec(query);
        return {
            matches:
                (max === null || width <= Number(max[1])) &&
                (min === null || width >= Number(min[1])),
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        };
    });
}

// The display-options popover is a MUI `Modal`, so while it is open the rest
// of the document is marked `aria-hidden` and role queries outside it
// legitimately find nothing -- hence `closeDisplayOptions` before any
// assertion about the surrounding page. `data-testid` queries are unaffected.
function openDisplayOptions(): HTMLElement {
    const toggle = screen.getByTestId("display-options-toggle");
    if (toggle.getAttribute("aria-expanded") !== "true") {
        fireEvent.click(toggle);
    }
    return screen.getByTestId("display-options");
}

function closeDisplayOptions(): void {
    const toggle = screen.getByTestId("display-options-toggle");
    if (toggle.getAttribute("aria-expanded") === "true") {
        fireEvent.click(toggle);
    }
}

function displayOption(label: string): HTMLElement {
    return within(openDisplayOptions()).getByRole("checkbox", {name: label});
}

// FM-176: the duplicate expand control is opt-in and off by default, so every
// case that addresses it flips "Show duplicate expand controls" the way a user
// would -- and back off again on the next call, hence the name.
function toggleDuplicateControls(): void {
    fireEvent.click(displayOption("Show duplicate expand controls"));
    closeDisplayOptions();
}

// The sidebar defaults collapsed in this non-browser test environment
// (matching the below-`sm` default; see SearchResults.tsx's
// prefersExpandedSidebarByDefault()). Since FM-045 it is the only filter
// surface, so every filter assertion has to expand it first.
function expandRefineSidebar(): void {
    const toggle = screen.getByTestId("refine-sidebar-toggle");
    if (toggle.getAttribute("aria-expanded") !== "true") {
        fireEvent.click(toggle);
    }
}

// One Category/Indexer toggle row, addressed by the value it filters on.
function refineOption(testId: string, value: string): HTMLElement {
    const row = screen
        .getAllByTestId(testId)
        .find((element) => element.getAttribute("data-filter-value") === value);
    if (!row) {
        throw new Error(`No ${testId} row for ${value}`);
    }
    return row;
}

// FM-114: renders the bulk-actions bar for one downloader with a given
// configured default and a given fetched category list, and returns the
// category select once that list has loaded.
async function renderCategorySelect({
    defaultCategory,
    fetchedCategories,
    fetchImplementation = vi
        .fn()
        .mockResolvedValue(jsonResponse(fetchedCategories)),
}: {
    defaultCategory?: string;
    fetchedCategories: string[];
    fetchImplementation?: typeof fetch;
}): Promise<HTMLElement> {
    vi.stubGlobal("fetch", fetchImplementation);
    window.__NZBHYDRA_BOOTSTRAP__ = {
        baseUrl: "/",
        safeConfig: {
            downloading: {
                downloaders: [{name: "SAB", enabled: true, defaultCategory}],
            },
        },
    };
    renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
    const select = categorySelect();
    // The list arrives asynchronously and its entries exist in the DOM only
    // while the menu is open, so opening it and waiting for the first fetched
    // entry is what proves the load has been applied. Escape closes it again.
    fireEvent.mouseDown(select);
    const listbox = screen.getByRole("listbox");
    await within(listbox).findByRole("option", {name: fetchedCategories[0]});
    fireEvent.keyDown(listbox, {key: "Escape"});
    return select;
}

// FM-114: drives one complete bulk send and returns the categories of the two
// requests it makes -- the duplicate probe and the add request. The fetch
// stub answers, in order, the category list, the duplicate probe, and the add.
async function bulkSendCategoryRequest({
    defaultCategory,
    fetchedCategories,
    chooseCategory,
}: {
    defaultCategory?: string;
    fetchedCategories: string[];
    chooseCategory?: string;
}): Promise<{category: unknown; duplicateCheckCategory: unknown}> {
    const fetchImplementation = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(fetchedCategories))
        .mockResolvedValueOnce(jsonResponse({reasonRequired: false}))
        .mockResolvedValueOnce(jsonResponse({successful: true, addedIds: [1]}));
    const select = await renderCategorySelect({
        defaultCategory,
        fetchedCategories,
        fetchImplementation: fetchImplementation as unknown as typeof fetch,
    });
    if (chooseCategory !== undefined) {
        fireEvent.mouseDown(select);
        fireEvent.click(screen.getByRole("option", {name: chooseCategory}));
    }
    fireEvent.click(screen.getByRole("checkbox", {name: "Select NZB result"}));
    fireEvent.click(
        screen.getByRole("button", {name: "Send selected to downloader"}),
    );
    await vi.waitFor(() =>
        expect(fetchImplementation).toHaveBeenCalledTimes(3),
    );
    expect(fetchImplementation.mock.calls[1][0]).toMatch(
        /checkDuplicateMovieDownload$/,
    );
    expect(fetchImplementation.mock.calls[2][0]).toMatch(/addNzbs$/);
    return {
        category: requestCategory(fetchImplementation.mock.calls[2][1]),
        duplicateCheckCategory: requestCategory(
            fetchImplementation.mock.calls[1][1],
        ),
    };
}

// FM-159: the shared parts of the three live-safe-config downloader cases.
// The fetch stub answers by URL rather than in call order, because a
// reconciled selection refetches the category list and would otherwise
// consume the response the send expects.
function liveDownloaderFetch(): (url: RequestInfo | URL) => Promise<Response> {
    return (url) => {
        const target = String(url);
        if (target.includes("/categories")) {
            return Promise.resolve(jsonResponse([]));
        }
        if (target.includes("checkDuplicateMovieDownload")) {
            return Promise.resolve(jsonResponse({reasonRequired: false}));
        }
        return Promise.resolve(jsonResponse({successful: true, addedIds: [1]}));
    };
}

function liveDownloaderTree(
    downloading: Record<string, unknown>,
    rest: Record<string, unknown> = {},
): React.ReactElement {
    return (
        <DialogProvider>
            <ToastProvider>
                <SafeConfigContext.Provider value={{...rest, downloading}}>
                    <SearchResults data={downloadActionResponse("NZB")} />
                </SafeConfigContext.Provider>
            </ToastProvider>
        </DialogProvider>
    );
}

function chooseDownloader(name: string): void {
    const select = screen
        .getByTestId("results-bulk-actions")
        .querySelector('[role="combobox"][aria-label="Downloader"]');
    if (!select) {
        throw new Error("No downloader select");
    }
    fireEvent.mouseDown(select);
    fireEvent.click(screen.getByRole("option", {name}));
}

// Selects the single result, sends it, and reports which downloader the add
// request named.
async function sendToFirstDownloader(
    fetchImplementation: MockedFunction<typeof fetch>,
): Promise<unknown> {
    fireEvent.click(screen.getByRole("checkbox", {name: "Select NZB result"}));
    fireEvent.click(
        screen.getByRole("button", {name: "Send selected to downloader"}),
    );
    const addRequest = await vi.waitFor(() => {
        const call = fetchImplementation.mock.calls.find(([url]) =>
            String(url).includes("internalapi/downloader/addNzbs"),
        );
        if (!call) {
            throw new Error("No add request");
        }
        return call[1] as RequestInit;
    });
    return JSON.parse(String(addRequest.body)).downloaderName;
}

// FM-183: `@mui/material` 9 puts the bare `Select`'s `aria-label` on the
// `role="combobox"` element itself (`Select/SelectInput.mjs`); through 7.3.9 it
// sat on the `MuiInputBase-root` wrapper and the combobox was addressed as its
// descendant. The element this returns is unchanged either way -- the combobox
// is what carries the displayed value and takes the open/close events.
function categorySelect(): HTMLElement {
    const combobox = screen
        .getByTestId("results-bulk-actions")
        .querySelector('[role="combobox"][aria-label="Downloader category"]');
    if (!combobox) {
        throw new Error("No downloader category select");
    }
    return combobox as HTMLElement;
}

function requestCategory(init: RequestInit): unknown {
    return (JSON.parse(String(init.body)) as {category: unknown}).category;
}

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
    });
}

function downloadActionResponse(
    downloadType: "NZB" | "TORRENT" | "TORBOX",
    includeTorrent = false,
) {
    return {
        ...response,
        numberOfAvailableResults: includeTorrent ? 2 : 1,
        searchResults: includeTorrent
            ? [
                  {
                      searchResultId: "1",
                      title: "NZB result",
                      indexer: "Mock",
                      category: "Movies",
                      downloadType: "NZB",
                  },
                  {
                      searchResultId: "2",
                      title: `${downloadType} result`,
                      indexer: "Mock",
                      category: "Movies",
                      downloadType,
                  },
              ]
            : [
                  {
                      searchResultId: "1",
                      title: `${downloadType} result`,
                      indexer: "Mock",
                      category: "Movies",
                      downloadType,
                  },
              ],
    };
}
