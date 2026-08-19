import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControlLabel,
    FormGroup,
    Menu,
    MenuItem,
    Popover,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
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
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type {SearchResponse, SearchResult} from "../../../api/search";
import {DialogContext} from "../../../components/dialogs/dialogs";
import {ToastContext} from "../../../components/toasts/toasts";
import {
    compactRowPaddingY,
    displayMenuCaptionColor,
    displayMenuDividerColor,
    displayMenuItemColor,
    displayMenuItemFontSize,
    displayMenuItemGap,
    displayMenuItemPaddingX,
    displayMenuItemPaddingY,
    displayMenuItemRadius,
    displayMenuMinWidth,
    displayMenuPadding,
    displayMenuRadius,
    displayMenuShadow,
    recentRowStripe,
    rowPaddingY,
} from "./displayStyles";
import {DirectDownloadActions, DownloadActions} from "./DownloadActions";
import {RefineSidebar, useCompactRefineSurface} from "./RefineSidebar";
import type {
    NumericRange,
    QuickFilter,
    ResultFilters,
    SelectionStatus,
} from "./resultTable";
import {
    checkboxUncheckedBorder,
    controlSurface,
    enabledSecondaryTextColor,
    popoverBorderColor,
    popoverRadius,
    popoverShadow,
} from "./toolbarStyles";
import {
    defaultFilters,
    duplicateGroupKey,
    filterResults,
    formatResultSize,
    groupResults,
    isRecentResult,
    preselectedQuickFilters,
    quickFilterKey,
    quickFiltersFromSafeConfig,
    selectionAfterClick,
    selectionStatus,
    selectVisibleResults,
    visibleGroupedResults,
} from "./resultTable";

const STORAGE_KEY = "hydra.search-results.table";

// Header cells carry MUI's default 16px vertical `TableCell` padding, which
// -- together with the tallest control each cell held -- set the pre-FM-045
// header row to 63.25px at 1280x800 (measured against the clean `89286c376`
// baseline). With FM-034's inline filter controls gone the header row holds
// nothing but its sort button, so the row's own padding is what now keeps it
// tall; matching the body cells' existing 6px keeps the simplified header
// measurably shorter, as this task's visual contract requires. FM-042
// (ADR-0011) leaves this padding as-is: the mock's exact 42px header height
// is not itself an acceptance criterion here (only that every header's
// `scrollWidth` fits its `clientWidth` at the evidenced viewports is), and
// the re-proportioned `<colgroup>` plus the label typography below already
// satisfy that without also re-tuning row height.
const HEADER_CELL_PADDING_Y = "6px";

// FM-042 (ADR-0011): the mock's own header-row label typography
// (`uimock/NZBHydra Search.dc.html:258`), which ADR-0009 already makes
// authoritative for palette/typography/density. This is the "complementary
// lever" ADR-0011 names alongside the re-proportioned `<colgroup>` for
// making all eight columns' full labels fit: a smaller, uppercase, tracked
// label leaves more of each header cell's narrowed box for the label text
// itself than the previous default MUI `Button` typography did.
const HEADER_LABEL_FONT_SIZE = "11px";
const HEADER_LABEL_FONT_WEIGHT = 600;
const HEADER_LABEL_LETTER_SPACING = "0.5px";
const HEADER_LABEL_COLOR = "#7c8483";

// FM-042: the mock's own sticky toolbar/header stacking relationship
// (`position:sticky;top:0;z-index:15` for the toolbar, `position:sticky;
// top:51px;z-index:10` for the header row directly beneath it -- the
// toolbar always renders above the header it pins against). MUI portals
// every `Menu`/`Popover` this feature opens (the header's/toolbar's
// selection-caret menu, the display-options popover) to `document.body` at
// the theme's modal z-index (1300 by default), so neither sticky region
// ever competes with an open popover for stacking order regardless of
// these two values.
const TOOLBAR_STICKY_Z_INDEX = 15;
const HEADER_STICKY_Z_INDEX = 10;

// The sticky background every pinned region shares, so rows/content
// scrolling underneath a sticky region never show through it. The same
// token `theme.ts`'s scrollbar `styleOverrides` already reads for the page
// background (see that file's `mockPalette.backgroundDefault`), reused
// here rather than restated as a new literal.
const STICKY_BACKGROUND = "background.default";

type StoredChoices = {
    compactRows?: boolean;
    filters?: Partial<ResultFilters>;
    highlightRecent?: boolean;
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
    // Below `sm` the refine surface is FM-045's temporary drawer rather than
    // the docked column, and its open state is a transient overlay state, not
    // a preference: it always starts closed and is deliberately absent from
    // the persisted `hydra.search-results.table` payload (see FM-045's
    // rationale in `RefineSidebar.tsx`). FM-041 moved the state here -- and
    // only the state, not its lifecycle -- so the display-options "Show refine
    // sidebar" entry can read and write whichever of the two per-branch
    // mechanisms is actually mounted.
    const [refineDrawerOpen, setRefineDrawerOpen] = useState(false);
    // The same branch decision `RefineSidebar` itself makes, from the one
    // shared definition of it, so the entry can never disagree with the live
    // `refine-sidebar-toggle`.
    const refineSurfaceCompact = useCompactRefineSurface();
    const refineSurfaceShown = refineSurfaceCompact
        ? refineDrawerOpen
        : !sidebarCollapsed;
    const toggleRefineSurface = useCallback(() => {
        if (refineSurfaceCompact) {
            setRefineDrawerOpen((open) => !open);
        } else {
            setSidebarCollapsed((current) => !current);
        }
    }, [refineSurfaceCompact]);
    // Both opt-in and both defaulting off, so the results list's default
    // rendering -- and every accepted default-state visual baseline measured
    // against it -- is unchanged by this task.
    const [compactRows, setCompactRows] = useState(
        () => choices.compactRows ?? false,
    );
    const [highlightRecent, setHighlightRecent] = useState(
        () => choices.highlightRecent ?? false,
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
    // Drives the results table header's tri-state checkbox and its mobile
    // toolbar counterpart (FM-040): "all"/"some"/"none" of the currently
    // visible rows.
    const currentSelectionStatus = useMemo(
        () => selectionStatus(selected, visibleResults),
        [selected, visibleResults],
    );
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
            JSON.stringify({
                compactRows,
                filters,
                highlightRecent,
                sidebarCollapsed,
                sorting,
            }),
        );
    }, [compactRows, filters, highlightRecent, sidebarCollapsed, sorting]);

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
    // FM-042: the results table's column header row sticks directly beneath
    // the sticky toolbar, at a `top` offset derived from the toolbar's own
    // rendered height -- never a hardcoded pixel constant -- so it stays
    // correct as FM-041's compact mode, FM-045's collapsible/drawer sidebar,
    // and the toolbar's own wrap-to-more-rows behavior at narrow widths all
    // change that height.
    //
    // The sticky element is `results-toolbar` itself (the whole existing
    // region: summary, `results-bulk-actions`, `results-download-actions`,
    // and `results-selection-actions`, unchanged in content), not its
    // individual children. This is a `position: sticky` CSS requirement, not
    // a style preference: a sticky element can only remain pinned for as
    // long as its own *containing block* (its nearest block-level DOM
    // ancestor -- here, the outer `search-results` Stack, which also
    // contains the table below) keeps overlapping the viewport as the page
    // scrolls. Nesting the sticky styling on `results-toolbar`'s individual
    // children instead would bound each one's containing block to
    // `results-toolbar`'s own short box, so they would detach and scroll
    // away again once the page scrolled roughly one toolbar-height past
    // them -- long before the table's later rows do -- which is exactly the
    // regression a real-browser scroll (not a jsdom component test) caught
    // during this task's own implementation.
    //
    // Re-measured synchronously before paint (matching how the mock's own
    // `top: 51px` is derived from its toolbar's rendered height) and kept in
    // sync afterwards through a `ResizeObserver`, which is unavailable in
    // the jsdom component-test environment (guarded below) and asserted for
    // real in `tests/system/tests/results.spec.ts` instead, per this task's
    // verification requirements.
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const [toolbarHeight, setToolbarHeight] = useState(0);
    const hasResults = data.searchResults.length > 0;
    useLayoutEffect(() => {
        const node = toolbarRef.current;
        if (!node) {
            return;
        }
        let cancelled = false;
        const measure = () => {
            if (!cancelled) {
                setToolbarHeight(node.getBoundingClientRect().height);
            }
        };
        measure();
        // The self-hosted IBM Plex Sans/Mono faces `theme.ts` declares can
        // still be loading at this point (this component's own first layout
        // races the browser's font fetch, independent of anything this task
        // controls), and a font swap reflows text width -- and so this
        // flex-wrapped toolbar's line count and rendered height -- without
        // changing the toolbar box's `ResizeObserver`-visible geometry
        // beforehand. `document.fonts` is unavailable in the jsdom
        // component-test environment (guarded below); it does not affect
        // that environment's assertions, which check the CSS declaration
        // rather than settled layout.
        if (typeof document !== "undefined" && document.fonts) {
            void document.fonts.ready.then(measure);
        }
        // `results-download-actions`' downloader/category `<Select>`s
        // populate asynchronously (an API fetch resolves after mount) and
        // change only their *text content*, not necessarily a size
        // `ResizeObserver` reports before the fetch settles -- real-browser
        // verification caught the header offset undershooting for exactly
        // this reason. A `MutationObserver` re-measures on any DOM change
        // within the toolbar regardless of cause, which is a more direct,
        // deterministic fix than guessing a settle delay.
        let mutationObserver: MutationObserver | undefined;
        if (typeof MutationObserver !== "undefined") {
            mutationObserver = new MutationObserver(measure);
            mutationObserver.observe(node, {
                characterData: true,
                childList: true,
                subtree: true,
            });
        }
        if (typeof ResizeObserver === "undefined") {
            return () => {
                cancelled = true;
                mutationObserver?.disconnect();
            };
        }
        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(node);
        return () => {
            cancelled = true;
            mutationObserver?.disconnect();
            resizeObserver.disconnect();
        };
        // `hasResults` re-runs this the moment the toolbar first mounts
        // (search results loading in after an initial empty render), which
        // a `[]`-only dependency array would miss entirely.
    }, [hasResults]);
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
                    <Box
                        data-testid="results-toolbar"
                        ref={toolbarRef}
                        sx={{
                            backgroundColor: STICKY_BACKGROUND,
                            padding: "16px 0 14px",
                            position: "sticky",
                            top: 0,
                            zIndex: TOOLBAR_STICKY_Z_INDEX,
                        }}
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
                                {selected.size > 0 && (
                                    <Box
                                        component="span"
                                        sx={{color: "primary.main"}}
                                    >
                                        {" "}
                                        · {selected.size} selected
                                    </Box>
                                )}
                            </Typography>
                            {dialogs !== null && toasts !== null ? (
                                <DownloadActions
                                    filteredCount={filteredResults.length}
                                    loadedCount={data.searchResults.length}
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
                                    onSaveSearch={onSaveSearch}
                                    results={data.searchResults.filter(
                                        (result) =>
                                            selected.has(result.searchResultId),
                                    )}
                                    safeConfig={safeConfig}
                                    savingSearch={savingSearch}
                                />
                            ) : (
                                // Defensive fallback for the (never exercised
                                // in this app -- App.tsx always wraps the
                                // tree in DialogProvider/ToastProvider --
                                // but still guarded) case where dialogs/
                                // toasts context is unavailable: Save search
                                // keeps rendering on its own, exactly as
                                // before this task, instead of disappearing
                                // along with the download-actions region.
                                onSaveSearch && (
                                    <Stack
                                        data-testid="results-download-actions"
                                        direction="row"
                                    >
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
                                    </Stack>
                                )
                            )}
                            <Stack
                                alignItems="center"
                                data-testid="results-selection-actions"
                                direction="row"
                                flexWrap="wrap"
                                gap={1}
                            >
                                {/* Below `sm` the table's `thead` (and so the
                                    header's tri-state checkbox/caret menu) is
                                    hidden by the responsive table styling; this
                                    mobile-only copy keeps bulk selection
                                    reachable from the toolbar at that
                                    viewport. Both copies share the same
                                    selection state and callbacks. */}
                                <Box sx={{display: {xs: "flex", sm: "none"}}}>
                                    <SelectionMenu
                                        idPrefix="toolbar"
                                        onDeselectAll={deselectAllVisible}
                                        onInvertSelection={
                                            invertVisibleSelection
                                        }
                                        onSelectAll={selectAllVisible}
                                        status={currentSelectionStatus}
                                    />
                                </Box>
                                {/* The mock puts its "⚙ Display" button at the
                                    right end of the same toolbar action row
                                    (`margin-left:auto`). */}
                                <Box sx={{ml: "auto"}}>
                                    <DisplayOptionsMenu
                                        compactRows={compactRows}
                                        groupEpisodes={groupEpisodes}
                                        groupTorrentAndUsenet={
                                            groupTorrentAndUsenet
                                        }
                                        highlightRecent={highlightRecent}
                                        onToggleCompactRows={() =>
                                            setCompactRows(
                                                (current) => !current,
                                            )
                                        }
                                        onToggleGroupEpisodes={() =>
                                            setGroupEpisodes(
                                                (current) => !current,
                                            )
                                        }
                                        onToggleGroupTorrentAndUsenet={() =>
                                            setGroupTorrentAndUsenet(
                                                (current) => !current,
                                            )
                                        }
                                        onToggleHighlightRecent={() =>
                                            setHighlightRecent(
                                                (current) => !current,
                                            )
                                        }
                                        onToggleRefineSurface={
                                            toggleRefineSurface
                                        }
                                        refineSurfaceShown={refineSurfaceShown}
                                    />
                                </Box>
                            </Stack>
                        </Stack>
                    </Box>
                    <Stack
                        alignItems="flex-start"
                        direction={{xs: "column", sm: "row"}}
                        spacing={2}
                    >
                        <RefineSidebar
                            clearRange={clearRange}
                            collapsed={sidebarCollapsed}
                            drawerOpen={refineDrawerOpen}
                            filters={filters}
                            onClearAll={clearAllFilters}
                            onDrawerOpenChange={setRefineDrawerOpen}
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
                            <Table
                                // The row-density preference, advertised on
                                // the element that carries it. The density
                                // itself is descendant `sx` below (one rule
                                // for every body cell rather than a
                                // per-cell prop, so `ResultRow`'s
                                // memoization is untouched by it), which a
                                // jsdom component test cannot resolve
                                // through a specificity-ordered cascade;
                                // the rendered geometry is asserted in the
                                // browser instead, matching how
                                // `data-nesting-level`/`data-sort-direction`
                                // already expose row and header state here.
                                data-compact-rows={
                                    compactRows ? "true" : "false"
                                }
                                data-testid="search-results-table"
                                sx={(theme) => ({
                                    tableLayout: "fixed",
                                    width: "100%",
                                    "& tbody > tr > td": {
                                        paddingBottom: compactRows
                                            ? compactRowPaddingY
                                            : rowPaddingY,
                                        paddingTop: compactRows
                                            ? compactRowPaddingY
                                            : rowPaddingY,
                                    },
                                    // "Compact rows" tightens the row's own
                                    // controls proportionally as well as its
                                    // padding: the row checkbox and the
                                    // action/expand buttons are what
                                    // actually set the row's height at this
                                    // density, so trimming their vertical
                                    // padding is what makes the compact
                                    // table measurably shorter. Descendant
                                    // `sx` from this one `Table`, so
                                    // `DownloadActions.tsx` (a different
                                    // capability's file) is untouched and
                                    // `ResultRow`'s memoization is not
                                    // involved at all.
                                    ...(compactRows
                                        ? {
                                              "& tbody .MuiCheckbox-root": {
                                                  padding: "2px",
                                              },
                                              "& tbody .MuiButton-root": {
                                                  fontSize: "11.5px",
                                                  minHeight: 0,
                                                  paddingBottom: 0,
                                                  paddingTop: 0,
                                              },
                                              "& tbody .MuiChip-root": {
                                                  fontSize: "10.5px",
                                                  height: "18px",
                                              },
                                              '& tbody td[data-label="Actions"] .MuiStack-root':
                                                  {gap: "2px"},
                                          }
                                        : {}),
                                    "& td, & th": {fontSize: "12px"},
                                    '& [data-label="Title"]': {
                                        fontSize: "13px",
                                    },
                                    // FM-042 (ADR-0011, Option E): the
                                    // table never scrolls horizontally
                                    // and carries no `min-width` floor,
                                    // so at and above the stacking
                                    // breakpoint it is always exactly as
                                    // wide as its flex-layout box, with
                                    // the re-proportioned `<colgroup>`
                                    // below doing the work of keeping
                                    // every header legible. Below the
                                    // breakpoint the table renders as
                                    // unrelated stacked cards instead
                                    // (`RefineSidebar.tsx`'s shared
                                    // `useCompactRefineSurface()` moves
                                    // its docked/drawer branch to the
                                    // same threshold, so the sidebar and
                                    // the table switch layouts together).
                                    // The threshold itself -- legacy's
                                    // measured 767px stacking point,
                                    // `tables.less:91` -- is expressed as
                                    // the same raw pixel value (768)
                                    // passed to `theme.breakpoints.down`
                                    // here as `useCompactRefineSurface()`
                                    // passes to its own raw `down` call,
                                    // rather than through `theme.ts`'s
                                    // out-of-scope named `sm`/`md`
                                    // tokens, so the two branches switch
                                    // at the same computed width.
                                    [theme.breakpoints.down(768)]: {
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
                                        '& td[data-label="Title"]::before': {
                                            content: "none",
                                        },
                                    },
                                })}
                            >
                                {/* FM-042 (ADR-0011): re-proportioned from
                                        legacy's byte-for-byte-ported
                                        54/9/8/7/6.5/5.5/10 now that the
                                        `overflowX: "auto"` wrapper and its
                                        `TABLE_MIN_WIDTH` floor are gone --
                                        those ratios left the metadata
                                        columns with no slack once the table
                                        could be compressed below ~1320px.
                                        Measured against a real-browser
                                        render (see the handoff for the
                                        observed numbers) rather than
                                        implemented from ADR-0011's sketch
                                        unmeasured. Age's 9% (from that
                                        pass) was re-measured in a
                                        follow-up quickfix: even the widest
                                        realistic value the unbounded
                                        `ageInDays + "d"` backend format can
                                        produce this side of absurd
                                        (`9999d`, ~27 years) only needs
                                        ~67px against the 81px 9% resolved
                                        to at 1280x800, so it drops to 8%
                                        and the freed 1% goes to Title.
                                        Size's 9% was re-measured the same
                                        way and left alone: its own
                                        mathematical worst case
                                        (`999.99 GB` -- `formatResultSize`
                                        guarantees the numeric part never
                                        reaches 4 digits) needs ~89px
                                        against the 81px available, so it
                                        already has no real slack to give
                                        up. */}
                                <colgroup>
                                    <col style={{width: 40}} />
                                    <col style={{width: "35%"}} />
                                    <col style={{width: "11%"}} />
                                    <col style={{width: "11%"}} />
                                    <col style={{width: "9%"}} />
                                    <col style={{width: "11%"}} />
                                    <col style={{width: "8%"}} />
                                    <col style={{width: "15%"}} />
                                </colgroup>
                                <TableHead>
                                    {table
                                        .getHeaderGroups()
                                        .map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                <TableCell
                                                    data-label="Select"
                                                    padding="checkbox"
                                                    sx={(theme) => ({
                                                        backgroundColor:
                                                            STICKY_BACKGROUND,
                                                        // FM-042
                                                        // (ADR-0011):
                                                        // `border-collapse:
                                                        // collapse`
                                                        // (kept, so
                                                        // FM-041's inset
                                                        // recency stripe
                                                        // is undisturbed)
                                                        // means the
                                                        // table paints
                                                        // this row's
                                                        // border, which
                                                        // does not
                                                        // travel with a
                                                        // sticky `<th>`
                                                        // -- drawn as an
                                                        // inset
                                                        // `box-shadow`
                                                        // on the cell
                                                        // instead,
                                                        // verified
                                                        // against a real
                                                        // Chromium build
                                                        // to actually
                                                        // remain visible
                                                        // while pinned.
                                                        boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`,
                                                        position: "sticky",
                                                        py: HEADER_CELL_PADDING_Y,
                                                        top: toolbarHeight,
                                                        zIndex: HEADER_STICKY_Z_INDEX,
                                                    })}
                                                >
                                                    <SelectionMenu
                                                        idPrefix="header"
                                                        onDeselectAll={
                                                            deselectAllVisible
                                                        }
                                                        onInvertSelection={
                                                            invertVisibleSelection
                                                        }
                                                        onSelectAll={
                                                            selectAllVisible
                                                        }
                                                        status={
                                                            currentSelectionStatus
                                                        }
                                                    />
                                                </TableCell>
                                                {headerGroup.headers.map(
                                                    (header) => {
                                                        const isTitle =
                                                            header.column.id ===
                                                            "title";
                                                        const label =
                                                            typeof header.column
                                                                .columnDef
                                                                .header ===
                                                            "string"
                                                                ? header.column
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
                                                                key={header.id}
                                                                sx={(
                                                                    theme,
                                                                ) => ({
                                                                    backgroundColor:
                                                                        STICKY_BACKGROUND,
                                                                    // FM-042 (ADR-0011): see the
                                                                    // checkbox header cell's comment
                                                                    // above for why this is a
                                                                    // `box-shadow` rather than the
                                                                    // collapsed table's own border.
                                                                    boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`,
                                                                    overflow:
                                                                        "hidden",
                                                                    position:
                                                                        "sticky",
                                                                    px: 1,
                                                                    py: HEADER_CELL_PADDING_Y,
                                                                    textOverflow:
                                                                        "ellipsis",
                                                                    top: toolbarHeight,
                                                                    whiteSpace:
                                                                        "nowrap",
                                                                    zIndex: HEADER_STICKY_Z_INDEX,
                                                                })}
                                                            >
                                                                {header.isPlaceholder ? null : (
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
                                                                            alignItems:
                                                                                "center",
                                                                            color: HEADER_LABEL_COLOR,
                                                                            // A native `<button>` keeps its
                                                                            // intrinsic shrink-to-fit width
                                                                            // even with `display: flex`
                                                                            // (buttons never stretch to fill
                                                                            // their containing block the way
                                                                            // a `<div>` does), so a bare
                                                                            // `textAlign` here has nothing to
                                                                            // act on and the label just hugs
                                                                            // the cell's left edge regardless
                                                                            // of alignment -- the fixed
                                                                            // `width: "100%"` plus
                                                                            // `justifyContent` below is what
                                                                            // actually right-aligns a
                                                                            // non-Title header against its
                                                                            // column's right-aligned body
                                                                            // content.
                                                                            display:
                                                                                "flex",
                                                                            flexShrink: 0,
                                                                            fontSize:
                                                                                HEADER_LABEL_FONT_SIZE,
                                                                            fontWeight:
                                                                                HEADER_LABEL_FONT_WEIGHT,
                                                                            justifyContent:
                                                                                isTitle
                                                                                    ? "flex-start"
                                                                                    : "flex-end",
                                                                            letterSpacing:
                                                                                HEADER_LABEL_LETTER_SPACING,
                                                                            maxWidth:
                                                                                "100%",
                                                                            minWidth: 0,
                                                                            overflow:
                                                                                "hidden",
                                                                            // The mock's Title sort
                                                                            // button is `padding:0
                                                                            // 6px`; every other
                                                                            // column's is `0 4px`
                                                                            // (`uimock/NZBHydra
                                                                            // Search.dc.html:270-277`).
                                                                            px: isTitle
                                                                                ? "6px"
                                                                                : "4px",
                                                                            textOverflow:
                                                                                "ellipsis",
                                                                            textTransform:
                                                                                "uppercase",
                                                                            whiteSpace:
                                                                                "nowrap",
                                                                            width: "100%",
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
                                                                )}
                                                            </TableCell>
                                                        );
                                                    },
                                                )}
                                                <TableCell
                                                    align="right"
                                                    data-label="Actions"
                                                    sx={(theme) => ({
                                                        backgroundColor:
                                                            STICKY_BACKGROUND,
                                                        // FM-042 (ADR-0011): see the
                                                        // checkbox header cell's comment
                                                        // above for why this is a
                                                        // `box-shadow` rather than the
                                                        // collapsed table's own border.
                                                        boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`,
                                                        color: HEADER_LABEL_COLOR,
                                                        fontSize:
                                                            HEADER_LABEL_FONT_SIZE,
                                                        fontWeight:
                                                            HEADER_LABEL_FONT_WEIGHT,
                                                        letterSpacing:
                                                            HEADER_LABEL_LETTER_SPACING,
                                                        overflow: "hidden",
                                                        position: "sticky",
                                                        py: HEADER_CELL_PADDING_Y,
                                                        textOverflow:
                                                            "ellipsis",
                                                        textTransform:
                                                            "uppercase",
                                                        top: toolbarHeight,
                                                        whiteSpace: "nowrap",
                                                        zIndex: HEADER_STICKY_Z_INDEX,
                                                    })}
                                                >
                                                    Actions
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableHead>
                                <TableBody>
                                    {groups.flatMap((group, groupIndex) =>
                                        group.duplicateGroups.flatMap(
                                            (duplicates, duplicateIndex) => {
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
                                                    .map((result, index) => {
                                                        const nestingLevel =
                                                            (duplicateIndex > 0
                                                                ? 1
                                                                : 0) +
                                                            (index > 0 ? 1 : 0);
                                                        const isNewGroup =
                                                            groupIndex > 0 &&
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
                                                                recent={
                                                                    highlightRecent &&
                                                                    isRecentResult(
                                                                        result,
                                                                    )
                                                                }
                                                                result={result}
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
                                                    });
                                            },
                                        ),
                                    )}
                                </TableBody>
                            </Table>
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
        value: (result) => formatResultSize(result.size),
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
    recent,
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
    // Already resolved to a primitive by the parent (which is iterating these
    // rows anyway), so the memoized row neither recomputes an age per render
    // nor loses its `memo` comparison to a fresh object identity.
    recent: boolean;
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
            {/* The recency flag's left-edge accent stripe (the mock's
                `box-shadow:inset 3px 0 0 {{ r.stripe }}`), drawn on the row's
                first cell because `border-collapse: collapse` suppresses a
                `<tr>`'s own box shadow, and as an inset shadow rather than a
                border so it consumes no layout width. */}
            <TableCell
                data-label="Select"
                padding="checkbox"
                sx={{boxShadow: recent ? recentRowStripe : undefined}}
            >
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
                            // The recency flag's second, independent property:
                            // the age column's accent-teal text color (the
                            // mock's `ageColor: isNew ? ACC_HI : ...`, read
                            // from the theme as `primary.light` so the
                            // `dark-dyschromatopsia` variant composes with it).
                            // Only the flagged state is styled -- an unflagged
                            // row keeps exactly the color it had before this
                            // task, so the default rendering is unchanged.
                            color:
                                recent && column.id === "epoch"
                                    ? "primary.light"
                                    : undefined,
                            // FM-042 (ADR-0011, sub-decision E-title (i)):
                            // the modern spelling of legacy's `.text-break`
                            // (`type.less:31-34`'s `word-wrap: break-word;
                            // word-break: break-word`, applied to the title
                            // cell by `search-result.html:3`). Release
                            // titles are dot-separated with no spaces, so
                            // `white-space: normal` alone would not wrap
                            // them -- `overflow-wrap: anywhere` is what lets
                            // a long, unbroken title wrap across multiple
                            // lines instead of spilling into the next
                            // column. Not ellipsis and not a clamp: both
                            // were presented and neither was selected: the
                            // owner's stated reason is that this component
                            // has no `<Tooltip>`/`title=` recovery
                            // affordance anywhere, so hiding a title's tail
                            // would have no way back.
                            overflowWrap: isTitle ? "anywhere" : undefined,
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

// The tri-state select-all checkbox's small square control (F-SEARCH-GROUP-
// SELECTION, FM-046), matching the mock's own `toggleAll` button: 17x17px, a
// 5px border radius, a filled `primary.main` square with a check mark when
// checked, a dash when indeterminate, and a transparent square with a
// neutral border when unchecked. Implemented through MUI `Checkbox`'s
// `icon`/`checkedIcon`/`indeterminateIcon` props plus `sx` sizing on the
// control itself (ADR-0002: restyle the existing MUI control, never a
// bespoke one) -- the underlying native `<input type="checkbox">`, the
// element Testing Library's and Playwright's `role="checkbox"` queries
// resolve to, is sized to fill this 17x17 control exactly, so its own
// rendered bounding box is what this task's visual contract measures.
const selectAllSquareSx = {
    alignItems: "center",
    borderRadius: "5px",
    display: "flex",
    fontSize: "11px",
    height: 17,
    justifyContent: "center",
    lineHeight: 1,
    width: 17,
} as const;

function SelectAllUncheckedIcon() {
    return (
        <Box
            sx={{
                ...selectAllSquareSx,
                border: `1.5px solid ${checkboxUncheckedBorder}`,
            }}
        />
    );
}

function SelectAllCheckedIcon() {
    return (
        <Box
            sx={{
                ...selectAllSquareSx,
                bgcolor: "primary.main",
                border: "1.5px solid",
                borderColor: "primary.main",
                color: "primary.contrastText",
            }}
        >
            ✓
        </Box>
    );
}

function SelectAllIndeterminateIcon() {
    return (
        <Box
            sx={{
                ...selectAllSquareSx,
                bgcolor: "primary.main",
                border: "1.5px solid",
                borderColor: "primary.main",
                color: "primary.contrastText",
            }}
        >
            –
        </Box>
    );
}

// Tri-state select-all checkbox plus an adjacent caret opening a `role="menu"`
// with Select all / Deselect all / Invert selection (FM-040), replacing the
// former flat row of three toolbar buttons. Each menu entry produces exactly
// the same `selectVisibleResults` outcome the old button produced. Rendered
// twice with different `idPrefix`es: once in the table header (visible at
// `sm` and up, where `thead` renders), and once in the toolbar's
// `results-selection-actions` region (visible only below `sm`, where the
// responsive table hides `thead` entirely) so bulk selection stays reachable
// at every viewport. Both copies share the same selection state/callbacks
// from the parent, so they always agree.
function SelectionMenu({
    idPrefix,
    onDeselectAll,
    onInvertSelection,
    onSelectAll,
    status,
}: {
    idPrefix: "header" | "toolbar";
    onDeselectAll: () => void;
    onInvertSelection: () => void;
    onSelectAll: () => void;
    status: SelectionStatus;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const close = () => setAnchorEl(null);
    const choose = (action: () => void) => {
        action();
        close();
    };
    const suffix = idPrefix === "toolbar" ? " (mobile)" : "";
    return (
        <Stack
            alignItems="center"
            data-testid={`${idPrefix}-selection-menu`}
            direction="row"
        >
            <Checkbox
                checked={status === "all"}
                checkedIcon={<SelectAllCheckedIcon />}
                // FM-053 (ADR-0013): kept, deliberately, and no longer an
                // affordance deletion. FM-052 dispositioned this control
                // `fails 2.4.7` because `disableRipple` left it with no
                // indicator at all -- the only property that changed was the
                // `opacity: 0` native input overlay's own `outline-style`.
                // ADR-0013's accepted Option A gives the `SwitchBase` family an
                // authored `&.Mui-focusVisible` ring on the visible root
                // instead (`app/theme.ts`, `MuiCheckbox`), which is the
                // indicator this control now renders and which the ripple
                // never was. Removing `disableRipple` would reinstate a
                // ~38px pulsating ripple on this deliberately flat 17x17
                // `p: 0` square (FM-046) and would measure 1.19:1-2.38:1
                // anyway, so it is replaced rather than restored -- the second
                // of the two options FM-053's Acceptance allows.
                disableRipple
                icon={<SelectAllUncheckedIcon />}
                indeterminate={status === "some"}
                indeterminateIcon={<SelectAllIndeterminateIcon />}
                inputProps={{
                    "aria-label": `Select all visible results${suffix}`,
                }}
                onChange={(event) =>
                    event.target.checked ? onSelectAll() : onDeselectAll()
                }
                size="small"
                sx={{
                    borderRadius: "5px",
                    height: 17,
                    p: 0,
                    width: 17,
                    "&:hover": {backgroundColor: "transparent"},
                }}
            />
            <Button
                aria-expanded={open ? "true" : undefined}
                aria-haspopup="menu"
                aria-label={`Selection options${suffix}`}
                onClick={(event) => setAnchorEl(event.currentTarget)}
                size="small"
                sx={{color: "text.secondary", minWidth: 0, px: 0.5}}
            >
                ▾
            </Button>
            <Menu
                anchorEl={anchorEl}
                onClose={close}
                open={open}
                slotProps={{
                    list: {
                        sx: {
                            "& .MuiMenuItem-root": {
                                borderRadius: "6px",
                                fontSize: "12.5px",
                                mx: "4px",
                                py: "8px",
                            },
                        },
                    },
                    paper: {
                        sx: {
                            backgroundColor: controlSurface,
                            backgroundImage: "none",
                            border: `1px solid ${popoverBorderColor}`,
                            borderRadius: popoverRadius,
                            boxShadow: popoverShadow,
                        },
                    },
                }}
            >
                <MenuItem onClick={() => choose(onSelectAll)}>
                    Select all
                </MenuItem>
                <MenuItem onClick={() => choose(onDeselectAll)}>
                    Deselect all
                </MenuItem>
                <MenuItem onClick={() => choose(onInvertSelection)}>
                    Invert selection
                </MenuItem>
            </Menu>
        </Stack>
    );
}

// Every display preference for the results list, gathered into the mock's own
// "⚙ Display" popover (FM-041): the two grouping toggles this toolbar used to
// render inline (relocated with their labels and behavior unchanged), the two
// new opt-in row treatments, and a second entry point to the refine surface's
// existing visibility affordance.
//
// A `Popover` of real `Checkbox` controls rather than a `role="menu"` of
// `menuitem`s: every entry is a persistent on/off preference, so `checkbox`
// semantics (an accessible name plus a queryable checked state) describe it
// correctly, where `menuitem` would not. The toggle still advertises the
// popover with `aria-haspopup`/`aria-expanded`.
function DisplayOptionsMenu({
    compactRows,
    groupEpisodes,
    groupTorrentAndUsenet,
    highlightRecent,
    onToggleCompactRows,
    onToggleGroupEpisodes,
    onToggleGroupTorrentAndUsenet,
    onToggleHighlightRecent,
    onToggleRefineSurface,
    refineSurfaceShown,
}: {
    compactRows: boolean;
    groupEpisodes: boolean;
    groupTorrentAndUsenet: boolean;
    highlightRecent: boolean;
    onToggleCompactRows: () => void;
    onToggleGroupEpisodes: () => void;
    onToggleGroupTorrentAndUsenet: () => void;
    onToggleHighlightRecent: () => void;
    onToggleRefineSurface: () => void;
    // "Is the refine surface currently shown", resolved by the parent from
    // whichever per-viewport mechanism is live, so this entry's checked state
    // can never disagree with the live `refine-sidebar-toggle`'s
    // `aria-expanded`.
    refineSurfaceShown: boolean;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const entries: {checked: boolean; label: string; onToggle: () => void}[] = [
        {
            checked: groupTorrentAndUsenet,
            label: "Group torrent and Usenet results",
            onToggle: onToggleGroupTorrentAndUsenet,
        },
        {
            checked: groupEpisodes,
            label: "Group TV episodes",
            onToggle: onToggleGroupEpisodes,
        },
        {
            checked: compactRows,
            label: "Compact rows",
            onToggle: onToggleCompactRows,
        },
        {
            checked: highlightRecent,
            label: "Highlight recent",
            onToggle: onToggleHighlightRecent,
        },
    ];
    return (
        <>
            <Button
                aria-expanded={open ? "true" : "false"}
                aria-haspopup="true"
                aria-label="Display options"
                data-testid="display-options-toggle"
                onClick={(event) =>
                    setAnchorEl(anchorEl ? null : event.currentTarget)
                }
                size="small"
                sx={{
                    backgroundColor: controlSurface,
                    border: `1px solid ${popoverBorderColor}`,
                    color: open ? "text.primary" : enabledSecondaryTextColor,
                    fontSize: "13px",
                    gap: "8px",
                    px: "13px",
                    py: "8px",
                }}
            >
                <Box aria-hidden="true" component="span">
                    ⚙
                </Box>
                Display
                <Box
                    aria-hidden="true"
                    component="span"
                    sx={{color: displayMenuCaptionColor, fontSize: "10px"}}
                >
                    {open ? "▲" : "▼"}
                </Box>
            </Button>
            <Popover
                anchorEl={anchorEl}
                anchorOrigin={{horizontal: "right", vertical: "bottom"}}
                onClose={() => setAnchorEl(null)}
                open={open}
                slotProps={{
                    paper: {
                        sx: {
                            backgroundColor: controlSurface,
                            backgroundImage: "none",
                            border: `1px solid ${popoverBorderColor}`,
                            borderRadius: displayMenuRadius,
                            boxShadow: displayMenuShadow,
                            maxWidth: "100%",
                        },
                    },
                }}
                transformOrigin={{horizontal: "right", vertical: "top"}}
            >
                <Box
                    data-testid="display-options"
                    sx={{
                        minWidth: displayMenuMinWidth,
                        p: displayMenuPadding,
                    }}
                >
                    <Typography
                        component="div"
                        sx={{
                            color: displayMenuCaptionColor,
                            fontSize: "10.5px",
                            fontWeight: 600,
                            letterSpacing: "0.6px",
                            padding: "4px 8px 8px",
                            textTransform: "uppercase",
                        }}
                    >
                        Display options
                    </Typography>
                    <FormGroup>
                        {entries.map((entry) => (
                            <DisplayOption
                                checked={entry.checked}
                                key={entry.label}
                                label={entry.label}
                                onToggle={entry.onToggle}
                            />
                        ))}
                        {/* The mock's own hairline before the refine-surface
                            entry, separating the row/grouping treatments from
                            the surrounding-layout one. */}
                        <Box
                            sx={{
                                backgroundColor: displayMenuDividerColor,
                                height: "1px",
                                mx: "4px",
                                my: "6px",
                            }}
                        />
                        {/* The only entry that closes the popover: below `sm`
                            the refine surface is a temporary `Drawer`, and
                            leaving this popover open behind it would stack two
                            overlays over the results (and hide the popover's
                            own entries from the accessibility tree). Closing
                            unconditionally keeps the behavior the same at
                            every viewport rather than viewport-dependent. */}
                        <DisplayOption
                            checked={refineSurfaceShown}
                            label="Show refine sidebar"
                            onToggle={() => {
                                onToggleRefineSurface();
                                setAnchorEl(null);
                            }}
                        />
                    </FormGroup>
                </Box>
            </Popover>
        </>
    );
}

// One popover entry, matching the mock's `<label>` + `<input type=checkbox>`
// shape: a 7px-radius row at `7px 8px` padding with a 9px gap.
function DisplayOption({
    checked,
    label,
    onToggle,
}: {
    checked: boolean;
    label: string;
    onToggle: () => void;
}) {
    return (
        <FormControlLabel
            control={
                <Checkbox checked={checked} onChange={onToggle} size="small" />
            }
            label={label}
            sx={{
                borderRadius: displayMenuItemRadius,
                gap: displayMenuItemGap,
                m: 0,
                px: displayMenuItemPaddingX,
                py: displayMenuItemPaddingY,
                "& .MuiFormControlLabel-label": {
                    color: displayMenuItemColor,
                    fontSize: displayMenuItemFontSize,
                },
                "& .MuiCheckbox-root": {p: 0},
                "& .MuiSvgIcon-root": {fontSize: "18px"},
            }}
        />
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
