import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

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
};

describe("SearchResults", () => {
    afterEach(() => {
        cleanup();
        window.localStorage?.clear();
        delete window.__NZBHYDRA_BOOTSTRAP__;
    });

    it("should render no-picked, all-failed, empty, warning, and rejected states", () => {
        const {rerender} = render(
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

    it("should preserve result selectors for valid entries", () => {
        render(
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
        render(<SearchResults data={{...response, malformedResultCount: 1}} />);
        expect(
            screen.getByText("1 malformed result entries were not displayed."),
        ).toBeVisible();
    });

    it("should sort and filter rows with accessible controls", () => {
        render(
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
        expect(titleSort).toHaveTextContent("Title (ascending)");
        expect(
            screen.getAllByTestId("search-result-title")[0],
        ).toHaveTextContent("Alpha BluRay");
        fireEvent.click(titleSort);
        expect(titleSort).toHaveTextContent("Title (descending)");
        fireEvent.click(titleSort);

        fireEvent.change(screen.getByTestId("freetext-filter-title"), {
            target: {value: "!web"},
        });
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
        fireEvent.change(screen.getByTestId("freetext-filter-title"), {
            target: {value: "/[/"},
        });
        expect(
            screen.queryByTestId("search-result-row"),
        ).not.toBeInTheDocument();

        fireEvent.change(screen.getByTestId("freetext-filter-title"), {
            target: {value: ""},
        });
        fireEvent.change(screen.getByTestId("number-filter-min-size"), {
            target: {value: "4"},
        });
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Zulu WEB",
        );
        fireEvent.click(screen.getByTestId("number-filter-clear-size"));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        const indexerFilter = within(
            screen.getByTestId("filter-toggle-indexer"),
        );
        fireEvent.click(indexerFilter.getByLabelText("One"));
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
    });

    it("should visibly sort every sortable column", () => {
        render(
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
            expect(sort).toHaveTextContent(
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
        render(
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

        expect(screen.getByRole("button", {name: "WEB"})).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "WEB-DL release",
        );
    });

    it("should expand groups and support keyboard bulk and shift selection", () => {
        render(
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
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(3);
        const checkboxes = screen.getAllByRole("checkbox", {name: /Select/});
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
        const deselectAll = screen.getByRole("button", {name: "Deselect all"});
        deselectAll.focus();
        fireEvent.keyDown(deselectAll, {key: "Enter"});
        checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
    });
});
