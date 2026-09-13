import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
    Box,
    Link,
    Stack,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {useCallback, type ReactNode} from "react";

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
import {
    CopyValueButton,
    rowRevealsCopyButtonsOnHover,
} from "../../../components/CopyValueButton";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {historyDownloadResult} from "../../../domain/downloads/actions";
import {externalLink} from "../../../domain/links/externalLinks";
import {DirectDownloadActions} from "../../search/results/DownloadActions";
import {historyUserInfoType} from "../shared/historyUserInfoType";
import {SortHeader} from "../shared/SortHeader";
import {HistoryPageFrame} from "./HistoryPageFrame";
import {
    defaultHistorySort,
    DOWNLOAD_HISTORY_SORT_COLUMNS,
} from "./historySearchParams";
import {useHistoryPage} from "./useHistoryPage";

const defaultSort: DownloadHistorySort = defaultHistorySort("time");

export function DownloadHistoryPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const safeConfig = useSafeConfig(bootstrap);
    const userInfoType = historyUserInfoType(safeConfig);
    const buildDimensions = useCallback(
        () =>
            downloadHistoryDimensions({
                indexerNames: configuredIndexerNames(safeConfig),
                showsUsername: showsUsername(userInfoType),
                showsIp: showsIp(userInfoType),
            }),
        [safeConfig, userInfoType],
    );
    const {
        activeFilterCount,
        changePageSize,
        clearFilters,
        dimensions,
        goToPage,
        page,
        pageSize,
        query,
        sort,
        updateFilter,
        updateSort,
        values,
    } = useHistoryPage({
        defaultSort,
        dimensions: buildDimensions,
        fetchPage: (request, signal) =>
            getDownloadHistory(transport, request, signal),
        queryKeyPrefix: "download-history",
        sortColumns: DOWNLOAD_HISTORY_SORT_COLUMNS,
    });
    return (
        <HistoryPageFrame
            activeFilterCount={activeFilterCount}
            dimensions={dimensions}
            entryNoun={{one: "download", many: "downloads"}}
            heading="Download history"
            messages={{
                empty: "No download history entries match the current filters.",
                error: "Unable to load download history.",
                loading: "Loading download history…",
                malformed: (count) =>
                    `${count} malformed download history entries were not displayed.`,
                refreshing: "Refreshing download history…",
            }}
            // ADR-0038's width floor, measured at 390x844 against the six
            // always-on columns: laid out so no cell has to break a word, this
            // table needs 625px (Time 90, Indexer 108, Title 108, Result 134,
            // Source 102, Age 83). Below that the browser starts squeezing
            // columns past their own content; 640 keeps them at their
            // intrinsic width and lets the container scroll instead (ADR-0029:
            // the page never does).
            minWidth={640}
            onClearFilters={clearFilters}
            onFilterChange={updateFilter}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
            page={page}
            pageSize={pageSize}
            query={query}
            tableLabel="Download history"
            testIds={{
                pageStatus: "download-history-page-status",
                refresh: "download-history-refresh",
                scroller: "download-history-scroller",
                table: "download-history-table",
            }}
            values={values}
        >
            {(downloads) => (
                <>
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
                                sx={rowRevealsCopyButtonsOnHover}
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
                                    <TableCell>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span>{entry.ip ?? ""}</span>
                                            <CopyValueButton
                                                label="IP address"
                                                testId="download-history-copy-ip"
                                                value={entry.ip}
                                            />
                                        </Stack>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </>
            )}
        </HistoryPageFrame>
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
        <Stack
            direction="row"
            sx={{
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
            }}
        >
            {repeatEligible(searchResult) ? (
                <DirectDownloadActions
                    result={historyDownloadResult(searchResult)}
                    onDownloaded={() => {}}
                />
            ) : (
                <Typography
                    component="span"
                    sx={{
                        color: "text.secondary",
                    }}
                >
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
            <CopyValueButton
                label="title"
                testId="download-history-copy-title"
                value={searchResult.title}
            />
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
            return (
                <HelpOutlineOutlinedIcon color="disabled" fontSize="small" />
            );
        case "INTERNAL_ERROR":
        case "NZB_DOWNLOAD_ERROR":
        case "NZB_NOT_ADDED":
        case "NZB_ADD_ERROR":
        case "NZB_ADD_REJECTED":
        case "CONTENT_DOWNLOAD_ERROR":
            return <ErrorOutlineOutlinedIcon color="error" fontSize="small" />;
        case "CONTENT_DOWNLOAD_WARNING":
            return <WarningAmberIcon color="warning" fontSize="small" />;
        case "NZB_DOWNLOAD_SUCCESSFUL":
        case "NZB_ADDED":
            return (
                <CheckCircleOutlineOutlinedIcon color="info" fontSize="small" />
            );
        case "CONTENT_DOWNLOAD_SUCCESSFUL":
            return (
                <CheckCircleOutlineOutlinedIcon
                    color="success"
                    fontSize="small"
                />
            );
    }
}

function StatusCell({status}: {status: DownloadStatus}) {
    return (
        <Stack
            direction="row"
            spacing={0.5}
            sx={{
                alignItems: "center",
            }}
        >
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
