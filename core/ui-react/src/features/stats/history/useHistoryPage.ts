import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {useSearch} from "@tanstack/react-router";
import {useMemo} from "react";
import type {UseQueryResult} from "@tanstack/react-query";

import {
    activeHistoryFilterCount,
    historyFilterModel,
    type HistoryDimension,
    type HistoryFilterValue,
    type HistoryFilterValues,
} from "../../../api/history/filters";
import type {HistoryPage, HistoryQuery} from "../../../api/history/request";
import {type HistoryPageSize} from "../shared/pageSize";
import {type SortState} from "../shared/SortHeader";
import {
    historyPageSizeFromSearch,
    historySortFromSearch,
    withHistoryPageSize,
    withHistorySort,
} from "./historySearchParams";
import {useHistoryFilterCriteria} from "./useHistoryFilterCriteria";

/**
 * What a history route declares to get its read. Everything else -- which page,
 * which size, which ordering, when to re-read, and what a sort click or a
 * page-size change does to the URL -- is the same on all three routes and lives
 * in the hook.
 */
export type HistoryPageOptions<Column extends string, Entry> = {
    /**
     * The route's declared dimensions, as a function of the *uncommitted*
     * filter values rather than as a ready-made array: search history's
     * user-agent dimension exists only while its column is shown, and the
     * column follows those values. The two routes that do not read them ignore
     * the argument. Memoize this per route on whatever else it reads -- the
     * hook memoizes the dimensions themselves on it and on the values.
     */
    dimensions: (values: HistoryFilterValues) => readonly HistoryDimension[];
    /** The route's own `HistoryWeb` reader, with its `AbortSignal` threaded. */
    fetchPage: (
        query: HistoryQuery,
        signal: AbortSignal,
    ) => Promise<HistoryPage<Entry>>;
    /** First element of the query key, e.g. `"download-history"`. */
    queryKeyPrefix: string;
    /** This route's sort vocabulary and its default ordering. */
    sortColumns: readonly Column[];
    defaultSort: SortState<Column>;
};

export type HistoryPageState<Column extends string, Entry> = {
    /** How many of the route's dimensions the *committed* filters narrow. */
    activeFilterCount: number;
    changePageSize: (size: HistoryPageSize) => void;
    clearFilters: () => void;
    dimensions: readonly HistoryDimension[];
    goToPage: (page: number) => void;
    page: number;
    pageSize: HistoryPageSize;
    query: UseQueryResult<HistoryPage<Entry>, Error>;
    sort: SortState<Column>;
    updateFilter: (id: string, value: HistoryFilterValue) => void;
    updateSort: (column: Column) => void;
    /** The filter values the refine surface edits, keystroke by keystroke. */
    values: HistoryFilterValues;
};

/**
 * The plumbing `SearchHistoryPage`, `DownloadHistoryPage` and
 * `NotificationHistoryPage` restated once each: the filter criteria, the
 * page/size/sort read out of the route's search parameters, the paged read
 * itself, and the two controls that change the URL rather than the request.
 *
 * What is left in a page is its own: which dimensions it declares, which
 * columns it shows, and how it renders a row.
 */
export function useHistoryPage<Column extends string, Entry>({
    dimensions: buildDimensions,
    fetchPage,
    queryKeyPrefix,
    sortColumns,
    defaultSort,
}: HistoryPageOptions<Column, Entry>): HistoryPageState<Column, Entry> {
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
    const sort = historySortFromSearch(search, sortColumns, defaultSort);
    const dimensions = useMemo(
        () => buildDimensions(values),
        [buildDimensions, values],
    );
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
            queryKeyPrefix,
            criteria.page,
            pageSize,
            historyFilterModel(dimensions, criteria.values),
            sort,
        ],
        queryFn: ({signal}) =>
            fetchPage(
                {
                    dimensions,
                    values: criteria.values,
                    page: criteria.page,
                    limit: pageSize,
                    sort,
                },
                signal,
            ),
        // A committed filter edit is a new query key. Without this the page
        // would fall back to its first-load spinner on each one, unmounting
        // the refine surface mid-edit and taking keyboard focus with it; the
        // already-rendered "Refreshing …" status row is what reports the
        // in-flight request instead.
        placeholderData: keepPreviousData,
    });
    // One navigation, not two: `commitFilters` carries the new ordering into
    // the same history entry as the filter edit it flushes, so a sort click
    // during typing is a single Back step and the sort change cannot resolve
    // against a search the filter commit has not written yet.
    const updateSort = (column: Column) => {
        const next: SortState<Column> = {
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
    return {
        activeFilterCount: activeHistoryFilterCount(
            dimensions,
            criteria.values,
        ),
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
    };
}
