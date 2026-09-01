import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Typography,
} from "@mui/material";

import type {
    ShareEntry,
    StatsResult,
    UserAgentShare,
} from "../../../../api/stats/mainStats";
import {ChartCard} from "../ChartCard";
import {
    horizontalBarChartHeight,
    HorizontalBarChart,
} from "../charts/HorizontalBarChart";

const USER_AGENT_HELP =
    "Some tools don't use specific user agents. They will most likely show up as 'Mozilla' or as 'Other'.";

type ShareCard = {
    key: string;
    title: string;
    entries: ShareEntry[] | UserAgentShare[];
    columnLabel: string;
    help?: string;
};

/**
 * Presentation Structure item 5: search/download shares per user, per host,
 * and per user agent as sorted horizontal bar lists in a responsive grid,
 * replacing legacy's six donuts. A card whose data cannot exist is hidden
 * entirely (not shown empty): user-share cards require `historyUserInfoType`
 * USERNAME or BOTH, host-share cards IP or BOTH.
 */
export function SourcesSection({
    stats,
    showsUsername,
    showsIp,
}: {
    stats: StatsResult;
    showsUsername: boolean;
    showsIp: boolean;
}) {
    const cards: ShareCard[] = [];
    if (showsUsername && stats.searchSharesPerUser) {
        cards.push({
            key: "search-user",
            title: "Searches per username",
            entries: stats.searchSharesPerUser,
            columnLabel: "User",
        });
    }
    if (showsUsername && stats.downloadSharesPerUser) {
        cards.push({
            key: "download-user",
            title: "Downloads per username",
            entries: stats.downloadSharesPerUser,
            columnLabel: "User",
        });
    }
    if (showsIp && stats.searchSharesPerIp) {
        cards.push({
            key: "search-ip",
            title: "Searches per host",
            entries: stats.searchSharesPerIp,
            columnLabel: "Host",
        });
    }
    if (showsIp && stats.downloadSharesPerIp) {
        cards.push({
            key: "download-ip",
            title: "Downloads per host",
            entries: stats.downloadSharesPerIp,
            columnLabel: "Host",
        });
    }
    if (stats.userAgentSearchShares) {
        cards.push({
            key: "search-agent",
            title: "API searches per user agent",
            entries: stats.userAgentSearchShares,
            columnLabel: "User agent",
            help: USER_AGENT_HELP,
        });
    }
    if (stats.userAgentDownloadShares) {
        cards.push({
            key: "download-agent",
            title: "API downloads per user agent",
            entries: stats.userAgentDownloadShares,
            columnLabel: "User agent",
            help: USER_AGENT_HELP,
        });
    }
    if (cards.length === 0) return null;
    return (
        <Stack
            component="section"
            data-testid="stats-section-sources"
            spacing={2}
        >
            <Typography component="h2" variant="h5">
                Sources
            </Typography>
            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                    },
                }}
            >
                {cards.map((card) => (
                    <ChartCard
                        chartHeight={horizontalBarChartHeight(
                            card.entries.length,
                        )}
                        chart={
                            <HorizontalBarChart
                                data={card.entries.map((entry) => ({
                                    label: entryKey(entry),
                                    value: entry.percentage ?? 0,
                                }))}
                                seriesLabel="Percentage"
                                valueFormatter={(value) =>
                                    `${value.toFixed(1)}%`
                                }
                            />
                        }
                        help={card.help}
                        key={card.key}
                        table={<ShareTable card={card} />}
                        testId={`stats-chart-${card.key}`}
                        title={card.title}
                    />
                ))}
            </Box>
        </Stack>
    );
}

function entryKey(entry: ShareEntry | UserAgentShare): string {
    if ("userAgent" in entry) return entry.userAgent ?? "";
    if ("key" in entry) return entry.key ?? "";
    return "";
}

function ShareTable({card}: {card: ShareCard}) {
    return (
        <TableContainer>
            <Table aria-label={card.title} size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>{card.columnLabel}</TableCell>
                        <TableCell>Percentage</TableCell>
                        <TableCell>Count</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {card.entries.map((entry, index) => (
                        <TableRow key={`${entryKey(entry)}-${index}`}>
                            <TableCell>{entryKey(entry)}</TableCell>
                            <TableCell>
                                {entry.percentage !== undefined
                                    ? `${entry.percentage.toFixed(1)}%`
                                    : ""}
                            </TableCell>
                            <TableCell>{entry.count ?? ""}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
