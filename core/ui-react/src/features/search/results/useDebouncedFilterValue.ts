import {useCallback, useEffect, useRef, useState} from "react";

/**
 * How long a free-text filter control waits after the last keystroke before
 * committing its value into the shared `ResultFilters` state.
 *
 * Every commit re-filters, re-sorts and re-groups every loaded result, rewrites
 * the selection, recomputes `hasActiveFilters`, writes the persisted choices to
 * `localStorage` synchronously and re-renders the whole table
 * (`SearchResults.tsx`). Doing that once per keystroke made typing into "Title
 * contains" -- the most used control on the results page -- visibly lag on a
 * large result set. Long enough to coalesce a burst of typing, short enough
 * that a user who stops typing sees the table follow immediately.
 */
export const FILTER_COMMIT_DELAY_MS = 175;

/**
 * Keeps a text filter's value local while the user is typing and commits it
 * once the typing stops, so the caller's expensive filter pipeline runs once
 * per burst rather than once per keystroke.
 *
 * The committed value stays the single source of truth: a change that did not
 * come from this control -- "Clear all", the per-range clear button, filters
 * restored from `localStorage` -- is adopted immediately and cancels any
 * pending commit, so the input can never keep showing a value the filters no
 * longer hold.
 */
export function useDebouncedFilterValue(
    value: string,
    commit: (next: string) => void,
): [string, (next: string) => void] {
    // `committed` is the upstream value this control last rendered against.
    // When the two disagree the change came from outside -- "Clear all", the
    // per-range clear button, filters restored from `localStorage`, or this
    // control's own commit landing -- and the draft is replaced during render
    // (React's "adjust state when a prop changes" pattern) rather than in an
    // effect, which would paint one frame of a field contradicting the table
    // beside it.
    const [state, setState] = useState({committed: value, draft: value});
    if (value !== state.committed) {
        setState({committed: value, draft: value});
    }
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const latestCommit = useRef(commit);
    useEffect(() => {
        latestCommit.current = commit;
    });
    // A commit still in flight belongs to a draft that no longer exists.
    useEffect(() => {
        clearTimeout(timer.current);
    }, [value]);
    useEffect(() => () => clearTimeout(timer.current), []);
    const change = useCallback((next: string) => {
        setState((current) => ({...current, draft: next}));
        clearTimeout(timer.current);
        timer.current = setTimeout(
            () => latestCommit.current(next),
            FILTER_COMMIT_DELAY_MS,
        );
    }, []);
    return [value === state.committed ? state.draft : value, change];
}
