import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

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
});
