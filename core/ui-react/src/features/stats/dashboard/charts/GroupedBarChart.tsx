import {useTheme} from "@mui/material/styles";
import {BarChart} from "@mui/x-charts/BarChart";

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
        <BarChart
            colors={theme.palette.charts.categorical}
            height={300}
            hideLegend={series.length < 2}
            series={series.map((entry) => ({
                data: entry.data,
                label: entry.label,
            }))}
            xAxis={[{data: categories, scaleType: "band"}]}
            yAxis={[{label: yLabel}]}
        />
    );
}
