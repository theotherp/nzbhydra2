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
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {
    keepPreviousData,
    useQuery,
    type UseQueryResult,
} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {useMemo, useState, type ReactNode} from "react";

import type {
    HistoryFilterValue,
    HistoryFilterValues,
} from "../../../api/history/filters";
import {
    getSearchHistory,
    getSearchHistoryDetails,
    searchHistoryDimensions,
    type SearchHistoryDetails,
    type SearchHistoryEntry,
    type SearchHistorySort,
} from "../../../api/searchHistory";
import {redirectRidUrl} from "../../../api/savedSearches";
import {ApiTransport} from "../../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {TableScrollAffordance} from "../../../components/table/TableScrollAffordance";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {externalLink} from "../../../domain/links/externalLinks";
import {createCategoryCatalog} from "../../../domain/categories/catalog";
import {recentSearchCriteria} from "../../search/history/recentSearchCriteria";
import {historyUserInfoType} from "../shared/historyUserInfoType";
import {Loading} from "../shared/Loading";
import {PAGE_SIZE} from "../shared/pageSize";
import {HistoryRefineLayout} from "./refine/HistoryRefineSurface";

const defaultSort: SearchHistorySort = {column: "time", sortMode: 2};

export function SearchHistoryPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const navigate = useNavigate({from: "/stats/searches"});
    const safeConfig = useSafeConfig(bootstrap);
    const catalog = createCategoryCatalog(safeConfig);
    const [page, setPage] = useState(1);
    const [values, setValues] = useState<HistoryFilterValues>({});
    const [sort, setSort] = useState<SearchHistorySort>(defaultSort);
    const [showUserAgent, setShowUserAgent] = useState(false);
    const [detailsId, setDetailsId] = useState<number>();
    const userInfoType = historyUserInfoType(safeConfig);
    const dimensions = useMemo(
        () =>
            searchHistoryDimensions({
                categoryNames: catalog.categories.map(
                    (category) => category.name,
                ),
                showUserAgent,
                showsUsername: showsUsername(userInfoType),
                showsIp: showsIp(userInfoType),
            }),
        [catalog.categories, showUserAgent, userInfoType],
    );
    const query = useQuery({
        queryKey: ["search-history", page, values, sort],
        queryFn: () =>
            getSearchHistory(transport, {
                dimensions,
                values,
                page,
                limit: PAGE_SIZE,
                sort,
            }),
        // Every filter keystroke is a new query key; keeping the previous
        // page's data rendered (rather than falling back to the first-load
        // spinner) keeps the refine surface mounted and its focus intact -- see
        // `DownloadHistoryPage` for the same reasoning.
        placeholderData: keepPreviousData,
    });
    const details = useQuery({
        queryKey: ["search-history-details", detailsId],
        queryFn: () => getSearchHistoryDetails(transport, detailsId!),
        enabled: detailsId !== undefined,
    });
    const updateFilter = (id: string, value: HistoryFilterValue) => {
        setPage(1);
        setValues((current) => ({...current, [id]: value}));
    };
    const clearFilters = () => {
        setPage(1);
        setValues({});
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
        return <Loading message="Loading search history…" />;
    }
    if (query.isError) {
        return <Alert severity="error">Unable to load search history.</Alert>;
    }
    const {entries: searches, totalElements, malformedCount} = query.data;
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
    return (
        // The route's single filter surface (ADR-0009/ADR-0046): every
        // dimension legacy offered per table column lives in the refine
        // surface this layout docks beside the table, and the table header
        // carries sorting only. "Show user agents" stays outside the
        // dimension model -- it is a table-display toggle, not a filter, so
        // it stays in the heading row with "Refresh".
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
                    Search history
                </Typography>
                <Stack alignItems="center" direction="row" spacing={1}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showUserAgent}
                                onChange={(event) => {
                                    setShowUserAgent(event.target.checked);
                                    if (!event.target.checked) {
                                        updateFilter("user-agent", {
                                            kind: "freetext",
                                            text: "",
                                        });
                                    }
                                }}
                            />
                        }
                        label="Show user agents"
                    />
                    <Button
                        data-testid="search-history-refresh"
                        onClick={() => void query.refetch()}
                        variant="outlined"
                    >
                        Refresh
                    </Button>
                </Stack>
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
                <TableScrollAffordance scrollerTestId="search-history-scroller">
                    <Table
                        aria-label="Search history"
                        data-testid="search-history-table"
                        // Until FM-126 this table had no scrolling ancestor at
                        // all, so at 390x844 it pushed the *document* to 687px
                        // against a 390px viewport -- the ADR-0029 violation
                        // ADR-0038 asked to confirm here first. The container
                        // above owns the scroll now, and this is its floor:
                        // measured at 390x844, laid out so no cell has to
                        // break a word, the six always-on columns need 691px
                        // (Time 96, Query 122, Category 106, Additional
                        // parameters 175, Source 96, Details 96). 700 keeps
                        // them at that intrinsic width; the three optional
                        // columns (user agent, username, IP) simply make the
                        // table wider than the floor and scroll with it.
                        sx={{minWidth: 700}}
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
                                            onClick={() =>
                                                setDetailsId(entry.id)
                                            }
                                        >
                                            Details
                                        </Button>
                                    </TableCell>
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
            <DetailsDialog
                details={details}
                onClose={() => setDetailsId(undefined)}
            />
        </HistoryRefineLayout>
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
                {details.isFetching && (
                    <Loading message="Loading search history…" />
                )}
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
    const safeConfig = useSafeConfig(bootstrap);
    const criteria: Array<{label: string; value: ReactNode}> = [];
    for (const identifier of entry.identifiers) {
        const href = identifierHref(
            identifier.identifierKey,
            identifier.identifierValue,
            safeConfig?.dereferer,
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

function showsUsername(type: string) {
    return type === "USERNAME" || type === "BOTH";
}

function showsIp(type: string) {
    return type === "IP" || type === "BOTH";
}
