import {render, screen} from "@testing-library/react";
import {ThemeProvider} from "@mui/material/styles";
import {describe, expect, it} from "vitest";

import {createHydraTheme} from "../../../../app/theme";
import type {StatsResult} from "../../../../api/stats/mainStats";
import {DownloadAgeSection} from "./DownloadAgeSection";

function renderSection(stats: StatsResult) {
    render(
        <ThemeProvider theme={createHydraTheme()}>
            <DownloadAgeSection stats={stats} />
        </ThemeProvider>,
    );
}

describe("DownloadAgeSection", () => {
    it("rounds the summary stats to one decimal, with a unit only on the percentages", () => {
        renderSection({
            downloadsPerAgeStats: {
                averageAge: 45.284,
                percentOlder1000: 55.714287,
                percentOlder2000: 2.5,
                percentOlder3000: 0,
                downloadsPerAge: [{age: 100, count: 3}],
            },
        });
        expect(screen.getByTestId("stats-age-average")).toHaveTextContent(
            "45.3",
        );
        expect(screen.getByTestId("stats-age-average")).not.toHaveTextContent(
            "%",
        );
        expect(screen.getByTestId("stats-age-older-1000")).toHaveTextContent(
            "55.7%",
        );
        expect(screen.getByTestId("stats-age-older-2000")).toHaveTextContent(
            "2.5%",
        );
        expect(screen.getByTestId("stats-age-older-3000")).toHaveTextContent(
            "0.0%",
        );
    });

    it("shows an em dash for a summary value the backend did not send", () => {
        renderSection({downloadsPerAgeStats: {downloadsPerAge: []}});
        expect(screen.getByTestId("stats-age-average")).toHaveTextContent("—");
        expect(screen.getByTestId("stats-age-older-1000")).toHaveTextContent(
            "—",
        );
    });
});
