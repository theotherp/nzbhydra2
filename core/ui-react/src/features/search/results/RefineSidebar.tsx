import {
    Box,
    Button,
    Collapse,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import type {Dispatch, ReactNode, SetStateAction} from "react";
import {useMemo, useState} from "react";

import type {SearchResult} from "../../../api/search";
import {MultiFilter, NumericFilter} from "./filterControls";
import type {NumericRange, QuickFilter, ResultFilters} from "./resultTable";
import {quickFilterKey} from "./resultTable";

// Exported so `SearchResults.tsx` can compute how much horizontal room the
// sidebar currently claims (e.g. to size the results table's minimum width
// consistently whether the sidebar is expanded or collapsed).
export const EXPANDED_WIDTH = 256;
export const COLLAPSED_WIDTH = 48;

// The persistent "Refine" filter sidebar (FM-039, ADR-0008 Option B: the
// mock's layout/structure only -- current ADR-0007 theme tokens throughout,
// no new color or typography). It binds the exact same `ResultFilters` state
// the inline column-header filters (FM-034) and the mobile `results-filters`
// toolbar row already drive; it introduces no second, independent filter
// state. It renders at every viewport (its parent `Stack` switches to a
// column layout below `sm`, so an expanded sidebar never competes with the
// table for horizontal space there); `SearchResults` defaults its initial
// collapsed state from the viewport at mount, so it starts collapsed below
// `sm` while the mobile `results-filters` row remains that surface's primary
// filter entry point, per this task's Out Of Scope.
export function RefineSidebar({
    clearRange,
    collapsed,
    filters,
    onClearAll,
    onToggleCollapsed,
    onToggleQuickFilter,
    quickFilters,
    results,
    setFilters,
    updateRange,
}: {
    clearRange: (name: "size" | "grabs" | "age") => void;
    collapsed: boolean;
    filters: ResultFilters;
    onClearAll: () => void;
    onToggleCollapsed: () => void;
    onToggleQuickFilter: (filter: QuickFilter) => void;
    quickFilters: QuickFilter[];
    results: SearchResult[];
    setFilters: Dispatch<SetStateAction<ResultFilters>>;
    updateRange: (
        name: "size" | "grabs" | "age",
        bound: keyof NumericRange,
        value: string,
    ) => void;
}) {
    const [categoryOpen, setCategoryOpen] = useState(true);
    const [indexerOpen, setIndexerOpen] = useState(true);
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
    const toggleDownloadType = (type: string) => {
        setFilters((current) => ({
            ...current,
            downloadTypes: current.downloadTypes.includes(type)
                ? current.downloadTypes.filter((value) => value !== type)
                : [...current.downloadTypes, type],
        }));
    };
    return (
        <Paper
            aria-label="Refine results"
            component="nav"
            data-testid="refine-sidebar"
            elevation={0}
            sx={{
                flexShrink: 0,
                overflow: "hidden",
                p: collapsed ? 1 : 2,
                transition:
                    "width 150ms ease-in-out, padding 150ms ease-in-out",
                width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
            }}
        >
            <Stack
                alignItems="center"
                direction="row"
                justifyContent="space-between"
                sx={{mb: collapsed ? 0 : 2}}
            >
                {!collapsed && (
                    <Typography sx={{fontWeight: 600}} variant="overline">
                        Refine
                    </Typography>
                )}
                <Button
                    aria-expanded={!collapsed}
                    aria-label={
                        collapsed
                            ? "Expand refine sidebar"
                            : "Collapse refine sidebar"
                    }
                    data-testid="refine-sidebar-toggle"
                    onClick={onToggleCollapsed}
                    size="small"
                    sx={{minWidth: 0, px: 0.75}}
                >
                    {collapsed ? "»" : "«"}
                </Button>
            </Stack>
            {!collapsed && (
                <Stack spacing={2.5}>
                    <Button
                        data-testid="refine-clear-all"
                        onClick={onClearAll}
                        size="small"
                        sx={{alignSelf: "flex-start", px: 0.5}}
                    >
                        Clear all
                    </Button>
                    {quickFilters.length > 0 && (
                        <RefineSection label="Quality">
                            <Stack
                                data-testid="refine-quality-filters"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                            >
                                {quickFilters.map((filter) => (
                                    <Button
                                        aria-pressed={
                                            filters.quickFilters[
                                                quickFilterKey(filter)
                                            ] ?? false
                                        }
                                        key={`${filter.group}-${filter.id}`}
                                        onClick={() =>
                                            onToggleQuickFilter(filter)
                                        }
                                        size="small"
                                        variant={
                                            filters.quickFilters[
                                                quickFilterKey(filter)
                                            ]
                                                ? "contained"
                                                : "outlined"
                                        }
                                    >
                                        {filter.label}
                                    </Button>
                                ))}
                            </Stack>
                        </RefineSection>
                    )}
                    <RefineSection label="Title contains">
                        <TextField
                            aria-label="Filter titles"
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
                                    "data-testid": "refine-filter-title",
                                },
                            }}
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
                        onToggleOpen={() => setCategoryOpen((value) => !value)}
                        open={categoryOpen}
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
                        onToggleOpen={() => setIndexerOpen((value) => !value)}
                        open={indexerOpen}
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
                            stacked
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
                            stacked
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
                            stacked
                            testIdPrefix="refine-grabs"
                        />
                    </RefineSection>
                    {downloadTypeOptions.length > 0 && (
                        <RefineSection label="Type">
                            <Stack
                                data-testid="refine-type-chips"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                            >
                                {downloadTypeOptions.map((type) => (
                                    <Button
                                        aria-pressed={filters.downloadTypes.includes(
                                            type,
                                        )}
                                        key={type}
                                        onClick={() => toggleDownloadType(type)}
                                        size="small"
                                        variant={
                                            filters.downloadTypes.includes(type)
                                                ? "contained"
                                                : "outlined"
                                        }
                                    >
                                        {type}
                                    </Button>
                                ))}
                            </Stack>
                        </RefineSection>
                    )}
                </Stack>
            )}
        </Paper>
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
                color="text.secondary"
                sx={{
                    display: "block",
                    fontWeight: 600,
                    mb: 1,
                    textTransform: "uppercase",
                }}
                variant="caption"
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
    selected,
    toggleTestId,
}: {
    entries: string[];
    label: string;
    listTestId: string;
    onChange: (values: string[]) => void;
    onToggleOpen: () => void;
    open: boolean;
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
                sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    justifyContent: "space-between",
                    px: 0.5,
                    textTransform: "uppercase",
                    width: "100%",
                }}
            >
                <Typography
                    component="span"
                    sx={{fontWeight: 600}}
                    variant="caption"
                >
                    {label}
                </Typography>
                <Box aria-hidden="true" component="span">
                    {open ? "▲" : "▼"}
                </Box>
            </Button>
            <Collapse in={open}>
                <MultiFilter
                    entries={entries}
                    onChange={onChange}
                    selected={selected}
                    showCounts
                    testId={listTestId}
                />
            </Collapse>
        </Box>
    );
}
