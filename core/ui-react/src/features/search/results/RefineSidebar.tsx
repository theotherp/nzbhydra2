import {Box, Button, Stack, TextField, Typography} from "@mui/material";
import type {Dispatch, ReactNode, SetStateAction} from "react";
import {useMemo} from "react";

import type {SearchResult} from "../../../api/search";
import {denseControlFontSize, refineSectionGap} from "../../../app/theme";
import type {
    RefineMultiselectEntry,
    RefineMultiselectTestIds,
} from "../../../components/refine/RefineMultiselect";
import {RefineMultiselect} from "../../../components/refine/RefineMultiselect";
import type {
    RefineSurfaceLabels,
    RefineSurfaceTestIds,
} from "../../../components/refine/RefineSurface";
import {RefineSurface} from "../../../components/refine/RefineSurface";
import {NumericFilter, useDebouncedFilterValue} from "./filterControls";
import type {NumericRange, QuickFilter, ResultFilters} from "./resultTable";
import {activeFilterCount, quickFilterKey} from "./resultTable";

// The results page's own chrome vocabulary for ADR-0046's shared refine
// surface. Both objects are compatibility contracts of this feature, not of
// the shell: `refine-sidebar`, `-toggle`, `-drawer`, `-close` and
// `refine-clear-all` are the ids `SearchResults.test.tsx` and
// `tests/system/tests/results.spec.ts` have always queried, and the accessible
// names are the ones this page's controls have always announced.
//
// FM-181 exports the labels because the compact branch's trigger is no longer
// the shell's own: below 768px `SearchResults.tsx` renders
// `refine-sidebar-toggle` itself, inside the single sticky toolbar row, and it
// has to announce the same two names the docked column's toggle does.
export const REFINE_LABELS: Omit<RefineSurfaceLabels, "done"> = {
    close: "Close refine sidebar",
    collapse: "Collapse refine sidebar",
    expand: "Expand refine sidebar",
    // FM-142: the below-768px trigger's visible text only. The docked column
    // renders no caption of its own any more.
    heading: "Refine",
    surface: "Refine results",
};
const REFINE_TEST_IDS: RefineSurfaceTestIds = {
    clearAll: "refine-clear-all",
    close: "refine-sidebar-close",
    done: "refine-sidebar-done",
    drawer: "refine-sidebar-drawer",
    surface: "refine-sidebar",
    toggle: "refine-sidebar-toggle",
};

// FM-153: this page's own ids for the two `C-REFINE-MULTISELECT` sections --
// the ids `SearchResults.test.tsx` and `tests/system/tests/results.spec.ts`
// have always queried, unchanged by the extraction.
const CATEGORY_TEST_IDS: RefineMultiselectTestIds = {
    list: "refine-category-list",
    option: "refine-category-option",
    toggle: "refine-category-toggle",
};
const INDEXER_TEST_IDS: RefineMultiselectTestIds = {
    list: "refine-indexer-list",
    option: "refine-indexer-option",
    toggle: "refine-indexer-toggle",
};

// The "Refine" filter sidebar. Since FM-045 (ADR-0009: full mock fidelity)
// it is the *only* result-filter surface at every viewport: FM-034's inline
// per-column-header filter popovers and the mobile-only `results-filters` /
// `results-quick-filters` toolbar rows are gone, so every filter dimension --
// quality, title, category, indexer, size, age, grabs/seeders, download type
// -- is reachable here and nowhere else. It binds exactly the same
// `ResultFilters` state those removed surfaces drove; no second, independent
// filter state exists.
//
// FM-136 (ADR-0046): the chrome around those sections -- the docked column,
// its 48px collapsed rail, the sub-768px `Drawer` that replaces both, and the
// header row -- is `C-REFINE-SURFACE`'s now. This component decides *what*
// filters exist and holds their binding to `ResultFilters`; the shell decides
// where the surface sits and how it collapses, for this page and for the
// history views alike.
export function RefineSidebar({
    categoryOpen,
    clearRange,
    collapsed,
    drawerOpen,
    filteredCount,
    filters,
    indexerOpen,
    onClearAll,
    onDrawerOpenChange,
    onToggleCategoryOpen,
    onToggleCollapsed,
    onToggleIndexerOpen,
    onToggleQuickFilter,
    quickFilters,
    results,
    setFilters,
    toolbarHeight,
    updateRange,
}: {
    // FM-089: lifted to `SearchResults.tsx` alongside `sidebarCollapsed`/
    // `drawerOpen` so the two booleans can persist through the same
    // `hydra.search-results.table` blob; this component stays presentational
    // and keeps no `useState` of its own for either.
    categoryOpen: boolean;
    clearRange: (name: "size" | "grabs" | "age") => void;
    collapsed: boolean;
    // The below-768px drawer's open state, owned by `SearchResults.tsx` since
    // FM-041 so its display-options "Show refine sidebar" entry can read and
    // write the same mechanism the `refine-sidebar-toggle` drives. Deliberately
    // *not* the persisted `collapsed` preference and deliberately still
    // unpersisted (the rationale lives with the shell that renders the drawer):
    // only the state's owner moved, its lifecycle did not change.
    drawerOpen: boolean;
    /**
     * FM-181: how many results the current filters leave. The compact sheet's
     * footer button counts them ("Show 12 results"), so a reader adjusting
     * filters with the results hidden behind the sheet can see the effect of
     * each change before dismissing it. Live, not a draft: the filters apply
     * as they are set, exactly as they do in the docked column.
     */
    filteredCount: number;
    filters: ResultFilters;
    indexerOpen: boolean;
    onClearAll: () => void;
    onDrawerOpenChange: (open: boolean) => void;
    onToggleCategoryOpen: () => void;
    onToggleCollapsed: () => void;
    onToggleIndexerOpen: () => void;
    onToggleQuickFilter: (filter: QuickFilter) => void;
    quickFilters: QuickFilter[];
    results: SearchResult[];
    setFilters: Dispatch<SetStateAction<ResultFilters>>;
    // FM-055: the sticky results toolbar's *measured* rendered height, owned
    // and re-measured by `SearchResults.tsx` (which already maintains it for
    // the table header's own sticky offset). It is handed on as the shell's
    // `stickyOffset`, so the docked branch pins itself directly beneath that
    // toolbar and sizes its own scroll box against it, rather than the value
    // being duplicated or hardcoded -- the toolbar's height changes with
    // viewport width, font loading, and its own wrapping.
    toolbarHeight: number;
    updateRange: (
        name: "size" | "grabs" | "age",
        bound: keyof NumericRange,
        value: string,
    ) => void;
}) {
    // FM-153: the derivation (dedupe, count, sort) stays here, in the feature
    // that has loaded results to derive from; `RefineMultiselect` renders what
    // it is handed, in the order it is handed it.
    const indexerEntries = useMemo(
        () => toggleRowEntries(results.map((result) => result.indexer)),
        [results],
    );
    const categoryEntries = useMemo(
        () => toggleRowEntries(results.map((result) => result.category)),
        [results],
    );
    // Derived from the loaded results rather than a hardcoded NZB/Torrent
    // pair: downloadType is optional and TORBOX also occurs.
    const downloadTypeOptions = useMemo(
        () =>
            [
                ...new Set(
                    results.flatMap((result) =>
                        result.downloadType === undefined
                            ? []
                            : [result.downloadType],
                    ),
                ),
            ].sort((first, second) => first.localeCompare(second)),
        [results],
    );
    // FM-181: the one comparison. The phone toolbar's badge counts the same
    // dimensions this disables "Clear all" on, so the two cannot disagree
    // about whether anything is active.
    const activeCount = useMemo(
        () => activeFilterCount(filters, results, quickFilters),
        [filters, results, quickFilters],
    );
    // FM maintenance: the field is debounced (`useDebouncedFilterValue`) so a
    // burst of typing commits once instead of running the whole filter / sort
    // / group / persist pipeline per keystroke.
    const [title, changeTitle] = useDebouncedFilterValue(
        filters.title,
        (next) => setFilters((current) => ({...current, title: next})),
    );
    const toggleDownloadType = (type: string) => {
        setFilters((current) => ({
            ...current,
            downloadTypes: current.downloadTypes.includes(type)
                ? current.downloadTypes.filter((value) => value !== type)
                : [...current.downloadTypes, type],
        }));
    };
    const sections = (
        <Stack sx={{gap: refineSectionGap}}>
            {quickFilters.length > 0 && (
                <RefineSection label="Quality">
                    <Stack
                        data-testid="refine-quality-filters"
                        direction="row"
                        sx={{
                            flexWrap: "wrap",
                            gap: 0.75,
                        }}
                    >
                        {quickFilters.map((filter) => (
                            <RefineChip
                                active={
                                    filters.quickFilters[
                                        quickFilterKey(filter)
                                    ] ?? false
                                }
                                key={`${filter.group}-${filter.id}`}
                                label={filter.label}
                                onToggle={() => onToggleQuickFilter(filter)}
                            />
                        ))}
                    </Stack>
                </RefineSection>
            )}
            <RefineSection label="Title contains">
                {/* FM-054 (ADR-0014): the mock's recessed input surface,
                    hairline border, and 8px radius are the `MuiOutlinedInput`
                    theme default now (`app/theme.ts`); this field carries no
                    local background/border override. */}
                <TextField
                    fullWidth
                    onChange={(event) => changeTitle(event.target.value)}
                    placeholder="e.g. 1080p, name…"
                    size="small"
                    slotProps={{
                        htmlInput: {
                            "aria-label": "Filter titles",
                            "data-testid": "refine-filter-title",
                        },
                    }}
                    sx={{"& input": {fontSize: denseControlFontSize}}}
                    value={title}
                />
            </RefineSection>
            <RefineMultiselect
                entries={categoryEntries}
                label="Category"
                onChange={(categories) =>
                    setFilters((current) => ({
                        ...current,
                        categories,
                    }))
                }
                onToggleOpen={onToggleCategoryOpen}
                open={categoryOpen}
                selected={filters.categories}
                testIds={CATEGORY_TEST_IDS}
            />
            <RefineMultiselect
                entries={indexerEntries}
                label="Indexer"
                onChange={(indexers) =>
                    setFilters((current) => ({
                        ...current,
                        indexers,
                    }))
                }
                onToggleOpen={onToggleIndexerOpen}
                open={indexerOpen}
                selected={filters.indexers}
                testIds={INDEXER_TEST_IDS}
            />
            <RefineSection label="Size (MB)">
                <NumericFilter
                    label="Size (MB)"
                    name="size"
                    onChange={updateRange}
                    onClear={clearRange}
                    range={filters.size}
                    testIdPrefix="refine-size"
                />
            </RefineSection>
            <RefineSection label="Age (days)">
                <NumericFilter
                    label="Age (days)"
                    name="age"
                    onChange={updateRange}
                    onClear={clearRange}
                    range={filters.age}
                    testIdPrefix="refine-age"
                />
            </RefineSection>
            <RefineSection label="Grabs / seeders">
                <NumericFilter
                    label="Grabs / seeders"
                    name="grabs"
                    onChange={updateRange}
                    onClear={clearRange}
                    range={filters.grabs}
                    testIdPrefix="refine-grabs"
                />
            </RefineSection>
            {downloadTypeOptions.length > 0 && (
                <RefineSection label="Type">
                    <Stack
                        data-testid="refine-type-chips"
                        direction="row"
                        sx={{
                            flexWrap: "wrap",
                            gap: 0.75,
                        }}
                    >
                        {downloadTypeOptions.map((type) => (
                            <RefineChip
                                active={filters.downloadTypes.includes(type)}
                                key={type}
                                label={type}
                                onToggle={() => toggleDownloadType(type)}
                            />
                        ))}
                    </Stack>
                </RefineSection>
            )}
        </Stack>
    );

    return (
        <RefineSurface
            clearAllDisabled={activeCount === 0}
            collapsed={collapsed}
            drawerOpen={drawerOpen}
            labels={{
                ...REFINE_LABELS,
                done:
                    filteredCount === 1
                        ? "Show 1 result"
                        : `Show ${filteredCount} results`,
            }}
            onClearAll={onClearAll}
            onDrawerOpenChange={onDrawerOpenChange}
            onToggleCollapsed={onToggleCollapsed}
            stickyOffset={toolbarHeight}
            testIds={REFINE_TEST_IDS}
            // FM-181: the compact trigger is `SearchResults.tsx`'s, in the
            // sticky toolbar row, so the shell renders none of its own.
            trigger="external"
        >
            {sections}
        </RefineSurface>
    );
}

/**
 * The Category/Indexer options, derived from the loaded results: one entry per
 * distinct value, carrying its number of occurrences, sorted by label.
 *
 * FM-153: deliberately *not* inside `RefineMultiselect`. That component renders
 * the entries it is given in the order it is given them, because the history
 * views' options are declared by `C-HISTORY-REQUEST` dimensions in an order
 * that carries meaning (download statuses, notification event types) and must
 * not be re-sorted. Only this page derives and sorts, so only this page does
 * it.
 *
 * Counting semantics are FM-039's, unchanged: `values` is one entry per
 * *loaded* result, so an option's count is its number of loaded results, not
 * its number of results in the currently filtered subset.
 */
function toggleRowEntries(values: string[]): RefineMultiselectEntry[] {
    const counts = new Map<string, number>();
    for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.keys()]
        .sort((first, second) => first.localeCompare(second))
        .map((value) => ({count: counts.get(value), label: value, value}));
}

// The mock's Quality and Type pills (`chip(active)`): a compact monospace
// label in a bordered box that changes background, border, and text color
// when selected. Every one of those rules is `app/theme.ts`'s `MuiButton`
// `variant="refineChip"` -- the same variant `C-HISTORY-REFINE-BAR` already
// renders, and a byte-for-byte duplicate of what this component used to
// author by hand. Its radius is `pillRadius`, a full stadium: a pill is a
// thing that is on or off, and nothing in these surfaces that is merely
// *pressable* is stadium-shaped any more.
function RefineChip({
    active,
    label,
    onToggle,
}: {
    active: boolean;
    label: string;
    onToggle: () => void;
}) {
    return (
        <Button
            aria-pressed={active}
            onClick={onToggle}
            size="small"
            variant="refineChip"
        >
            {label}
        </Button>
    );
}

function RefineSection({
    children,
    label,
}: {
    children: ReactNode;
    label: string;
}) {
    return (
        <Box>
            <Typography
                component="div"
                sx={{mb: 1}}
                variant="refineSectionLabel"
            >
                {label}
            </Typography>
            {children}
        </Box>
    );
}
