import {fireEvent, render, screen, within} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it} from "vitest";

import type {SearchResponse} from "../../../api/search";
import {stubNarrowViewport} from "../../../test/browserStubs";
import {IndexerSummary} from "./IndexerSummary";

const baseResponse: SearchResponse = {
    searchResults: [],
    malformedResultCount: 0,
    indexerSearchMetaDatas: [],
    indexerLimitWarnings: [],
    rejectedReasonsMap: {},
    notPickedIndexersWithReason: {},
    numberOfAvailableResults: 0,
    numberOfRejectedResults: 0,
    pagingState: "partial",
};

// One failed, two successful (one of them with an unknown total) and one
// not-picked indexer, handed over in an order the summary must not keep.
const mixedResponse: SearchResponse = {
    ...baseResponse,
    indexerSearchMetaDatas: [
        {
            indexerName: "Zulu",
            wasSuccessful: true,
            didSearch: true,
            responseTime: 400,
            numberOfFoundResults: 100,
            numberOfAvailableResults: 2500,
            totalResultsKnown: true,
        },
        {
            indexerName: "Broken",
            wasSuccessful: false,
            didSearch: true,
            errorMessage: "Connection timed out",
            responseTime: 0,
        },
        {
            indexerName: "Alpha",
            wasSuccessful: true,
            didSearch: true,
            responseTime: 2000,
            numberOfFoundResults: 50,
            numberOfAvailableResults: 100,
            totalResultsKnown: false,
        },
    ],
    notPickedIndexersWithReason: {Skipped: "Disabled by the user"},
};

function Harness({
    data,
    initialOpen = false,
}: {
    data: SearchResponse;
    initialOpen?: boolean;
}) {
    const [open, setOpen] = useState(initialOpen);
    return <IndexerSummary data={data} onOpenChange={setOpen} open={open} />;
}

function rowNames(): string[] {
    return within(screen.getByTestId("indexer-summary-details"))
        .getAllByTestId(/^indexer-summary-row-/)
        .map(
            (row) =>
                row
                    .getAttribute("data-testid")
                    ?.replace("indexer-summary-row-", "") ?? "",
        );
}

describe("IndexerSummary", () => {
    afterEach(() => {
        delete window.__NZBHYDRA_BOOTSTRAP__;
    });

    it("should render nothing when no indexer was searched or passed over", () => {
        render(<Harness data={baseResponse} />);
        expect(screen.queryByTestId("indexer-summary")).toBeNull();
    });

    it("should summarise searched, failed, not-searched and the slowest indexer on one collapsed line", () => {
        render(<Harness data={mixedResponse} />);
        const toggle = screen.getByTestId("indexer-summary-toggle");
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(toggle).toHaveTextContent(
            "Indexers · 3 searched · 1 failed · 1 not searched · slowest Alpha (2.00 s)",
        );
        expect(screen.queryByTestId("indexer-summary-details")).toBeNull();
    });

    it("should leave out the failed and not-searched counts when they are zero", () => {
        render(
            <Harness
                data={{
                    ...baseResponse,
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Alpha",
                            wasSuccessful: true,
                            responseTime: 12_345,
                        },
                    ],
                }}
            />,
        );
        const toggle = screen.getByTestId("indexer-summary-toggle");
        expect(toggle).toHaveTextContent(
            "Indexers · 1 searched · slowest Alpha (12.3 s)",
        );
        expect(screen.queryByTestId("indexer-summary-failed")).toBeNull();
        expect(screen.queryByTestId("indexer-summary-notSearched")).toBeNull();
    });

    it("should shorten the collapsed line to counts below 768px", () => {
        stubNarrowViewport();
        render(<Harness data={mixedResponse} />);
        expect(screen.getByTestId("indexer-summary-toggle")).toHaveTextContent(
            /^3 searched · 1 failed · 1 not searched$/,
        );
    });

    it("should expand into rows ordered failed, successful by name, then not searched", () => {
        render(<Harness data={mixedResponse} />);
        fireEvent.click(screen.getByTestId("indexer-summary-toggle"));
        expect(screen.getByTestId("indexer-summary-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(rowNames()).toEqual(["Broken", "Alpha", "Zulu", "Skipped"]);
    });

    it("should show results as found of total, with a lower-bound marker and blanks for failed or skipped indexers", () => {
        render(<Harness data={mixedResponse} initialOpen />);
        const cells = (name: string) =>
            within(screen.getByTestId(`indexer-summary-row-${name}`))
                .getAllByRole("cell")
                .map((cell) => cell.textContent);

        expect(cells("Zulu")[1]).toBe("100 of 2,500");
        expect(cells("Alpha")[1]).toBe("50 of >100");
        expect(cells("Broken")[1]).toBe("");
        expect(cells("Skipped")[1]).toBe("");
    });

    it("should show response times as seconds against the slowest indexer", () => {
        render(<Harness data={mixedResponse} initialOpen />);
        const alpha = screen.getByTestId("indexer-summary-row-Alpha");
        const zulu = screen.getByTestId("indexer-summary-row-Zulu");
        expect(alpha).toHaveTextContent("2.00 s");
        expect(zulu).toHaveTextContent("0.40 s");
        expect(
            within(alpha).getByRole("progressbar", {
                name: "Response time of Alpha, relative to the slowest indexer",
            }),
        ).toHaveAttribute("aria-valuenow", "100");
        expect(
            within(zulu).getByRole("progressbar", {
                name: "Response time of Zulu, relative to the slowest indexer",
            }),
        ).toHaveAttribute("aria-valuenow", "20");
        // A failed request that reports 0ms has no response time to show.
        expect(
            within(
                screen.getByTestId("indexer-summary-row-Broken"),
            ).queryByRole("progressbar"),
        ).toBeNull();
    });

    it("should state the error of a failed indexer and the reason an indexer was not searched", () => {
        render(<Harness data={mixedResponse} initialOpen />);
        const broken = screen.getByTestId("indexer-summary-row-Broken");
        expect(within(broken).getByTitle("Failed")).toBeInTheDocument();
        expect(broken).toHaveTextContent("Connection timed out");
        expect(
            within(screen.getByTestId("indexer-summary-row-Alpha")).getByTitle(
                "Succeeded",
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId("indexer-summary-row-Skipped"),
        ).toHaveTextContent("Not searched: Disabled by the user");
    });

    it("should link failed and not-searched indexers to the indexer statuses page when stats may be seen", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/hydra/",
            maySeeStats: true,
            statsRestricted: true,
        };
        render(<Harness data={mixedResponse} initialOpen />);
        for (const name of ["Broken", "Skipped"]) {
            const link = within(
                screen.getByTestId(`indexer-summary-row-${name}`),
            ).getByRole("link", {name});
            expect(link).toHaveAttribute("href", "/hydra/stats/indexers");
            expect(link).toHaveAttribute("target", "_blank");
        }
        expect(
            within(screen.getByTestId("indexer-summary-row-Alpha")).queryByRole(
                "link",
            ),
        ).toBeNull();
    });

    it("should show plain names when stats are restricted and this session may not see them", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            maySeeStats: false,
            statsRestricted: true,
        };
        render(<Harness data={mixedResponse} initialOpen />);
        const details = screen.getByTestId("indexer-summary-details");
        expect(within(details).queryAllByRole("link")).toEqual([]);
        expect(
            screen.getByTestId("indexer-summary-row-Broken"),
        ).toHaveTextContent("Broken");
    });

    it("should lay each indexer out as a two-line card below 768px", () => {
        stubNarrowViewport();
        render(<Harness data={mixedResponse} initialOpen />);
        const details = screen.getByTestId("indexer-summary-details");
        expect(within(details).queryByRole("table")).toBeNull();
        expect(rowNames()).toEqual(["Broken", "Alpha", "Zulu", "Skipped"]);
        const alpha = screen.getByTestId("indexer-summary-row-Alpha");
        expect(alpha.children).toHaveLength(2);
        expect(alpha).toHaveTextContent("50 of >100");
        expect(
            within(alpha).getByRole("progressbar", {
                name: "Response time of Alpha, relative to the slowest indexer",
            }),
        ).toBeInTheDocument();
    });

    it("should summarise an all-not-picked search", () => {
        render(
            <Harness
                data={{
                    ...baseResponse,
                    notPickedIndexersWithReason: {Only: "No matching category"},
                }}
            />,
        );
        expect(screen.getByTestId("indexer-summary-toggle")).toHaveTextContent(
            /^Indexers · 0 searched · 1 not searched$/,
        );
    });
});
