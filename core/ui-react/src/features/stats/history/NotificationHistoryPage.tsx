import {
    Alert,
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
import {useMemo, useState} from "react";

import type {
    HistoryFilterValue,
    HistoryFilterValues,
} from "../../../api/history/filters";
import {
    NOTIFICATION_EVENT_LABELS,
    getNotificationHistory,
    notificationHistoryDimensions,
    type NotificationHistorySort,
} from "../../../api/history/notifications";
import {ApiTransport} from "../../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {TableScrollAffordance} from "../../../components/table/TableScrollAffordance";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {linkedTextLines} from "../../../domain/links/textLinks";
import {Loading} from "../shared/Loading";
import {PAGE_SIZE} from "../shared/pageSize";
import {SortHeader} from "../shared/SortHeader";
import {HistoryRefineLayout} from "./refine/HistoryRefineSurface";

const defaultSort: NotificationHistorySort = {column: "time", sortMode: 2};

export function NotificationHistoryPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const [page, setPage] = useState(1);
    const [values, setValues] = useState<HistoryFilterValues>({});
    const [sort, setSort] = useState<NotificationHistorySort>(defaultSort);
    const safeConfig = useSafeConfig(bootstrap);
    const dimensions = useMemo(() => notificationHistoryDimensions(), []);
    const query = useQuery({
        queryKey: ["notification-history", page, values, sort],
        queryFn: () =>
            getNotificationHistory(transport, {
                dimensions,
                values,
                page,
                limit: PAGE_SIZE,
                sort,
            }),
        // As on download history: a filter keystroke makes a new query key, and
        // falling back to the first-load spinner would unmount the refine surface
        // mid-edit and take keyboard focus with it.
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
    const updateSort = (column: NotificationHistorySort["column"]) => {
        setPage(1);
        setSort((current) => ({
            column,
            sortMode:
                current.column === column && current.sortMode === 1 ? 2 : 1,
        }));
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
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
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
                alignItems="center"
                direction="row"
                justifyContent="space-between"
                spacing={1}
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
            {query.isFetching && (
                <Stack direction="row" role="status" spacing={1}>
                    <CircularProgress size={20} />
                    <Typography>Refreshing notification history…</Typography>
                </Stack>
            )}
            {malformedCount > 0 && (
                <Alert severity="warning">
                    {malformedCount} malformed notification history entries were
                    not displayed.
                </Alert>
            )}
            {notifications.length === 0 ? (
                <Alert severity="info">
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
                                    <TableCell data-testid="notification-history-title">
                                        <SafeText
                                            dereferer={dereferer}
                                            value={entry.title}
                                        />
                                    </TableCell>
                                    <TableCell data-testid="notification-history-body">
                                        <SafeText
                                            dereferer={dereferer}
                                            value={entry.body}
                                        />
                                    </TableCell>
                                    <TableCell data-testid="notification-history-urls">
                                        <SafeText
                                            dereferer={dereferer}
                                            value={entry.urls}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableScrollAffordance>
            )}
            <Stack alignItems="center" direction="row" spacing={1}>
                <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Previous page
                </Button>
                <Typography data-testid="notification-history-page-status">
                    Page {page} of {totalPages} · {totalElements}{" "}
                    {totalElements === 1 ? "notification" : "notifications"}
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
