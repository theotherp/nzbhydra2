import {
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";

import type {StatsResult} from "../../../../api/stats/mainStats";
import {ChartCard} from "../ChartCard";
import {
    GROUPED_BAR_CHART_HEIGHT,
    GroupedBarChart,
} from "../charts/GroupedBarChart";

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
                    value={data.averageAge}
                />
                <SummaryStat
                    label="% older than 1000 days"
                    testId="stats-age-older-1000"
                    value={data.percentOlder1000}
                    suffix="%"
                />
                <SummaryStat
                    label="% older than 2000 days"
                    testId="stats-age-older-2000"
                    value={data.percentOlder2000}
                    suffix="%"
                />
                <SummaryStat
                    label="% older than 3000 days"
                    testId="stats-age-older-3000"
                    value={data.percentOlder3000}
                    suffix="%"
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
                        <TableContainer>
                            <Table aria-label="Downloads per age" size="small">
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
                        </TableContainer>
                    }
                    testId="stats-chart-downloads-per-age"
                    title="Downloads per age (100-day steps)"
                />
            )}
        </Stack>
    );
}

function SummaryStat({
    label,
    value,
    suffix,
    testId,
}: {
    label: string;
    value: number | undefined;
    suffix?: string;
    testId: string;
}) {
    return (
        <Stack data-testid={testId}>
            <Typography color="text.secondary" variant="body2">
                {label}
            </Typography>
            <Typography component="p" variant="h5">
                {value !== undefined ? `${value}${suffix ?? ""}` : "—"}
            </Typography>
        </Stack>
    );
}
