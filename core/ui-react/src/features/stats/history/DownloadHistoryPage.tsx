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
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import {useQuery} from "@tanstack/react-query";
import {useState, type ReactNode} from "react";

import {
    DOWNLOAD_STATUSES,
    getDownloadHistory,
    type DownloadHistoryEntry,
    type DownloadHistoryFilters,
    type DownloadHistorySort,
    type DownloadHistorySearchResult,
    type DownloadStatus,
} from "../../../api/history/downloads";
import {ApiTransport} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {historyDownloadResult} from "../../../domain/downloads/actions";
import {externalLink} from "../../../domain/links/externalLinks";
import {DirectDownloadActions} from "../../search/results/DownloadActions";

const PAGE_SIZE = 25;
const defaultSort: DownloadHistorySort = {column: "time", sortMode: 2};

export function DownloadHistoryPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<DownloadHistoryFilters>({
        source: "all",
    });
    const [sort, setSort] = useState<DownloadHistorySort>(defaultSort);
    const userInfoType = historyUserInfoType(bootstrap.safeConfig);
    const query = useQuery({
        queryKey: ["download-history", page, filters, sort],
        queryFn: () =>
            getDownloadHistory(transport, page, PAGE_SIZE, filters, sort),
    });
    const updateFilter = (
        name: keyof DownloadHistoryFilters,
        value: string,
    ) => {
        setPage(1);
        setFilters((current) => ({
            ...current,
            [name]: value || undefined,
        }));
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
        return <Loading />;
    }
    if (query.isError) {
        return <Alert severity="error">Unable to load download history.</Alert>;
    }
    const {downloads, totalElements, malformedCount} = query.data;
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
    return (
        <Stack component="main" spacing={2}>
            <Typography component="h1" variant="h4">
                Download history
            </Typography>
            <Stack
                component="form"
                direction={{md: "row"}}
                flexWrap="wrap"
                gap={1}
                onSubmit={(event) => event.preventDefault()}
            >
                <TextField
                    label="After"
                    type="datetime-local"
                    slotProps={{inputLabel: {shrink: true}}}
                    value={filters.after ?? ""}
                    onChange={(event) =>
                        updateFilter("after", event.target.value)
                    }
                />
                <TextField
                    label="Before"
                    type="datetime-local"
                    slotProps={{inputLabel: {shrink: true}}}
                    value={filters.before ?? ""}
                    onChange={(event) =>
                        updateFilter("before", event.target.value)
                    }
                />
                <TextField
                    label="Indexer"
                    value={filters.indexer ?? ""}
                    onChange={(event) =>
                        updateFilter("indexer", event.target.value)
                    }
                />
                <TextField
                    label="Title"
                    value={filters.title ?? ""}
                    onChange={(event) =>
                        updateFilter("title", event.target.value)
                    }
                />
                <TextField
                    label="Result"
                    select
                    value={filters.status ?? "all"}
                    onChange={(event) =>
                        updateFilter("status", event.target.value)
                    }
                >
                    <MenuItem value="all">All results</MenuItem>
                    {DOWNLOAD_STATUSES.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                            {status.label}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    label="Source"
                    select
                    value={filters.source ?? "all"}
                    onChange={(event) =>
                        updateFilter("source", event.target.value)
                    }
                >
                    <MenuItem value="all">All sources</MenuItem>
                    <MenuItem value="INTERNAL">Internal</MenuItem>
                    <MenuItem value="API">API</MenuItem>
                </TextField>
                <TextField
                    label="Minimum age (days)"
                    inputMode="numeric"
                    value={filters.minAge ?? ""}
                    onChange={(event) =>
                        updateFilter("minAge", event.target.value)
                    }
                />
                <TextField
                    label="Maximum age (days)"
                    inputMode="numeric"
                    value={filters.maxAge ?? ""}
                    onChange={(event) =>
                        updateFilter("maxAge", event.target.value)
                    }
                />
                {showsUsername(userInfoType) && (
                    <TextField
                        label="Username"
                        value={filters.username ?? ""}
                        onChange={(event) =>
                            updateFilter("username", event.target.value)
                        }
                    />
                )}
                {showsIp(userInfoType) && (
                    <TextField
                        label="IP address"
                        value={filters.ip ?? ""}
                        onChange={(event) =>
                            updateFilter("ip", event.target.value)
                        }
                    />
                )}
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
                <TableContainer>
                    <Table
                        aria-label="Download history"
                        data-testid="download-history-table"
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
                                            dereferer={
                                                (
                                                    bootstrap.safeConfig as {
                                                        dereferer?: unknown;
                                                    } | null
                                                )?.dereferer
                                            }
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
                </TableContainer>
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
        </Stack>
    );
}

function Loading() {
    return (
        <Stack alignItems="center" component="main" role="status" spacing={1}>
            <CircularProgress />
            <Typography>Loading download history…</Typography>
        </Stack>
    );
}

function SortHeader({
    label,
    column,
    sort,
    onSort,
}: {
    label: string;
    column: DownloadHistorySort["column"];
    sort: DownloadHistorySort;
    onSort(column: DownloadHistorySort["column"]): void;
}) {
    return (
        <TableCell
            sortDirection={
                sort.column === column
                    ? sort.sortMode === 1
                        ? "asc"
                        : "desc"
                    : false
            }
        >
            <Button onClick={() => onSort(column)}>{label}</Button>
        </TableCell>
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

function historyUserInfoType(safeConfig: unknown): string {
    if (!safeConfig || typeof safeConfig !== "object") {
        return "NONE";
    }
    const logging = (safeConfig as {logging?: unknown}).logging;
    return logging &&
        typeof logging === "object" &&
        typeof (logging as {historyUserInfoType?: unknown})
            .historyUserInfoType === "string"
        ? (logging as {historyUserInfoType: string}).historyUserInfoType
        : "NONE";
}

function showsUsername(type: string) {
    return type === "USERNAME" || type === "BOTH";
}

function showsIp(type: string) {
    return type === "IP" || type === "BOTH";
}
