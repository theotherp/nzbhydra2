import {Stack} from "@mui/material";
import type {ColumnDef} from "@tanstack/react-table";
import {
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {useWindowVirtualizer} from "@tanstack/react-virtual";
import {
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type {SearchResponse, SearchResult} from "../../../api/search";
import {ApiTransport} from "../../../api/transport";
import {SafeConfigContext} from "../../../bootstrap";
import {DialogContext} from "../../../components/dialogs/dialogs";
import {useCompactRefineSurface} from "../../../components/refine/RefineSurface";
import {ToastContext} from "../../../components/toasts/toasts";
import {
    configuredDownloaders,
    downloadSettings,
    type Downloader,
} from "../../../domain/downloads/actions";
import {createServerPreferences} from "../../../services/preferences/serverPreferences";
import {bootstrapBase} from "./DownloadActions";
import {RefineSidebar} from "./RefineSidebar";
import type {ExpandSlots} from "./ResultRow";
import {ResultsAlerts} from "./ResultsAlerts";
import {ResultsPagingFooter} from "./ResultsPagingFooter";
import type {VisibleRowDescriptor} from "./ResultsTable";
import {ResultsTable} from "./ResultsTable";
import {ResultsToolbar} from "./ResultsToolbar";
import type {SearchedCategory} from "./groupEpisodesHelp";
import {
    GROUP_EPISODES_HELP_MESSAGE,
    GROUP_EPISODES_HELP_TITLE,
    isGroupEpisodesHelpEligible,
    showGroupEpisodesHelpIfNeeded,
} from "./groupEpisodesHelp";
import type {
    NumericRange,
    QuickFilter,
    ResultFilters,
    ResultGroup,
} from "./resultTable";
import {
    activeFilterCount,
    blackHoleSlot,
    defaultFilters,
    duplicateGroupKey,
    filterResults,
    groupResults,
    indexerColorsFromSafeConfig,
    preselectedQuickFilters,
    quickFilterKey,
    quickFiltersFromSafeConfig,
    visibleGroupedResults,
} from "./resultTable";
import {isRecord} from "./storedChoices";
import {useResultDisplayChoices} from "./useResultDisplayChoices";
import {useResultSelection} from "./useResultSelection";

// FM-162. The table body is window-virtualized: only the rows near the
// viewport (plus `ROW_OVERSCAN` on each side) are mounted, and the space the
// unmounted rows would occupy is carried by two spacer `<tr>`s inside the
// same `<tbody>`.
//
// Spacer rows rather than the usual absolutely-positioned/transformed window:
// below 768px this exact `<tr>` is re-laid-out as a stacked card
// (`display: block`, its `<td>`s `display: flex` -- see the table's own `sx`
// below), and neither `position: absolute` nor a `transform` survives that
// switch. Two in-flow rows whose only job is to be tall work identically in
// both layouts, and they leave ADR-0011 intact: the document is still the only
// scroller, so the `<th>`s below stay natively viewport-sticky and no new
// scrolling ancestor is introduced.
//
// The estimate is only the seed for a row that has not been measured yet
// (`measureRowHeight` below replaces it with the row's real height as soon as
// it mounts); it is deliberately on the low side of a real default-density row
// so the first paint errs towards rendering one row too many rather than
// leaving a gap at the bottom of the viewport.
const ESTIMATED_ROW_HEIGHT = 44;
const ROW_OVERSCAN = 8;

// FM-162: above this many *available* results, "Load all results" asks first.
// A single search legitimately reports tens of thousands of available results,
// and loading them is an unbounded commitment on the server (every remaining
// page fetched) as well as in this component's state -- unlike "Load more",
// which is bounded by one page and therefore stays unguarded. The value is a
// judgement call rather than a measurement: a few hundred rows is still an
// ordinary, fast result set, so the prompt only appears once the request is
// clearly beyond what the user could have meant by a single click.
const LOAD_ALL_CONFIRMATION_THRESHOLD = 500;

export function SearchResults({
    data,
    episodeRequested = false,
    onLoadMore,
    onSaveSearch,
    savingSearch = false,
    searchedCategory,
    searchRequestId,
}: {
    data: SearchResponse;
    episodeRequested?: boolean;
    onLoadMore?: (loadAll: boolean) => Promise<void>;
    onSaveSearch?: () => Promise<void>;
    savingSearch?: boolean;
    // FM-162: the category the search was actually submitted for, resolved
    // against the category catalog by `SearchPage`. Only the group-episodes
    // help dialog's eligibility reads it -- see the effect below.
    searchedCategory?: SearchedCategory;
    searchRequestId?: number;
}) {
    // FM-159: the mount-time snapshot. It is the seed the `SafeConfigContext`
    // below falls back to when no provider is present, and -- deliberately --
    // the source the quick-filter reads below keep using: `quickFilters` and
    // `preselectedQuickFilters` seed per-search *selection* state, so making
    // them live would clobber a user's quick-filter selections the moment any
    // config is saved mid-session. That is a UX trade-off ADR-0017 does not
    // settle; every read that feeds rendering rather than selection state
    // uses `effectiveSafeConfig`.
    const safeConfig =
        window.__NZBHYDRA_BOOTSTRAP__ && isRecord(window.__NZBHYDRA_BOOTSTRAP__)
            ? window.__NZBHYDRA_BOOTSTRAP__.safeConfig
            : undefined;
    const quickFilters = useMemo(
        () => quickFiltersFromSafeConfig(safeConfig),
        [safeConfig],
    );
    // FM-082: legacy reads `HydraAuthService.getUserInfos().maySeeDetailsDl`
    // (`search-result.js:146`) to decide whether a row shows its external
    // links at all. The React equivalent is the bootstrap flag, read here from
    // the same `window.__NZBHYDRA_BOOTSTRAP__` object this component already
    // reads `safeConfig` from -- this component is not passed `BootstrapData`,
    // and its only caller (`SearchPage`) is outside this task's scope.
    const maySeeDetailsDl =
        isRecord(window.__NZBHYDRA_BOOTSTRAP__) &&
        window.__NZBHYDRA_BOOTSTRAP__.maySeeDetailsDl === true;
    // ADR-0017: the dereferer must come from the *live* safe configuration, so
    // saving a new one reaches the rendered links without a page reload. The
    // context's `undefined` means "no provider above me" (focused component
    // tests only), which falls back to the bootstrap seed above.
    const liveSafeConfig = useContext(SafeConfigContext);
    const effectiveSafeConfig =
        liveSafeConfig === undefined ? safeConfig : liveSafeConfig;
    const dereferer = isRecord(effectiveSafeConfig)
        ? effectiveSafeConfig.dereferer
        : undefined;
    // FM-096: same live-config read as `dereferer` above (ADR-0017), so a
    // colour saved in Config -> Indexers reaches already-rendered rows
    // without a reload. Memoized on `effectiveSafeConfig` so the map is
    // referentially stable across re-renders that don't change config,
    // which `ResultRow`'s `memo` depends on.
    const indexerColors = useMemo(
        () => indexerColorsFromSafeConfig(effectiveSafeConfig),
        [effectiveSafeConfig],
    );
    // FM-186: the enabled downloaders every row renders a send button for.
    // Live (ADR-0017) and memoized for the same two reasons as the colours
    // above -- a downloader enabled or removed in Config -> Downloading
    // reaches already-rendered rows without a reload, and `ResultRow`'s `memo`
    // needs one stable reference rather than the config object itself.
    const downloaders = useMemo(
        (): Downloader[] => configuredDownloaders(effectiveSafeConfig),
        [effectiveSafeConfig],
    );
    // FM-187: the black hole configuration every row's send-to-black-hole
    // button is gated on. Live and memoized for the same two reasons as
    // `downloaders` above -- a folder set in Config -> Downloading reaches
    // already-rendered rows, and `ResultRow`'s `memo` needs one stable
    // reference rather than the config object itself.
    const settings = useMemo(
        () => downloadSettings(effectiveSafeConfig),
        [effectiveSafeConfig],
    );
    // How many 28px send slots the Actions track has to hold: one per enabled
    // downloader, plus one for the black hole button when some *loaded* result
    // would render it. The slot is derived from `data.searchResults` rather
    // than the filtered rows so a refine filter never shifts the columns, and
    // from the results at all rather than the config alone because
    // `sendMagnetLinks` defaults to true (see `blackHoleSlot`).
    // Memoized because it walks every loaded result, and a search can hold
    // tens of thousands of them (`LOAD_ALL_CONFIRMATION_THRESHOLD`) while this
    // component re-renders on every scroll frame.
    const actionsSlotCount = useMemo(
        () =>
            downloaders.length +
            (blackHoleSlot(data.searchResults, settings) ? 1 : 0),
        [data.searchResults, downloaders.length, settings],
    );
    // FM-177 (ADR-0054): covers render at `searching.coverSize`, the width
    // Config -> Searching already owns ("Cover width", help text "when
    // enabled in display options"), read from the *live* config for the same
    // reason as `dereferer` above (ADR-0017). The fallback stands in for an
    // absent or nonsensical value, not for the YAML default, which stays 128.
    const coverWidth = useMemo(
        () => coverWidthFromSafeConfig(effectiveSafeConfig),
        [effectiveSafeConfig],
    );
    // One transport for every row's `API-SEARCH-NFO` request, rather than one
    // per rendered row.
    const transport = useMemo(() => new ApiTransport(bootstrapBase()), []);
    // FM-192 (ADR-0054): every choice that survives a search, and the one
    // effect that writes them all into the single
    // `hydra.search-results.table` payload.
    const {
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
    } = useResultDisplayChoices();
    // Recomputed from whatever results are currently loaded, so the
    // per-search reset below always selects every value of the search it is
    // resetting for.
    const filterDefaults = useMemo(
        () => defaultFilters(data.searchResults, quickFilters),
        [data.searchResults, quickFilters],
    );
    // FM-178: every `ResultFilters` field -- title, ranges, quick filters,
    // and the indexer/category/download-type selections -- is scoped to one
    // search's own results (a value typed or picked for one search's result
    // set is meaningless, or actively hides results, in the next one) and so
    // is never read from `choices`; this is the exact shape `clearAllFilters`
    // produces.
    const [filters, setFilters] = useState<ResultFilters>(() => ({
        ...filterDefaults,
        quickFilters: preselectedQuickFilters(safeConfig, quickFilters),
    }));
    // A new search's results carry their own values for every filter, so the
    // previous search's filters cannot be kept: a title or range typed for
    // one result set, or a selection scoped to it, is meaningless -- or
    // actively hides results -- against a different one.
    // This adjusts state during render -- React's documented pattern for
    // deriving state from a changed prop -- rather than in an effect, which
    // keeps it off the load-more path (paging keeps the same
    // `searchRequestId`, and a deliberate change must survive it) and avoids
    // painting one frame of results filtered by the stale values.
    const [lastSearchRequestId, setLastSearchRequestId] =
        useState(searchRequestId);
    if (lastSearchRequestId !== searchRequestId) {
        setLastSearchRequestId(searchRequestId);
        setFilters({
            ...filterDefaults,
            quickFilters: preselectedQuickFilters(safeConfig, quickFilters),
        });
    }
    // Below `sm` the refine surface is FM-045's temporary drawer rather than
    // the docked column, and its open state is a transient overlay state, not
    // a preference: it always starts closed and is deliberately absent from
    // the persisted `hydra.search-results.table` payload (see FM-045's
    // rationale in `components/refine/RefineSurface.tsx`). FM-041 moved the
    // state here -- and only the state, not its lifecycle -- so the
    // display-options "Show refine sidebar" entry can read and write whichever
    // of the two per-branch mechanisms is actually mounted.
    const [refineDrawerOpen, setRefineDrawerOpen] = useState(false);
    // The same branch decision the refine surface itself makes, from the one
    // shared definition of it (`C-REFINE-SURFACE`, which owns both branches
    // since FM-136), so the entry can never disagree with the live
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
        // FM-192: `setSidebarCollapsed` now arrives from
        // `useResultDisplayChoices` rather than from a `useState` call the
        // lint rule can see, so it has to be named here. It is the same
        // referentially stable setter, so this callback's identity still
        // changes only with `refineSurfaceCompact`.
    }, [refineSurfaceCompact, setSidebarCollapsed]);
    const [expandedTitles, setExpandedTitles] = useState<Set<string>>(
        new Set(),
    );
    const [expandedDuplicates, setExpandedDuplicates] = useState<Set<string>>(
        new Set(),
    );
    const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
    const [pagingLoading, setPagingLoading] = useState(false);
    const [pagingError, setPagingError] = useState<string>();
    const [pagingExhausted, setPagingExhausted] = useState(false);
    const dialogs = useContext(DialogContext);
    const toasts = useContext(ToastContext);
    const groupEpisodesHelpChecked = useRef(false);
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
    // FM-176: with the option off there is no control that could collapse an
    // expanded duplicate group again, so no group may stay expanded. The
    // effect below clears the state itself; this keeps the very render in
    // which the option is switched off consistent with it.
    const effectiveExpandedDuplicates = showDuplicateControls
        ? expandedDuplicates
        : NO_EXPANDED_DUPLICATES;
    const visibleResults = useMemo(
        () =>
            visibleGroupedResults(
                groups,
                expandedTitles,
                effectiveExpandedDuplicates,
            ),
        [effectiveExpandedDuplicates, expandedTitles, groups],
    );
    // FM-150: the shape of every row the table body is about to render,
    // derived once instead of inside the JSX, because the expand-control width
    // each row reserves is a property of the whole rendered set (see
    // `expandSlots` below) and cannot be decided row by row.
    const rowDescriptors = useMemo(
        () =>
            visibleRowDescriptors(
                groups,
                expandedTitles,
                effectiveExpandedDuplicates,
                showDuplicateControls,
            ),
        [
            effectiveExpandedDuplicates,
            expandedTitles,
            groups,
            showDuplicateControls,
        ],
    );
    // FM-150/FM-176: which of the two positional expand-control slots the
    // current render reserves -- a slot exists as soon as one visible row
    // carries that control, and every other row spends a spacer on it, so a
    // title at a given nesting level always starts at the same x. When no row
    // can expand anything neither slot exists and nothing is reserved at all.
    // Computed here, once, because only the parent sees every rendered row.
    const titleSlot = rowDescriptors.some((row) => row.showTitleExpand);
    const duplicateSlot = rowDescriptors.some((row) => row.showDuplicateExpand);
    const expandSlots = useMemo<ExpandSlots>(
        () => ({duplicate: duplicateSlot, title: titleSlot}),
        [duplicateSlot, titleSlot],
    );
    // FM-162: the window virtualizer over `rowDescriptors`. `count` is the
    // whole visible row set -- selection, grouping, expansion and sorting all
    // keep operating on that full list (see `visibleResultsRef` below), so
    // scrolling a row out of the rendered window changes nothing about it
    // except that its DOM node is gone.
    //
    // `scrollMargin` is where the `<tbody>` starts in the document; without it
    // the virtualizer would treat the page's own scroll offset as an offset
    // into the row list and render the wrong window. It is measured rather
    // than assumed -- the alerts, the sticky toolbar and the search form above
    // this table all change height -- by the `listOffset` layout effect below.
    const resultsRootRef = useRef<HTMLDivElement | null>(null);
    const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);
    const [listOffset, setListOffset] = useState(0);
    const virtualizer = useWindowVirtualizer({
        count: rowDescriptors.length,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        // Keyed by result id, not index, so a row's measured height follows
        // the row through a re-sort, a filter change or an expansion instead
        // of staying with whatever now occupies that position.
        getItemKey: (index) =>
            rowDescriptors[index]?.result.searchResultId ?? index,
        measureElement: measureRowHeight,
        overscan: ROW_OVERSCAN,
        scrollMargin: listOffset,
    });
    const virtualRows = virtualizer.getVirtualItems();
    // The two spacer heights. `item.start` is measured from the document, so
    // the top spacer is the distance from the `<tbody>`'s own start to the
    // first rendered row; `getTotalSize()` is already relative to the same
    // origin, so the bottom spacer is what is left after the last one.
    const spacerHeightTop =
        virtualRows.length > 0 ? virtualRows[0].start - listOffset : 0;
    const spacerHeightBottom =
        virtualRows.length > 0
            ? virtualizer.getTotalSize() -
              (virtualRows[virtualRows.length - 1].end - listOffset)
            : 0;
    // FM-192: the selection cluster, called here rather than where `selected`
    // itself was declared -- it is defined against the visible rows and pruned
    // against the filtered ones, so this is the first point at which both of
    // its inputs exist.
    const {
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
    } = useResultSelection({
        results: data.searchResults,
        visibleResults,
    });
    // The two latest-value refs the hook's handlers read, written here during
    // render exactly as they were before FM-192 -- see `useResultSelection`'s
    // note on why the writes did not move with them.
    visibleResultsRef.current = visibleResults;
    lastSelectedIdRef.current = lastSelectedId;
    const handleDownloaded = useCallback((resultId: string) => {
        setDownloadedIds((current) => new Set([...current, resultId]));
    }, []);
    const handleToggleTitleExpansion = useCallback((key: string) => {
        setExpandedTitles((current) => toggleSet(current, key));
    }, []);
    const handleToggleDuplicateExpansion = useCallback((key: string) => {
        setExpandedDuplicates((current) => toggleSet(current, key));
    }, []);

    // FM-176: switching the option off drops every duplicate expansion, so no
    // group is left expanded without a control to collapse it again. Switching
    // it back on therefore starts from the collapsed state, matching legacy,
    // where the triggers simply were not rendered.
    useEffect(() => {
        if (!showDuplicateControls) {
            setExpandedDuplicates((current) =>
                current.size === 0 ? current : new Set(),
            );
        }
    }, [showDuplicateControls]);

    useEffect(() => {
        const filteredIds = new Set(
            filteredResults.map((result) => result.searchResultId),
        );
        setSelected((current) => {
            const kept = [...current].filter((id) => filteredIds.has(id));
            // The common case by far -- a filter change that prunes nothing
            // (and every re-run for a selection that was already inside the
            // filtered set). Returning the *same* Set lets React bail out of
            // the update instead of re-rendering the whole results tree with
            // an identically-populated new one, which also keeps every
            // `selected`-derived memo below (`DownloadActions`' results, the
            // selection status) from being invalidated for nothing.
            return kept.length === current.size ? current : new Set(kept);
        });
        // FM-192: `setSelected` now arrives from `useResultSelection` rather
        // than from a `useState` call the lint rule can see, so it has to be
        // named here. It is the same referentially stable setter, so this
        // effect still re-runs only when `filteredResults` changes.
    }, [filteredResults, setSelected]);

    useEffect(() => {
        setPagingLoading(false);
        setPagingError(undefined);
        setPagingExhausted(false);
    }, [searchRequestId]);

    // FM-091: legacy's one-time "Sorting of TV episodes" help dialog. Guarded
    // by a ref rather than the server flag alone so a load that keeps this
    // component mounted across several eligible searches (the normal case --
    // `SearchPage` never remounts it) issues at most one read and shows at
    // most one dialog, matching `StartupChecks.tsx`'s own `started` ref
    // precedent for a once-per-load check.
    useEffect(() => {
        if (groupEpisodesHelpChecked.current || dialogs === null) {
            return;
        }
        if (
            !isGroupEpisodesHelpEligible({
                episodeRequested,
                groupEpisodes,
                searchedCategory,
            })
        ) {
            return;
        }
        groupEpisodesHelpChecked.current = true;
        void showGroupEpisodesHelpIfNeeded({
            preferences: createServerPreferences(transport),
            show: () =>
                dialogs
                    .confirm({
                        confirmLabel: "OK",
                        message: GROUP_EPISODES_HELP_MESSAGE,
                        testId: "group-episodes-help-dialog",
                        title: GROUP_EPISODES_HELP_TITLE,
                        variant: "acknowledge",
                    })
                    .then(() => undefined),
        });
    }, [dialogs, episodeRequested, groupEpisodes, searchedCategory, transport]);

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
    // The sticky element is `results-toolbar` itself (since FM-055 the whole
    // consolidated region: the summary/paging/display row and the single
    // `results-bulk-actions` row), not its individual children. This is a
    // `position: sticky` CSS requirement, not
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
    //
    // FM-055 additionally feeds this measured height to the docked
    // `refine-sidebar`, which pins itself directly beneath the same toolbar.
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const [toolbarHeight, setToolbarHeight] = useState(0);
    const hasResults = data.searchResults.length > 0;
    // FM-055 review fix: a response can report every loaded result rejected
    // (`numberOfRejectedResults > 0` while `searchResults` is empty), and
    // `numberOfAvailableResults` -- which includes rejected items server-side
    // -- is then `> 0` too, so neither the "no results" Alert (gated on
    // `numberOfAvailableResults === 0`) nor the table renders. Without this,
    // the rejection breakdown that now lives only in the toolbar summary
    // would be completely unreachable in exactly the state it matters most.
    const hasRejectedResults = data.numberOfRejectedResults > 0;
    // FM-055: the toolbar also renders with no loaded results whenever the
    // page owns paging controls, because "Load more"/"Load all results" moved
    // into it from their former standalone row. A response can legitimately
    // report more available results while carrying none itself (everything
    // loaded so far rejected, for instance), and losing the continuation
    // controls in that state would be a capability regression. Only row 1's
    // paging controls render then: there is nothing to summarize, display, or
    // act on yet. The same is true of the rejection count/breakdown itself:
    // it must stay reachable even with nothing else to show in row 1.
    const showToolbar =
        hasResults || onLoadMore !== undefined || hasRejectedResults;
    // The count of loaded results the active refine filters currently hide.
    const filteredOutCount = data.searchResults.length - filteredResults.length;
    // The pre-existing ">"-prefix rule: at least one indexer reports more
    // results whose total it cannot count, so `numberOfAvailableResults` is a
    // lower bound rather than the total.
    const totalResultsUnknown =
        hasMoreResults &&
        data.indexerSearchMetaDatas.some(
            (indexer) => indexer.totalResultsKnown === false,
        );
    // Legacy drops the "of N results" clause once everything is loaded
    // ("Loaded all N results", `search-results.html:183-185`); the same rule
    // decides whether the "(N available)" clause renders here.
    const moreResultsAvailable = hasMoreResults || hasRemainingKnownResults;
    // The count phrase the summary renders inside its "(N available)" clause,
    // hoisted so the load-all confirmation below can name exactly the same
    // number the user is looking at rather than recomputing it.
    const availableResultsPhrase = `${totalResultsUnknown ? ">" : ""}${
        data.numberOfAvailableResults
    }`;
    // FM-162: "Load all results" fetches every remaining page in one commit,
    // which is the one paging action whose cost the user cannot see in
    // advance. Above `LOAD_ALL_CONFIRMATION_THRESHOLD` it therefore asks
    // first, through `C-DIALOG-SERVICE` (the same confirmation service the
    // rest of the app confirms through), naming exactly the count the toolbar
    // summary beside the button already shows -- ">"-prefixed when at least
    // one indexer cannot count its remaining results. Dismissing leaves the
    // table untouched: nothing is requested and no paging state changes.
    // "Load more" stays unguarded -- it loads one bounded page.
    const requestLoadAll = async () => {
        if (!onLoadMore || pagingLoading || !pagingAvailable) {
            return;
        }
        if (
            dialogs !== null &&
            data.numberOfAvailableResults > LOAD_ALL_CONFIRMATION_THRESHOLD
        ) {
            const answer = await dialogs.confirm({
                confirmLabel: "Load all results",
                message: `This search reports ${availableResultsPhrase} results. Loading all of them can take a while and makes the results table much longer.`,
                testId: "results-load-all-confirmation",
                title: "Load all results?",
            });
            if (answer !== "confirmed") {
                return;
            }
        }
        await requestContinuation(true);
    };
    // FM-181: how many refine dimensions are active, for the phone toolbar's
    // badge. The same function `RefineSidebar` disables its "Clear all" on.
    const activeFilters = useMemo(
        () => activeFilterCount(filters, filterDefaults),
        [filterDefaults, filters],
    );
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
        // The toolbar's own text carries the "N of M loaded / N filtered / N
        // selected" counters, so the `MutationObserver` below fires on every
        // checkbox click and every filter commit -- and `measure` reads
        // layout, which forces a synchronous reflow each time. Coalescing
        // through one animation frame per burst keeps the re-measure (the
        // `<Select>` case the observer exists for) without paying a reflow
        // per counter update. Same shape as `ConfigNav.tsx`'s scroll
        // handler.
        let frame = 0;
        const scheduleMeasure = () => {
            if (typeof requestAnimationFrame === "undefined") {
                measure();
                return;
            }
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
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
        // The action row's downloader/category `<Select>`s
        // populate asynchronously (an API fetch resolves after mount) and
        // change only their *text content*, not necessarily a size
        // `ResizeObserver` reports before the fetch settles -- real-browser
        // verification caught the header offset undershooting for exactly
        // this reason. A `MutationObserver` re-measures on any DOM change
        // within the toolbar regardless of cause, which is a more direct,
        // deterministic fix than guessing a settle delay.
        let mutationObserver: MutationObserver | undefined;
        if (typeof MutationObserver !== "undefined") {
            mutationObserver = new MutationObserver(scheduleMeasure);
            mutationObserver.observe(node, {
                characterData: true,
                childList: true,
                subtree: true,
            });
        }
        const cancelFrame = () => {
            if (typeof cancelAnimationFrame !== "undefined") {
                cancelAnimationFrame(frame);
            }
        };
        if (typeof ResizeObserver === "undefined") {
            return () => {
                cancelled = true;
                cancelFrame();
                mutationObserver?.disconnect();
            };
        }
        const resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(node);
        return () => {
            cancelled = true;
            cancelFrame();
            mutationObserver?.disconnect();
            resizeObserver.disconnect();
        };
        // `showToolbar` re-runs this the moment the toolbar first mounts
        // (search results loading in after an initial empty render), which
        // a `[]`-only dependency array would miss entirely. `hasResults` is
        // a further dependency because the toolbar can mount with paging
        // controls only and gain both of its full rows afterwards.
    }, [hasResults, showToolbar]);
    // FM-162: where the `<tbody>` sits in the document, which is the
    // virtualizer's `scrollMargin`. Measured after layout and kept in sync
    // through a `ResizeObserver` on the whole results region, because
    // everything that can push the table down the page -- the indexer/paging
    // alerts above it, the sticky toolbar's own wrapping at narrow widths,
    // the refine sidebar's collapse -- lives inside it. A `ResizeObserver`
    // also covers viewport resizes, since the region's width changes with
    // them; it is unavailable in the jsdom component-test environment, where
    // the initial measurement is enough (nothing resizes there).
    useLayoutEffect(() => {
        const body = tableBodyRef.current;
        const root = resultsRootRef.current;
        if (!body) {
            return;
        }
        let cancelled = false;
        const measure = () => {
            if (cancelled) {
                return;
            }
            const top = Math.round(
                body.getBoundingClientRect().top +
                    (typeof window === "undefined" ? 0 : window.scrollY),
            );
            // Only a real move re-renders: the observer below fires on every
            // height change of the results region, including the ones this
            // table's own row measurements cause.
            setListOffset((current) => (current === top ? current : top));
        };
        measure();
        if (typeof ResizeObserver === "undefined" || !root) {
            return () => {
                cancelled = true;
            };
        }
        let frame = 0;
        const scheduleMeasure = () => {
            if (typeof requestAnimationFrame === "undefined") {
                measure();
                return;
            }
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        const observer = new ResizeObserver(scheduleMeasure);
        observer.observe(root);
        return () => {
            cancelled = true;
            if (typeof cancelAnimationFrame !== "undefined") {
                cancelAnimationFrame(frame);
            }
            observer.disconnect();
        };
        // Re-runs when the table first mounts (or unmounts), which is when
        // `tableBodyRef` becomes observable at all.
    }, [hasResults]);
    // FM-162: hands every mounted row to the virtualizer for measurement.
    //
    // The usual shape -- `ref={virtualizer.measureElement}` on each rendered
    // element -- is unavailable here: `ResultRow` is a `memo`ized component
    // that this task must not change, and it renders the `<tr>` itself. So the
    // rows are collected from the `<tbody>` after the commit instead, tagged
    // with the `data-index` the virtualizer reads back, and handed over. This
    // is the library's own public `measureElement` (its `ResizeObserver`, its
    // scroll-offset compensation -- which is what keeps the scrollbar from
    // jumping when an estimated row turns out to be taller), only called from
    // the parent rather than through a ref.
    //
    // Deliberately without a dependency array: it must run after every commit
    // that can change which rows are mounted or how tall they are, and the
    // work is bounded by the rendered window (a few dozen nodes), not by the
    // result count.
    useLayoutEffect(() => {
        const body = tableBodyRef.current;
        if (!body) {
            return;
        }
        const rows = body.querySelectorAll<HTMLTableRowElement>(
            'tr[data-testid="search-result-row"]',
        );
        virtualRows.forEach((item, position) => {
            const element = rows[position];
            if (!element) {
                return;
            }
            element.dataset.index = String(item.index);
            virtualizer.measureElement(element);
        });
        // Drops rows that have since left the DOM from the virtualizer's own
        // element cache.
        virtualizer.measureElement(null);
    });
    return (
        <Stack
            data-testid="search-results"
            ref={resultsRootRef}
            spacing={2}
            sx={{mt: 4}}
        >
            <ResultsAlerts
                allIndexersFailed={allIndexersFailed}
                data={data}
                hasInvalidPagingCursor={hasInvalidPagingCursor}
                pagingError={pagingError}
            />
            {showToolbar && (
                <ResultsToolbar
                    activeFilters={activeFilters}
                    availableResultsPhrase={availableResultsPhrase}
                    compactRows={compactRows}
                    currentSelectionStatus={currentSelectionStatus}
                    data={data}
                    deselectAllVisible={deselectAllVisible}
                    dialogs={dialogs}
                    effectiveSafeConfig={effectiveSafeConfig}
                    filteredOutCount={filteredOutCount}
                    filteredResults={filteredResults}
                    groupEpisodes={groupEpisodes}
                    groupTorrentAndUsenet={groupTorrentAndUsenet}
                    hasRejectedResults={hasRejectedResults}
                    hasResults={hasResults}
                    highlightRecent={highlightRecent}
                    invertVisibleSelection={invertVisibleSelection}
                    moreResultsAvailable={moreResultsAvailable}
                    onLoadMore={onLoadMore}
                    onSaveSearch={onSaveSearch}
                    pagingAvailable={pagingAvailable}
                    pagingLoading={pagingLoading}
                    refineSurfaceCompact={refineSurfaceCompact}
                    refineSurfaceShown={refineSurfaceShown}
                    requestContinuation={requestContinuation}
                    requestLoadAll={requestLoadAll}
                    savingSearch={savingSearch}
                    selectAllVisible={selectAllVisible}
                    selected={selected}
                    selectedResults={selectedResults}
                    setCompactRows={setCompactRows}
                    setDownloadedIds={setDownloadedIds}
                    setGroupEpisodes={setGroupEpisodes}
                    setGroupTorrentAndUsenet={setGroupTorrentAndUsenet}
                    setHighlightRecent={setHighlightRecent}
                    setSelected={setSelected}
                    setShowCovers={setShowCovers}
                    setShowDuplicateControls={setShowDuplicateControls}
                    setSorting={setSorting}
                    showCovers={showCovers}
                    showDuplicateControls={showDuplicateControls}
                    sorting={sorting}
                    table={table}
                    toasts={toasts}
                    toggleRefineSurface={toggleRefineSurface}
                    toolbarRef={toolbarRef}
                />
            )}
            {hasResults && (
                <>
                    <Stack
                        direction={{xs: "column", sm: "row"}}
                        spacing={2}
                        sx={{
                            alignItems: "flex-start",
                        }}
                    >
                        <RefineSidebar
                            categoryOpen={categoryOpen}
                            clearRange={clearRange}
                            collapsed={sidebarCollapsed}
                            drawerOpen={refineDrawerOpen}
                            filterDefaults={filterDefaults}
                            filteredCount={filteredResults.length}
                            filters={filters}
                            indexerOpen={indexerOpen}
                            onClearAll={clearAllFilters}
                            onDrawerOpenChange={setRefineDrawerOpen}
                            onToggleCategoryOpen={() =>
                                setCategoryOpen((current) => !current)
                            }
                            onToggleCollapsed={() =>
                                setSidebarCollapsed((current) => !current)
                            }
                            onToggleIndexerOpen={() =>
                                setIndexerOpen((current) => !current)
                            }
                            onToggleQuickFilter={toggleQuickFilter}
                            quickFilters={quickFilters}
                            results={data.searchResults}
                            setFilters={setFilters}
                            toolbarHeight={toolbarHeight}
                            updateRange={updateRange}
                        />
                        <ResultsTable
                            actionsSlotCount={actionsSlotCount}
                            compactRows={compactRows}
                            coverWidth={coverWidth}
                            currentSelectionStatus={currentSelectionStatus}
                            dereferer={dereferer}
                            deselectAllVisible={deselectAllVisible}
                            downloadedIds={downloadedIds}
                            downloaders={downloaders}
                            expandSlots={expandSlots}
                            filteredResults={filteredResults}
                            handleDownloaded={handleDownloaded}
                            handleToggleDuplicateExpansion={
                                handleToggleDuplicateExpansion
                            }
                            handleToggleTitleExpansion={
                                handleToggleTitleExpansion
                            }
                            highlightRecent={highlightRecent}
                            indexerColors={indexerColors}
                            invertVisibleSelection={invertVisibleSelection}
                            maySeeDetailsDl={maySeeDetailsDl}
                            rowDescriptors={rowDescriptors}
                            selectAllVisible={selectAllVisible}
                            selected={selected}
                            settings={settings}
                            showCovers={showCovers}
                            spacerHeightBottom={spacerHeightBottom}
                            spacerHeightTop={spacerHeightTop}
                            table={table}
                            tableBodyRef={tableBodyRef}
                            toolbarHeight={toolbarHeight}
                            transport={transport}
                            updateSelection={updateSelection}
                            virtualRows={virtualRows}
                        />
                    </Stack>
                </>
            )}
            {/* FM-181: the phone's paging controls, under the last card
                rather than in the sticky bar. Paging is the one thing a
                reader asks for *after* reaching the end of the list, so it
                belongs where that ending is; keeping it pinned spent a
                permanent line of a 390px viewport on a control that is
                irrelevant until then. Rendered whenever the page owns paging
                at all -- including with nothing loaded, the state FM-055's
                row 1 already covered for the same reason. */}
            {refineSurfaceCompact && onLoadMore && (
                <ResultsPagingFooter
                    availableResultsPhrase={availableResultsPhrase}
                    moreResultsAvailable={moreResultsAvailable}
                    pagingAvailable={pagingAvailable}
                    pagingLoading={pagingLoading}
                    requestContinuation={requestContinuation}
                    requestLoadAll={requestLoadAll}
                />
            )}
        </Stack>
    );
}

/**
 * FM-162: a mounted row's real height, for the virtualizer.
 *
 * The measurement itself is the library's own (the `ResizeObserver` entry's
 * border box while scrolling/resizing, the element's `offsetHeight` on the
 * first pass) -- rows here are genuinely variable-height, since the Title cell
 * wraps and below 768px a row is a whole card, so an estimate is not good
 * enough and none is used once a row has been seen.
 *
 * The one addition is the zero guard. A rendered table row cannot really be
 * 0px tall; a zero reading means the environment cannot lay the row out at all
 * -- jsdom, which reports 0 for every box and has no `ResizeObserver` -- and
 * feeding those zeros back would collapse the whole list to offset 0 and mount
 * every row, which is precisely the behaviour this task removes. Falling back
 * to the estimate keeps the component's own tests measuring a bounded window
 * without weakening anything a real browser does.
 */
function measureRowHeight(
    element: Element,
    entry: ResizeObserverEntry | undefined,
): number {
    const borderBox = entry?.borderBoxSize?.[0];
    const measured = borderBox
        ? Math.round(borderBox.blockSize)
        : (element as HTMLElement).offsetHeight;
    return measured > 0 ? measured : ESTIMATED_ROW_HEIGHT;
}

/**
 * FM-177 (ADR-0054): the width one cover renders at, from the safe config's
 * `searching.coverSize` (`SafeSearchingConfig.java`, `baseConfig.yml`'s 128).
 *
 * The 100px fallback covers a config that carries no value at all, or one that
 * could not produce a visible image (0, negative, non-numeric) -- neither is a
 * reason to break the row, and neither should silently become the YAML
 * default, which this frontend does not restate.
 */
function coverWidthFromSafeConfig(value: unknown): number {
    const configured =
        isRecord(value) && isRecord(value.searching)
            ? value.searching.coverSize
            : undefined;
    return typeof configured === "number" &&
        Number.isFinite(configured) &&
        configured > 0
        ? configured
        : DEFAULT_COVER_WIDTH;
}

const DEFAULT_COVER_WIDTH = 100;

// FM-176: the empty set every render with the duplicate-controls option off
// uses, so that render's memos keep a stable dependency identity.
const NO_EXPANDED_DUPLICATES: ReadonlySet<string> = new Set<string>();

/**
 * Flattens the grouped results into the rows the table body actually renders,
 * in render order. `visibleGroupedResults` answers "which results are visible"
 * for selection; this answers the richer "how does each visible row render",
 * which FM-150 needs before the first row is emitted so every row can reserve
 * the same expand-control width.
 */
function visibleRowDescriptors(
    groups: ResultGroup[],
    expandedTitles: ReadonlySet<string>,
    expandedDuplicates: ReadonlySet<string>,
    // FM-176: the "Show duplicate expand controls" display option. False keeps
    // `showDuplicateExpand` false on every row, which is what makes both the
    // control and the width it would reserve disappear together.
    showDuplicateControls: boolean,
): VisibleRowDescriptor[] {
    return groups.flatMap((group, groupIndex) =>
        group.duplicateGroups.flatMap((duplicates, duplicateIndex) => {
            const duplicateKey = duplicateGroupKey(group.key, duplicates[0]);
            const titleExpanded = expandedTitles.has(group.key);
            const duplicateExpanded = expandedDuplicates.has(duplicateKey);
            if (duplicateIndex > 0 && !titleExpanded) {
                return [];
            }
            return duplicates
                .filter((_, index) => index === 0 || duplicateExpanded)
                .map((result, index) => ({
                    duplicateExpanded,
                    duplicateKey,
                    isNewGroup:
                        groupIndex > 0 && duplicateIndex === 0 && index === 0,
                    nestingLevel:
                        (duplicateIndex > 0 ? 1 : 0) + (index > 0 ? 1 : 0),
                    result,
                    showDuplicateExpand:
                        showDuplicateControls &&
                        index === 0 &&
                        duplicates.length > 1,
                    showTitleExpand:
                        index === 0 &&
                        duplicateIndex === 0 &&
                        group.duplicateGroups.length > 1,
                    titleExpanded,
                    titleGroupKey: group.key,
                }));
        }),
    );
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
