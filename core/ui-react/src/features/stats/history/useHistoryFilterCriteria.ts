import {useNavigate, useRouter, useSearch} from "@tanstack/react-router";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import type {
    HistoryFilterValue,
    HistoryFilterValues,
} from "../../../api/history/filters";
import {
    historyFilterParams,
    historyFilterValuesFromSearch,
    historyPageFromSearch,
    historySearchEqual,
    withHistoryCriteria,
    type HistorySearchParams,
} from "./historySearchParams";

/**
 * How long a typed filter edit waits before it becomes a request. Long enough
 * that a burst of typing is one round trip, short enough that a reader who
 * stops typing does not notice waiting -- the same order as the results refine
 * sidebar's own `FILTER_COMMIT_DELAY_MS`.
 */
const FILTER_COMMIT_DELAY_MS = 275;

/** What identifies a history read: which page, filtered by what. */
export type HistoryCriteria = {
    page: number;
    values: HistoryFilterValues;
};

/**
 * The edit in progress, together with the committed filter parameters it was
 * built on top of. Keeping the two in one state value is what lets an
 * *external* arrival -- Back, a pasted link, a `Link` from elsewhere -- be
 * recognized by comparison during render instead of by an effect that would
 * have to overwrite the draft a render too late.
 */
type HistoryFilterDraft = {
    /** The committed filter parameters this draft was written against. */
    base: Record<string, unknown>;
    values: HistoryFilterValues;
    /**
     * The search object this draft was last reconciled with. A commit's own
     * navigation is asynchronous, so between writing the draft and the router
     * answering there is a render in which the URL still holds the *previous*
     * filters. Identity, not content, is what tells that render ("the search
     * has not moved yet") apart from a real arrival ("the search moved, and
     * not to what we wrote").
     */
    from: HistorySearchParams;
};

/**
 * The filter state of a history route, split into the half the controls edit
 * and the half the query is keyed on.
 *
 * Every history page keyed its query on the raw filter values, so each
 * keystroke in the refine surface's free-text and range fields was its own
 * POST -- and each of those runs a COUNT beside the page read. Typing
 * "avengers" was eight round trips whose first seven answers were thrown away.
 * `values` still tracks every keystroke, so the inputs stay exactly as
 * responsive as they were; `criteria` follows `FILTER_COMMIT_DELAY_MS` after
 * the last one.
 *
 * The page number travels with the values rather than beside them because a
 * filter edit also returns to page 1: committing the two separately would make
 * every filter change *two* requests (one for the page reset against the old
 * filter, one for the filter), which is the opposite of the point. For the same
 * reason the controls that change the query key on their own -- paging and
 * sorting -- commit whatever edit is pending instead of racing it.
 *
 * Since FM-165 the committed half lives in the route's search parameters
 * (`historySearchParams.ts`) rather than in component state, which makes a
 * filtered, sorted, paged view a link. That puts the debounce and the history
 * stack in each other's way, so each commit path picks its own answer:
 *
 *   - a debounced `updateFilter` commit **replaces**, because a reader typing
 *     "avengers" wants one entry to go Back past, not eight;
 *   - `clearFilters`, `commitFilters` and `goToPage` **push**, because each is
 *     one deliberate act and Back should undo exactly it.
 *
 * A commit that comes out at the URL the reader is already on reloads rather
 * than pushing a duplicate entry -- the router's own answer to a same-URL
 * navigation.
 */
export function useHistoryFilterCriteria() {
    const search = useSearch({strict: false}) as HistorySearchParams;
    const navigate = useNavigate();
    const router = useRouter();
    const committedValues = useMemo(
        () => historyFilterValuesFromSearch(search),
        [search],
    );
    const criteria = useMemo<HistoryCriteria>(
        () => ({page: historyPageFromSearch(search), values: committedValues}),
        [search, committedValues],
    );
    const committedParams = useMemo(
        () => historyFilterParams(committedValues),
        [committedValues],
    );
    const [draft, setDraft] = useState<HistoryFilterDraft>(() => ({
        base: committedParams,
        values: committedValues,
        from: search,
    }));
    /**
     * Whether the URL's filters are something this hook did not put there. A
     * commit updates `base` to what it wrote, so its own arrival compares
     * equal and leaves the draft alone -- which is what keeps a keystroke that
     * lands while a commit is in flight from being rolled back to the value
     * that commit carried.
     */
    const external =
        search !== draft.from &&
        !historySearchEqual(committedParams, draft.base);
    const values = external ? committedValues : draft.values;
    const base = external ? committedParams : draft.base;
    /**
     * The current render's values, base and search, readable from an event
     * handler or the debounce timer without waiting for a render and without
     * making every commit callback change identity. Written in an effect and
     * in handlers -- never during render.
     */
    const latest = useRef({values, base, search});
    useEffect(() => {
        latest.current = {values, base, search};
    });
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    // An external arrival also cancels an edit that was still waiting to
    // commit: having gone Back, the reader should not be carried forward again
    // 275ms later by the keystroke they left behind.
    useEffect(() => {
        if (external) clearTimeout(timer.current);
    }, [external]);

    const commit = useCallback(
        (
            next: HistoryCriteria,
            options: {
                replace: boolean;
                /**
                 * A further change to fold into the same navigation -- how a
                 * page's sort control commits a pending filter edit and its own
                 * new ordering at once. Two `navigate` calls in one handler
                 * would be two history entries, and the second would resolve
                 * against the search the first had not written yet.
                 */
                also?: (search: HistorySearchParams) => Record<string, unknown>;
            },
        ) => {
            const nextBase = historyFilterParams(next.values);
            latest.current = {...latest.current, base: nextBase};
            setDraft({
                base: nextBase,
                values: latest.current.values,
                from: latest.current.search,
            });
            const build = (previous: HistorySearchParams) => {
                const withCriteria = withHistoryCriteria(previous, next);
                return options.also ? options.also(withCriteria) : withCriteria;
            };
            // A commit that would land on the URL the reader is already on is
            // not a navigation: TanStack pushes a duplicate entry for it, and
            // Back would then appear to do nothing once.
            const current = router.latestLocation.search as HistorySearchParams;
            if (historySearchEqual(build(current), current)) return;
            // `to: "."` -- stay on whichever history route mounted the hook,
            // changing only the search. The hook is shared by three routes, so
            // it never names one.
            //
            // The search is built by a *reducer* rather than from the search
            // read above, because two commits can land between two renders (a
            // sort click and a page click). The router resolves the reducer's
            // argument against a navigation it has not finished committing
            // yet, so the second builds on the first instead of discarding it.
            void navigate({
                to: ".",
                search: build,
                replace: options.replace,
            });
        },
        [navigate, router],
    );

    /** Record an edit locally now; schedule the request it becomes. */
    const editDraft = useCallback((next: HistoryFilterValues) => {
        latest.current = {...latest.current, values: next};
        setDraft({
            base: latest.current.base,
            values: next,
            from: latest.current.search,
        });
    }, []);

    const updateFilter = useCallback(
        (id: string, value: HistoryFilterValue) => {
            const next = {...latest.current.values, [id]: value};
            editDraft(next);
            clearTimeout(timer.current);
            timer.current = setTimeout(
                () => commit({page: 1, values: next}, {replace: true}),
                FILTER_COMMIT_DELAY_MS,
            );
        },
        [commit, editDraft],
    );

    const clearFilters = useCallback(() => {
        editDraft({});
        clearTimeout(timer.current);
        commit({page: 1, values: {}}, {replace: false});
    }, [commit, editDraft]);

    /**
     * Commit any pending edit now and return to the first page, optionally
     * carrying a further search change into the same navigation.
     */
    const commitFilters = useCallback(
        (also?: (search: HistorySearchParams) => Record<string, unknown>) => {
            clearTimeout(timer.current);
            commit(
                {page: 1, values: latest.current.values},
                {replace: false, also},
            );
        },
        [commit],
    );

    const goToPage = useCallback(
        (page: number) => {
            clearTimeout(timer.current);
            commit({page, values: latest.current.values}, {replace: false});
        },
        [commit],
    );

    return {
        clearFilters,
        commitFilters,
        criteria,
        goToPage,
        updateFilter,
        values,
    };
}
