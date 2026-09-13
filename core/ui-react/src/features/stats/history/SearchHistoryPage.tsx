import RepeatIcon from "@mui/icons-material/Repeat";
import {
    Alert,
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import {useQuery, type UseQueryResult} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {useCallback, useState, type ReactNode} from "react";

import {
    getSearchHistory,
    getSearchHistoryDetails,
    searchHistoryDimensions,
    type SearchHistoryDetails,
    type SearchHistoryEntry,
    type SearchHistorySort,
} from "../../../api/searchHistory";
import {redirectRidUrl} from "../../../api/savedSearches";
import {
    isHistoryFilterActive,
    type HistoryFilterValues,
} from "../../../api/history/filters";
import {ApiTransport} from "../../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {
    CopyValueButton,
    rowRevealsCopyButtonsOnHover,
} from "../../../components/CopyValueButton";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {externalLink} from "../../../domain/links/externalLinks";
import {createCategoryCatalog} from "../../../domain/categories/catalog";
import {recentSearchCriteria} from "../../search/history/recentSearchCriteria";
import {historyUserInfoType} from "../shared/historyUserInfoType";
import {Loading} from "../shared/Loading";
import {HistoryPageFrame} from "./HistoryPageFrame";
import {
    defaultHistorySort,
    SEARCH_HISTORY_SORT_COLUMNS,
} from "./historySearchParams";
import {useHistoryPage} from "./useHistoryPage";

const defaultSort: SearchHistorySort = defaultHistorySort("time");

/**
 * Legacy's tooltip on the repeat control, verbatim
 * (`search-history.html:76-92`): a repeat runs the search again against
 * whatever is enabled now, not against the indexers it originally used.
 */
const REPEAT_SEARCH_HINT =
    "Repeat this search with all currently enabled indexers.";

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
    // A display toggle with an invariant attached: the user-agent dimension
    // only exists while the column is shown, so a user-agent filter must never
    // be able to sit in the URL with the column hidden -- it would then be in
    // the search parameters but in no dimension, and so in no request, no
    // refine field and no active-filter count, leaving the page claiming a
    // filter it does not apply. The column therefore follows the checkbox
    // *or* an active user-agent filter, which is what carries a bookmark, a
    // shared link, a reload, a Back step and a link from elsewhere alike.
    // Derived from the current filter values rather than from the URL, so
    // unticking -- which clears the filter in the same handler and commits it
    // `FILTER_COMMIT_DELAY_MS` later -- hides the column at once instead of
    // holding it open until the commit lands...
    const [userAgentColumnChosen, setUserAgentColumnChosen] = useState(false);
    const [detailsId, setDetailsId] = useState<number>();
    const userInfoType = historyUserInfoType(safeConfig);
    // The dimensions are a function of those same in-flight filter values,
    // which is why `useHistoryPage` asks for them that way: the user-agent
    // dimension has to appear and disappear with the column.
    const buildDimensions = useCallback(
        (values: HistoryFilterValues) =>
            searchHistoryDimensions({
                categoryNames: catalog.categories.map(
                    (category) => category.name,
                ),
                showUserAgent:
                    userAgentColumnChosen || userAgentFilterActive(values),
                showsUsername: showsUsername(userInfoType),
                showsIp: showsIp(userInfoType),
            }),
        [catalog.categories, userAgentColumnChosen, userInfoType],
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
            getSearchHistory(transport, request, signal),
        queryKeyPrefix: "search-history",
        sortColumns: SEARCH_HISTORY_SORT_COLUMNS,
    });
    const details = useQuery({
        queryKey: ["search-history-details", detailsId],
        queryFn: ({signal}) =>
            getSearchHistoryDetails(transport, detailsId!, signal),
        enabled: detailsId !== undefined,
    });
    const userAgentFilter = values["user-agent"];
    const userAgentActive = userAgentFilterActive(values);
    // ...and the arrival *latches* the checkbox on, adjusting state during
    // render rather than in an effect. Without the latch the column would be
    // held open by the filter value alone, so clearing the field to retype it
    // would unmount the field under the caret on the keystroke that empties
    // it. Once shown, the column stays until the checkbox is unticked -- which
    // clears the filter in the same handler, so the two never disagree.
    const [wasUserAgentFilterActive, setWasUserAgentFilterActive] =
        useState(false);
    if (userAgentActive !== wasUserAgentFilterActive) {
        setWasUserAgentFilterActive(userAgentActive);
        if (userAgentActive) setUserAgentColumnChosen(true);
    }
    const showUserAgent = userAgentColumnChosen || userAgentActive;
    const repeat = (entry: SearchHistoryEntry) => {
        void navigate({
            to: "/",
            search: {
                ...recentSearchCriteria(entry, catalog),
                repeat: "history",
            },
        });
    };
    const detailsEntry = query.data?.entries.find(
        (entry) => entry.id === detailsId,
    );
    return (
        <HistoryPageFrame
            activeFilterCount={activeFilterCount}
            dimensions={dimensions}
            entryNoun={{one: "search", many: "searches"}}
            footer={
                <DetailsDialog
                    // FM-174: the row no longer prints the entry's identifiers, so
                    // the dialog carries the search's full criteria -- the row's
                    // own entry, since the details endpoint answers with the
                    // request metadata and the indexer searches only.
                    criteria={
                        detailsEntry
                            ? searchCriteria(detailsEntry, {
                                  includeIdentifiers: true,
                              })
                            : []
                    }
                    dereferer={safeConfig?.dereferer}
                    details={details}
                    onClose={() => setDetailsId(undefined)}
                    transport={transport}
                />
            }
            // "Show user agents" stays outside the dimension model -- it is a
            // table-display toggle, not a filter, so it stays in the heading
            // row with "Refresh".
            headerActions={
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showUserAgent}
                            onChange={(event) => {
                                setUserAgentColumnChosen(event.target.checked);
                                // Hiding the column drops any filter the
                                // column carried -- but only if it carried
                                // one. Writing an empty value
                                // unconditionally made a toggle of a
                                // column nobody had filtered into a filter
                                // edit, and so into a re-read of a
                                // byte-identical page.
                                if (
                                    !event.target.checked &&
                                    userAgentFilter !== undefined &&
                                    isHistoryFilterActive(userAgentFilter)
                                ) {
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
            }
            heading="Search history"
            messages={{
                empty: "No search history entries match the current filters.",
                error: "Unable to load search history.",
                loading: "Loading search history…",
                malformed: (count) =>
                    `${count} malformed search history entries were not displayed.`,
                refreshing: "Refreshing search history…",
            }}
            // Until FM-126 this table had no scrolling ancestor at all, so at
            // 390x844 it pushed the *document* to 687px against a 390px
            // viewport -- the ADR-0029 violation ADR-0038 asked to confirm
            // here first. The container above owns the scroll now, and this is
            // its floor: re-measured for FM-174's column set at 390x844, laid
            // out so no cell has to break a word, the six always-on columns
            // need 752px (Time 157, Query 123, Category 106, Additional
            // parameters 142, Source 96, Details 128) -- Time grew because the
            // timestamp no longer wraps and now carries a 24-hour clock, and
            // Details because it holds the repeat icon beside the button,
            // while Query lost "Repeat" and Additional parameters lost the
            // identifier lines. 760 keeps them at that intrinsic width; the
            // three optional columns (user agent, username, IP) simply make
            // the table wider than the floor and scroll with it.
            minWidth={760}
            onClearFilters={clearFilters}
            onFilterChange={updateFilter}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
            page={page}
            pageSize={pageSize}
            query={query}
            tableLabel="Search history"
            testIds={{
                pageStatus: "search-history-page-status",
                refresh: "search-history-refresh",
                scroller: "search-history-scroller",
                table: "search-history-table",
            }}
            values={values}
        >
            {(searches) => (
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
                                sx={rowRevealsCopyButtonsOnHover}
                            >
                                {/*
                                 * FM-174: the whole timestamp on one line.
                                 * "Sep 10, 2026, 23:00" is the widest
                                 * value this column ever holds and it has
                                 * to fit; left to wrap it broke after the
                                 * year in the narrow layout.
                                 */}
                                <TableCell sx={{whiteSpace: "nowrap"}}>
                                    {formatServerDateTime(
                                        entry.time,
                                        bootstrap.serverTimeZone,
                                    )}
                                </TableCell>
                                {/*
                                 * FM-174 (owner request 2026-09-01): the
                                 * query and its copy affordance, nothing
                                 * else. "Repeat" was a text button in this
                                 * cell and pushed every query off the
                                 * column a reader scans; it is an icon
                                 * beside "Details" now.
                                 */}
                                <TableCell>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <span>{queryLabel(entry)}</span>
                                        <CopyValueButton
                                            label="query"
                                            testId="search-history-copy-query"
                                            value={copyableQueryValue(entry)}
                                        />
                                    </Stack>
                                </TableCell>
                                {showUserAgent && (
                                    <TableCell>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span>{entry.userAgent ?? ""}</span>
                                            <CopyValueButton
                                                label="user agent"
                                                testId="search-history-copy-user-agent"
                                                value={entry.userAgent}
                                            />
                                        </Stack>
                                    </TableCell>
                                )}
                                <TableCell data-testid="search-history-category">
                                    {entry.categoryName}
                                </TableCell>
                                <TableCell>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <Criteria
                                            dereferer={safeConfig?.dereferer}
                                            items={searchCriteria(entry, {
                                                includeIdentifiers: false,
                                            })}
                                            transport={transport}
                                        />
                                        <CopyValueButton
                                            label="additional parameters"
                                            testId="search-history-copy-additional-parameters"
                                            value={additionalParametersText(
                                                entry,
                                            )}
                                        />
                                    </Stack>
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
                                                testId="search-history-copy-ip"
                                                value={entry.ip}
                                            />
                                        </Stack>
                                    </TableCell>
                                )}
                                <TableCell>
                                    <Stack
                                        direction="row"
                                        spacing={0.5}
                                        sx={{
                                            alignItems: "center",
                                        }}
                                    >
                                        <Button
                                            data-testid="search-history-details"
                                            onClick={() =>
                                                setDetailsId(entry.id)
                                            }
                                        >
                                            Details
                                        </Button>
                                        {/*
                                         * Legacy parity
                                         * (search-history.html:76-92):
                                         * repeating a search was an
                                         * icon-only control carrying this
                                         * sentence as its tooltip. It is
                                         * the row's secondary action, so
                                         * it sits beside "Details" rather
                                         * than in the Query column.
                                         */}
                                        <Tooltip title={REPEAT_SEARCH_HINT}>
                                            <IconButton
                                                aria-label={REPEAT_SEARCH_HINT}
                                                data-testid="search-history-repeat"
                                                onClick={() => repeat(entry)}
                                                size="small"
                                            >
                                                <RepeatIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </>
            )}
        </HistoryPageFrame>
    );
}

/**
 * Whether a user-agent filter is currently narrowing the view. Read from the
 * in-flight filter values, which is what lets the column follow a filter that
 * arrived from a link or a Back step before its commit has landed.
 */
function userAgentFilterActive(values: HistoryFilterValues): boolean {
    const filter = values["user-agent"];
    return filter !== undefined && isHistoryFilterActive(filter);
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
    criteria,
    dereferer,
    details,
    onClose,
    transport,
}: {
    criteria: SearchCriterion[];
    dereferer: unknown;
    details: UseQueryResult<SearchHistoryDetails, Error>;
    onClose(): void;
    transport: ApiTransport;
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
                                <TableRow sx={rowRevealsCopyButtonsOnHover}>
                                    <TableCell>Host</TableCell>
                                    <TableCell>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span>{details.data.ip ?? ""}</span>
                                            <CopyValueButton
                                                label="host"
                                                testId="search-history-details-copy-host"
                                                value={details.data.ip}
                                            />
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                                <TableRow sx={rowRevealsCopyButtonsOnHover}>
                                    <TableCell>User agent</TableCell>
                                    <TableCell>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            sx={{
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <span>
                                                {details.data.userAgent ?? ""}
                                            </span>
                                            <CopyValueButton
                                                label="user agent"
                                                testId="search-history-details-copy-user-agent"
                                                value={details.data.userAgent}
                                            />
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                                {/*
                                 * FM-174: everything the row's Additional-
                                 * parameters cell stopped printing -- the
                                 * identifiers, with the same external links
                                 * the row used to carry -- plus the criteria
                                 * it still shows, so one place holds the whole
                                 * search request.
                                 */}
                                {criteria.map((criterion) => (
                                    <TableRow key={criterion.key}>
                                        <TableCell>{criterion.label}</TableCell>
                                        <TableCell>
                                            {criterionValue(
                                                criterion,
                                                dereferer,
                                                transport,
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
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

/**
 * `queryLabel` without its "Update query" placeholder: that string is UI
 * chrome for an entry with no title, query, or identifiers, not a value to
 * copy. `CopyValueButton` already hides itself on an empty/undefined value,
 * so this falling through to `undefined` is what makes the button disappear
 * on those rows instead of copying a label nobody typed.
 */
function copyableQueryValue(entry: SearchHistoryEntry): string | undefined {
    return entry.title ?? entry.query;
}

/**
 * One ordered list of the entry's search criteria, shared by the row's
 * "Additional parameters" cell, that cell's copy text, and the details
 * dialog -- so the three can never drift apart.
 *
 * FM-174 (owner request 2026-09-01): `includeIdentifiers` is the whole
 * difference between the row and the dialog. The row stopped printing the
 * `<key> ID` lines (they made every identifier search a three-line cell for
 * values a reader rarely reads); the dialog prints them, with the same
 * external links, so nothing the row dropped became unreachable.
 */
function searchCriteria(
    entry: SearchHistoryEntry,
    {includeIdentifiers}: {includeIdentifiers: boolean},
): SearchCriterion[] {
    const criteria: SearchCriterion[] = [];
    if (includeIdentifiers) {
        for (const [index, identifier] of entry.identifiers.entries()) {
            criteria.push({
                key: `identifier-${index}`,
                label: `${identifier.identifierKey} ID`,
                text: identifier.identifierValue,
                identifier,
            });
        }
    }
    if (entry.season !== undefined) {
        criteria.push({
            key: "season",
            label: "Season",
            text: String(entry.season),
        });
    }
    if (entry.episode) {
        criteria.push({key: "episode", label: "Episode", text: entry.episode});
    }
    if (entry.author) {
        criteria.push({key: "author", label: "Author", text: entry.author});
    }
    /*
     * One line per dimension rather than legacy's separate Minimum/Maximum
     * rows: a bounded search wrote four of the row's lines for two facts.
     */
    const size = rangeText(
        entry.minSize,
        entry.maxSize,
        (value) => `${value} MB`,
    );
    if (size !== undefined) {
        criteria.push({key: "size", label: "Size", text: size});
    }
    const age = rangeText(
        entry.minAge,
        entry.maxAge,
        (value) => `${value} days`,
    );
    if (age !== undefined) {
        criteria.push({key: "age", label: "Age", text: age});
    }
    // Only when indexers were actually chosen: an empty array is the ordinary
    // "searched everything enabled" case, and rendering it as "None" claimed
    // the opposite of what happened.
    if (
        entry.selectedIndexers !== undefined &&
        entry.selectedIndexers.length > 0
    ) {
        criteria.push({
            key: "selected-indexers",
            label: "Selected indexers",
            text: entry.selectedIndexers.join(", "),
        });
    }
    return criteria;
}

function rangeText(
    minimum: number | undefined,
    maximum: number | undefined,
    unit: (value: number) => string,
): string | undefined {
    if (minimum !== undefined && maximum !== undefined) {
        return `${unit(minimum)} - ${unit(maximum)}`;
    }
    if (minimum !== undefined) return `at least ${unit(minimum)}`;
    if (maximum !== undefined) return `up to ${unit(maximum)}`;
    return undefined;
}

interface SearchCriterion {
    key: string;
    label: string;
    /** The value as plain text -- what the copy button writes. */
    text: string;
    /** Set on an identifier, which renders as an external link. */
    identifier?: {identifierKey: string; identifierValue: string};
}

/**
 * The row's criteria as one plain-text block for the column's copy button:
 * the same labels and values the cell renders, assembled from the entry
 * rather than read back out of the cell's DOM.
 * Returns `undefined` when the entry carries no such criteria at all, so the
 * button does not appear over an empty cell.
 */
function additionalParametersText(
    entry: SearchHistoryEntry,
): string | undefined {
    const lines = searchCriteria(entry, {includeIdentifiers: false}).map(
        (criterion) => `${criterion.label}: ${criterion.text}`,
    );
    return lines.length > 0 ? lines.join("\n") : undefined;
}

function Criteria({
    dereferer,
    items,
    transport,
}: {
    dereferer: unknown;
    items: SearchCriterion[];
    transport: ApiTransport;
}) {
    return (
        <Stack component="dl" spacing={0.5} sx={{m: 0}}>
            {items.map((criterion) => (
                <Stack
                    component="div"
                    direction="row"
                    key={criterion.key}
                    spacing={0.5}
                >
                    <Typography
                        component="dt"
                        sx={{
                            fontWeight: "medium",
                        }}
                    >
                        {criterion.label}:
                    </Typography>
                    <Typography component="dd" sx={{m: 0}}>
                        {criterionValue(criterion, dereferer, transport)}
                    </Typography>
                </Stack>
            ))}
        </Stack>
    );
}

function criterionValue(
    criterion: SearchCriterion,
    dereferer: unknown,
    transport: ApiTransport,
): ReactNode {
    const href = criterion.identifier
        ? identifierHref(
              criterion.identifier.identifierKey,
              criterion.identifier.identifierValue,
              dereferer,
              transport,
          )
        : undefined;
    return href ? (
        <Link href={href} rel="noreferrer" target="_blank">
            {criterion.text}
        </Link>
    ) : (
        criterion.text
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
