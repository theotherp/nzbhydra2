import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    Table,
    Typography,
} from "@mui/material";
import type {ReactNode} from "react";
import type {UseQueryResult} from "@tanstack/react-query";

import type {
    HistoryDimension,
    HistoryFilterValue,
    HistoryFilterValues,
} from "../../../api/history/filters";
import type {HistoryPage} from "../../../api/history/request";
import {TableScrollAffordance} from "../../../components/table/TableScrollAffordance";
import {Loading} from "../shared/Loading";
import {type HistoryPageSize} from "../shared/pageSize";
import {HistoryPager} from "./HistoryPager";
import {HistoryRefineLayout} from "./refine/HistoryRefineSurface";

/**
 * Every sentence a history page says about its own state. Stated per route
 * rather than derived from one label so each route's wording stays its own and
 * a change to one is visible where it is made.
 */
export type HistoryPageMessages = {
    /** Shown instead of the table when the filters match nothing. */
    empty: string;
    /** Shown instead of the page when the read fails. */
    error: string;
    /** The first-load placeholder's message. */
    loading: string;
    /** The status row's message while a re-read is in flight. */
    refreshing: string;
    /** How this route reports entries its own parser rejected. */
    malformed: (count: number) => string;
};

/** The route's own compatibility-contract test ids (see `FEATURES.yaml`). */
export type HistoryPageTestIds = {
    pageStatus: string;
    refresh: string;
    scroller: string;
    table: string;
};

/**
 * The page frame the three history routes share: the refine surface beside a
 * heading row with a Refresh button, a constant-height refreshing status, the
 * malformed-count and empty-state alerts, and the scrolling table with its
 * pager below it.
 *
 * A route supplies its columns and rows as `children` -- a function of the
 * loaded page, so a page's rows are never written against data the frame has
 * not got yet -- plus its dimensions, its own strings, its measured table
 * `minWidth` and its test ids. `headerActions` is the heading row's non-filter
 * controls (search history's "Show user agents" toggle) and `footer` whatever
 * a route hangs below the pager (its details dialog).
 *
 * The frame states no tokens of its own (ADR-0014) and moves no filter surface
 * (ADR-0046): it renders `HistoryRefineLayout` exactly where each page did.
 */
export function HistoryPageFrame<Entry>({
    activeFilterCount,
    children,
    dimensions,
    entryNoun,
    footer,
    headerActions,
    heading,
    messages,
    minWidth,
    onClearFilters,
    onFilterChange,
    onPageChange,
    onPageSizeChange,
    page,
    pageSize,
    query,
    tableLabel,
    testIds,
    values,
}: {
    /** How many committed filters are narrowing the view right now. */
    activeFilterCount: number;
    children: (entries: Entry[]) => ReactNode;
    dimensions: readonly HistoryDimension[];
    entryNoun: {one: string; many: string};
    footer?: ReactNode;
    headerActions?: ReactNode;
    heading: string;
    messages: HistoryPageMessages;
    /**
     * The route's own measured table width floor (ADR-0038). It is a fact
     * about that route's columns, so it is declared -- and justified -- at the
     * call site rather than here.
     */
    minWidth: number;
    onClearFilters: () => void;
    onFilterChange: (id: string, value: HistoryFilterValue) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: HistoryPageSize) => void;
    page: number;
    pageSize: HistoryPageSize;
    query: UseQueryResult<HistoryPage<Entry>, Error>;
    tableLabel: string;
    testIds: HistoryPageTestIds;
    values: HistoryFilterValues;
}) {
    if (query.isPending) {
        return <Loading message={messages.loading} />;
    }
    if (query.isError) {
        return <Alert severity="error">{messages.error}</Alert>;
    }
    const {entries, totalElements, malformedCount} = query.data;
    return (
        // The route's single filter surface (ADR-0009/ADR-0016/ADR-0046):
        // every dimension legacy offered per table column lives in the refine
        // surface this layout docks beside the table, and the table header
        // carries sorting only. A display toggle is not a filter and stays in
        // the heading row with "Refresh".
        <HistoryRefineLayout
            dimensions={dimensions}
            onChange={onFilterChange}
            onClearAll={onClearFilters}
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
                    {heading}
                </Typography>
                {headerActions === undefined ? (
                    <RefreshButton
                        onRefresh={query.refetch}
                        testId={testIds.refresh}
                    />
                ) : (
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: "center",
                        }}
                    >
                        {headerActions}
                        <RefreshButton
                            onRefresh={query.refetch}
                            testId={testIds.refresh}
                        />
                    </Stack>
                )}
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
                        <Typography>{messages.refreshing}</Typography>
                    </>
                )}
            </Stack>
            {malformedCount > 0 && (
                <Alert severity="warning">
                    {messages.malformed(malformedCount)}
                </Alert>
            )}
            {entries.length === 0 ? (
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
                                onClick={onClearFilters}
                                size="small"
                            >
                                Clear filters
                            </Button>
                        ) : undefined
                    }
                    severity="info"
                >
                    {messages.empty}
                </Alert>
            ) : (
                <TableScrollAffordance scrollerTestId={testIds.scroller}>
                    <Table
                        aria-label={tableLabel}
                        data-testid={testIds.table}
                        sx={{minWidth}}
                    >
                        {children(entries)}
                    </Table>
                </TableScrollAffordance>
            )}
            <HistoryPager
                entryNoun={entryNoun}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                page={page}
                pageSize={pageSize}
                statusTestId={testIds.pageStatus}
                totalElements={totalElements}
            />
            {footer}
        </HistoryRefineLayout>
    );
}

function RefreshButton({
    onRefresh,
    testId,
}: {
    onRefresh: () => Promise<unknown>;
    testId: string;
}) {
    return (
        <Button
            data-testid={testId}
            onClick={() => void onRefresh()}
            variant="outlined"
        >
            Refresh
        </Button>
    );
}
