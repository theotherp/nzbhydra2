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
 * How much room one character of a category label needs, and the padding the
 * axis wants around the longest of them (`@mui/x-charts` spends part of the
 * axis width on the tick mark and its gap before any text is drawn).
 *
 * An estimate rather than a measurement, and deliberately a generous one:
 * this number sizes the space *reserved*, while x-charts does the eliding
 * against the glyphs it actually draws. Under-reserving would cut a name that
 * had room; over-reserving only costs a chart of short labels a little plot
 * width, and the ceiling below bounds it either way.
 */
const LABEL_CHARACTER_WIDTH = 8;
const LABEL_GUTTER = 16;

/**
 * The share of the chart's own width the category axis may take. The ceiling
 * exists so the bars stay comparable -- a "share" chart whose bars are shorter
 * than their labels is not showing anything -- and it is the only thing that
 * elides a label. Before FM-172 the axis took x-charts' default 45px however
 * wide the card was, which cut every indexer name to about 4 characters.
 */
const LABEL_WIDTH_SHARE = 0.5;

/**
 * The ceiling before the chart has measured itself: no `ResizeObserver` yet
 * (first paint), or an environment without one. The width the chart's old
 * `margin.left` reserved, so an unmeasured chart still shows a useful part of
 * a long label instead of a guess in either direction.
 */
const UNMEASURED_LABEL_CEILING = 140;

/**
 * The tighter ceiling below `sm`, where half of a 390px viewport would still
 * leave bars too short to compare. Labels beyond it are elided honestly and
 * stay whole in the axis tooltip.
 */
const NARROW_LABEL_CEILING = 84;

/**
 * The floor the ceiling itself is never pushed below, so a card that reports
 * an implausibly small width still shows a few characters and an ellipsis
 * instead of nothing.
 */
const MIN_LABEL_WIDTH = LABEL_GUTTER + LABEL_CHARACTER_WIDTH * 4;

/**
 * The width `HorizontalBarChart` gives its category (y) axis: as much as the
 * longest label present asks for, bounded by the ceiling above. `chartWidth`
 * is the chart's measured outer width, or `undefined` before it has been
 * measured.
 *
 * This is the axis's own `width`, not a chart margin: `@mui/x-charts` 9 sizes
 * the axis from that property (defaulting to 45px) and ellipsizes each tick
 * label to fit it, so a margin alone moves the plot without giving the labels
 * a single extra pixel.
 */
export function categoryAxisWidth(
    longestLabelCharacters: number,
    chartWidth: number | undefined,
    narrow: boolean,
): number {
    const wanted =
        longestLabelCharacters * LABEL_CHARACTER_WIDTH + LABEL_GUTTER;
    const measuredCeiling =
        chartWidth === undefined
            ? UNMEASURED_LABEL_CEILING
            : chartWidth * LABEL_WIDTH_SHARE;
    const ceiling = narrow
        ? Math.min(measuredCeiling, NARROW_LABEL_CEILING)
        : measuredCeiling;
    return Math.round(Math.min(wanted, Math.max(ceiling, MIN_LABEL_WIDTH)));
}

/**
 * The total height `GroupedBarChart` occupies, legend included. Exported for
 * the same reason as `horizontalBarChartHeight`: `ChartCard` reserves it
 * while the chart is still below the fold (FM-164), and a reservation that
 * missed by the legend's height would move everything below the card once
 * the chart mounted.
 */
export const GROUPED_BAR_CHART_HEIGHT = 300;
