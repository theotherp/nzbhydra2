import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
    Alert,
    Button,
    Card,
    CardContent,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {LineChart} from "@mui/x-charts/LineChart";
import {useMemo, useState} from "react";

import type {ThreadCpuSeries} from "../../../api/system/debug";
import {cpuChartData, formatChartTime, latestCpuValues} from "./cpuChartData";

/** Legacy's help text for this panel (`bugreport.html:74-75`). */
export const CPU_CHART_HELP =
    "Enable the logging marker 'Performance' for this graph to show data.";

const CHART_HEIGHT = 360;

/**
 * The CPU-usage panel: a themed line chart as the primary rendering with the
 * latest sample per thread reachable as a table behind a toggle, which is
 * ADR-0021's rule that every charted value stays reachable as text.
 */
export function CpuUsageCard({
    serverTimeZone,
    stopped,
    threadSeries,
}: {
    serverTimeZone: string | null;
    stopped: boolean;
    threadSeries: ThreadCpuSeries[];
}) {
    const theme = useTheme();
    const [showTable, setShowTable] = useState(false);
    const data = useMemo(
        () => cpuChartData(threadSeries, serverTimeZone),
        [serverTimeZone, threadSeries],
    );
    const rows = useMemo(() => latestCpuValues(data), [data]);
    const empty = data.times.length === 0;

    return (
        <Card data-testid="system-cpu-chart" variant="outlined">
            <CardContent>
                <Stack
                    alignItems="center"
                    direction="row"
                    justifyContent="space-between"
                    spacing={1}
                >
                    <Stack alignItems="center" direction="row" spacing={0.5}>
                        <Typography component="h2" variant="h6">
                            CPU usage
                        </Typography>
                        <Tooltip title={CPU_CHART_HELP}>
                            <HelpOutlineIcon
                                aria-label="About CPU usage"
                                fontSize="small"
                                sx={{color: "text.secondary"}}
                            />
                        </Tooltip>
                    </Stack>
                    <Button
                        aria-expanded={showTable}
                        disabled={empty}
                        onClick={() => setShowTable((current) => !current)}
                        size="small"
                    >
                        {showTable ? "Hide data" : "View data"}
                    </Button>
                </Stack>
                {stopped && (
                    <Alert severity="warning" sx={{mt: 1.5}}>
                        Unable to read the CPU usage; the chart stopped
                        updating.
                    </Alert>
                )}
                {empty ? (
                    // A stopped poll that never produced a sample already has
                    // its explanation in the alert above; showing the marker
                    // hint too would offer two different reasons for the same
                    // empty panel.
                    !stopped && (
                        <Typography sx={{mt: 1.5}}>{CPU_CHART_HELP}</Typography>
                    )
                ) : (
                    <Stack sx={{mt: 1.5}}>
                        {showTable ? (
                            <TableContainer>
                                <Table
                                    data-testid="system-cpu-chart-table"
                                    size="small"
                                >
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Thread</TableCell>
                                            <TableCell>Time</TableCell>
                                            <TableCell align="right">
                                                CPU %
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow key={row.label}>
                                                <TableCell>
                                                    {row.label}
                                                </TableCell>
                                                <TableCell>
                                                    {formatChartTime(
                                                        row.time,
                                                        serverTimeZone,
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {row.value.toFixed(1)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <LineChart
                                colors={theme.palette.charts.categorical}
                                height={CHART_HEIGHT}
                                series={data.series.map((series) => ({
                                    connectNulls: false,
                                    data: series.data,
                                    label: series.label,
                                    showMark: false,
                                }))}
                                xAxis={[
                                    {
                                        data: data.times,
                                        label: "Time",
                                        scaleType: "point",
                                        valueFormatter: (time: number) =>
                                            formatChartTime(
                                                time,
                                                serverTimeZone,
                                            ),
                                    },
                                ]}
                                yAxis={[{label: "CPU %"}]}
                            />
                        )}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}
