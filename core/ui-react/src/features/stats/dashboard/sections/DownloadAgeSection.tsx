import {
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";

import type {StatsResult} from "../../../../api/stats/mainStats";
import {TableScrollAffordance} from "../../../../components/table/TableScrollAffordance";
import {ChartCard} from "../ChartCard";
import {formatNumber, formatPercent} from "../formatting";
import {GROUPED_BAR_CHART_HEIGHT} from "../charts/chartSizing";
import {GroupedBarChart} from "../charts/GroupedBarChart";

/**
 * Presentation Structure item 6: the per-age histogram as a bar chart plus
 * the summary values (average age, % older than 1000/2000/3000 days) as
 * adjacent stat text, with the underlying table reachable.
 */
export function DownloadAgeSection({stats}: {stats: StatsResult}) {
    const data = stats.downloadsPerAgeStats;
    if (!data) return null;
    const entries = data.downloadsPerAge ?? [];
    return (
        <Stack
            component="section"
            data-testid="stats-section-download-age"
            spacing={2}
        >
            <Typography component="h2" variant="h5">
                Downloads per age
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={3}>
                <SummaryStat
                    label="Average age (days)"
                    testId="stats-age-average"
                    value={formatNumber(data.averageAge, 1)}
                />
                <SummaryStat
                    label="% older than 1000 days"
                    testId="stats-age-older-1000"
                    value={formatPercent(data.percentOlder1000)}
                />
                <SummaryStat
                    label="% older than 2000 days"
                    testId="stats-age-older-2000"
                    value={formatPercent(data.percentOlder2000)}
                />
                <SummaryStat
                    label="% older than 3000 days"
                    testId="stats-age-older-3000"
                    value={formatPercent(data.percentOlder3000)}
                />
            </Stack>
            {entries.length > 0 && (
                <ChartCard
                    chartHeight={GROUPED_BAR_CHART_HEIGHT}
                    chart={
                        <GroupedBarChart
                            categories={entries.map((entry) =>
                                String(entry.age ?? ""),
                            )}
                            series={[
                                {
                                    label: "Downloads",
                                    data: entries.map(
                                        (entry) => entry.count ?? 0,
                                    ),
                                },
                            ]}
                            yLabel="Downloads"
                        />
                    }
                    table={
                        <TableScrollAffordance scrollerTestId="stats-downloads-per-age-scroller">
                            <Table
                                aria-label="Downloads per age"
                                size="small"
                                // Measured at 390x844 with the card toggled to
                                // its table side: Age (days) and Downloads
                                // need 204px so no header wraps. 210 keeps
                                // them at that intrinsic width.
                                sx={{minWidth: 210}}
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Age (days)</TableCell>
                                        <TableCell>Downloads</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {entries.map((entry, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                {entry.age ?? ""}
                                            </TableCell>
                                            <TableCell>
                                                {entry.count ?? ""}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableScrollAffordance>
                    }
                    testId="stats-chart-downloads-per-age"
                    title="Downloads per age (100-day steps)"
                />
            )}
        </Stack>
    );
}

/**
 * One summary value. `value` arrives already formatted (FM-172: the stats
 * feature states every ratio through `formatPercent`), and an absent value
 * arrives as the empty string that `formatNumber`/`formatPercent` return.
 */
function SummaryStat({
    label,
    value,
    testId,
}: {
    label: string;
    value: string;
    testId: string;
}) {
    return (
        <Stack data-testid={testId}>
            <Typography color="text.secondary" variant="body2">
                {label}
            </Typography>
            <Typography component="p" variant="h5">
                {value === "" ? "—" : value}
            </Typography>
        </Stack>
    );
}
