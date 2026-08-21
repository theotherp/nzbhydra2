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
        expect(alphaCells[2].textContent).toBe("50%");
        expect(betaCells[2].textContent).toBe("4");
        expect(alphaCells[2].textContent).not.toContain("(");
        expect(betaCells[2].textContent).not.toMatch(/^\s*\//);
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
