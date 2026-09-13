import {SparkLineChart} from "@mui/x-charts/SparkLineChart";

/**
 * FM-163: the downloader footer's rate graph, split into its own module so
 * `React.lazy` can keep `@mui/x-charts` — and the `d3-*` packages underneath
 * it — out of the entry chunk. `AppShell` mounts the footer on *every* route,
 * so a static import of the chart here would put the whole chart engine on the
 * critical path of a session that only ever searches.
 *
 * Default-exported because that is the shape `React.lazy` resolves. Everything
 * the graph draws arrives as props (the palette colour included, which the
 * footer already reads from the theme), so this module imports nothing beyond
 * the chart itself and nothing else in it has to move.
 */
export default function DownloaderRateSparkline({
    color,
    data,
    height,
    width,
}: {
    color: string;
    data: number[];
    height: number;
    width: number;
}) {
    return (
        <SparkLineChart
            area
            color={color}
            data={data}
            height={height}
            width={width}
        />
    );
}
