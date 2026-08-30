import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {useMemo, useState, type ReactNode} from "react";

import type {
    HistoryFilterValue,
    HistoryFilterValues,
} from "../../../api/history/filters";
import {
    DOWNLOAD_STATUSES,
    downloadHistoryDimensions,
    getDownloadHistory,
    type DownloadHistoryEntry,
    type DownloadHistorySort,
    type DownloadHistorySearchResult,
    type DownloadStatus,
} from "../../../api/history/downloads";
import {ApiTransport} from "../../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {TableScrollAffordance} from "../../../components/table/TableScrollAffordance";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {historyDownloadResult} from "../../../domain/downloads/actions";
import {externalLink} from "../../../domain/links/externalLinks";
import {DirectDownloadActions} from "../../search/results/DownloadActions";
import {historyUserInfoType} from "../shared/historyUserInfoType";
import {Loading} from "../shared/Loading";
import {PAGE_SIZE} from "../shared/pageSize";
import {SortHeader} from "../shared/SortHeader";
import {HistoryRefineLayout} from "./refine/HistoryRefineSurface";

const defaultSort: DownloadHistorySort = {column: "time", sortMode: 2};

export function DownloadHistoryPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const [page, setPage] = useState(1);
    const [values, setValues] = useState<HistoryFilterValues>({});
    const [sort, setSort] = useState<DownloadHistorySort>(defaultSort);
    const safeConfig = useSafeConfig(bootstrap);
    const userInfoType = historyUserInfoType(safeConfig);
    const dimensions = useMemo(
        () =>
            downloadHistoryDimensions({
                indexerNames: configuredIndexerNames(safeConfig),
                showsUsername: showsUsername(userInfoType),
                showsIp: showsIp(userInfoType),
            }),
        [safeConfig, userInfoType],
    );
    const query = useQuery({
        queryKey: ["download-history", page, values, sort],
        queryFn: () =>
            getDownloadHistory(transport, {
                dimensions,
                values,
                page,
                limit: PAGE_SIZE,
                sort,
            }),
        // Every filter keystroke is a new query key. Without this the page
        // would fall back to its first-load spinner on each one, unmounting
        // the refine surface mid-edit and taking keyboard focus with it; the
        // already-rendered "Refreshing download history…" status row is what
        // reports the in-flight request instead.
        placeholderData: keepPreviousData,
    });
    const updateFilter = (id: string, value: HistoryFilterValue) => {
        setPage(1);
        setValues((current) => ({...current, [id]: value}));
    };
    const clearFilters = () => {
        setPage(1);
        setValues({});
    };
    const updateSort = (column: DownloadHistorySort["column"]) => {
        setPage(1);
        setSort((current) => ({
            column,
            sortMode:
                current.column === column && current.sortMode === 1 ? 2 : 1,
        }));
    };
    if (query.isPending) {
        return <Loading message="Loading download history…" />;
    }
    if (query.isError) {
        return <Alert severity="error">Unable to load download history.</Alert>;
    }
    const {entries: downloads, totalElements, malformedCount} = query.data;
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
    return (
        // The route's single filter surface (ADR-0009/ADR-0046): every
        // dimension legacy offered per table column lives in the refine
        // surface this layout docks beside the table, and the table header
        // carries sorting only.
        <HistoryRefineLayout
            dimensions={dimensions}
            onChange={updateFilter}
            onClearAll={clearFilters}
            values={values}
        >
            <Stack
                alignItems="center"
                direction="row"
                justifyContent="space-between"
                spacing={1}
            >
                <Typography component="h1" variant="h4">
                    Download history
                </Typography>
                <Button
                    data-testid="download-history-refresh"
                    onClick={() => void query.refetch()}
                    variant="outlined"
                >
                    Refresh
                </Button>
            </Stack>
            {query.isFetching && (
                <Stack direction="row" role="status" spacing={1}>
                    <CircularProgress size={20} />
                    <Typography>Refreshing download history…</Typography>
                </Stack>
            )}
            {malformedCount > 0 && (
                <Alert severity="warning">
                    {malformedCount} malformed download history entries were not
                    displayed.
                </Alert>
            )}
            {downloads.length === 0 ? (
                <Alert severity="info">
                    No download history entries match the current filters.
                </Alert>
            ) : (
                <TableScrollAffordance scrollerTestId="download-history-scroller">
                    <Table
                        aria-label="Download history"
                        data-testid="download-history-table"
                        // ADR-0038's width floor, measured at 390x844 against
                        // the six always-on columns: laid out so no cell has
                        // to break a word, this table needs 625px (Time 90,
                        // Indexer 108, Title 108, Result 134, Source 102, Age
                        // 83). Below that the browser starts squeezing
                        // columns past their own content; 640 keeps them at
                        // their intrinsic width and lets the container
                        // scroll instead (ADR-0029: the page never does).
                        sx={{minWidth: 640}}
                    >
                        <TableHead>
                            <TableRow>
                                <SortHeader
                                    label="Time"
                                    column="time"
                                    sort={sort}
                                    onSort={updateSort}
                                />
                                <SortHeader
                                    label="Indexer"
                                    column="name"
                                    sort={sort}
                                    onSort={updateSort}
                                />
                                <SortHeader
                                    label="Title"
                                    column="title"
                                    sort={sort}
                                    onSort={updateSort}
                                />
                                <SortHeader
                                    label="Result"
                                    column="status"
                                    sort={sort}
                                    onSort={updateSort}
                                />
                                <SortHeader
                                    label="Source"
                                    column="access_source"
                                    sort={sort}
                                    onSort={updateSort}
                                />
                                <SortHeader
                                    label="Age"
                                    column="age"
                                    sort={sort}
                                    onSort={updateSort}
                                />
                                {showsUsername(userInfoType) && (
                                    <SortHeader
                                        label="Username"
                                        column="username"
                                        sort={sort}
                                        onSort={updateSort}
                                    />
                                )}
                                {showsIp(userInfoType) && (
                                    <SortHeader
                                        label="IP address"
                                        column="ip"
                                        sort={sort}
                                        onSort={updateSort}
                                    />
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {downloads.map((entry) => (
                                <TableRow
                                    data-testid="download-history-row"
                                    key={entry.id}
                                >
                                    <TableCell>
                                        {formatServerDateTime(
                                            entry.time,
                                            bootstrap.serverTimeZone,
                                        )}
                                    </TableCell>
                                    <TableCell data-testid="download-history-indexer">
                                        {entry.searchResult.indexer ?? ""}
                                    </TableCell>
                                    <TableCell>
                                        <TitleCell
                                            entry={entry}
                                            dereferer={safeConfig?.dereferer}
                                        />
                                    </TableCell>
                                    <TableCell data-testid="download-history-status">
                                        <StatusCell status={entry.status} />
                                    </TableCell>
                                    <TableCell>
                                        {sourceLabel(entry.accessSource)}
                                    </TableCell>
                                    <TableCell>
                                        {entry.age !== undefined
                                            ? `${entry.age} days`
                                            : ""}
                                    </TableCell>
                                    {showsUsername(userInfoType) && (
                                        <TableCell>
                                            {entry.username ?? ""}
                                        </TableCell>
                                    )}
                                    {showsIp(userInfoType) && (
                                        <TableCell>{entry.ip ?? ""}</TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableScrollAffordance>
            )}
            <Stack direction="row" alignItems="center" spacing={1}>
                <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Previous page
                </Button>
                <Typography>
                    Page {page} of {totalPages}
                </Typography>
                <Button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    Next page
                </Button>
            </Stack>
        </HistoryRefineLayout>
    );
}

function TitleCell({
    entry,
    dereferer,
}: {
    entry: DownloadHistoryEntry;
    dereferer: unknown;
}) {
    const {searchResult} = entry;
    const href = searchResult.details
        ? externalLink(searchResult.details, dereferer)
        : undefined;
    return (
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            {repeatEligible(searchResult) ? (
                <DirectDownloadActions
                    result={historyDownloadResult(searchResult)}
                    onDownloaded={() => {}}
                />
            ) : (
                <Typography component="span" color="text.secondary">
                    Repeat unavailable
                </Typography>
            )}
            {href ? (
                <Link href={href} rel="noreferrer" target="_blank">
                    {searchResult.title}
                </Link>
            ) : (
                searchResult.title
            )}
        </Stack>
    );
}

function repeatEligible(searchResult: DownloadHistorySearchResult): boolean {
    return Boolean(searchResult.indexerGuid);
}

const STATUS_LABELS: Record<DownloadStatus, string> = Object.fromEntries(
    DOWNLOAD_STATUSES.map((status) => [status.value, status.label]),
) as Record<DownloadStatus, string>;

function statusIcon(status: DownloadStatus): ReactNode {
    switch (status) {
        case "NONE":
        case "REQUESTED":
            return <HelpOutlineIcon color="disabled" fontSize="small" />;
        case "INTERNAL_ERROR":
        case "NZB_DOWNLOAD_ERROR":
        case "NZB_NOT_ADDED":
        case "NZB_ADD_ERROR":
        case "NZB_ADD_REJECTED":
        case "CONTENT_DOWNLOAD_ERROR":
            return <ErrorOutlineIcon color="error" fontSize="small" />;
        case "CONTENT_DOWNLOAD_WARNING":
            return <WarningAmberIcon color="warning" fontSize="small" />;
        case "NZB_DOWNLOAD_SUCCESSFUL":
        case "NZB_ADDED":
            return <CheckCircleOutlineIcon color="info" fontSize="small" />;
        case "CONTENT_DOWNLOAD_SUCCESSFUL":
            return <CheckCircleOutlineIcon color="success" fontSize="small" />;
    }
}

function StatusCell({status}: {status: DownloadStatus}) {
    return (
        <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box aria-hidden="true" sx={{display: "flex"}}>
                {statusIcon(status)}
            </Box>
            <Typography component="span" variant="body2">
                {STATUS_LABELS[status]}
            </Typography>
        </Stack>
    );
}

function sourceLabel(accessSource: "INTERNAL" | "API" | undefined): string {
    if (accessSource === "INTERNAL") return "Internal";
    if (accessSource === "API") return "API";
    return "";
}

/**
 * The `Indexer` multi-select's options: every configured indexer's name, taken
 * from the bootstrap's safe config the page already receives. Legacy builds its
 * own `indexersForFiltering` list exactly this way
 * (`download-history-controller.js:21-24`) -- unfiltered by `showOnSearch` or
 * category -- so no endpoint is involved. Sorted case-insensitively for a
 * stable, readable option order.
 */
function configuredIndexerNames(safeConfig: unknown): string[] {
    if (!safeConfig || typeof safeConfig !== "object") return [];
    const indexers = (safeConfig as {indexers?: unknown}).indexers;
    if (!Array.isArray(indexers)) return [];
    return indexers
        .flatMap((indexer) => {
            if (!indexer || typeof indexer !== "object") return [];
            const name = (indexer as {name?: unknown}).name;
            return typeof name === "string" && name ? [name] : [];
        })
        .sort((first, second) =>
            first.localeCompare(second, undefined, {sensitivity: "base"}),
        );
}

function showsUsername(type: string) {
    return type === "USERNAME" || type === "BOTH";
}

function showsIp(type: string) {
    return type === "IP" || type === "BOTH";
}
