import {
    Box,
    Button,
    Collapse,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type {Dispatch, ReactNode, SetStateAction} from "react";
import {useMemo} from "react";

import type {SearchResult} from "../../../api/search";
import {denseControlFontSize, refineSectionGap} from "../../../app/theme";
import type {
    RefineSurfaceLabels,
    RefineSurfaceTestIds,
} from "../../../components/refine/RefineSurface";
import {RefineSurface} from "../../../components/refine/RefineSurface";
import {NumericFilter, ToggleRowFilter} from "./filterControls";
import type {NumericRange, QuickFilter, ResultFilters} from "./resultTable";
import {defaultFilters, quickFilterKey} from "./resultTable";

// Order-independent for the array-valued fields (`categories`/`indexers`/
// `downloadTypes`), which the UI never reorders but whose default value
// (`defaultFilters`, `resultTable.ts`) is derived by scanning `results` and
// so is not guaranteed to land in the same order the user's own toggling
// produced.
function canonicalFilters(value: ResultFilters): string {
    return JSON.stringify({
        ...value,
        categories: [...value.categories].sort(),
        downloadTypes: [...value.downloadTypes].sort(),
        indexers: [...value.indexers].sort(),
    });
}

// The results page's own chrome vocabulary for ADR-0046's shared refine
// surface. Both objects are compatibility contracts of this feature, not of
// the shell: `refine-sidebar`, `-toggle`, `-drawer`, `-close` and
// `refine-clear-all` are the ids `SearchResults.test.tsx` and
// `tests/system/tests/results.spec.ts` have always queried, and the accessible
// names are the ones this page's controls have always announced.
const REFINE_LABELS: RefineSurfaceLabels = {
    close: "Close refine sidebar",
    collapse: "Collapse refine sidebar",
    expand: "Expand refine sidebar",
    heading: "Refine",
    surface: "Refine results",
};
const REFINE_TEST_IDS: RefineSurfaceTestIds = {
    clearAll: "refine-clear-all",
    close: "refine-sidebar-close",
    drawer: "refine-sidebar-drawer",
    surface: "refine-sidebar",
    toggle: "refine-sidebar-toggle",
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
    const indexerEntries = useMemo(
        () => results.map((result) => result.indexer),
        [results],
    );
    const categoryEntries = useMemo(
        () => results.map((result) => result.category),
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
    const hasActiveFilters = useMemo(
        () =>
            canonicalFilters(filters) !==
            canonicalFilters(defaultFilters(results, quickFilters)),
        [filters, results, quickFilters],
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
                        flexWrap="wrap"
                        sx={{gap: 0.75}}
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
                    onChange={(event) =>
                        setFilters((current) => ({
                            ...current,
                            title: event.target.value,
                        }))
                    }
                    placeholder="e.g. 1080p, name…"
                    size="small"
                    slotProps={{
                        htmlInput: {
                            "aria-label": "Filter titles",
                            "data-testid": "refine-filter-title",
                        },
                    }}
                    sx={{"& input": {fontSize: denseControlFontSize}}}
                    value={filters.title}
                />
            </RefineSection>
            <RefineCollapsibleList
                entries={categoryEntries}
                label="Category"
                listTestId="refine-category-list"
                onChange={(categories) =>
                    setFilters((current) => ({
                        ...current,
                        categories,
                    }))
                }
                onToggleOpen={onToggleCategoryOpen}
                open={categoryOpen}
                optionTestId="refine-category-option"
                selected={filters.categories}
                toggleTestId="refine-category-toggle"
            />
            <RefineCollapsibleList
                entries={indexerEntries}
                label="Indexer"
                listTestId="refine-indexer-list"
                onChange={(indexers) =>
                    setFilters((current) => ({
                        ...current,
                        indexers,
                    }))
                }
                onToggleOpen={onToggleIndexerOpen}
                open={indexerOpen}
                optionTestId="refine-indexer-option"
                selected={filters.indexers}
                toggleTestId="refine-indexer-toggle"
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
                        flexWrap="wrap"
                        sx={{gap: 0.75}}
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
            clearAllDisabled={!hasActiveFilters}
            collapsed={collapsed}
            drawerOpen={drawerOpen}
            labels={REFINE_LABELS}
            onClearAll={onClearAll}
            onDrawerOpenChange={onDrawerOpenChange}
            onToggleCollapsed={onToggleCollapsed}
            stickyOffset={toolbarHeight}
            testIds={REFINE_TEST_IDS}
        >
            {sections}
        </RefineSurface>
    );
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

function RefineCollapsibleList({
    entries,
    label,
    listTestId,
    onChange,
    onToggleOpen,
    open,
    optionTestId,
    selected,
    toggleTestId,
}: {
    entries: string[];
    label: string;
    listTestId: string;
    onChange: (values: string[]) => void;
    onToggleOpen: () => void;
    open: boolean;
    optionTestId: string;
    selected: string[];
    toggleTestId: string;
}) {
    return (
        <Box>
            <Button
                aria-expanded={open}
                data-testid={toggleTestId}
                onClick={onToggleOpen}
                size="small"
                // The section caption's own typography role, spread from
                // the theme rather than restated: this caption is a `Button`
                // (the section is collapsible), so it cannot take
                // `Typography`'s `variant` prop the way `RefineSection`'s
                // static caption above does, and consuming the variant here
                // is what keeps the two captions identical.
                sx={(theme) => ({
                    ...theme.typography.refineSectionLabel,
                    justifyContent: "space-between",
                    mb: 1,
                    minWidth: 0,
                    px: 0,
                    py: 0,
                    width: "100%",
                })}
            >
                {label}
                {open ? (
                    <ExpandLessIcon fontSize="small" />
                ) : (
                    <ExpandMoreIcon fontSize="small" />
                )}
            </Button>
            <Collapse in={open}>
                <ToggleRowFilter
                    entries={entries}
                    onChange={onChange}
                    optionTestId={optionTestId}
                    selected={selected}
                    testId={listTestId}
                />
            </Collapse>
        </Box>
    );
}
