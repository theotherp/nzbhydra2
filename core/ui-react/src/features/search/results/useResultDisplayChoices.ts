import type {SortingState} from "@tanstack/react-table";
import {useEffect, useState} from "react";

import {writeItem} from "../../../domain/storage/browserStorage";
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
    const [sorting, setSorting] = useState<SortingState>(
        choices.sorting ?? [{id: "epoch", desc: true}],
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

    useEffect(() => {
        writeItem(
            STORAGE_KEY,
            JSON.stringify({
                compactRows,
                groupEpisodes,
                groupTorrentAndUsenet,
                highlightRecent,
                refineCategoryOpen: categoryOpen,
                refineIndexerOpen: indexerOpen,
                showCovers,
                showDuplicateControls,
                sidebarCollapsed,
                sorting,
            } satisfies StoredChoices),
        );
    }, [
        categoryOpen,
        compactRows,
        groupEpisodes,
        groupTorrentAndUsenet,
        highlightRecent,
        indexerOpen,
        showCovers,
        showDuplicateControls,
        sidebarCollapsed,
        sorting,
    ]);

    return {
        categoryOpen,
        compactRows,
        groupEpisodes,
        groupTorrentAndUsenet,
        highlightRecent,
        indexerOpen,
        setCategoryOpen,
        setCompactRows,
        setGroupEpisodes,
        setGroupTorrentAndUsenet,
        setHighlightRecent,
        setIndexerOpen,
        setShowCovers,
        setShowDuplicateControls,
        setSidebarCollapsed,
        setSorting,
        showCovers,
        showDuplicateControls,
        sidebarCollapsed,
        sorting,
    };
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
