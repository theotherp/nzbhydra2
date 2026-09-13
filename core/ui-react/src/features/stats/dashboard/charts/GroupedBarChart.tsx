import {Box} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {BarChart} from "@mui/x-charts/BarChart";

import {GROUPED_BAR_CHART_HEIGHT} from "./chartSizing";

export type GroupedBarSeries = {label: string; data: number[]};

/**
 * Vertical grouped-bar chart for the Activity section: one or two series
 * (searches/downloads) over a fixed calendar/clock category order -- the
 * category order is the caller's responsibility, never value order.
 */
export function GroupedBarChart({
    categories,
    series,
    yLabel,
}: {
    categories: string[];
    series: GroupedBarSeries[];
    yLabel: string;
}) {
    const theme = useTheme();
    return (
        // The height belongs to the container, not to the `height` prop: the
        // legend is laid out beside the plot rather than inside it, so a chart
        // sized by that prop is legend-height taller than the number it was
        // given -- and a two-series chart would then be taller than a
        // one-series one. Sizing the container instead makes
        // `GROUPED_BAR_CHART_HEIGHT` the chart's true outside height in both
        // cases, which is what `ChartCard` reserves for it.
        <Box sx={{height: GROUPED_BAR_CHART_HEIGHT, width: "100%"}}>
            <BarChart
                colors={theme.palette.charts.categorical}
                hideLegend={series.length < 2}
                series={series.map((entry) => ({
                    data: entry.data,
                    label: entry.label,
                }))}
                xAxis={[{data: categories, scaleType: "band"}]}
                yAxis={[{label: yLabel}]}
            />
        </Box>
    );
}
