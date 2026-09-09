import {useCallback, useMemo, useRef, useState} from "react";

import type {SearchResult} from "../../../api/search";
import {
    selectionAfterClick,
    selectionStatus,
    selectVisibleResults,
} from "./resultTable";

/**
 * FM-192: the results region's selection cluster — the selected ids, the
 * results behind them, the header/toolbar tri-state status, the shift-click
 * range handler and the select-all/none/invert trio.
 *
 * The effect that prunes a selection a refine filter has hidden stays in
 * `SearchResults`: `react-hooks/set-state-in-effect` rejects a synchronous
 * `setState` inside an effect declared in a `use*` function, and the effect's
 * bail-out-on-no-change contract (see its own note) is exactly why it is
 * written that way. It calls this hook's `setSelected`.
 *
 * The hook takes the derived lists it depends on rather than deriving them:
 * the selection is defined against the *currently visible* rows (which
 * grouping and expansion decide) and pruned against the *filtered* ones, and
 * both of those sit downstream of the sort/group pipeline in `SearchResults`.
 * That dependency is why the hook is called where `visibleResultsRef` stood
 * rather than where `selected` did — the earliest point at which its inputs
 * exist. The declarations below are otherwise in their `SearchResults` order.
 *
 * The two latest-value refs the callbacks close over are created here and
 * returned for the caller to write during its own render, which is where those
 * two assignments already were: `react-hooks/refs` rejects a render-time ref
 * write inside a `use*` function, and both ways around it — an effect that
 * writes after the commit, or a dependency on the value itself — would change
 * either when the anchor is written or the identity of `updateSelection`,
 * which `ResultRow`'s `memo` depends on. FM-192 is code motion, so neither is
 * on the table.
 */
export function useResultSelection({
    results,
    visibleResults,
}: {
    results: SearchResult[];
    visibleResults: SearchResult[];
}) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string>();
    // The selected results themselves, for `DownloadActions`. Memoized rather
    // than filtered inline in the JSX because the window virtualizer below
    // re-renders this component on every scroll offset change: as an inline
    // expression this scanned every loaded result and handed `DownloadActions`
    // a brand-new array -- which it filters again -- once per scroll frame,
    // for a value that can only change when the selection or the loaded
    // results do.
    const selectedResults = useMemo(
        () => results.filter((result) => selected.has(result.searchResultId)),
        [results, selected],
    );
    const visibleResultsRef = useRef(visibleResults);
    // Drives the results table header's tri-state checkbox and its mobile
    // toolbar counterpart (FM-040): "all"/"some"/"none" of the currently
    // visible rows.
    const currentSelectionStatus = useMemo(
        () => selectionStatus(selected, visibleResults),
        [selected, visibleResults],
    );
    const lastSelectedIdRef = useRef(lastSelectedId);
    const updateSelection = useCallback(
        (resultId: string, checked: boolean, shiftKey: boolean) => {
            setSelected((current) =>
                selectionAfterClick(
                    current,
                    visibleResultsRef.current,
                    resultId,
                    checked,
                    lastSelectedIdRef.current,
                    shiftKey,
                ),
            );
            setLastSelectedId(resultId);
        },
        [],
    );
    const selectAllVisible = useCallback(() => {
        setSelected((current) =>
            selectVisibleResults(current, visibleResultsRef.current, "all"),
        );
    }, []);
    const deselectAllVisible = useCallback(() => {
        setSelected((current) =>
            selectVisibleResults(current, visibleResultsRef.current, "none"),
        );
    }, []);
    const invertVisibleSelection = useCallback(() => {
        setSelected((current) =>
            selectVisibleResults(current, visibleResultsRef.current, "invert"),
        );
    }, []);

    return {
        currentSelectionStatus,
        deselectAllVisible,
        invertVisibleSelection,
        lastSelectedId,
        lastSelectedIdRef,
        selectAllVisible,
        selected,
        selectedResults,
        setSelected,
        updateSelection,
        visibleResultsRef,
    };
}
