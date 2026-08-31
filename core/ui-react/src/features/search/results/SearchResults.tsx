import {
    Alert,
    Box,
    Button,
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
import {denseControlFontSize} from "../../../app/theme";
import {SafeConfigContext} from "../../../bootstrap";
import {DialogContext} from "../../../components/dialogs/dialogs";
import {useCompactRefineSurface} from "../../../components/refine/RefineSurface";
import {ToastContext} from "../../../components/toasts/toasts";
import {writeItem} from "../../../domain/storage/browserStorage";
import {createServerPreferences} from "../../../services/preferences/serverPreferences";
import {bootstrapBase, DownloadActions} from "./DownloadActions";
import {RefineSidebar} from "./RefineSidebar";
import {ResultRow} from "./ResultRow";
import {DisplayOptionsMenu, RejectedResultsTrigger} from "./ResultsPopovers";
import {SelectionMenu} from "./SelectionMenu";
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
    defaultFilters,
    duplicateGroupKey,
    filterResults,
    groupResults,
    indexerColorsFromSafeConfig,
    isRecentResult,
    preselectedQuickFilters,
    quickFilterKey,
    quickFiltersFromSafeConfig,
    selectionAfterClick,
    selectionStatus,
    selectVisibleResults,
    visibleGroupedResults,
} from "./resultTable";
import type {StoredChoices} from "./storedChoices";
import {
    isRecord,
    loadChoices,
    STORAGE_KEY,
    withoutSearchScopedFilters,
} from "./storedChoices";

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
const HEADER_CELL_PADDING_Y = 0.75;

// FM-042 (ADR-0011): the mock's own header-row label typography
// (`uimock/NZBHydra Search.dc.html:258`), which ADR-0009 already makes
// authoritative for palette/typography/density. This is the "complementary
// lever" ADR-0011 names alongside the re-proportioned `<colgroup>` for
// making all eight columns' full labels fit: a smaller, uppercase, tracked
// label leaves more of each header cell's narrowed box for the label text
// itself than the previous default MUI `Button` typography did. FM-054
// (ADR-0014): the label color is the theme's own muted `text.secondary`
// role, consumed via `sx`'s palette-path resolution rather than restated as
// a `#hex` literal.
const HEADER_LABEL_FONT_SIZE = "11px";
const HEADER_LABEL_FONT_WEIGHT = 600;
const HEADER_LABEL_LETTER_SPACING = "0.5px";
const HEADER_LABEL_COLOR = "text.secondary";

// FM-041/FM-054: row-density values for the two display-option row
// treatments. Kept as local constants in this file (not a per-feature
// `*Styles.ts` token module, which ADR-0014 forbids) since neither is a
// color, font, or radius value.
const ROW_PADDING_Y = 0.75;
const COMPACT_ROW_PADDING_Y = 0.5;

// FM-129: the compact table's own type ladder, one step under the default
// row treatment at each of the three places compact mode tightens. These stay
// local named constants rather than shared tokens: each is a value *relative*
// to the row density this one table switches between, meaningless outside it,
// and no other surface in the application has a compact mode to share them
// with. The title cell is the exception -- it renders the shared
// `denseControlFontSize` role, so it reads that instead.
const TABLE_CELL_FONT_SIZE = "12px";
const COMPACT_ACTION_FONT_SIZE = "11.5px";
const COMPACT_CHIP_FONT_SIZE = "10.5px";

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
    // One transport for every row's `API-SEARCH-NFO` request, rather than one
    // per rendered row.
    const transport = useMemo(() => new ApiTransport(bootstrapBase()), []);
    const [choices] = useState(() => loadChoices());
    // Recomputed from whatever results are currently loaded, so the
    // `SearchScopedFilter` reset below always selects every value of the
    // search it is resetting for.
    const filterDefaults = useMemo(
        () => defaultFilters(data.searchResults, quickFilters),
        [data.searchResults, quickFilters],
    );
    const [sorting, setSorting] = useState<SortingState>(
        choices.sorting ?? [{id: "epoch", desc: true}],
    );
    const [filters, setFilters] = useState<ResultFilters>(() => ({
        ...filterDefaults,
        ...choices.filters,
        size: choices.filters?.size ?? {min: "", max: ""},
        grabs: choices.filters?.grabs ?? {min: "", max: ""},
        age: choices.filters?.age ?? {min: "", max: ""},
        quickFilters: {
            ...preselectedQuickFilters(safeConfig, quickFilters),
            ...choices.filters?.quickFilters,
        },
    }));
    // A new search's results carry their own indexer, category, and
    // download-type values, so the previous search's selection cannot be
    // kept: it would silently hide every result from an indexer, category, or
    // download type that search did not return.
    // This adjusts state during render -- React's documented pattern for
    // deriving state from a changed prop -- rather than in an effect, which
    // keeps it off the load-more path (paging keeps the same
    // `searchRequestId`, and a deliberate deselection must survive it) and
    // avoids painting one frame of results filtered by the stale selection.
    const [lastSearchRequestId, setLastSearchRequestId] =
        useState(searchRequestId);
    if (lastSearchRequestId !== searchRequestId) {
        setLastSearchRequestId(searchRequestId);
        setFilters((current) => ({
            ...current,
            categories: filterDefaults.categories,
            downloadTypes: filterDefaults.downloadTypes,
            indexers: filterDefaults.indexers,
        }));
    }
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
    const visibleResults = useMemo(
        () => visibleGroupedResults(groups, expandedTitles, expandedDuplicates),
        [expandedDuplicates, expandedTitles, groups],
    );
    // FM-150: the shape of every row the table body is about to render,
    // derived once instead of inside the JSX, because the expand-control width
    // each row reserves is a property of the whole rendered set (see
    // `expandSlots` below) and cannot be decided row by row.
    const rowDescriptors = useMemo(
        () => visibleRowDescriptors(groups, expandedTitles, expandedDuplicates),
        [expandedDuplicates, expandedTitles, groups],
    );
    // The largest number of expand controls any one visible row carries. Rows
    // with fewer pad to it with invisible spacers, so a title at a given
    // nesting level always starts at the same x; when no row can expand
    // anything this is 0 and nothing is reserved at all.
    const expandSlots = useMemo(
        () =>
            rowDescriptors.reduce(
                (widest, row) =>
                    Math.max(
                        widest,
                        (row.showTitleExpand ? 1 : 0) +
                            (row.showDuplicateExpand ? 1 : 0),
                    ),
                0,
            ),
        [rowDescriptors],
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
        writeItem(
            STORAGE_KEY,
            JSON.stringify({
                compactRows,
                filters: withoutSearchScopedFilters(filters),
                highlightRecent,
                refineCategoryOpen: categoryOpen,
                refineIndexerOpen: indexerOpen,
                sidebarCollapsed,
                sorting,
            } satisfies StoredChoices),
        );
    }, [
        categoryOpen,
        compactRows,
        filters,
        highlightRecent,
        indexerOpen,
        sidebarCollapsed,
        sorting,
    ]);

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
                categories: data.searchResults.map((result) => result.category),
                episodeRequested,
                groupEpisodes,
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
    }, [
        data.searchResults,
        dialogs,
        episodeRequested,
        groupEpisodes,
        transport,
    ]);

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
    // Below `sm` the table's `thead` -- and so the header's tri-state
    // checkbox/caret menu -- is hidden by the responsive table styling; this
    // mobile-only copy keeps bulk selection reachable from the toolbar at
    // that viewport. Both copies share the same selection state and
    // callbacks. FM-055 moves it to the start of the merged action row.
    const mobileSelectionMenu = (
        <Box sx={{display: {xs: "flex", sm: "none"}}}>
            <SelectionMenu
                idPrefix="toolbar"
                onDeselectAll={deselectAllVisible}
                onInvertSelection={invertVisibleSelection}
                onSelectAll={selectAllVisible}
                status={currentSelectionStatus}
            />
        </Box>
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
            {/* FM-055: the standalone `Rejected N results.` Alert is gone --
                the count now lives in `search-results-summary` as the
                `results-rejected-trigger`, which additionally exposes the
                per-reason breakdown legacy showed in its click-tooltip
                (`search-results.html:170-190`) and React never rendered.
                Review fix: `search-results-summary` (and so the trigger)
                still renders when everything loaded was rejected -- see
                `hasRejectedResults` above -- so this information stays
                reachable in the one state where the "no results" Alert
                above does not fire either (`numberOfAvailableResults`
                includes rejected items server-side). */}
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
            {showToolbar && (
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
                    {/* FM-055: exactly two rows. Row 1 carries the single
                        count phrase, the paging controls that used to sit in
                        their own non-sticky row above this region, and the
                        "⚙ Display" popover at the row's right end. Row 2 is
                        the one wrapping action row. */}
                    <Stack spacing={1.5}>
                        <Stack
                            alignItems="center"
                            direction="row"
                            flexWrap="wrap"
                            gap={1.5}
                        >
                            {(hasResults || hasRejectedResults) && (
                                <Typography
                                    // A `div`, not `subtitle2`'s default
                                    // `h6`: this phrase now contains the
                                    // interactive `results-rejected-trigger`,
                                    // and a heading that wraps a control is
                                    // a worse accessibility tree than a
                                    // plain block with the same typography.
                                    //
                                    // FM-055 review fix: also rendered with
                                    // `hasResults` false -- everything loaded
                                    // rejected -- so the `results-rejected-
                                    // trigger` clause below stays reachable
                                    // instead of vanishing along with the
                                    // rest of row 1. The `{0} of {0} loaded`
                                    // prefix that implies is accurate (there
                                    // is genuinely nothing loaded) and keeps
                                    // the one-phrase format from the
                                    // acceptance contract intact rather than
                                    // special-casing it away.
                                    component="div"
                                    data-testid="search-results-summary"
                                    variant="subtitle2"
                                >
                                    {filteredResults.length} of{" "}
                                    {data.searchResults.length} loaded
                                    {moreResultsAvailable &&
                                        ` (${totalResultsUnknown ? ">" : ""}${
                                            data.numberOfAvailableResults
                                        } available)`}
                                    {filteredOutCount > 0 &&
                                        ` · ${filteredOutCount} filtered`}
                                    {data.numberOfRejectedResults > 0 && (
                                        <>
                                            {" · "}
                                            <RejectedResultsTrigger
                                                count={
                                                    data.numberOfRejectedResults
                                                }
                                                reasons={
                                                    data.rejectedReasonsMap
                                                }
                                            />
                                        </>
                                    )}
                                    {selected.size > 0 && (
                                        <Box
                                            component="span"
                                            sx={{color: "primary.main"}}
                                        >
                                            {" · "}
                                            {selected.size} selected
                                        </Box>
                                    )}
                                </Typography>
                            )}
                            {onLoadMore && (
                                <>
                                    <Button
                                        aria-busy={pagingLoading}
                                        data-testid="results-load-more"
                                        disabled={
                                            !pagingAvailable || pagingLoading
                                        }
                                        onClick={() =>
                                            void requestContinuation(false)
                                        }
                                        size="small"
                                    >
                                        {pagingLoading
                                            ? "Loading more results…"
                                            : "Load more"}
                                    </Button>
                                    <Button
                                        data-testid="results-load-all"
                                        disabled={
                                            !pagingAvailable || pagingLoading
                                        }
                                        onClick={() =>
                                            void requestContinuation(true)
                                        }
                                        size="small"
                                    >
                                        Load all results
                                    </Button>
                                </>
                            )}
                            {/* The mock puts its "⚙ Display" button at the
                                right end of the toolbar's first row
                                (`margin-left:auto`). */}
                            {hasResults && (
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
                            )}
                        </Stack>
                        {hasResults &&
                            (dialogs !== null && toasts !== null ? (
                                <DownloadActions
                                    leading={mobileSelectionMenu}
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
                                    // FM-159 (ADR-0017): the *live* config,
                                    // so a downloader added, removed, or
                                    // edited in Config -> Downloading becomes
                                    // (or stops being) a send target in
                                    // already-rendered results without a
                                    // reload. Falls back to the bootstrap
                                    // seed with no provider above.
                                    safeConfig={effectiveSafeConfig}
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
                                        alignItems="center"
                                        data-testid="results-bulk-actions"
                                        direction="row"
                                        flexWrap="wrap"
                                        gap={1}
                                    >
                                        {mobileSelectionMenu}
                                        <Button
                                            disabled={savingSearch}
                                            id="save-search"
                                            onClick={() => void onSaveSearch()}
                                            size="small"
                                            sx={{ml: "auto"}}
                                        >
                                            {savingSearch
                                                ? "Saving search…"
                                                : "Save search"}
                                        </Button>
                                    </Stack>
                                )
                            ))}
                    </Stack>
                </Box>
            )}
            {hasResults && (
                <>
                    <Stack
                        alignItems="flex-start"
                        direction={{xs: "column", sm: "row"}}
                        spacing={2}
                    >
                        <RefineSidebar
                            categoryOpen={categoryOpen}
                            clearRange={clearRange}
                            collapsed={sidebarCollapsed}
                            drawerOpen={refineDrawerOpen}
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
                                            ? COMPACT_ROW_PADDING_Y
                                            : ROW_PADDING_Y,
                                        paddingTop: compactRows
                                            ? COMPACT_ROW_PADDING_Y
                                            : ROW_PADDING_Y,
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
                                                  padding: 0.25,
                                              },
                                              "& tbody .MuiButton-root": {
                                                  fontSize:
                                                      COMPACT_ACTION_FONT_SIZE,
                                                  minHeight: 0,
                                                  paddingBottom: 0,
                                                  paddingTop: 0,
                                              },
                                              // FM-150: since the expand and
                                              // download controls became icon
                                              // buttons, the `.MuiButton-root`
                                              // rule above no longer reaches
                                              // the controls that set a row's
                                              // height -- these do, together
                                              // with the detail links that
                                              // were always icons.
                                              "& tbody .MuiIconButton-root": {
                                                  padding: 0.25,
                                              },
                                              "& tbody .MuiChip-root": {
                                                  fontSize:
                                                      COMPACT_CHIP_FONT_SIZE,
                                                  height: "18px",
                                              },
                                              '& tbody td[data-label="Actions"] .MuiStack-root':
                                                  {gap: 0.25},
                                          }
                                        : {}),
                                    "& td, & th": {
                                        fontSize: TABLE_CELL_FONT_SIZE,
                                    },
                                    '& [data-label="Title"]': {
                                        fontSize: denseControlFontSize,
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
                                    // (`C-REFINE-SURFACE`'s shared
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
                                {/* FM-042 (ADR-0011) established that this
                                        table never scrolls horizontally and
                                        carries no `min-width` floor, so these
                                        eight tracks are the whole width
                                        budget: what one column gives up,
                                        another gets.

                                        FM-150 (owner request, 2026-08-31)
                                        sets the current basis, and it is not
                                        the previous one. Age and Size used to
                                        be sized so their *mathematical* worst
                                        case fit; they are now sized for the
                                        values users actually see, and the
                                        surplus goes to Title. At the 1280x800
                                        basis these percentages are measured
                                        against (a ~896px table beside the
                                        docked refine sidebar), 1% is ~9px:

                                        - Age 8% -> 5% (45px measured). This
                                          deliberately gives up the `9999d`
                                          (~27 year) worst case the previous
                                          pass sized for. `999d` measures 28px
                                          and sits inside the cell; `9999d`
                                          measures 35px against the 13px this
                                          track leaves between the cell's own
                                          16px paddings, so it spends that
                                          padding and (these cells are
                                          right-aligned) ends ~6px past the
                                          cell's left edge, into the Details
                                          column's right padding. It stays
                                          fully legible and
                                          collides with no neighbouring text
                                          (these cells are `nowrap`, so
                                          nothing reflows), but the guarantee
                                          that it fits is gone -- accepted,
                                          not overlooked.
                                        - Size 9% -> 8% (72px measured). Same
                                          trade: `999.99 GB` -- the
                                          mathematical maximum, since
                                          `formatResultSize` never reaches
                                          four digits -- measures 57px and
                                          ends ~2px past the cell's left
                                          edge, into the Category column's
                                          right padding, while
                                          real values (`51.2 GB`, `780 MB`,
                                          ~43px) sit inside it.
                                        - Title 35% -> 39% (349px measured),
                                          the sum of what the two gave up.
                                          Title is the column whose overflow
                                          actually costs something: it is the
                                          one cell that wraps, and every extra
                                          line makes the whole row taller.

                                        The checkbox track stays a fixed 40px
                                        and Indexer/Category/Details/Actions
                                        are untouched; the percentages still
                                        sum to 100. The Age *header* is the
                                        one label that no longer fits its
                                        track -- see the header cell's own
                                        padding note below. */}
                                <colgroup>
                                    <col style={{width: 40}} />
                                    <col style={{width: "39%"}} />
                                    <col style={{width: "11%"}} />
                                    <col style={{width: "11%"}} />
                                    <col style={{width: "8%"}} />
                                    <col style={{width: "11%"}} />
                                    <col style={{width: "5%"}} />
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
                                                                    // FM-150: Age is the one header
                                                                    // whose label no longer fits the
                                                                    // column the owner asked for --
                                                                    // "AGE ▼" measures 34.9px against
                                                                    // the 29px the 5% track leaves
                                                                    // once this padding is taken, so
                                                                    // it rendered clipped. Halving
                                                                    // its own padding buys the 8px
                                                                    // that makes the header legible
                                                                    // again without touching any
                                                                    // column's width.
                                                                    px:
                                                                        header
                                                                            .column
                                                                            .id ===
                                                                        "epoch"
                                                                            ? 0.5
                                                                            : 1,
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
                                                                                ? 0.75
                                                                                : 0.5,
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
                                    {rowDescriptors.map((row) => (
                                        <ResultRow
                                            dereferer={dereferer}
                                            downloaded={downloadedIds.has(
                                                row.result.searchResultId,
                                            )}
                                            duplicateExpanded={
                                                row.duplicateExpanded
                                            }
                                            duplicateKey={row.duplicateKey}
                                            expandSlots={expandSlots}
                                            indexerColors={indexerColors}
                                            isNewGroup={row.isNewGroup}
                                            key={row.result.searchResultId}
                                            maySeeDetailsDl={maySeeDetailsDl}
                                            nestingLevel={row.nestingLevel}
                                            onDownloaded={handleDownloaded}
                                            onSelectionChange={updateSelection}
                                            onToggleDuplicateExpansion={
                                                handleToggleDuplicateExpansion
                                            }
                                            onToggleTitleExpansion={
                                                handleToggleTitleExpansion
                                            }
                                            recent={
                                                highlightRecent &&
                                                isRecentResult(row.result)
                                            }
                                            result={row.result}
                                            selected={selected.has(
                                                row.result.searchResultId,
                                            )}
                                            showDuplicateExpand={
                                                row.showDuplicateExpand
                                            }
                                            showTitleExpand={
                                                row.showTitleExpand
                                            }
                                            titleExpanded={row.titleExpanded}
                                            titleGroupKey={row.titleGroupKey}
                                            transport={transport}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Stack>
                </>
            )}
        </Stack>
    );
}

/** One rendered table-body row, with everything the grouping decides about it. */
type VisibleRowDescriptor = {
    duplicateExpanded: boolean;
    duplicateKey: string;
    isNewGroup: boolean;
    nestingLevel: number;
    result: SearchResult;
    showDuplicateExpand: boolean;
    showTitleExpand: boolean;
    titleExpanded: boolean;
    titleGroupKey: string;
};

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
                    showDuplicateExpand: index === 0 && duplicates.length > 1,
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

function downloadIdFor(result: SearchResult): string {
    return result.downloadId ?? result.searchResultId;
}
