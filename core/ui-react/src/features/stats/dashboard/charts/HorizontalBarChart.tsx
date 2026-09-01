import {useMediaQuery} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {BarChart} from "@mui/x-charts/BarChart";

export type HorizontalBarDatum = {label: string; value: number};

/**
 * How much room one character of a category label needs, and the padding
 * between the longest label and its axis. Approximations rather than
 * measurements: the exact advance width depends on the glyphs, and the point
 * of deriving the margin at all is that a chart of short labels should not
 * reserve room for long ones.
 */
const LABEL_CHARACTER_WIDTH = 7;
const LABEL_GUTTER = 16;

/**
 * The most the labels may take from the plot. The wide ceiling is the value
 * this chart used to reserve unconditionally; the narrow one keeps the bars
 * themselves legible on a phone, where 140px of a 390px viewport left roughly
 * 200px of plot -- a "share" chart whose bars are too short to compare is not
 * showing anything.
 */
const WIDE_LABEL_MARGIN = 140;
const NARROW_LABEL_MARGIN = 84;

/**
 * Vertical room per bar, and the bounds the total is clamped to: a one-row
 * chart still needs an axis, and a fifty-indexer chart stops growing before it
 * becomes a page of its own.
 */
const ROW_HEIGHT = 34;
const MIN_CHART_HEIGHT = 160;
const MAX_CHART_HEIGHT = 900;

/**
 * The height this chart takes for a given number of rows. Exported because
 * `ChartCard` reserves the same height for a chart it has not mounted yet
 * (FM-164): a placeholder sized by a guess would move everything below it once
 * the real chart arrived, which is exactly the shift the deferral is meant to
 * avoid.
 */
export function horizontalBarChartHeight(rowCount: number): number {
    return Math.min(
        Math.max(rowCount * ROW_HEIGHT, MIN_CHART_HEIGHT),
        MAX_CHART_HEIGHT,
    );
}

/**
 * A value-labeled horizontal bar chart, sorted descending by value. Used for
 * every "share"/"proportion" family (ADR-0021: sorted bars, never
 * pie/donut) and for the Indexers section's download-share and
 * response-time charts.
 */
export function HorizontalBarChart({
    data,
    seriesLabel,
    valueFormatter,
    height,
}: {
    data: HorizontalBarDatum[];
    seriesLabel: string;
    valueFormatter?: (value: number) => string;
    height?: number;
}) {
    const theme = useTheme();
    const narrow = useMediaQuery(theme.breakpoints.down("sm"));
    const sorted = [...data].sort((left, right) => right.value - left.value);
    const chartHeight = height ?? horizontalBarChartHeight(sorted.length);
    const longestLabel = sorted.reduce(
        (longest, entry) => Math.max(longest, entry.label.length),
        0,
    );
    const labelMargin = Math.min(
        longestLabel * LABEL_CHARACTER_WIDTH + LABEL_GUTTER,
        narrow ? NARROW_LABEL_MARGIN : WIDE_LABEL_MARGIN,
    );
    // A label that no longer fits its margin is elided rather than clipped
    // mid-glyph. Ticks only: the tooltip keeps the whole label, so nothing is
    // unreachable.
    const tickCharacters = Math.floor(
        (labelMargin - LABEL_GUTTER) / LABEL_CHARACTER_WIDTH,
    );
    return (
        <BarChart
            colors={theme.palette.charts.categorical}
            height={chartHeight}
            hideLegend
            layout="horizontal"
            margin={{left: labelMargin}}
            series={[
                {
                    barLabel: "value",
                    data: sorted.map((entry) => entry.value),
                    label: seriesLabel,
                    valueFormatter: (value) =>
                        value === null
                            ? ""
                            : (valueFormatter?.(value) ?? String(value)),
                },
            ]}
            yAxis={[
                {
                    data: sorted.map((entry) => entry.label),
                    scaleType: "band",
                    valueFormatter: (label: string, context) =>
                        context.location === "tick"
                            ? elide(label, tickCharacters)
                            : label,
                },
            ]}
        />
    );
}

function elide(label: string, characters: number): string {
    return label.length <= characters
        ? label
        : `${label.slice(0, Math.max(characters - 1, 1))}…`;
}
