import type {SortingState, VisibilityState} from "@tanstack/react-table";
import {useCallback, useEffect, useMemo, useState} from "react";

import {writeItem} from "../../../domain/storage/browserStorage";
import type {HideableResultColumn} from "./resultTable";
import type {StoredChoices} from "./storedChoices";
import {loadChoices, STORAGE_KEY} from "./storedChoices";

/**
 * FM-192: the results region's display choices — every value that survives a
 * search, plus the single effect that persists them.
 *
 * ADR-0054: all of them travel in one `hydra.search-results.table` payload
 * under one key, so the write stays one effect over one object literal rather
 * than one write per choice. That is why the sort state and the sidebar's
 * collapsed flag live here beside the display options proper: they are in the
 * payload, and splitting the write to tidy the hook boundary would break the
 * decision.
 *
 * The transient refine-drawer state is deliberately *not* here — it is not
 * persisted (see `RefineSurface.tsx`) — and neither is anything scoped to one
 * search's own results (`ResultFilters`), which is never read from storage.
 *
 * The declarations below are in the order they had in `SearchResults`, and the
 * effect keeps its exact key set and dependency array.
 */
export function useResultDisplayChoices() {
    const [choices] = useState(() => loadChoices());
    // FM-200: whether the table renders its Category and Details columns.
    // Owner (2026-09-27): both shown by default. `??` rather than `||`, so a
    // stored `false` survives a new search and a reload.
    const [showCategoryColumn, setShowCategoryColumn] = useState(
        () => choices.showCategoryColumn ?? true,
    );
    const [showDetailsColumn, setShowDetailsColumn] = useState(
        () => choices.showDetailsColumn ?? true,
    );
    // The stored sort is dropped for the default if it names a hidden column
    // -- which the toggle below never writes, but a hand-edited or older
    // payload could hold, and TanStack would keep sorting by a column no
    // control can show or change.
    const [sorting, setSorting] = useState<SortingState>(() =>
        withoutHiddenColumnSort(choices.sorting ?? DEFAULT_SORTING, {
            category: showCategoryColumn,
            grabs: showDetailsColumn,
        }),
    );
    // Below `sm` the sidebar starts collapsed by default; at `sm` and up it
    // starts expanded, matching the "persistent left column ... at sm and
    // up" contract. A stored user preference always wins over this
    // viewport-derived default. When `matchMedia` cannot positively confirm
    // `sm`-and-up width (e.g. unavailable in a non-browser test
    // environment, mirroring `theme.ts`'s `systemPrefersDark()` guard), the
    // default conservatively falls back to collapsed rather than assuming
    // desktop.
    const [sidebarCollapsed, setSidebarCollapsed] = useState(
        () => choices.sidebarCollapsed ?? !prefersExpandedSidebarByDefault(),
    );
    // Both opt-in and both defaulting off, so the results list's default
    // rendering -- and every accepted default-state visual baseline measured
    // against it -- is unchanged by this task.
    const [compactRows, setCompactRows] = useState(
        () => choices.compactRows ?? false,
    );
    const [highlightRecent, setHighlightRecent] = useState(
        () => choices.highlightRecent ?? false,
    );
    // FM-198: legacy's "Hide already downloaded results"
    // (`search-results-controller.js:170,210` at `3ce28441e^`), which
    // defaulted *on* there; the owner asked for off, as with `showCovers`.
    const [hideDownloaded, setHideDownloaded] = useState(
        () => choices.hideDownloaded ?? false,
    );
    // FM-176: legacy's "Show duplicate display triggers"
    // (`search-results-controller.js:162,205`), off by default there and here.
    // With it off the duplicate expand control does not render, reserves no
    // width, and duplicates stay collapsed under their first row.
    const [showDuplicateControls, setShowDuplicateControls] = useState(
        () => choices.showDuplicateControls ?? false,
    );
    // FM-177: legacy's "Show movie covers in results"
    // (`search-results-controller.js:197`), which defaulted *on* there; the
    // owner asked for off, so a result's cover reserves no width until the
    // option is switched on.
    const [showCovers, setShowCovers] = useState(
        () => choices.showCovers ?? false,
    );
    // FM-197: legacy's "Show button to download results as ZIP"
    // (`search-results-controller.js:171` at `3ce28441e^`), which defaulted
    // *on* there and here.
    const [showZipButton, setShowZipButton] = useState(
        () => choices.showZipButton ?? true,
    );
    // Lifted from `RefineSidebar.tsx` by this task (FM-089), matching the
    // `sidebarCollapsed`/`drawerOpen` precedent above: `RefineSidebar` stays
    // presentational and these two persist through the same
    // `hydra.search-results.table` blob rather than a second storage
    // mechanism.
    const [categoryOpen, setCategoryOpen] = useState(
        () => choices.refineCategoryOpen ?? true,
    );
    const [indexerOpen, setIndexerOpen] = useState(
        () => choices.refineIndexerOpen ?? true,
    );
    // FM-189: both grouping options persist through the same
    // `hydra.search-results.table` payload as the other display options
    // (ADR-0054), because `SearchPage` drops `state.data` on every submit and
    // remounts this component -- bare `useState` defaults would otherwise
    // undo the choice on every new search. Legacy's defaults are kept
    // (`search-results-controller.js`: `groupEpisodes` on,
    // `groupTorrentAndNewznabResults` off), and `??` rather than `||` so a
    // stored `false` is honoured.
    const [groupTorrentAndUsenet, setGroupTorrentAndUsenet] = useState(
        () => choices.groupTorrentAndUsenet ?? false,
    );
    const [groupEpisodes, setGroupEpisodes] = useState(
        () => choices.groupEpisodes ?? true,
    );
    // Owner (2026-09-18): title grouping used to be unconditional, so `true`
    // is the behavior every existing payload was written under; `??` keeps a
    // stored `false` alive across searches like the two above.
    const [groupTitles, setGroupTitles] = useState(
        () => choices.groupTitles ?? true,
    );
    // Owner (2026-09-18): legacy's `expandGroupsByDefault`, off there and
    // here, so the default rendering is unchanged. `SearchResults` derives
    // each group's expansion from it (see `titleExpansionOverrides`).
    const [expandGroupsByDefault, setExpandGroupsByDefault] = useState(
        () => choices.expandGroupsByDefault ?? false,
    );
    // FM-199: the per-indexer summary above the toolbar. Owner (2026-09-26):
    // shown and collapsed by default. `??` rather than `||`, so a stored
    // `false` for either survives a new search and a reload.
    const [showIndexerSummary, setShowIndexerSummary] = useState(
        () => choices.showIndexerSummary ?? true,
    );
    const [indexerSummaryOpen, setIndexerSummaryOpen] = useState(
        () => choices.indexerSummaryOpen ?? false,
    );

    // FM-200: TanStack's `columnVisibility` for the table, the header row,
    // the body rows, the column tracks and the phone sort menu alike. `grabs`
    // is the Details column's id. Memoized, because every `ResultRow` takes it
    // and is `memo`ized.
    const columnVisibility = useMemo<VisibilityState>(
        () => ({category: showCategoryColumn, grabs: showDetailsColumn}),
        [showCategoryColumn, showDetailsColumn],
    );
    // FM-200: shows or hides one column. Hiding the column the table is
    // sorted by falls back to the default sort in the same step, so the
    // stored payload never names a column no control can show or change.
    // Clearing that column's refine filter is `SearchResults`' part, since the
    // filters are not a display choice.
    const setColumnShown = useCallback(
        (column: HideableResultColumn, shown: boolean) => {
            if (column === "category") {
                setShowCategoryColumn(shown);
            } else {
                setShowDetailsColumn(shown);
            }
            if (!shown) {
                setSorting((current) =>
                    withoutHiddenColumnSort(current, {[column]: false}),
                );
            }
        },
        [],
    );

    useEffect(() => {
        writeItem(
            STORAGE_KEY,
            JSON.stringify({
                compactRows,
                expandGroupsByDefault,
                groupEpisodes,
                groupTitles,
                groupTorrentAndUsenet,
                hideDownloaded,
                highlightRecent,
                indexerSummaryOpen,
                refineCategoryOpen: categoryOpen,
                refineIndexerOpen: indexerOpen,
                showCategoryColumn,
                showCovers,
                showDetailsColumn,
                showDuplicateControls,
                showIndexerSummary,
                showZipButton,
                sidebarCollapsed,
                sorting,
            } satisfies StoredChoices),
        );
    }, [
        categoryOpen,
        compactRows,
        expandGroupsByDefault,
        groupEpisodes,
        groupTitles,
        groupTorrentAndUsenet,
        hideDownloaded,
        highlightRecent,
        indexerOpen,
        indexerSummaryOpen,
        showCategoryColumn,
        showCovers,
        showDetailsColumn,
        showDuplicateControls,
        showIndexerSummary,
        showZipButton,
        sidebarCollapsed,
        sorting,
    ]);

    return {
        categoryOpen,
        columnVisibility,
        compactRows,
        expandGroupsByDefault,
        groupEpisodes,
        groupTitles,
        groupTorrentAndUsenet,
        hideDownloaded,
        highlightRecent,
        indexerOpen,
        indexerSummaryOpen,
        setCategoryOpen,
        setColumnShown,
        setCompactRows,
        setExpandGroupsByDefault,
        setGroupEpisodes,
        setGroupTitles,
        setGroupTorrentAndUsenet,
        setHideDownloaded,
        setHighlightRecent,
        setIndexerOpen,
        setIndexerSummaryOpen,
        setShowCovers,
        setShowDuplicateControls,
        setShowIndexerSummary,
        setShowZipButton,
        setSidebarCollapsed,
        setSorting,
        showCategoryColumn,
        showCovers,
        showDetailsColumn,
        showDuplicateControls,
        showIndexerSummary,
        showZipButton,
        sidebarCollapsed,
        sorting,
    };
}

// The results' default sort, newest first -- also what hiding the sorted
// column falls back to (FM-200).
const DEFAULT_SORTING: SortingState = [{id: "epoch", desc: true}];

/**
 * FM-200: `sorting`, or the default sort if any of its entries is on a column
 * `visibility` marks hidden. The same array is returned when nothing changes,
 * so a state update with it bails out.
 */
function withoutHiddenColumnSort(
    sorting: SortingState,
    visibility: VisibilityState,
): SortingState {
    return sorting.some((entry) => visibility[entry.id] === false)
        ? DEFAULT_SORTING
        : sorting;
}

// MUI's default `sm` breakpoint (600px and up). Mirrors theme.ts's
// systemPrefersDark() defensive matchMedia guard.
function prefersExpandedSidebarByDefault(): boolean {
    try {
        return (
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(min-width: 600px)").matches
        );
    } catch {
        return false;
    }
}
