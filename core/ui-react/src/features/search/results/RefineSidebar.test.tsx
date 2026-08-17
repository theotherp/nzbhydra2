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
import {defaultFilters, quickFilterKey} from "./resultTable";

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

function Harness({
    collapsed = false,
    loadedResults = results,
    onClearAll = vi.fn(),
    onToggleCollapsed = vi.fn(),
    quickFilters = [],
}: {
    collapsed?: boolean;
    loadedResults?: SearchResult[];
    onClearAll?: () => void;
    onToggleCollapsed?: () => void;
    quickFilters?: QuickFilter[];
}) {
    const [filters, setFilters] = useState<ResultFilters>(() =>
        defaultFilters(loadedResults, quickFilters),
    );
    return (
        <RefineSidebar
            clearRange={(name) =>
                setFilters((current) => ({
                    ...current,
                    [name]: {min: "", max: ""},
                }))
            }
            collapsed={collapsed}
            filters={filters}
            onClearAll={onClearAll}
            onToggleCollapsed={onToggleCollapsed}
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
            updateRange={(name, bound, value) =>
                setFilters((current) => ({
                    ...current,
                    [name]: {...current[name], [bound]: value},
                }))
            }
        />
    );
}

describe("RefineSidebar", () => {
    afterEach(() => {
        cleanup();
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

    it("toggling a category checkbox narrows the bound filters.categories selection", () => {
        render(<Harness />);
        const categoryList = screen.getByTestId("refine-category-list");
        const moviesCheckbox = within(categoryList).getByLabelText(/Movies/);
        expect(moviesCheckbox).toBeChecked();
        fireEvent.click(moviesCheckbox);
        expect(moviesCheckbox).not.toBeChecked();
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
});
