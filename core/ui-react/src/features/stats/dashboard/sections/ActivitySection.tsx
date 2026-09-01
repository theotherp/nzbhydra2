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
import {dayOfWeekSeries, hourOfDaySeries} from "../derivations";
import {ChartCard} from "../ChartCard";
import {
    GROUPED_BAR_CHART_HEIGHT,
    GroupedBarChart,
} from "../charts/GroupedBarChart";

/**
 * Presentation Structure item 4: searches/downloads per day of week as one
 * grouped-bar chart (two series when both families are enabled, one
 * otherwise), and likewise per hour of day.
 */
export function ActivitySection({stats}: {stats: StatsResult}) {
    const searchesByDay = dayOfWeekSeries(stats.searchesPerDayOfWeek);
    const downloadsByDay = dayOfWeekSeries(stats.downloadsPerDayOfWeek);
    const searchesByHour = hourOfDaySeries(stats.searchesPerHourOfDay);
    const downloadsByHour = hourOfDaySeries(stats.downloadsPerHourOfDay);
    if (
        !searchesByDay &&
        !downloadsByDay &&
        !searchesByHour &&
        !downloadsByHour
    ) {
        return null;
    }
    return (
        <Stack
            component="section"
            data-testid="stats-section-activity"
            spacing={2}
        >
            <Typography component="h2" variant="h5">
                Activity
            </Typography>
            {(searchesByDay || downloadsByDay) && (
                <ChartCard
                    chartHeight={GROUPED_BAR_CHART_HEIGHT}
                    chart={
                        <GroupedBarChart
                            categories={
                                (searchesByDay ?? downloadsByDay)!.categories
                            }
                            series={[
                                ...(searchesByDay
                                    ? [
                                          {
                                              label: "Searches",
                                              data: searchesByDay.values,
                                          },
                                      ]
                                    : []),
                                ...(downloadsByDay
                                    ? [
                                          {
                                              label: "Downloads",
                                              data: downloadsByDay.values,
                                          },
                                      ]
                                    : []),
                            ]}
                            yLabel="Count"
                        />
                    }
                    table={
                        <CategoryTable
                            categoryLabel="Day of week"
                            downloads={downloadsByDay}
                            searches={searchesByDay}
                        />
                    }
                    testId="stats-chart-activity-day-of-week"
                    title="Activity per day of week"
                />
            )}
            {(searchesByHour || downloadsByHour) && (
                <ChartCard
                    chartHeight={GROUPED_BAR_CHART_HEIGHT}
                    chart={
                        <GroupedBarChart
                            categories={
                                (searchesByHour ?? downloadsByHour)!.categories
                            }
                            series={[
                                ...(searchesByHour
                                    ? [
                                          {
                                              label: "Searches",
                                              data: searchesByHour.values,
                                          },
                                      ]
                                    : []),
                                ...(downloadsByHour
                                    ? [
                                          {
                                              label: "Downloads",
                                              data: downloadsByHour.values,
                                          },
                                      ]
                                    : []),
                            ]}
                            yLabel="Count"
                        />
                    }
                    table={
                        <CategoryTable
                            categoryLabel="Hour of day"
                            downloads={downloadsByHour}
                            searches={searchesByHour}
                        />
                    }
                    testId="stats-chart-activity-hour-of-day"
                    title="Activity per hour of day"
                />
            )}
        </Stack>
    );
}

function CategoryTable({
    categoryLabel,
    searches,
    downloads,
}: {
    categoryLabel: string;
    searches?: {categories: string[]; values: number[]};
    downloads?: {categories: string[]; values: number[]};
}) {
    const categories = (searches ?? downloads)!.categories;
    return (
        <TableContainer>
            <Table
                aria-label={`Activity per ${categoryLabel.toLowerCase()}`}
                size="small"
            >
                <TableHead>
                    <TableRow>
                        <TableCell>{categoryLabel}</TableCell>
                        {searches && <TableCell>Searches</TableCell>}
                        {downloads && <TableCell>Downloads</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {categories.map((category, index) => (
                        <TableRow key={category}>
                            <TableCell>{category}</TableCell>
                            {searches && (
                                <TableCell>{searches.values[index]}</TableCell>
                            )}
                            {downloads && (
                                <TableCell>{downloads.values[index]}</TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
