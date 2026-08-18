import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
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
        expect(screen.getByText("Rejected 2 results.")).toBeVisible();
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

    it("should sort and filter rows with accessible controls", () => {
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
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "/[/"},
        });
        expect(
            screen.queryByTestId("search-result-row"),
        ).not.toBeInTheDocument();

        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: ""},
        });
        fireEvent.change(screen.getByTestId("number-filter-min-refine-size"), {
            target: {value: "4"},
        });
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Zulu WEB",
        );
        fireEvent.click(screen.getByTestId("number-filter-clear-refine-size"));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

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
        // Below `sm` the responsive table styling hides `thead` entirely
        // (see the table's `sx` in SearchResults.tsx), so the header's
        // selection menu is unreachable there; `results-selection-actions`
        // carries a second, functionally-identical copy so bulk selection
        // stays reachable from the toolbar at that viewport. jsdom does not
        // evaluate the CSS media query that keeps only one copy visible at a
        // time in a real browser (asserted for real in
        // tests/system/tests/results.spec.ts); this test only exercises that
        // the toolbar copy is functionally wired to the same selection
        // state, regardless of jsdom's lack of layout.
        const toolbarMenu = within(
            screen.getByTestId("results-selection-actions"),
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
        expect(
            within(bar).getByTestId("results-bulk-actions-summary"),
        ).toHaveTextContent("1 of 1 loaded results");
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
        // FM-046: `search-results-summary` carries no `· N selected`
        // fragment while nothing is selected.
        const summary = screen.getByTestId("search-results-summary");
        expect(summary).not.toHaveTextContent("selected");

        fireEvent.click(
            within(screen.getByTestId("search-result-row")).getByRole(
                "checkbox",
            ),
        );
        expect(
            within(bar).getByTestId("results-selected-count"),
        ).toHaveTextContent("1 selected");
        expect(send).toBeEnabled();
        expect(zip).toBeEnabled();
        // The same "1 selected" fragment also renders inline in
        // `search-results-summary`, unchanged from `results-selected-count`
        // (both render; neither replaces the other).
        expect(summary).toHaveTextContent("1 selected");
    });

    it("should reconcile merged rows without losing active sort, filter, grouping, or valid selection", () => {
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
            within(toolbar).getByTestId("results-selection-actions"),
        ).toBeVisible();
        expect(
            within(toolbar).getByTestId("results-download-actions"),
        ).toBeVisible();
        expect(
            within(table).getByText("Actions", {selector: "th"}),
        ).toBeVisible();
        // The three regions stay distinct: FM-040's bulk-actions bar (counts
        // + the two selection-gated primary actions) is a different element
        // from both results-selection-actions (grouping toggles + the
        // mobile-reachable selection menu) and results-download-actions
        // (downloader select, category select, black hole, copy links, save
        // search).
        const bulkActions = within(toolbar).getByTestId("results-bulk-actions");
        const selectionActions = within(toolbar).getByTestId(
            "results-selection-actions",
        );
        const downloadActions = within(toolbar).getByTestId(
            "results-download-actions",
        );
        expect(bulkActions).not.toBe(selectionActions);
        expect(bulkActions).not.toBe(downloadActions);
        expect(selectionActions).not.toBe(downloadActions);
    });

    // FM-042: `position: sticky` is applied to the whole `results-toolbar`
    // container (matching the mock's own `position:sticky;top:0` toolbar
    // div) and to every table header cell, matching the mock's own
    // `position:sticky;top:51px` header row. It is deliberately *not*
    // applied to the toolbar's individual children (summary,
    // results-bulk-actions, results-selection-actions): `position: sticky`
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
            "results-selection-actions",
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

    it("should drive every filter dimension from the refine-sidebar as the single filter surface", () => {
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
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: ""},
        });
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

    it("should reset every result-side filter via refine-clear-all while leaving sorting, grouping, and selection untouched", () => {
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
        fireEvent.click(refineOption("refine-indexer-option", "One"));
        fireEvent.click(screen.getByRole("button", {name: "NZB"}));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(1);
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );

        fireEvent.click(screen.getByTestId("refine-clear-all"));

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

    it("should persist the refine-sidebar collapsed state in the existing search-results-table localStorage payload alongside sorting and filters", () => {
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
        fireEvent.change(screen.getByTestId("refine-filter-title"), {
            target: {value: "alpha"},
        });
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha Result",
        );
        unmount();

        // A fresh mount reads the same `hydra.search-results.table`
        // localStorage payload the sidebar's collapsed state now shares with
        // sorting and filters -- all three come back together.
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
        expect(screen.getByTestId("refine-filter-title")).toHaveValue("alpha");
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha Result",
        );
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

    it("should persist compact rows and highlight recent in the existing search-results-table payload without persisting the mobile drawer", () => {
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
        closeDisplayOptions();
        const stored = storedChoices();
        expect(stored).toMatchObject({
            compactRows: true,
            highlightRecent: true,
        });
        // The sidebar shortcut adds no key of its own, and the below-`sm`
        // drawer's transient open state is deliberately not persisted.
        expect(Object.keys(stored).sort()).toEqual([
            "compactRows",
            "filters",
            "highlightRecent",
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
});

const STORAGE_KEY = "hydra.search-results.table";

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
