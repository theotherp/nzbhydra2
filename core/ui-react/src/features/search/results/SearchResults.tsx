import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    Paper,
    Popover,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import type {ColumnDef, SortingState} from "@tanstack/react-table";
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import type {ReactNode} from "react";
import {
    memo,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type {SearchResponse, SearchResult} from "../../../api/search";
import {DialogContext} from "../../../components/dialogs/dialogs";
import {ToastContext} from "../../../components/toasts/toasts";
import {DirectDownloadActions, DownloadActions} from "./DownloadActions";
import {MultiFilter, NumericFilter} from "./filterControls";
import {COLLAPSED_WIDTH, EXPANDED_WIDTH, RefineSidebar} from "./RefineSidebar";
import type {NumericRange, QuickFilter, ResultFilters} from "./resultTable";
import {
    defaultFilters,
    duplicateGroupKey,
    filterResults,
    groupResults,
    preselectedQuickFilters,
    quickFilterKey,
    quickFiltersFromSafeConfig,
    selectionAfterClick,
    selectVisibleResults,
    visibleGroupedResults,
} from "./resultTable";

const STORAGE_KEY = "hydra.search-results.table";

// The narrowest a `sm`-and-up results table is allowed to render before it
// scrolls horizontally within its own box instead of squeezing header
// sort-buttons into overflow (measured against the fixed `colgroup` column
// ratios below: this is the smallest width at which every header's
// `scrollWidth` fits its `clientWidth`, including the epoch column's sort
// arrow). Below `sm` the table renders as unrelated stacked cards and never
// uses this constant.
const TABLE_MIN_WIDTH = 1320;

type StoredChoices = {
    filters?: Partial<ResultFilters>;
    sidebarCollapsed?: boolean;
    sorting?: SortingState;
};

export function SearchResults({
    data,
    episodeRequested = false,
    onLoadMore,
    onSaveSearch,
    savingSearch = false,
    searchRequestId,
}: {
    data: SearchResponse;
    episodeRequested?: boolean;
    onLoadMore?: (loadAll: boolean) => Promise<void>;
    onSaveSearch?: () => Promise<void>;
    savingSearch?: boolean;
    searchRequestId?: number;
}) {
    const safeConfig =
        window.__NZBHYDRA_BOOTSTRAP__ && isRecord(window.__NZBHYDRA_BOOTSTRAP__)
            ? window.__NZBHYDRA_BOOTSTRAP__.safeConfig
            : undefined;
    const quickFilters = useMemo(
        () => quickFiltersFromSafeConfig(safeConfig),
        [safeConfig],
    );
    const [choices] = useState(() => loadChoices());
    const [sorting, setSorting] = useState<SortingState>(
        choices.sorting ?? [{id: "epoch", desc: true}],
    );
    const [filters, setFilters] = useState<ResultFilters>(() => ({
        ...defaultFilters(data.searchResults, quickFilters),
        ...choices.filters,
        size: choices.filters?.size ?? {min: "", max: ""},
        grabs: choices.filters?.grabs ?? {min: "", max: ""},
        age: choices.filters?.age ?? {min: "", max: ""},
        quickFilters: {
            ...preselectedQuickFilters(safeConfig, quickFilters),
            ...choices.filters?.quickFilters,
        },
    }));
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
    const [groupTorrentAndUsenet, setGroupTorrentAndUsenet] = useState(false);
    const [groupEpisodes, setGroupEpisodes] = useState(true);
    const [expandedTitles, setExpandedTitles] = useState<Set<string>>(
        new Set(),
    );
    const [expandedDuplicates, setExpandedDuplicates] = useState<Set<string>>(
        new Set(),
    );
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string>();
    const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
    const [pagingLoading, setPagingLoading] = useState(false);
    const [pagingError, setPagingError] = useState<string>();
    const [pagingExhausted, setPagingExhausted] = useState(false);
    const dialogs = useContext(DialogContext);
    const toasts = useContext(ToastContext);
    const filteredResults = useMemo(
        () => filterResults(data.searchResults, filters, quickFilters),
        [data.searchResults, filters, quickFilters],
    );
    const indexerOptions = useMemo(
        () => [...new Set(data.searchResults.map((result) => result.indexer))],
        [data.searchResults],
    );
    const categoryOptions = useMemo(
        () => [...new Set(data.searchResults.map((result) => result.category))],
        [data.searchResults],
    );
    const columns = useMemo<ColumnDef<SearchResult>[]>(
        () => [
            {accessorKey: "title", header: "Title"},
            {accessorKey: "indexer", header: "Indexer"},
            {accessorKey: "category", header: "Category"},
            {
                accessorKey: "size",
                header: "Size",
                cell: (context) => context.getValue<number | undefined>() ?? "",
            },
            {
                id: "grabs",
                accessorFn: (result) => result.seeders ?? result.grabs,
                header: "Details",
                cell: (context) => context.getValue<number | undefined>() ?? "",
            },
            {
                accessorKey: "epoch",
                header: "Age",
                cell: (context) => context.row.original.age ?? "",
            },
        ],
        [],
    );
    const table = useReactTable({
        columns,
        data: filteredResults,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (result) => result.searchResultId,
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {sorting},
    });
    const sortedRows = table.getRowModel().rows;
    const sortedResults = useMemo(
        () => sortedRows.map((row) => row.original),
        [sortedRows],
    );
    const groups = useMemo(
        () =>
            groupResults(sortedResults, {
                groupTorrentAndUsenet,
                groupEpisodes,
                episodeRequested,
            }),
        [episodeRequested, groupEpisodes, groupTorrentAndUsenet, sortedResults],
    );
    const visibleResults = useMemo(
        () => visibleGroupedResults(groups, expandedTitles, expandedDuplicates),
        [expandedDuplicates, expandedTitles, groups],
    );
    const visibleResultsRef = useRef(visibleResults);
    visibleResultsRef.current = visibleResults;
    const lastSelectedIdRef = useRef(lastSelectedId);
    lastSelectedIdRef.current = lastSelectedId;
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
    const handleDownloaded = useCallback((resultId: string) => {
        setDownloadedIds((current) => new Set([...current, resultId]));
    }, []);
    const handleToggleTitleExpansion = useCallback((key: string) => {
        setExpandedTitles((current) => toggleSet(current, key));
    }, []);
    const handleToggleDuplicateExpansion = useCallback((key: string) => {
        setExpandedDuplicates((current) => toggleSet(current, key));
    }, []);

    useEffect(() => {
        getStorage()?.setItem(
            STORAGE_KEY,
            JSON.stringify({filters, sidebarCollapsed, sorting}),
        );
    }, [filters, sidebarCollapsed, sorting]);

    useEffect(() => {
        const filteredIds = new Set(
            filteredResults.map((result) => result.searchResultId),
        );
        setSelected(
            (current) =>
                new Set([...current].filter((id) => filteredIds.has(id))),
        );
    }, [filteredResults]);

    useEffect(() => {
        setPagingLoading(false);
        setPagingError(undefined);
        setPagingExhausted(false);
    }, [searchRequestId]);

    const allIndexersFailed =
        data.indexerSearchMetaDatas.length > 0 &&
        data.indexerSearchMetaDatas.every((indexer) => !indexer.wasSuccessful);
    const hasMoreResults = data.indexerSearchMetaDatas.some(
        (indexer) => indexer.hasMoreResults === true,
    );
    const hasRemainingKnownResults =
        data.numberOfProcessedResults !== undefined &&
        data.numberOfProcessedResults < data.numberOfAvailableResults;
    const hasInvalidPagingCursor =
        data.pagingState === "ready" &&
        data.offset === 0 &&
        data.limit === 0 &&
        (hasMoreResults || hasRemainingKnownResults);
    const pagingAvailable =
        onLoadMore !== undefined &&
        data.pagingState === "ready" &&
        (hasMoreResults || hasRemainingKnownResults) &&
        !hasInvalidPagingCursor &&
        !pagingExhausted;
    const requestContinuation = async (loadAll: boolean) => {
        if (!onLoadMore || pagingLoading || !pagingAvailable) {
            return;
        }
        setPagingLoading(true);
        setPagingError(undefined);
        try {
            await onLoadMore(loadAll);
            if (loadAll) {
                setPagingExhausted(true);
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to load more results.";
            setPagingError(message);
            if (message.includes("did not advance")) {
                setPagingExhausted(true);
            }
        } finally {
            setPagingLoading(false);
        }
    };
    const updateRange = (
        name: "size" | "grabs" | "age",
        bound: keyof NumericRange,
        value: string,
    ) => {
        setFilters((current) => ({
            ...current,
            [name]: {...current[name], [bound]: value},
        }));
    };
    const clearRange = (name: "size" | "grabs" | "age") => {
        setFilters((current) => ({...current, [name]: {min: "", max: ""}}));
    };
    const toggleQuickFilter = useCallback((filter: QuickFilter) => {
        setFilters((current) => ({
            ...current,
            quickFilters: {
                ...current.quickFilters,
                [quickFilterKey(filter)]:
                    !current.quickFilters[quickFilterKey(filter)],
            },
        }));
    }, []);
    // Resets every result-side filter (title, indexer/category selection,
    // download-type selection, size/age/grabs ranges, and quick filters) back
    // to defaultFilters(...) plus the configured quick-filter preselection --
    // the exact same shape the initial `filters` state is computed from,
    // minus any persisted `choices` override. Sorting, grouping, selection,
    // paging, and the search form are untouched.
    const clearAllFilters = useCallback(() => {
        setFilters({
            ...defaultFilters(data.searchResults, quickFilters),
            quickFilters: preselectedQuickFilters(safeConfig, quickFilters),
        });
    }, [data.searchResults, quickFilters, safeConfig]);
    // At `sm` and up, collapsing the sidebar frees exactly
    // `EXPANDED_WIDTH - COLLAPSED_WIDTH` px of flex space back to the table.
    // The table's own minimum width tracks that same delta so it keeps
    // growing when the sidebar collapses (matching the flex layout's actual
    // available space) instead of clamping to one shared floor in both
    // states.
    const tableMinWidth =
        TABLE_MIN_WIDTH +
        (sidebarCollapsed ? EXPANDED_WIDTH - COLLAPSED_WIDTH : 0);
    const renderHeaderFilter = (columnId: string) => {
        switch (columnId) {
            case "title":
                return (
                    <TextField
                        aria-label="Filter titles"
                        onChange={(event) =>
                            setFilters((current) => ({
                                ...current,
                                title: event.target.value,
                            }))
                        }
                        placeholder="Filter titles"
                        size="small"
                        slotProps={{
                            htmlInput: {
                                "data-testid": "header-filter-title",
                            },
                        }}
                        sx={{flexGrow: 1, minWidth: 0}}
                        value={filters.title}
                        variant="standard"
                    />
                );
            case "indexer":
                return (
                    <HeaderFilterMenu
                        active={
                            filters.indexers.length !== indexerOptions.length
                        }
                        label="Indexer"
                        testId="header-filter-indexer"
                    >
                        <MultiFilter
                            entries={data.searchResults.map(
                                (result) => result.indexer,
                            )}
                            label="Indexer"
                            onChange={(indexers) =>
                                setFilters((current) => ({
                                    ...current,
                                    indexers,
                                }))
                            }
                            selected={filters.indexers}
                            testId="header-filter-indexer-options"
                        />
                    </HeaderFilterMenu>
                );
            case "category":
                return (
                    <HeaderFilterMenu
                        active={
                            filters.categories.length !== categoryOptions.length
                        }
                        label="Category"
                        testId="header-filter-category"
                    >
                        <MultiFilter
                            entries={data.searchResults.map(
                                (result) => result.category,
                            )}
                            label="Category"
                            onChange={(categories) =>
                                setFilters((current) => ({
                                    ...current,
                                    categories,
                                }))
                            }
                            selected={filters.categories}
                            testId="header-filter-category-options"
                        />
                    </HeaderFilterMenu>
                );
            case "size":
                return (
                    <HeaderFilterMenu
                        active={
                            filters.size.min !== "" || filters.size.max !== ""
                        }
                        label="Size"
                        testId="header-filter-size"
                    >
                        <NumericFilter
                            label="Size (MB)"
                            name="size"
                            onChange={updateRange}
                            onClear={clearRange}
                            range={filters.size}
                            testIdPrefix="header-size"
                        />
                    </HeaderFilterMenu>
                );
            case "grabs":
                return (
                    <HeaderFilterMenu
                        active={
                            filters.grabs.min !== "" || filters.grabs.max !== ""
                        }
                        label="Grabs"
                        testId="header-filter-grabs"
                    >
                        <NumericFilter
                            label="Grabs / seeders"
                            name="grabs"
                            onChange={updateRange}
                            onClear={clearRange}
                            range={filters.grabs}
                            testIdPrefix="header-grabs"
                        />
                    </HeaderFilterMenu>
                );
            case "epoch":
                return (
                    <HeaderFilterMenu
                        active={
                            filters.age.min !== "" || filters.age.max !== ""
                        }
                        label="Age"
                        testId="header-filter-age"
                    >
                        <NumericFilter
                            label="Age (days)"
                            name="age"
                            onChange={updateRange}
                            onClear={clearRange}
                            range={filters.age}
                            testIdPrefix="header-age"
                        />
                    </HeaderFilterMenu>
                );
            default:
                return null;
        }
    };
    return (
        <Stack data-testid="search-results" spacing={2} sx={{mt: 4}}>
            {data.indexerLimitWarnings.length > 0 && (
                <Alert data-testid="indexer-limit-warnings" severity="warning">
                    <strong>Indexer quota warning</strong>
                    <ul>
                        {data.indexerLimitWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </Alert>
            )}
            {data.malformedResultCount > 0 && (
                <Alert severity="warning">
                    {data.malformedResultCount} malformed result entries were
                    not displayed.
                </Alert>
            )}
            {Object.keys(data.notPickedIndexersWithReason).length > 0 &&
                data.indexerSearchMetaDatas.length === 0 && (
                    <Alert severity="info">
                        <Typography component="h2" variant="h6">
                            No indexers were picked for this search
                        </Typography>
                        <ul>
                            {Object.entries(
                                data.notPickedIndexersWithReason,
                            ).map(([indexer, reason]) => (
                                <li key={indexer}>
                                    {indexer}: {reason}
                                </li>
                            ))}
                        </ul>
                    </Alert>
                )}
            {allIndexersFailed && (
                <Alert severity="error">
                    Unable to search any indexer successfully; no results
                    available
                </Alert>
            )}
            {!allIndexersFailed &&
                data.indexerSearchMetaDatas.length > 0 &&
                data.numberOfAvailableResults === 0 && (
                    <Alert severity="info">
                        No results were found for this search
                    </Alert>
                )}
            {data.numberOfRejectedResults > 0 && (
                <Alert severity="info">
                    Rejected {data.numberOfRejectedResults} results.
                </Alert>
            )}
            {data.pagingState === "partial" && (
                <Alert role="status" severity="warning">
                    More results cannot be loaded because the server returned
                    incomplete paging information.
                </Alert>
            )}
            {hasInvalidPagingCursor && (
                <Alert role="status" severity="warning">
                    More results cannot be loaded because the server returned an
                    invalid paging cursor.
                </Alert>
            )}
            {pagingError && (
                <Alert role="alert" severity="error">
                    {pagingError}
                </Alert>
            )}
            {onLoadMore && (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Button
                        aria-busy={pagingLoading}
                        disabled={!pagingAvailable || pagingLoading}
                        onClick={() => void requestContinuation(false)}
                        size="small"
                    >
                        {pagingLoading ? "Loading more results…" : "Load more"}
                    </Button>
                    <Button
                        disabled={!pagingAvailable || pagingLoading}
                        onClick={() => void requestContinuation(true)}
                        size="small"
                    >
                        Load all results
                    </Button>
                </Stack>
            )}
            {data.searchResults.length > 0 && (
                <>
                    <Paper
                        data-testid="results-toolbar"
                        elevation={1}
                        sx={{p: {xs: 1.5, sm: 2}}}
                    >
                        <Stack spacing={1.5}>
                            <Typography
                                data-testid="search-results-summary"
                                variant="subtitle2"
                            >
                                Loaded {data.searchResults.length} (
                                {data.searchResults.length -
                                    filteredResults.length}{" "}
                                filtered) of{" "}
                                {hasMoreResults &&
                                data.indexerSearchMetaDatas.some(
                                    (indexer) =>
                                        indexer.totalResultsKnown === false,
                                )
                                    ? ">"
                                    : ""}
                                {data.numberOfAvailableResults} results
                                (rejected {data.numberOfRejectedResults})
                            </Typography>
                            <Stack
                                alignItems="center"
                                data-testid="results-selection-actions"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={groupTorrentAndUsenet}
                                            onChange={(event) =>
                                                setGroupTorrentAndUsenet(
                                                    event.target.checked,
                                                )
                                            }
                                            size="small"
                                        />
                                    }
                                    label="Group torrent and Usenet results"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={groupEpisodes}
                                            onChange={(event) =>
                                                setGroupEpisodes(
                                                    event.target.checked,
                                                )
                                            }
                                            size="small"
                                        />
                                    }
                                    label="Group TV episodes"
                                />
                                <Button
                                    onClick={() =>
                                        setSelected((current) =>
                                            selectVisibleResults(
                                                current,
                                                visibleResults,
                                                "all",
                                            ),
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault();
                                            setSelected((current) =>
                                                selectVisibleResults(
                                                    current,
                                                    visibleResults,
                                                    "all",
                                                ),
                                            );
                                        }
                                    }}
                                    size="small"
                                >
                                    Select all
                                </Button>
                                <Button
                                    onClick={() => setSelected(new Set())}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault();
                                            setSelected(new Set());
                                        }
                                    }}
                                    size="small"
                                >
                                    Deselect all
                                </Button>
                                <Button
                                    onClick={() =>
                                        setSelected((current) =>
                                            selectVisibleResults(
                                                current,
                                                visibleResults,
                                                "invert",
                                            ),
                                        )
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault();
                                            setSelected((current) =>
                                                selectVisibleResults(
                                                    current,
                                                    visibleResults,
                                                    "invert",
                                                ),
                                            );
                                        }
                                    }}
                                    size="small"
                                >
                                    Invert selection
                                </Button>
                            </Stack>
                            <Stack
                                alignItems="center"
                                data-testid="results-download-actions"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                            >
                                {onSaveSearch && (
                                    <Button
                                        disabled={savingSearch}
                                        id="save-search"
                                        onClick={() => void onSaveSearch()}
                                        size="small"
                                    >
                                        {savingSearch
                                            ? "Saving search…"
                                            : "Save search"}
                                    </Button>
                                )}
                                {dialogs !== null && toasts !== null && (
                                    <DownloadActions
                                        onDownloaded={(ids) => {
                                            const affected = data.searchResults
                                                .filter((result) =>
                                                    ids.includes(
                                                        Number(
                                                            downloadIdFor(
                                                                result,
                                                            ).split(".")[0],
                                                        ),
                                                    ),
                                                )
                                                .map(
                                                    (result) =>
                                                        result.searchResultId,
                                                );
                                            setDownloadedIds(
                                                (current) =>
                                                    new Set([
                                                        ...current,
                                                        ...affected,
                                                    ]),
                                            );
                                            setSelected(
                                                (current) =>
                                                    new Set(
                                                        [...current].filter(
                                                            (id) =>
                                                                !affected.includes(
                                                                    id,
                                                                ),
                                                        ),
                                                    ),
                                            );
                                        }}
                                        results={data.searchResults.filter(
                                            (result) =>
                                                selected.has(
                                                    result.searchResultId,
                                                ),
                                        )}
                                        safeConfig={safeConfig}
                                    />
                                )}
                            </Stack>
                            <Stack
                                alignItems="flex-end"
                                data-testid="results-filters"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                                sx={{display: {xs: "flex", sm: "none"}}}
                            >
                                <TextField
                                    label="Filter titles"
                                    size="small"
                                    slotProps={{
                                        htmlInput: {
                                            "data-testid":
                                                "freetext-filter-title",
                                        },
                                    }}
                                    value={filters.title}
                                    onChange={(event) =>
                                        setFilters((current) => ({
                                            ...current,
                                            title: event.target.value,
                                        }))
                                    }
                                />
                                <MultiFilter
                                    label="Indexer"
                                    testId="filter-toggle-indexer"
                                    entries={data.searchResults.map(
                                        (result) => result.indexer,
                                    )}
                                    selected={filters.indexers}
                                    onChange={(indexers) =>
                                        setFilters((current) => ({
                                            ...current,
                                            indexers,
                                        }))
                                    }
                                />
                                <MultiFilter
                                    label="Category"
                                    testId="filter-toggle-category"
                                    entries={data.searchResults.map(
                                        (result) => result.category,
                                    )}
                                    selected={filters.categories}
                                    onChange={(categories) =>
                                        setFilters((current) => ({
                                            ...current,
                                            categories,
                                        }))
                                    }
                                />
                                <NumericFilter
                                    label="Size (MB)"
                                    name="size"
                                    range={filters.size}
                                    onChange={updateRange}
                                    onClear={clearRange}
                                />
                                <NumericFilter
                                    label="Grabs / seeders"
                                    name="grabs"
                                    range={filters.grabs}
                                    onChange={updateRange}
                                    onClear={clearRange}
                                />
                                <NumericFilter
                                    label="Age (days)"
                                    name="age"
                                    range={filters.age}
                                    onChange={updateRange}
                                    onClear={clearRange}
                                />
                            </Stack>
                            {quickFilters.length > 0 && (
                                // Visible only at xs (mobile), matching the
                                // mobile-only `results-filters` row: at `sm`
                                // and up, the same quick filters (bound to
                                // the same `filters.quickFilters` state) now
                                // render in the persistent refine-sidebar's
                                // Quality section instead, so this row would
                                // otherwise duplicate an identically-labeled,
                                // simultaneously-visible control.
                                <Stack
                                    data-testid="results-quick-filters"
                                    direction="row"
                                    flexWrap="wrap"
                                    gap={1}
                                    sx={{display: {xs: "flex", sm: "none"}}}
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
                                                toggleQuickFilter(filter)
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
                            )}
                        </Stack>
                    </Paper>
                    <Stack
                        alignItems="flex-start"
                        direction={{xs: "column", sm: "row"}}
                        spacing={2}
                    >
                        <RefineSidebar
                            clearRange={clearRange}
                            collapsed={sidebarCollapsed}
                            filters={filters}
                            onClearAll={clearAllFilters}
                            onToggleCollapsed={() =>
                                setSidebarCollapsed((current) => !current)
                            }
                            onToggleQuickFilter={toggleQuickFilter}
                            quickFilters={quickFilters}
                            results={data.searchResults}
                            setFilters={setFilters}
                            updateRange={updateRange}
                        />
                        <Box sx={{minWidth: 0, width: "100%"}}>
                            {filteredResults.length === 0 && (
                                <Typography component="h2" variant="h6">
                                    All results are currently filtered
                                </Typography>
                            )}
                            <Box sx={{maxWidth: "100%", overflowX: "auto"}}>
                                <Table
                                    data-testid="search-results-table"
                                    sx={(theme) => ({
                                        tableLayout: "fixed",
                                        width: "100%",
                                        "& tbody > tr > td": {
                                            paddingBottom: "6px",
                                            paddingTop: "6px",
                                        },
                                        "& td, & th": {fontSize: "12px"},
                                        '& [data-label="Title"]': {
                                            fontSize: "13px",
                                        },
                                        // Below `sm` the table is an
                                        // unrelated stacked-card layout (see
                                        // the down("sm") block below) that
                                        // never competes with the sidebar for
                                        // width, so `tableMinWidth` only
                                        // applies at `sm` and up, where it
                                        // keeps header sort-buttons from
                                        // being squeezed into overflow by
                                        // the persistent sidebar -- scrolling
                                        // horizontally within the existing
                                        // `overflowX: "auto"` wrapper instead.
                                        [theme.breakpoints.up("sm")]: {
                                            minWidth: tableMinWidth,
                                        },
                                        [theme.breakpoints.down("sm")]: {
                                            display: "block",
                                            "& thead": {display: "none"},
                                            "& tbody": {display: "block"},
                                            "& tr": {
                                                borderTop: `2px solid ${theme.palette.divider}`,
                                                display: "block",
                                                "&:first-of-type": {
                                                    borderTop: "none",
                                                },
                                            },
                                            "& td": {
                                                alignItems: "center",
                                                border: "none",
                                                display: "flex",
                                                flexDirection: "row",
                                                gap: 1,
                                                justifyContent: "space-between",
                                                textAlign: "right",
                                                "&::before": {
                                                    color: theme.palette.text
                                                        .secondary,
                                                    content: "attr(data-label)",
                                                    fontSize: "0.7rem",
                                                    fontWeight: 700,
                                                    textAlign: "left",
                                                    textTransform: "uppercase",
                                                },
                                            },
                                            '& td[data-label="Title"]': {
                                                display: "block",
                                                textAlign: "left",
                                            },
                                            '& td[data-label="Title"]::before':
                                                {
                                                    content: "none",
                                                },
                                        },
                                    })}
                                >
                                    <colgroup>
                                        <col style={{width: 40}} />
                                        <col style={{width: "54%"}} />
                                        <col style={{width: "9%"}} />
                                        <col style={{width: "8%"}} />
                                        <col style={{width: "7%"}} />
                                        <col style={{width: "6.5%"}} />
                                        <col style={{width: "5.5%"}} />
                                        <col style={{width: "10%"}} />
                                    </colgroup>
                                    <TableHead>
                                        {table
                                            .getHeaderGroups()
                                            .map((headerGroup) => (
                                                <TableRow key={headerGroup.id}>
                                                    <TableCell
                                                        data-label="Select"
                                                        padding="checkbox"
                                                    />
                                                    {headerGroup.headers.map(
                                                        (header) => {
                                                            const isTitle =
                                                                header.column
                                                                    .id ===
                                                                "title";
                                                            const label =
                                                                typeof header
                                                                    .column
                                                                    .columnDef
                                                                    .header ===
                                                                "string"
                                                                    ? header
                                                                          .column
                                                                          .columnDef
                                                                          .header
                                                                    : undefined;
                                                            const sortDirection =
                                                                header.column.getIsSorted();
                                                            return (
                                                                <TableCell
                                                                    align={
                                                                        isTitle
                                                                            ? "left"
                                                                            : "right"
                                                                    }
                                                                    aria-sort={
                                                                        sortDirection ===
                                                                        "asc"
                                                                            ? "ascending"
                                                                            : sortDirection ===
                                                                                "desc"
                                                                              ? "descending"
                                                                              : "none"
                                                                    }
                                                                    data-label={
                                                                        label
                                                                    }
                                                                    key={
                                                                        header.id
                                                                    }
                                                                    sx={{
                                                                        overflow:
                                                                            "hidden",
                                                                        px: 1,
                                                                        textOverflow:
                                                                            "ellipsis",
                                                                        whiteSpace:
                                                                            "nowrap",
                                                                    }}
                                                                >
                                                                    {header.isPlaceholder ? null : (
                                                                        <Stack
                                                                            alignItems="center"
                                                                            direction="row"
                                                                            gap={
                                                                                0.5
                                                                            }
                                                                            justifyContent={
                                                                                isTitle
                                                                                    ? undefined
                                                                                    : "flex-end"
                                                                            }
                                                                        >
                                                                            <Button
                                                                                aria-label={`${
                                                                                    label ??
                                                                                    ""
                                                                                }${
                                                                                    sortDirection ===
                                                                                    "asc"
                                                                                        ? " (ascending)"
                                                                                        : sortDirection ===
                                                                                            "desc"
                                                                                          ? " (descending)"
                                                                                          : ""
                                                                                }`}
                                                                                data-sort-direction={
                                                                                    sortDirection ||
                                                                                    "none"
                                                                                }
                                                                                data-testid={`sort-${header.column.id}`}
                                                                                onClick={header.column.getToggleSortingHandler()}
                                                                                size="small"
                                                                                sx={{
                                                                                    display:
                                                                                        "block",
                                                                                    flexShrink: 0,
                                                                                    maxWidth:
                                                                                        "100%",
                                                                                    minWidth: 0,
                                                                                    overflow:
                                                                                        "hidden",
                                                                                    px: 0.5,
                                                                                    textAlign:
                                                                                        isTitle
                                                                                            ? "left"
                                                                                            : "right",
                                                                                    textOverflow:
                                                                                        "ellipsis",
                                                                                    whiteSpace:
                                                                                        "nowrap",
                                                                                }}
                                                                            >
                                                                                {flexRender(
                                                                                    header
                                                                                        .column
                                                                                        .columnDef
                                                                                        .header,
                                                                                    header.getContext(),
                                                                                )}
                                                                                {sortDirection && (
                                                                                    <Box
                                                                                        aria-hidden="true"
                                                                                        component="span"
                                                                                    >
                                                                                        {sortDirection ===
                                                                                        "asc"
                                                                                            ? " ▲"
                                                                                            : " ▼"}
                                                                                    </Box>
                                                                                )}
                                                                            </Button>
                                                                            {renderHeaderFilter(
                                                                                header
                                                                                    .column
                                                                                    .id,
                                                                            )}
                                                                        </Stack>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        },
                                                    )}
                                                    <TableCell
                                                        align="right"
                                                        data-label="Actions"
                                                        sx={{
                                                            whiteSpace:
                                                                "nowrap",
                                                        }}
                                                    >
                                                        Actions
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableHead>
                                    <TableBody>
                                        {groups.flatMap((group, groupIndex) =>
                                            group.duplicateGroups.flatMap(
                                                (
                                                    duplicates,
                                                    duplicateIndex,
                                                ) => {
                                                    const first = duplicates[0];
                                                    const duplicateKey =
                                                        duplicateGroupKey(
                                                            group.key,
                                                            first,
                                                        );
                                                    const titleExpanded =
                                                        expandedTitles.has(
                                                            group.key,
                                                        );
                                                    const duplicateExpanded =
                                                        expandedDuplicates.has(
                                                            duplicateKey,
                                                        );
                                                    if (
                                                        duplicateIndex > 0 &&
                                                        !titleExpanded
                                                    ) {
                                                        return [];
                                                    }
                                                    return duplicates
                                                        .filter(
                                                            (_, index) =>
                                                                index === 0 ||
                                                                duplicateExpanded,
                                                        )
                                                        .map(
                                                            (result, index) => {
                                                                const nestingLevel =
                                                                    (duplicateIndex >
                                                                    0
                                                                        ? 1
                                                                        : 0) +
                                                                    (index > 0
                                                                        ? 1
                                                                        : 0);
                                                                const isNewGroup =
                                                                    groupIndex >
                                                                        0 &&
                                                                    duplicateIndex ===
                                                                        0 &&
                                                                    index === 0;
                                                                return (
                                                                    <ResultRow
                                                                        downloaded={downloadedIds.has(
                                                                            result.searchResultId,
                                                                        )}
                                                                        duplicateExpanded={
                                                                            duplicateExpanded
                                                                        }
                                                                        duplicateKey={
                                                                            duplicateKey
                                                                        }
                                                                        isNewGroup={
                                                                            isNewGroup
                                                                        }
                                                                        key={
                                                                            result.searchResultId
                                                                        }
                                                                        nestingLevel={
                                                                            nestingLevel
                                                                        }
                                                                        onDownloaded={
                                                                            handleDownloaded
                                                                        }
                                                                        onSelectionChange={
                                                                            updateSelection
                                                                        }
                                                                        onToggleDuplicateExpansion={
                                                                            handleToggleDuplicateExpansion
                                                                        }
                                                                        onToggleTitleExpansion={
                                                                            handleToggleTitleExpansion
                                                                        }
                                                                        result={
                                                                            result
                                                                        }
                                                                        selected={selected.has(
                                                                            result.searchResultId,
                                                                        )}
                                                                        showDuplicateExpand={
                                                                            index ===
                                                                                0 &&
                                                                            duplicates.length >
                                                                                1
                                                                        }
                                                                        showTitleExpand={
                                                                            index ===
                                                                                0 &&
                                                                            duplicateIndex ===
                                                                                0 &&
                                                                            group
                                                                                .duplicateGroups
                                                                                .length >
                                                                                1
                                                                        }
                                                                        titleExpanded={
                                                                            titleExpanded
                                                                        }
                                                                        titleGroupKey={
                                                                            group.key
                                                                        }
                                                                    />
                                                                );
                                                            },
                                                        );
                                                },
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Box>
                    </Stack>
                </>
            )}
        </Stack>
    );
}

type ResultColumn = {
    align: "left" | "right";
    id: string;
    label: string;
    testId?: string;
    value: (result: SearchResult) => ReactNode;
};

const resultColumns: ResultColumn[] = [
    {
        align: "left",
        id: "title",
        label: "Title",
        testId: "search-result-title",
        value: (result) => result.title,
    },
    {
        align: "right",
        id: "indexer",
        label: "Indexer",
        value: (result) => result.indexer,
    },
    {
        align: "right",
        id: "category",
        label: "Category",
        value: (result) => result.category,
    },
    {
        align: "right",
        id: "size",
        label: "Size",
        value: (result) => result.size ?? "",
    },
    {
        align: "right",
        id: "grabs",
        label: "Details",
        value: (result) => result.seeders ?? result.grabs ?? "",
    },
    {
        align: "right",
        id: "epoch",
        label: "Age",
        value: (result) => result.age ?? "",
    },
];

const ResultRow = memo(function ResultRow({
    downloaded,
    duplicateExpanded,
    duplicateKey,
    isNewGroup,
    nestingLevel,
    onDownloaded,
    onSelectionChange,
    onToggleDuplicateExpansion,
    onToggleTitleExpansion,
    result,
    selected,
    showDuplicateExpand,
    showTitleExpand,
    titleExpanded,
    titleGroupKey,
}: {
    downloaded: boolean;
    duplicateExpanded: boolean;
    duplicateKey: string;
    isNewGroup: boolean;
    nestingLevel: number;
    onDownloaded: (resultId: string) => void;
    onSelectionChange: (
        resultId: string,
        checked: boolean,
        shiftKey: boolean,
    ) => void;
    onToggleDuplicateExpansion: (key: string) => void;
    onToggleTitleExpansion: (key: string) => void;
    result: SearchResult;
    selected: boolean;
    showDuplicateExpand: boolean;
    showTitleExpand: boolean;
    titleExpanded: boolean;
    titleGroupKey: string;
}) {
    return (
        <TableRow
            data-result-id={result.searchResultId}
            data-result-title={result.title}
            data-nesting-level={nestingLevel}
            data-testid="search-result-row"
            sx={{
                bgcolor: nestingLevel > 0 ? "action.hover" : undefined,
                borderTopColor: isNewGroup ? "divider" : undefined,
                borderTopStyle: isNewGroup ? "solid" : undefined,
                borderTopWidth: isNewGroup ? 2 : undefined,
            }}
        >
            <TableCell data-label="Select" padding="checkbox">
                <Checkbox
                    checked={selected}
                    inputProps={{
                        "aria-label": `Select ${result.title}`,
                    }}
                    onChange={(event) => {
                        onSelectionChange(
                            result.searchResultId,
                            event.target.checked,
                            (event.nativeEvent as MouseEvent).shiftKey,
                        );
                    }}
                    onKeyDown={(event) => {
                        if (event.key === " ") {
                            event.preventDefault();
                            onSelectionChange(
                                result.searchResultId,
                                !selected,
                                event.shiftKey,
                            );
                        }
                    }}
                    size="small"
                />
            </TableCell>
            {resultColumns.map((column) => {
                const isTitle = column.id === "title";
                return (
                    <TableCell
                        align={column.align}
                        data-label={column.label}
                        data-testid={column.testId}
                        key={column.id}
                        sx={{
                            pl: isTitle ? 2 + nestingLevel * 2 : undefined,
                            whiteSpace: isTitle ? "normal" : "nowrap",
                        }}
                    >
                        {isTitle ? (
                            <Stack
                                alignItems="center"
                                direction="row"
                                flexWrap="wrap"
                                gap={0.5}
                            >
                                {showTitleExpand && (
                                    <Button
                                        aria-expanded={titleExpanded}
                                        onClick={() =>
                                            onToggleTitleExpansion(
                                                titleGroupKey,
                                            )
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();
                                                onToggleTitleExpansion(
                                                    titleGroupKey,
                                                );
                                            }
                                        }}
                                        size="small"
                                    >
                                        {titleExpanded
                                            ? "Collapse group"
                                            : "Expand group"}
                                    </Button>
                                )}
                                {showDuplicateExpand && (
                                    <Button
                                        aria-expanded={duplicateExpanded}
                                        onClick={() =>
                                            onToggleDuplicateExpansion(
                                                duplicateKey,
                                            )
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();
                                                onToggleDuplicateExpansion(
                                                    duplicateKey,
                                                );
                                            }
                                        }}
                                        size="small"
                                    >
                                        {duplicateExpanded
                                            ? "Collapse duplicates"
                                            : "Expand duplicates"}
                                    </Button>
                                )}
                                <Box>{column.value(result)}</Box>
                            </Stack>
                        ) : (
                            column.value(result)
                        )}
                    </TableCell>
                );
            })}
            <TableCell align="right" data-label="Actions">
                <Stack
                    alignItems={{xs: "center", sm: "flex-end"}}
                    direction={{xs: "row", sm: "column"}}
                    flexWrap="wrap"
                    gap={0.5}
                    justifyContent="flex-end"
                >
                    <DirectDownloadActions
                        onDownloaded={() => onDownloaded(result.searchResultId)}
                        result={result}
                    />
                    {downloaded && (
                        <Chip
                            color="success"
                            label="Downloaded"
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Stack>
            </TableCell>
        </TableRow>
    );
});

function HeaderFilterMenu({
    active,
    children,
    label,
    testId,
}: {
    active: boolean;
    children: ReactNode;
    label: string;
    testId: string;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    return (
        <>
            <Button
                aria-label={`Filter ${label}`}
                aria-pressed={active}
                data-testid={`${testId}-toggle`}
                onClick={(event) => setAnchorEl(event.currentTarget)}
                size="small"
                sx={{minWidth: 0, px: 0.75}}
                variant={active ? "contained" : "outlined"}
            >
                ▾
            </Button>
            <Popover
                anchorEl={anchorEl}
                anchorOrigin={{horizontal: "right", vertical: "bottom"}}
                onClose={() => setAnchorEl(null)}
                open={Boolean(anchorEl)}
                slotProps={{paper: {sx: {minWidth: 220, p: 1.5}}}}
            >
                <Box data-testid={testId}>{children}</Box>
            </Popover>
        </>
    );
}

function loadChoices(): StoredChoices {
    try {
        const value: unknown = JSON.parse(
            getStorage()?.getItem(STORAGE_KEY) ?? "null",
        );
        return isRecord(value) ? (value as StoredChoices) : {};
    } catch {
        return {};
    }
}

function getStorage(): Storage | undefined {
    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
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

function toggleSet(values: ReadonlySet<string>, value: string): Set<string> {
    const next = new Set(values);
    if (next.has(value)) {
        next.delete(value);
    } else {
        next.add(value);
    }
    return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function downloadIdFor(result: SearchResult): string {
    return result.downloadId ?? result.searchResultId;
}
