import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {ThemeProvider} from "@mui/material/styles";
import {afterEach, describe, expect, it} from "vitest";

import {createHydraTheme} from "../../../../app/theme";
import type {StatsResult} from "../../../../api/stats/mainStats";
import {IndexersSection} from "./IndexersSection";

function renderSection(stats: StatsResult) {
    render(
        <ThemeProvider theme={createHydraTheme()}>
            <IndexersSection stats={stats} />
        </ThemeProvider>,
    );
}

function rowNames(): string[] {
    return within(screen.getByTestId("stats-indexers-table"))
        .getAllByTestId("stats-indexer-row")
        .map((row) => within(row).getAllByRole("cell")[0].textContent ?? "");
}

afterEach(() => {
    cleanup();
});

describe("IndexersSection", () => {
    it("defaults to indexer-name order and toggles ascending/descending on repeat clicks", () => {
        renderSection({
            avgResponseTimes: [
                {indexer: "Charlie", avgResponseTime: 30},
                {indexer: "Alpha", avgResponseTime: 10},
                {indexer: "Bravo", avgResponseTime: 20},
            ],
        });
        expect(rowNames()).toEqual(["Alpha", "Bravo", "Charlie"]);

        const responseTimeHeader = screen.getByRole("columnheader", {
            name: "Avg. response time (ms)",
        });
        fireEvent.click(
            within(responseTimeHeader).getByText("Avg. response time (ms)"),
        );
        expect(rowNames()).toEqual(["Alpha", "Bravo", "Charlie"]);

        fireEvent.click(
            within(responseTimeHeader).getByText("Avg. response time (ms)"),
        );
        expect(rowNames()).toEqual(["Charlie", "Bravo", "Alpha"]);
    });

    it("sorts a numeric column ascending on first click, keeping rows missing that field last", () => {
        renderSection({
            avgResponseTimes: [
                {indexer: "Alpha", avgResponseTime: 30},
                {indexer: "Bravo"},
                {indexer: "Charlie", avgResponseTime: 10},
            ],
        });
        const responseTimeHeader = screen.getByRole("columnheader", {
            name: "Avg. response time (ms)",
        });
        fireEvent.click(
            within(responseTimeHeader).getByText("Avg. response time (ms)"),
        );
        // Ascending by response time; the row with no response time sorts last
        // regardless of direction.
        expect(rowNames()).toEqual(["Charlie", "Alpha", "Bravo"]);
    });

    it("omits punctuation for missing composite sub-values instead of rendering bare separators", () => {
        renderSection({
            indexerScores: [
                {
                    indexerName: "Alpha",
                    coveragePercent: 50,
                    // providedDownloads/involvedSearches both missing.
                },
                {
                    indexerName: "Beta",
                    // coveragePercent missing, but a fraction half is present.
                    providedDownloads: 4,
                },
            ],
        });
        const rows = within(
            screen.getByTestId("stats-indexers-table"),
        ).getAllByTestId("stats-indexer-row");
        const alphaCells = within(rows[0]).getAllByRole("cell");
        const betaCells = within(rows[1]).getAllByRole("cell");
        // Columns for indexerScores-only: Indexer, Avg. uniqueness score, Coverage.
        expect(alphaCells[2].textContent).toBe("50.0%");
        expect(betaCells[2].textContent).toBe("4");
        expect(alphaCells[2].textContent).not.toContain("(");
        expect(betaCells[2].textContent).not.toMatch(/^\s*\//);
    });

    it("rounds every percentage the table renders to one decimal with its unit", () => {
        renderSection({
            indexerApiAccessStats: [
                {
                    indexerName: "Alpha",
                    percentSuccessful: 95.238095,
                    percentConnectionError: 4.761905,
                    averageAccessesPerDay: 12.4,
                },
            ],
            indexerDownloadShares: [
                {indexerName: "Alpha", total: 30, share: 55.714287},
            ],
            successfulDownloadsPerIndexer: [
                {indexerName: "Alpha", percentSuccessful: 90.909091},
            ],
            indexerScores: [
                {
                    indexerName: "Alpha",
                    averageUniquenessScore: 4.6666,
                    coveragePercent: 79.999999,
                    providedDownloads: 80,
                    involvedSearches: 100,
                    sharedContribution: 1.5,
                    sharedContributionPercent: 20.454545,
                },
            ],
        });
        fireEvent.click(screen.getByTestId("stats-indexers-details-toggle"));
        const cells = within(screen.getByTestId("stats-indexer-row"))
            .getAllByRole("cell")
            .map((cell) => cell.textContent ?? "");
        expect(cells).toContain("95.2%");
        expect(cells).toContain("4.8%");
        expect(cells).toContain("55.7%");
        expect(cells).toContain("90.9%");
        // The uniqueness score is a raw double in the response, not a
        // percentage: one decimal, no unit.
        expect(cells).toContain("4.7");
        expect(cells).toContain("80.0% (80/100)");
        expect(cells).toContain("1.50 (20.5%)");
        // No cell keeps a raw double.
        expect(cells.join(" ")).not.toMatch(/\d\.\d{3}/);
    });

    it("rounds the download-share card's own table", () => {
        renderSection({
            indexerDownloadShares: [
                {indexerName: "Alpha", total: 30, share: 55.714287},
            ],
        });
        fireEvent.click(screen.getByRole("button", {name: "View data"}));
        expect(
            within(
                screen.getByRole("table", {name: "Downloads per indexer"}),
            ).getByText("55.7%"),
        ).toBeInTheDocument();
    });

    it("shows an em dash when a composite cell has neither sub-value, never a bare fraction or parenthetical", () => {
        renderSection({
            indexerScores: [{indexerName: "Alpha"}],
            successfulDownloadsPerIndexer: [{indexerName: "Alpha"}],
        });
        fireEvent.click(screen.getByTestId("stats-indexers-details-toggle"));
        const row = screen.getByTestId("stats-indexer-row");
        const cells = within(row)
            .getAllByRole("cell")
            .map((cell) => cell.textContent ?? "");
        expect(cells).not.toContain("/");
        expect(cells).not.toContain("(%)");
        expect(cells).not.toContain("% (/)");
        expect(cells.filter((text) => text === "—").length).toBeGreaterThan(0);
    });
});
