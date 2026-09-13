import {render} from "@testing-library/react";
import {ThemeProvider} from "@mui/material/styles";
import {afterEach, describe, expect, it} from "vitest";

import {createHydraTheme} from "../../../../app/theme";
import {HorizontalBarChart} from "./HorizontalBarChart";

const LONG_NAME = "NZBIndexerWithAVeryLongName123";

/**
 * jsdom reports every element as 0x0, so the chart would only ever see its
 * unmeasured fallback. Stating a width here is what makes the desktop case --
 * the one the reader complained about -- assertable at all; the drawn result
 * at 1280x800 is verified for real in `tests/system/tests/stats.spec.ts`.
 */
function withCardWidth(width: number) {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
        configurable: true,
        get: () => width,
    });
}

afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

/**
 * The width the category axis was given. x-charts places the y-axis group at
 * its own default 20px chart margin plus the axis width, and that width is
 * the property deciding both the room the labels get and the width they are
 * ellipsized to -- so it is the honest thing to assert in an environment that
 * measures no text.
 */
const CHART_DEFAULT_LEFT_MARGIN = 20;

function categoryAxisWidth(container: HTMLElement): number {
    const axis = container.querySelector(".MuiChartsAxis-directionY");
    const transform = axis?.getAttribute("transform") ?? "";
    const offset = Number(/translate\((-?\d+(?:\.\d+)?)/.exec(transform)?.[1]);
    return offset - CHART_DEFAULT_LEFT_MARGIN;
}

function renderChart(labels: string[]) {
    return render(
        <ThemeProvider theme={createHydraTheme()}>
            <HorizontalBarChart
                data={labels.map((label, index) => ({
                    label,
                    value: labels.length - index,
                }))}
                seriesLabel="Download share %"
                valueFormatter={(value) => `${value.toFixed(1)}%`}
            />
        </ThemeProvider>,
    );
}

describe("HorizontalBarChart", () => {
    it("gives a 30-character indexer name a category axis wide enough to print it", () => {
        expect(LONG_NAME).toHaveLength(30);
        withCardWidth(1200);
        const {container} = renderChart([LONG_NAME, "Short"]);
        // 256px, not x-charts' default 45px: the axis asks for what the
        // longest label needs, and it is well inside the 600px ceiling.
        expect(categoryAxisWidth(container)).toBe(256);
        expect(
            [...container.querySelectorAll(".MuiChartsAxis-tickLabel")].map(
                (tick) => tick.textContent,
            ),
        ).toContain(LONG_NAME);
    });

    it("caps the axis at half the chart where the card is genuinely narrow", () => {
        withCardWidth(300);
        const {container} = renderChart([LONG_NAME, "Short"]);
        expect(categoryAxisWidth(container)).toBe(150);
    });

    it("draws its value labels for exactly one series, which is what ADR-0053 rests on", () => {
        // The bar-label contrast this application asserts is measured against
        // `palette.charts.categorical[0]` alone, because a labelled bar can
        // only ever take the first series colour. A second labelled series
        // here would paint labels on `categorical[1]` and silently fall below
        // 4.5:1, so the single series is pinned rather than assumed.
        withCardWidth(1200);
        const {container} = renderChart(["Alpha", "Beta", "Gamma"]);
        expect(
            container.querySelectorAll(".MuiBarChart-seriesLabels"),
        ).toHaveLength(1);
    });

    it("formats a bar's own value label, rather than printing the raw number", () => {
        withCardWidth(1200);
        const {container} = renderChart(["Alpha"]);
        // x-charts' `barLabel: "value"` shorthand would print "1" here, and
        // did print "55.714287" on the real dashboard.
        expect(
            [...container.querySelectorAll(".MuiBarChart-label")].map(
                (label) => label.textContent,
            ),
        ).toEqual(["1.0%"]);
    });
});
