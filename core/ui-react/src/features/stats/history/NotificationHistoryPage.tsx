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
import {useCallback} from "react";

import {
    NOTIFICATION_EVENT_LABELS,
    getNotificationHistory,
    notificationHistoryDimensions,
    type NotificationHistorySort,
} from "../../../api/history/notifications";
import {ApiTransport} from "../../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {
    CopyValueButton,
    rowRevealsCopyButtonsOnHover,
} from "../../../components/CopyValueButton";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {linkedTextLines} from "../../../domain/links/textLinks";
import {SortHeader} from "../shared/SortHeader";
import {HistoryPageFrame} from "./HistoryPageFrame";
import {
    defaultHistorySort,
    NOTIFICATION_HISTORY_SORT_COLUMNS,
} from "./historySearchParams";
import {useHistoryPage} from "./useHistoryPage";

const defaultSort: NotificationHistorySort = defaultHistorySort("time");

export function NotificationHistoryPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const safeConfig = useSafeConfig(bootstrap);
    const buildDimensions = useCallback(
        () => notificationHistoryDimensions(),
        [],
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
            getNotificationHistory(transport, request, signal),
        queryKeyPrefix: "notification-history",
        sortColumns: NOTIFICATION_HISTORY_SORT_COLUMNS,
    });
    const dereferer = safeConfig?.dereferer;
    return (
        <HistoryPageFrame
            activeFilterCount={activeFilterCount}
            dimensions={dimensions}
            entryNoun={{one: "notification", many: "notifications"}}
            heading="Notification history"
            messages={{
                empty: "No notification history entries match the current filters.",
                error: "Unable to load notification history.",
                loading: "Loading notification history…",
                malformed: (count) =>
                    `${count} malformed notification history entries were not displayed.`,
                refreshing: "Refreshing notification history…",
            }}
            // ADR-0038's width floor, and the one that fixes the mid-word
            // wrapping this table was reported for: Title, Body, and URLs
            // render through `SafeText`, whose `overflow-wrap: anywhere`
            // breaks *inside* a word as soon as its column is narrower than
            // the word. Measured at 390x844 the table collapsed to 374px,
            // leaving those three columns at their header labels' width
            // (61/64/65px) -- which is what turned "System" into "Syst / em".
            // Time and Type need a measured 90 and 94; 800 gives each of the
            // three free-text columns roughly 205px, enough for real
            // notification prose to break at spaces, and the container
            // scrolls for the rest.
            minWidth={800}
            onClearFilters={clearFilters}
            onFilterChange={updateFilter}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
            page={page}
            pageSize={pageSize}
            query={query}
            tableLabel="Notification history"
            testIds={{
                pageStatus: "notification-history-page-status",
                refresh: "notification-history-refresh",
                scroller: "notification-history-scroller",
                table: "notification-history-table",
            }}
            values={values}
        >
            {(notifications) => (
                <>
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
                </>
            )}
        </HistoryPageFrame>
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
