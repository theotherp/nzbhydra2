import {useCallback, useEffect, useRef, useState} from "react";

import type {
    HistoryFilterValue,
    HistoryFilterValues,
} from "../../../api/history/filters";

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
 */
export function useHistoryFilterCriteria() {
    const [values, setValues] = useState<HistoryFilterValues>({});
    const [criteria, setCriteria] = useState<HistoryCriteria>({
        page: 1,
        values: {},
    });
    /**
     * The values as last edited, readable from an event handler that has to
     * commit them without waiting for a render. Only ever written beside the
     * `setValues` that renders the same object.
     */
    const draft = useRef<HistoryFilterValues>(values);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);

    const updateFilter = useCallback(
        (id: string, value: HistoryFilterValue) => {
            const next = {...draft.current, [id]: value};
            draft.current = next;
            setValues(next);
            clearTimeout(timer.current);
            timer.current = setTimeout(
                () => setCriteria({page: 1, values: next}),
                FILTER_COMMIT_DELAY_MS,
            );
        },
        [],
    );

    const clearFilters = useCallback(() => {
        draft.current = {};
        setValues({});
        clearTimeout(timer.current);
        setCriteria({page: 1, values: {}});
    }, []);

    /** Commit any pending edit now and return to the first page. */
    const commitFilters = useCallback(() => {
        clearTimeout(timer.current);
        setCriteria((current) =>
            current.page === 1 && current.values === draft.current
                ? current
                : {page: 1, values: draft.current},
        );
    }, []);

    const goToPage = useCallback((page: number) => {
        clearTimeout(timer.current);
        setCriteria({page, values: draft.current});
    }, []);

    return {
        clearFilters,
        commitFilters,
        criteria,
        goToPage,
        updateFilter,
        values,
    };
}
