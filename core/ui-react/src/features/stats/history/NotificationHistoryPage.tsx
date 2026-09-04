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
import {useSearch} from "@tanstack/react-router";
import {useMemo} from "react";

import {
    NOTIFICATION_EVENT_LABELS,
    getNotificationHistory,
    notificationHistoryDimensions,
    type NotificationHistorySort,
} from "../../../api/history/notifications";
import {
    activeHistoryFilterCount,
    historyFilterModel,
} from "../../../api/history/filters";
import {ApiTransport} from "../../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {
    CopyValueButton,
    rowRevealsCopyButtonsOnHover,
} from "../../../components/CopyValueButton";
import {TableScrollAffordance} from "../../../components/table/TableScrollAffordance";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {linkedTextLines} from "../../../domain/links/textLinks";
import {Loading} from "../shared/Loading";
import {type HistoryPageSize} from "../shared/pageSize";
import {SortHeader} from "../shared/SortHeader";
import {HistoryPager} from "./HistoryPager";
import {
    defaultHistorySort,
    historyPageSizeFromSearch,
    historySortFromSearch,
    withHistoryPageSize,
    withHistorySort,
    NOTIFICATION_HISTORY_SORT_COLUMNS,
} from "./historySearchParams";
import {HistoryRefineLayout} from "./refine/HistoryRefineSurface";
import {useHistoryFilterCriteria} from "./useHistoryFilterCriteria";

const defaultSort: NotificationHistorySort = defaultHistorySort("time");

export function NotificationHistoryPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const {
        clearFilters,
        commitFilters,
        criteria,
        goToPage,
        updateFilter,
        values,
    } = useHistoryFilterCriteria();
    const page = criteria.page;
    const search = useSearch({strict: false});
    const pageSize = historyPageSizeFromSearch(search);
    const sort = historySortFromSearch(
        search,
        NOTIFICATION_HISTORY_SORT_COLUMNS,
        defaultSort,
    );
    const safeConfig = useSafeConfig(bootstrap);
    const dimensions = useMemo(() => notificationHistoryDimensions(), []);
    const query = useQuery({
        /*
         * Keyed on the *filter model* rather than on the raw values: the model
         * is what actually reaches the server, and it already collapses empty
         * text, whitespace, an unparseable bound and a `boolean` left on "all"
         * to no filter at all. Keying on the values gave every one of those a
         * key of its own, so typing a character and deleting it -- or clearing
         * a field a different way than it was filled -- missed the cache and
         * re-read a byte-identical page.
         */
        queryKey: [
            "notification-history",
            criteria.page,
            pageSize,
            historyFilterModel(dimensions, criteria.values),
            sort,
        ],
        queryFn: () =>
            getNotificationHistory(transport, {
                dimensions,
                values: criteria.values,
                page: criteria.page,
                limit: pageSize,
                sort,
            }),
        // As on download history: a committed filter edit makes a new query
        // key, and falling back to the first-load spinner would unmount the
        // refine surface mid-edit and take keyboard focus with it.
        placeholderData: keepPreviousData,
    });
    // One navigation, not two: `commitFilters` carries the new ordering into
    // the same history entry as the filter edit it flushes, so a sort click
    // during typing is a single Back step and the sort change cannot resolve
    // against a search the filter commit has not written yet.
    const updateSort = (column: NotificationHistorySort["column"]) => {
        const next: NotificationHistorySort = {
            column,
            sortMode: sort.column === column && sort.sortMode === 1 ? 2 : 1,
        };
        commitFilters((previous) =>
            withHistorySort(previous, next, defaultSort),
        );
    };
    /*
     * A page-size change is one navigation, not two: `commitFilters` already
     * returns to page 1 (and flushes any filter edit still waiting), and
     * `withHistoryPageSize` writes the new size into the same search object.
     * Committing them separately would ask the server for a page that the new
     * size may have put past the end.
     */
    const changePageSize = (size: HistoryPageSize) => {
        commitFilters((previous) => withHistoryPageSize(previous, size));
    };
    if (query.isPending) {
        return <Loading message="Loading notification history…" />;
    }
    if (query.isError) {
        return (
            <Alert severity="error">Unable to load notification history.</Alert>
        );
    }
    const {entries: notifications, totalElements, malformedCount} = query.data;
    const activeFilterCount = activeHistoryFilterCount(
        dimensions,
        criteria.values,
    );
    const dereferer = safeConfig?.dereferer;
    return (
        // The route's single filter surface (ADR-0009/ADR-0016/ADR-0046):
        // legacy's per-column time and event-type filters live in the refine
        // surface this layout docks beside the table, and the table header
        // carries sorting only.
        <HistoryRefineLayout
            dimensions={dimensions}
            onChange={updateFilter}
            onClearAll={clearFilters}
            values={values}
        >
            <Stack
                direction="row"
                spacing={1}
                sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Typography component="h1" variant="h4">
                    Notification history
                </Typography>
                <Button
                    data-testid="notification-history-refresh"
                    onClick={() => void query.refetch()}
                    variant="outlined"
                >
                    Refresh
                </Button>
            </Stack>
            {/*
             * A constant-height slot, not a conditional row: this indicator
             * used to be inserted above the table when a fetch started and
             * removed when it ended, moving everything below it by its own
             * height twice per refresh -- under the reader's pointer, and for
             * every filter commit. The row is always in the layout (and is
             * always the same live region); only its contents come and go.
             */}
            <Stack
                direction="row"
                role="status"
                spacing={1}
                sx={{minHeight: (theme) => theme.spacing(3)}}
            >
                {query.isFetching && (
                    <>
                        <CircularProgress size={20} />
                        <Typography>
                            Refreshing notification history…
                        </Typography>
                    </>
                )}
            </Stack>
            {malformedCount > 0 && (
                <Alert severity="warning">
                    {malformedCount} malformed notification history entries were
                    not displayed.
                </Alert>
            )}
            {notifications.length === 0 ? (
                <Alert
                    // A filtered-empty page is otherwise a dead end: the
                    // filters that emptied it are in the refine surface, which
                    // is collapsed on narrow viewports. Offered only when
                    // there is something to clear -- an empty history has no
                    // filters to blame.
                    action={
                        activeFilterCount > 0 ? (
                            <Button
                                color="inherit"
                                onClick={clearFilters}
                                size="small"
                            >
                                Clear filters
                            </Button>
                        ) : undefined
                    }
                    severity="info"
                >
                    No notification history entries match the current filters.
                </Alert>
            ) : (
                <TableScrollAffordance scrollerTestId="notification-history-scroller">
                    <Table
                        aria-label="Notification history"
                        data-testid="notification-history-table"
                        // ADR-0038's width floor, and the one that fixes the
                        // mid-word wrapping this table was reported for:
                        // Title, Body, and URLs render through `SafeText`,
                        // whose `overflow-wrap: anywhere` breaks *inside* a
                        // word as soon as its column is narrower than the
                        // word. Measured at 390x844 the table collapsed to
                        // 374px, leaving those three columns at their header
                        // labels' width (61/64/65px) -- which is what turned
                        // "System" into "Syst / em". Time and Type need a
                        // measured 90 and 94; 800 gives each of the three
                        // free-text columns roughly 205px, enough for real
                        // notification prose to break at spaces, and the
                        // container scrolls for the rest.
                        sx={{minWidth: 800}}
                    >
                        <TableHead>
                            <TableRow>
                                <SortHeader
                                    column="time"
                                    label="Time"
                                    onSort={updateSort}
                                    sort={sort}
                                />
                                <SortHeader
                                    column="NOTIFICATION_EVENT_TYPE"
                                    label="Type"
                                    onSort={updateSort}
                                    sort={sort}
                                />
                                <TableCell>Title</TableCell>
                                <TableCell>Body</TableCell>
                                <TableCell>URLs</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {notifications.map((entry) => (
                                <TableRow
                                    data-testid="notification-history-row"
                                    key={entry.id}
                                    sx={rowRevealsCopyButtonsOnHover}
                                >
                                    <TableCell>
                                        {formatServerDateTime(
                                            entry.time,
                                            bootstrap.serverTimeZone,
                                        )}
                                    </TableCell>
                                    <TableCell data-testid="notification-history-type">
                                        {
                                            NOTIFICATION_EVENT_LABELS[
                                                entry.notificationEventType
                                            ]
                                        }
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
                                            {/*
                                             * The testid stays on a box
                                             * around `SafeText`'s own output
                                             * only, not the whole cell: its
                                             * lines are direct-child `div`s
                                             * (the "never markup" test walks
                                             * them with `:scope > div`), and
                                             * that shape has to survive this
                                             * cell also holding a copy
                                             * button now.
                                             */}
                                            <Box data-testid="notification-history-title">
                                                <SafeText
                                                    dereferer={dereferer}
                                                    value={entry.title}
                                                />
                                            </Box>
                                            <CopyValueButton
                                                label="notification title"
                                                testId="notification-history-copy-title"
                                                value={entry.title}
                                            />
                                        </Stack>
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
                                            <Box data-testid="notification-history-body">
                                                <SafeText
                                                    dereferer={dereferer}
                                                    value={entry.body}
                                                />
                                            </Box>
                                            <CopyValueButton
                                                label="notification body"
                                                testId="notification-history-copy-body"
                                                value={entry.body}
                                            />
                                        </Stack>
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
                                            <Box data-testid="notification-history-urls">
                                                <SafeText
                                                    dereferer={dereferer}
                                                    value={entry.urls}
                                                />
                                            </Box>
                                            <CopyValueButton
                                                label="notification URLs"
                                                testId="notification-history-copy-urls"
                                                value={entry.urls}
                                            />
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableScrollAffordance>
            )}
            <HistoryPager
                entryNoun={{one: "notification", many: "notifications"}}
                onPageChange={goToPage}
                onPageSizeChange={changePageSize}
                page={page}
                pageSize={pageSize}
                statusTestId="notification-history-page-status"
                totalElements={totalElements}
            />
        </HistoryRefineLayout>
    );
}

/**
 * A notification's title, body, and URL list are server-side templated text
 * that can carry markup, arbitrary schemes, and line breaks. They are rendered
 * as text nodes with real line breaks, and only `http(s)` runs become anchors
 * -- see `domain/links/textLinks.ts` for why `ng-bind-html` is not carried
 * forward.
 */
function SafeText({dereferer, value}: {dereferer: unknown; value?: string}) {
    if (!value) return null;
    return (
        <>
            {linkedTextLines(value, dereferer).map((segments, line) => (
                <Typography
                    component="div"
                    key={line}
                    sx={{overflowWrap: "anywhere"}}
                    variant="body2"
                >
                    {segments.map((segment, index) =>
                        segment.href ? (
                            <Link
                                href={segment.href}
                                key={index}
                                rel="noreferrer"
                                target="_blank"
                            >
                                {segment.text}
                            </Link>
                        ) : (
                            <span key={index}>{segment.text}</span>
                        ),
                    )}
                </Typography>
            ))}
        </>
    );
}
