/**
 * Chart height constants and derivations shared by the dashboard's chart
 * components. Kept out of the chart component files themselves so those
 * files export components only -- a component file that also exports a
 * plain function or constant trips `react-refresh/only-export-components`.
 */

/**
 * Vertical room per bar, and the bounds the total is clamped to: a one-row
 * chart still needs an axis, and a fifty-indexer chart stops growing before it
 * becomes a page of its own.
 */
const ROW_HEIGHT = 34;
const MIN_CHART_HEIGHT = 160;
const MAX_CHART_HEIGHT = 900;

/**
 * The height `HorizontalBarChart` takes for a given number of rows. Exported
 * because `ChartCard` reserves the same height for a chart it has not
 * mounted yet (FM-164): a placeholder sized by a guess would move everything
 * below it once the real chart arrived, which is exactly the shift the
 * deferral is meant to avoid.
 */
export function horizontalBarChartHeight(rowCount: number): number {
    return Math.min(
        Math.max(rowCount * ROW_HEIGHT, MIN_CHART_HEIGHT),
        MAX_CHART_HEIGHT,
    );
}

/**
 * The total height `GroupedBarChart` occupies, legend included. Exported for
 * the same reason as `horizontalBarChartHeight`: `ChartCard` reserves it
 * while the chart is still below the fold (FM-164), and a reservation that
 * missed by the legend's height would move everything below the card once
 * the chart mounted.
 */
export const GROUPED_BAR_CHART_HEIGHT = 300;
