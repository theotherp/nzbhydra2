import {
    Alert,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Link,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import {useQuery, type UseQueryResult} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {useState, type ReactNode} from "react";

import {
    getSearchHistory,
    getSearchHistoryDetails,
    type SearchHistoryDetails,
    type SearchHistoryEntry,
    type SearchHistoryFilters,
    type SearchHistorySort,
} from "../../../api/searchHistory";
import {redirectRidUrl} from "../../../api/savedSearches";
import {ApiTransport} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {externalLink} from "../../../domain/links/externalLinks";
import {createCategoryCatalog} from "../../../domain/categories/catalog";
import {recentSearchCriteria} from "../../search/history/recentSearchCriteria";

const PAGE_SIZE = 25;
const defaultSort: SearchHistorySort = {column: "time", sortMode: 2};

export function SearchHistoryPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const navigate = useNavigate({from: "/stats/searches"});
    const catalog = createCategoryCatalog(bootstrap.safeConfig);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<SearchHistoryFilters>({
        source: "all",
    });
    const [sort, setSort] = useState<SearchHistorySort>(defaultSort);
    const [showUserAgent, setShowUserAgent] = useState(false);
    const [detailsId, setDetailsId] = useState<number>();
    const userInfoType = historyUserInfoType(bootstrap.safeConfig);
    const query = useQuery({
        queryKey: ["search-history", page, filters, sort],
        queryFn: () =>
            getSearchHistory(transport, page, PAGE_SIZE, filters, sort),
    });
    const details = useQuery({
        queryKey: ["search-history-details", detailsId],
        queryFn: () => getSearchHistoryDetails(transport, detailsId!),
        enabled: detailsId !== undefined,
    });
    const updateFilter = (name: keyof SearchHistoryFilters, value: string) => {
        setPage(1);
        setFilters((current) => ({...current, [name]: value || undefined}));
    };
    const updateSort = (column: SearchHistorySort["column"]) => {
        setPage(1);
        setSort((current) => ({
            column,
            sortMode:
                current.column === column && current.sortMode === 1 ? 2 : 1,
        }));
    };
    const repeat = (entry: SearchHistoryEntry) => {
        void navigate({
            to: "/",
            search: {
                ...recentSearchCriteria(entry, catalog),
                repeat: "history",
            },
        });
    };
    if (query.isPending) {
        return <Loading />;
    }
    if (query.isError) {
        return <Alert severity="error">Unable to load search history.</Alert>;
    }
    const {searches, totalElements, malformedCount} = query.data;
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
    return (
        <Stack component="main" spacing={2}>
            <Typography component="h1" variant="h4">
                Search history
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
                    label="Query"
                    value={filters.query ?? ""}
                    onChange={(event) =>
                        updateFilter("query", event.target.value)
                    }
                />
                <TextField
                    label="Category"
                    select
                    value={filters.category ?? ""}
                    onChange={(event) =>
                        updateFilter("category", event.target.value)
                    }
                >
                    <MenuItem value="">All categories</MenuItem>
                    {catalog.categories.map((category) => (
                        <MenuItem key={category.name} value={category.name}>
                            {category.name}
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
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showUserAgent}
                            onChange={(event) => {
                                setShowUserAgent(event.target.checked);
                                if (!event.target.checked) {
                                    updateFilter("userAgent", "");
                                }
                            }}
                        />
                    }
                    label="Show user agents"
                />
                {showUserAgent && (
                    <TextField
                        label="User agent"
                        value={filters.userAgent ?? ""}
                        onChange={(event) =>
                            updateFilter("userAgent", event.target.value)
                        }
                    />
                )}
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
                    data-testid="search-history-refresh"
                    onClick={() => void query.refetch()}
                    variant="outlined"
                >
                    Refresh
                </Button>
            </Stack>
            {query.isFetching && (
                <Stack direction="row" role="status" spacing={1}>
                    <CircularProgress size={20} />
                    <Typography>Refreshing search history…</Typography>
                </Stack>
            )}
            {malformedCount > 0 && (
                <Alert severity="warning">
                    {malformedCount} malformed search history entries were not
                    displayed.
                </Alert>
            )}
            {searches.length === 0 ? (
                <Alert severity="info">
                    No search history entries match the current filters.
                </Alert>
            ) : (
                <Table
                    aria-label="Search history"
                    data-testid="search-history-table"
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
                                label="Query"
                                column="query"
                                sort={sort}
                                onSort={updateSort}
                            />
                            {showUserAgent && (
                                <SortHeader
                                    label="User agent"
                                    column="user_agent"
                                    sort={sort}
                                    onSort={updateSort}
                                />
                            )}
                            <SortHeader
                                label="Category"
                                column="category_name"
                                sort={sort}
                                onSort={updateSort}
                            />
                            <TableCell>Additional parameters</TableCell>
                            <SortHeader
                                label="Source"
                                column="source"
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
                            <TableCell>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {searches.map((entry) => (
                            <TableRow
                                data-testid="search-history-row"
                                key={entry.id}
                            >
                                <TableCell>
                                    {formatServerDateTime(
                                        entry.time,
                                        bootstrap.serverTimeZone,
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        data-testid="search-history-repeat"
                                        onClick={() => repeat(entry)}
                                    >
                                        Repeat
                                    </Button>
                                    {queryLabel(entry)}
                                </TableCell>
                                {showUserAgent && (
                                    <TableCell>
                                        {entry.userAgent ?? ""}
                                    </TableCell>
                                )}
                                <TableCell data-testid="search-history-category">
                                    {entry.categoryName}
                                </TableCell>
                                <TableCell>
                                    <Criteria
                                        entry={entry}
                                        bootstrap={bootstrap}
                                        transport={transport}
                                    />
                                </TableCell>
                                <TableCell data-testid="search-history-source">
                                    {entry.source === "API"
                                        ? "API"
                                        : "Internal"}
                                </TableCell>
                                {showsUsername(userInfoType) && (
                                    <TableCell>
                                        {entry.username ?? ""}
                                    </TableCell>
                                )}
                                {showsIp(userInfoType) && (
                                    <TableCell>{entry.ip ?? ""}</TableCell>
                                )}
                                <TableCell>
                                    <Button
                                        data-testid="search-history-details"
                                        onClick={() => setDetailsId(entry.id)}
                                    >
                                        Details
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
            <DetailsDialog
                details={details}
                onClose={() => setDetailsId(undefined)}
            />
        </Stack>
    );
}

function Loading() {
    return (
        <Stack alignItems="center" component="main" role="status" spacing={1}>
            <CircularProgress />
            <Typography>Loading search history…</Typography>
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
    column: SearchHistorySort["column"];
    sort: SearchHistorySort;
    onSort(column: SearchHistorySort["column"]): void;
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

function DetailsDialog({
    details,
    onClose,
}: {
    details: UseQueryResult<SearchHistoryDetails, Error>;
    onClose(): void;
}) {
    return (
        <Dialog
            open={details.isFetching || details.isSuccess || details.isError}
            onClose={onClose}
        >
            <DialogTitle>Search details</DialogTitle>
            <DialogContent>
                {details.isFetching && <Loading />}
                {details.isError && (
                    <Alert severity="error">
                        Unable to load search details.
                    </Alert>
                )}
                {details.data && (
                    <Stack spacing={2}>
                        <Table aria-label="Search request details">
                            <TableBody>
                                <TableRow>
                                    <TableCell>Host</TableCell>
                                    <TableCell>
                                        {details.data.ip ?? ""}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>User agent</TableCell>
                                    <TableCell>
                                        {details.data.userAgent ?? ""}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <Table aria-label="Related indexer searches">
                            <caption>Related indexer searches</caption>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Indexer</TableCell>
                                    <TableCell>Successful</TableCell>
                                    <TableCell>Results</TableCell>
                                    <TableCell>Response time</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {details.data.indexerSearches.map((entry) => (
                                    <TableRow key={entry.indexerName}>
                                        <TableCell>
                                            {entry.indexerName}
                                        </TableCell>
                                        <TableCell>
                                            {entry.successful ? "Yes" : "No"}
                                        </TableCell>
                                        <TableCell>
                                            {entry.resultsCount}
                                        </TableCell>
                                        <TableCell>
                                            {entry.responseTime === undefined
                                                ? "N/A"
                                                : `${entry.responseTime}ms`}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {details.data.malformedCount > 0 && (
                            <Alert severity="warning">
                                {details.data.malformedCount} malformed indexer
                                search entries were not displayed.
                            </Alert>
                        )}
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}

function queryLabel(entry: SearchHistoryEntry) {
    return (
        entry.title ??
        entry.query ??
        (entry.identifiers.length === 0 &&
        entry.season === undefined &&
        !entry.episode
            ? "Update query"
            : "")
    );
}

function Criteria({
    entry,
    bootstrap,
    transport,
}: {
    entry: SearchHistoryEntry;
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const criteria: Array<{label: string; value: ReactNode}> = [];
    for (const identifier of entry.identifiers) {
        const href = identifierHref(
            identifier.identifierKey,
            identifier.identifierValue,
            bootstrap.safeConfig?.dereferer,
            transport,
        );
        criteria.push({
            label: `${identifier.identifierKey} ID`,
            value: href ? (
                <Link
                    href={href}
                    key={`${identifier.identifierKey}-${identifier.identifierValue}`}
                    rel="noreferrer"
                    target="_blank"
                >
                    {identifier.identifierValue}
                </Link>
            ) : (
                identifier.identifierValue
            ),
        });
    }
    if (entry.season !== undefined) {
        criteria.push({label: "Season", value: entry.season});
    }
    if (entry.episode) {
        criteria.push({label: "Episode", value: entry.episode});
    }
    if (entry.author) {
        criteria.push({label: "Author", value: entry.author});
    }
    if (entry.minAge !== undefined) {
        criteria.push({label: "Minimum age", value: `${entry.minAge} days`});
    }
    if (entry.maxAge !== undefined) {
        criteria.push({label: "Maximum age", value: `${entry.maxAge} days`});
    }
    if (entry.minSize !== undefined) {
        criteria.push({label: "Minimum size", value: `${entry.minSize} MB`});
    }
    if (entry.maxSize !== undefined) {
        criteria.push({label: "Maximum size", value: `${entry.maxSize} MB`});
    }
    if (entry.selectedIndexers !== undefined) {
        criteria.push({
            label: "Selected indexers",
            value:
                entry.selectedIndexers.length > 0
                    ? entry.selectedIndexers.join(", ")
                    : "None",
        });
    }
    return (
        <Stack component="dl" spacing={0.5} sx={{m: 0}}>
            {criteria.map(({label, value}) => (
                <Stack
                    component="div"
                    direction="row"
                    key={label}
                    spacing={0.5}
                >
                    <Typography component="dt" fontWeight="medium">
                        {label}:
                    </Typography>
                    <Typography component="dd" sx={{m: 0}}>
                        {value}
                    </Typography>
                </Stack>
            ))}
        </Stack>
    );
}

function identifierHref(
    key: string,
    value: string,
    dereferer: unknown,
    transport: ApiTransport,
) {
    if (key === "TVRAGE") {
        return redirectRidUrl(transport, value);
    }
    const external =
        key === "TMDB"
            ? `https://www.themoviedb.org/movie/${value}`
            : key === "IMDB"
              ? `https://www.imdb.com/title/tt${value.replace(/^tt/, "")}`
              : key === "TVDB"
                ? `https://thetvdb.com/?tab=series&id=${value}`
                : key === "TVMAZE"
                  ? `https://www.tvmaze.com/shows/${value}`
                  : undefined;
    return external ? externalLink(external, dereferer) : undefined;
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
