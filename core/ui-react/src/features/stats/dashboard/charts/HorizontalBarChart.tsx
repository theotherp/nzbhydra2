import {useTheme} from "@mui/material/styles";
import {BarChart} from "@mui/x-charts/BarChart";

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
    height,
}: {
    data: HorizontalBarDatum[];
    seriesLabel: string;
    valueFormatter?: (value: number) => string;
    height?: number;
}) {
    const theme = useTheme();
    const sorted = [...data].sort((left, right) => right.value - left.value);
    const chartHeight =
        height ?? Math.min(Math.max(sorted.length * 34, 160), 900);
    return (
        <BarChart
            colors={theme.palette.charts.categorical}
            height={chartHeight}
            hideLegend
            layout="horizontal"
            margin={{left: 140}}
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
                {data: sorted.map((entry) => entry.label), scaleType: "band"},
            ]}
        />
    );
}
