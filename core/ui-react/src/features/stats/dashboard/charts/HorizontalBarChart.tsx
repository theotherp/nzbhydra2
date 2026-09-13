import {Box, useMediaQuery} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {BarChart} from "@mui/x-charts/BarChart";
import {useEffect, useRef, useState} from "react";

import {categoryAxisWidth, horizontalBarChartHeight} from "./chartSizing";

export type HorizontalBarDatum = {label: string; value: number};

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
}: {
    data: HorizontalBarDatum[];
    seriesLabel: string;
    valueFormatter?: (value: number) => string;
}) {
    const theme = useTheme();
    const narrow = useMediaQuery(theme.breakpoints.down("sm"));
    // FM-172: the category axis is sized from the width the card actually
    // gives this chart, so an indexer name is elided only where it genuinely
    // does not fit. `ResizeObserver` is the `ConfigNav`/`SearchResults` idiom;
    // where it is absent (jsdom, older embedded browsers) the one-shot
    // measurement below still runs and the chart falls back to a fixed
    // ceiling rather than to no chart.
    const containerRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState<number | undefined>(undefined);
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        const measure = () =>
            setChartWidth(
                element.clientWidth > 0 ? element.clientWidth : undefined,
            );
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, []);
    const sorted = [...data].sort((left, right) => right.value - left.value);
    const chartHeight = horizontalBarChartHeight(sorted.length);
    const longestLabel = sorted.reduce(
        (longest, entry) => Math.max(longest, entry.label.length),
        0,
    );
    const axisWidth = categoryAxisWidth(longestLabel, chartWidth, narrow);
    const format = (value: number) => valueFormatter?.(value) ?? String(value);
    return (
        <Box ref={containerRef} sx={{width: "100%"}}>
            <BarChart
                colors={theme.palette.charts.categorical}
                height={chartHeight}
                hideLegend
                layout="horizontal"
                series={[
                    {
                        // A function, not the `"value"` shorthand: the
                        // shorthand prints `String(value)` and never consults
                        // `valueFormatter`, which is what put `55.714287`
                        // inside a bar labelled "Download share %". Returning
                        // `null` for a zero-length bar keeps the shorthand's
                        // one good habit -- a label with no bar to sit in.
                        barLabel: (item) =>
                            item.value ? format(item.value) : null,
                        data: sorted.map((entry) => entry.value),
                        label: seriesLabel,
                        valueFormatter: (value) =>
                            value === null ? "" : format(value),
                    },
                ]}
                yAxis={[
                    {
                        data: sorted.map((entry) => entry.label),
                        scaleType: "band",
                        // x-charts ellipsizes each tick to this width against
                        // the glyphs it is drawing, and the tooltip keeps the
                        // whole label, so nothing is unreachable.
                        width: axisWidth,
                    },
                ]}
            />
        </Box>
    );
}
