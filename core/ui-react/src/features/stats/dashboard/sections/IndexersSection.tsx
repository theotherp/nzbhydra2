import {
    Button,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    Typography,
} from "@mui/material";
import {useMemo, useState} from "react";

import type {StatsResult} from "../../../../api/stats/mainStats";
import {
    indexerColumnsEnabled,
    joinIndexerRows,
    type IndexerRow,
} from "../derivations";
import {ChartCard} from "../ChartCard";
import {HorizontalBarChart} from "../charts/HorizontalBarChart";

const SCORE_HELP =
    "Shows how valuable this indexer was for your downloads. A higher score means it often had downloads that fewer of your other indexers could provide.";
const COVERAGE_HELP =
    "Percentage of download observations where this indexer could provide matching content.";
const API_ACCESS_HELP =
    "An API access is considered failed only when the indexer could not be reached, not if auth was unsuccessful or Hydra had an unexpected error. The average calculation only spans the time since the first search with the indexer.";
const DOWNLOAD_SHARE_HELP =
    "Only downloads by enabled indexers are taken into account and displayed.";
const DOWNLOAD_SUCCESS_HELP =
    "Only works if user scripts report the actual download result of a NZB's content. Shows percentage of successful downloads of all downloads with reported status.";

type SortDirection = "asc" | "desc";

/**
 * Comparator for the consolidated table's column sort. Rows missing the
 * sorted field always sort last, regardless of direction; the default sort
 * (indexer name, ascending) matches `joinIndexerRows`' own base order.
 */
function compareIndexerRows(
    sortKey: keyof IndexerRow,
    direction: SortDirection,
) {
    const multiplier = direction === "asc" ? 1 : -1;
    return (left: IndexerRow, right: IndexerRow): number => {
        const leftValue = left[sortKey];
        const rightValue = right[sortKey];
        if (leftValue === undefined && rightValue === undefined) return 0;
        if (leftValue === undefined) return 1;
        if (rightValue === undefined) return -1;
        if (typeof leftValue === "string" && typeof rightValue === "string") {
            return (
                multiplier *
                leftValue.localeCompare(rightValue, undefined, {
                    sensitivity: "base",
                })
            );
        }
        if (typeof leftValue === "number" && typeof rightValue === "number") {
            return multiplier * (leftValue - rightValue);
        }
        return 0;
    };
}

export function IndexersSection({stats}: {stats: StatsResult}) {
    const rows = joinIndexerRows(stats);
    const columns = indexerColumnsEnabled(stats);
    const [showDetails, setShowDetails] = useState(false);
    const [sortKey, setSortKey] = useState<keyof IndexerRow>("indexerName");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const sortedRows = useMemo(
        () => [...rows].sort(compareIndexerRows(sortKey, sortDirection)),
        [rows, sortKey, sortDirection],
    );
    const handleSort = (key: keyof IndexerRow) => {
        if (key === sortKey) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };
    const anyColumn = Object.values(columns).some(Boolean);
    if (!anyColumn) return null;
    return (
        <Stack
            component="section"
            data-testid="stats-section-indexers"
            spacing={2}
        >
            <Typography component="h2" variant="h5">
                Indexers
            </Typography>
            <Stack direction="row" justifyContent="flex-end">
                <Button
                    aria-expanded={showDetails}
                    data-testid="stats-indexers-details-toggle"
                    onClick={() => setShowDetails((current) => !current)}
                    size="small"
                >
                    {showDetails
                        ? "Hide detail columns"
                        : "Show detail columns"}
                </Button>
            </Stack>
            <TableContainer>
                <Table
                    aria-label="Indexer statistics"
                    data-testid="stats-indexers-table"
                    size="small"
                >
                    <TableHead>
                        <TableRow>
                            <SortableHeaderCell
                                label="Indexer"
                                onSort={handleSort}
                                sortDirection={sortDirection}
                                sortKey={sortKey}
                                sortKeyName="indexerName"
                            />
                            {columns.responseTime && (
                                <SortableHeaderCell
                                    label="Avg. response time (ms)"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="avgResponseTime"
                                />
                            )}
                            {columns.responseTime && showDetails && (
                                <SortableHeaderCell
                                    label="Delta"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="responseTimeDelta"
                                />
                            )}
                            {columns.apiAccess && (
                                <SortableHeaderCell
                                    help={API_ACCESS_HELP}
                                    label="API accesses/day"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="apiAccessesPerDay"
                                />
                            )}
                            {columns.apiAccess && (
                                <SortableHeaderCell
                                    label="% successful"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="apiSuccessPercent"
                                />
                            )}
                            {columns.apiAccess && showDetails && (
                                <SortableHeaderCell
                                    label="% failed"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="apiFailurePercent"
                                />
                            )}
                            {columns.downloadShare && (
                                <SortableHeaderCell
                                    help={DOWNLOAD_SHARE_HELP}
                                    label="Download share %"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="downloadShare"
                                />
                            )}
                            {columns.downloadShare && showDetails && (
                                <SortableHeaderCell
                                    label="Downloads total"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="downloadShareTotal"
                                />
                            )}
                            {columns.downloadSuccess && (
                                <SortableHeaderCell
                                    help={DOWNLOAD_SUCCESS_HELP}
                                    label="Download success %"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="downloadSuccessPercent"
                                />
                            )}
                            {columns.downloadSuccess && showDetails && (
                                <>
                                    <SortableHeaderCell
                                        label="Successful/all"
                                        onSort={handleSort}
                                        sortDirection={sortDirection}
                                        sortKey={sortKey}
                                        sortKeyName="downloadSuccessCount"
                                    />
                                    <SortableHeaderCell
                                        label="Errors"
                                        onSort={handleSort}
                                        sortDirection={sortDirection}
                                        sortKey={sortKey}
                                        sortKeyName="downloadErrorCount"
                                    />
                                </>
                            )}
                            {columns.uniqueness && (
                                <SortableHeaderCell
                                    help={SCORE_HELP}
                                    label="Avg. uniqueness score"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="uniquenessScore"
                                />
                            )}
                            {columns.uniqueness && (
                                <SortableHeaderCell
                                    help={COVERAGE_HELP}
                                    label="Coverage"
                                    onSort={handleSort}
                                    sortDirection={sortDirection}
                                    sortKey={sortKey}
                                    sortKeyName="coveragePercent"
                                />
                            )}
                            {columns.uniqueness && showDetails && (
                                <>
                                    <SortableHeaderCell
                                        label="Unique downloads"
                                        onSort={handleSort}
                                        sortDirection={sortDirection}
                                        sortKey={sortKey}
                                        sortKeyName="uniqueDownloads"
                                    />
                                    <SortableHeaderCell
                                        label="Shared contribution"
                                        onSort={handleSort}
                                        sortDirection={sortDirection}
                                        sortKey={sortKey}
                                        sortKeyName="sharedContribution"
                                    />
                                    <SortableHeaderCell
                                        label="Observations"
                                        onSort={handleSort}
                                        sortDirection={sortDirection}
                                        sortKey={sortKey}
                                        sortKeyName="observations"
                                    />
                                </>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedRows.map((row) => (
                            <IndexerRowCells
                                columns={columns}
                                key={row.indexerName}
                                row={row}
                                showDetails={showDetails}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {columns.downloadShare && (
                <ChartCard
                    chart={
                        <HorizontalBarChart
                            data={(stats.indexerDownloadShares ?? []).map(
                                (entry) => ({
                                    label: entry.indexerName ?? "",
                                    value: entry.share ?? 0,
                                }),
                            )}
                            seriesLabel="Download share %"
                            valueFormatter={(value) => `${value.toFixed(1)}%`}
                        />
                    }
                    help={DOWNLOAD_SHARE_HELP}
                    table={<ShareTable rows={rows} />}
                    testId="stats-chart-indexer-download-shares"
                    title="Downloads per indexer"
                />
            )}
            {columns.responseTime && (
                <ChartCard
                    chart={
                        <HorizontalBarChart
                            data={(stats.avgResponseTimes ?? []).map(
                                (entry) => ({
                                    label: entry.indexer ?? "",
                                    value: entry.avgResponseTime ?? 0,
                                }),
                            )}
                            seriesLabel="Avg. response time (ms)"
                            valueFormatter={(value) => `${value.toFixed(0)} ms`}
                        />
                    }
                    table={<ResponseTimeTable rows={rows} />}
                    testId="stats-chart-response-times"
                    title="Avg. response times"
                />
            )}
        </Stack>
    );
}

function SortableHeaderCell({
    label,
    help,
    sortKeyName,
    sortKey,
    sortDirection,
    onSort,
}: {
    label: string;
    help?: string;
    sortKeyName: keyof IndexerRow;
    sortKey: keyof IndexerRow;
    sortDirection: "asc" | "desc";
    onSort: (key: keyof IndexerRow) => void;
}) {
    const active = sortKey === sortKeyName;
    const sortLabel = (
        <TableSortLabel
            active={active}
            direction={active ? sortDirection : "asc"}
            onClick={() => onSort(sortKeyName)}
        >
            {label}
        </TableSortLabel>
    );
    return (
        <TableCell sortDirection={active ? sortDirection : false}>
            {help ? <Tooltip title={help}>{sortLabel}</Tooltip> : sortLabel}
        </TableCell>
    );
}

function IndexerRowCells({
    row,
    columns,
    showDetails,
}: {
    row: IndexerRow;
    columns: ReturnType<typeof indexerColumnsEnabled>;
    showDetails: boolean;
}) {
    return (
        <TableRow data-testid="stats-indexer-row">
            <TableCell>{row.indexerName}</TableCell>
            {columns.responseTime && (
                <TableCell>{formatNumber(row.avgResponseTime, 0)}</TableCell>
            )}
            {columns.responseTime && showDetails && (
                <TableCell>{formatNumber(row.responseTimeDelta, 1)}</TableCell>
            )}
            {columns.apiAccess && (
                <TableCell>{formatNumber(row.apiAccessesPerDay, 0)}</TableCell>
            )}
            {columns.apiAccess && (
                <TableCell>{formatNumber(row.apiSuccessPercent, 0)}</TableCell>
            )}
            {columns.apiAccess && showDetails && (
                <TableCell>{formatNumber(row.apiFailurePercent, 0)}</TableCell>
            )}
            {columns.downloadShare && (
                <TableCell>{formatNumber(row.downloadShare, 0)}</TableCell>
            )}
            {columns.downloadShare && showDetails && (
                <TableCell>{formatNumber(row.downloadShareTotal, 0)}</TableCell>
            )}
            {columns.downloadSuccess && (
                <TableCell>
                    {formatNumber(row.downloadSuccessPercent, 1)}
                </TableCell>
            )}
            {columns.downloadSuccess && showDetails && (
                <>
                    <TableCell>
                        {formatFraction(
                            row.downloadSuccessCount,
                            row.downloadSuccessAll,
                        )}
                    </TableCell>
                    <TableCell>{row.downloadErrorCount ?? ""}</TableCell>
                </>
            )}
            {columns.uniqueness && (
                <TableCell>{row.uniquenessScore ?? ""}</TableCell>
            )}
            {columns.uniqueness && (
                <TableCell>
                    {formatCoverage(
                        row.coveragePercent,
                        row.providedDownloads,
                        row.involvedSearches,
                    )}
                </TableCell>
            )}
            {columns.uniqueness && showDetails && (
                <>
                    <TableCell>{row.uniqueDownloads ?? ""}</TableCell>
                    <TableCell>
                        {formatSharedContribution(
                            row.sharedContribution,
                            row.sharedContributionPercent,
                        )}
                    </TableCell>
                    <TableCell>{row.observations ?? ""}</TableCell>
                </>
            )}
        </TableRow>
    );
}

function ShareTable({rows}: {rows: IndexerRow[]}) {
    return (
        <TableContainer>
            <Table aria-label="Downloads per indexer" size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Indexer</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>% of all enabled</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows
                        .filter((row) => row.downloadShare !== undefined)
                        .map((row) => (
                            <TableRow key={row.indexerName}>
                                <TableCell>{row.indexerName}</TableCell>
                                <TableCell>
                                    {row.downloadShareTotal ?? ""}
                                </TableCell>
                                <TableCell>
                                    {formatNumber(row.downloadShare, 0)}
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function ResponseTimeTable({rows}: {rows: IndexerRow[]}) {
    return (
        <TableContainer>
            <Table aria-label="Avg. response times" size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Indexer</TableCell>
                        <TableCell>Avg. response time (ms)</TableCell>
                        <TableCell>Delta</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows
                        .filter((row) => row.avgResponseTime !== undefined)
                        .map((row) => (
                            <TableRow key={row.indexerName}>
                                <TableCell>{row.indexerName}</TableCell>
                                <TableCell>
                                    {formatNumber(row.avgResponseTime, 0)}
                                </TableCell>
                                <TableCell>
                                    {formatNumber(row.responseTimeDelta, 1)}
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function formatNumber(value: number | undefined, digits: number): string {
    return value === undefined ? "" : value.toFixed(digits);
}

/**
 * A composite "X/Y" cell where either half may be missing independently
 * (e.g. one family reported a count but not its total). Never renders a
 * bare "/" -- a missing half is simply omitted, and both missing renders
 * an em dash.
 */
function formatFraction(
    numerator: number | undefined,
    denominator: number | undefined,
): string {
    if (numerator === undefined && denominator === undefined) return "—";
    if (numerator === undefined) return String(denominator);
    if (denominator === undefined) return String(numerator);
    return `${numerator}/${denominator}`;
}

/**
 * The Coverage column: a percentage with an "(provided/involved)"
 * parenthetical. The parenthetical is included only when it has at least
 * one of its two halves, and is omitted entirely (not rendered as "(%)")
 * when neither is present.
 */
function formatCoverage(
    percent: number | undefined,
    numerator: number | undefined,
    denominator: number | undefined,
): string {
    const percentText = percent === undefined ? undefined : `${percent}%`;
    const fractionText =
        numerator === undefined && denominator === undefined
            ? undefined
            : formatFraction(numerator, denominator);
    if (percentText && fractionText) return `${percentText} (${fractionText})`;
    return percentText ?? fractionText ?? "—";
}

/**
 * The Shared contribution detail column: a value with a "(percent)"
 * parenthetical. Same omission rule as `formatCoverage`.
 */
function formatSharedContribution(
    value: number | undefined,
    percent: number | undefined,
): string {
    const valueText = value === undefined ? undefined : formatNumber(value, 2);
    const percentText = percent === undefined ? undefined : `${percent}%`;
    if (valueText && percentText) return `${valueText} (${percentText})`;
    return valueText ?? percentText ?? "—";
}
