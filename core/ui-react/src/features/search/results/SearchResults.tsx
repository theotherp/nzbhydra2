import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import {
    Alert,
    Badge,
    Box,
    Button,
    IconButton,
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
import {denseControlFontSize} from "../../../app/theme";
import {SafeConfigContext} from "../../../bootstrap";
import {DialogContext} from "../../../components/dialogs/dialogs";
import {useCompactRefineSurface} from "../../../components/refine/RefineSurface";
import {ToastContext} from "../../../components/toasts/toasts";
import {
    configuredDownloaders,
    downloadSettings,
    type Downloader,
} from "../../../domain/downloads/actions";
import {writeItem} from "../../../domain/storage/browserStorage";
import {createServerPreferences} from "../../../services/preferences/serverPreferences";
import {bootstrapBase, DownloadActions} from "./DownloadActions";
import {REFINE_LABELS, RefineSidebar} from "./RefineSidebar";
import type {ExpandSlots} from "./ResultRow";
import {ResultRow} from "./ResultRow";
import {
    DisplayOptionsMenu,
    RejectedResultsTrigger,
    ResultsSortMenu,
} from "./ResultsPopovers";
import {SelectionMenu} from "./SelectionMenu";
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
    actionsTrackWidth,
    activeFilterCount,
    blackHoleSlot,
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
import {isRecord, loadChoices, STORAGE_KEY} from "./storedChoices";

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

// FM-150's header inset, named by FM-175 so the Actions header (which sits
// outside the sorted-column loop and needs the same left inset with no right
// one) states the same value rather than a second literal. The `epoch` header
// halves it -- see the header cell's own note below.
const HEADER_CELL_PADDING_X = 1;
const AGE_HEADER_CELL_PADDING_X = 0.5;

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

// FM-175: the body cells' horizontal padding, in theme spacing units -- 8px,
// half MUI's stock `MuiTableCell` 16px. Not density-switched: "compact rows"
// is a *vertical* preference, and this table is horizontally tight at every
// density because ADR-0011 denies it a scrollbar.
const ROW_PADDING_X = 1;

// FM-175: the size of the glyph inside the row's icon buttons (Actions, and
// the title cell's expand controls), down from `fontSize="small"`'s 20px.
// A number, not a `fontSize` token, because it is a measured relationship to
// this table's 12-13px cell text rather than a step on the type ramp.
const ROW_ICON_GLYPH_SIZE = 16;

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

// The table's fixed `<colgroup>` track widths, single source for both the
// rendered `<colgroup>` below and TABLE_COLUMN_COUNT, so the spacer rows'
// colSpan can never drift from the actual track count under `tableLayout:
// fixed`. In rendered order:
// Checkbox/Title/Indexer/Category/Size/Details/Age/Actions -- which is the
// order `resultColumns` in `ResultRow.tsx` declares, not the one this
// comment claimed before FM-175.
//
// FM-175 (owner request, 2026-09-02) replaces the percentages with fixed
// pixel tracks and leaves Title alone with no width at all. Under
// `tableLayout: fixed` a percentage Title is starved twice over -- it is
// sized *before* the surplus is known, and any width the other columns do
// not need is redistributed to every track pro rata rather than to the one
// column that can use it. A track with no declared width is the only one
// that absorbs the whole remainder, which is exactly the "Title takes what
// the others leave" behaviour ADR-0011 asks for. The px values are the
// measured worst case of each column's own header label (uppercase 11px
// plus the sort glyph, plus the header cell's 8px paddings) rounded up:
// Indexer 88 -> 90, Category 96 -> 98, Size 64 -> 65, Details 87 -> 90,
// Age 51 -> 52; Actions 140 and Details 90 are the owner's own numbers.
// See the `<colgroup>` note below for the resulting Title measurement.
//
// `undefined` means "declare no width for this track"; the entry still
// exists so TABLE_COLUMN_COUNT and the rendered `<col>` list stay in step.
//
// FM-186 makes the last track a function of how many send buttons the row's
// Actions cell has to hold -- `actionsTrackWidth`, the single source both this
// set and the percentage set below derive from. FM-187 adds one more slot to
// that count for the send-to-black-hole button, when some loaded result
// renders it (`actionsSlotCount` below).
function tableColumnWidths(
    slotCount: number,
): Array<number | string | undefined> {
    return [40, undefined, 90, 98, 65, 90, 52, actionsTrackWidth(slotCount)];
}

// The same tracks below the basis width, as percentages of the table.
//
// Pixel tracks have no give: their sum (575px including the checkbox) is a
// floor the table cannot go under, and a fixed-layout table simply overflows
// its box rather than scaling them -- measured, and exactly the horizontal
// scroll ADR-0011 forbids. Every percentage here is its pixel track over the
// 936px basis table, so at the basis the two sets are the same table to the
// pixel and below it every track (Title included) shrinks in proportion
// instead of Title alone being crushed to nothing. Headers clip with an
// ellipsis at the narrow end, as they did before FM-175; the "every header
// fits" criterion is a criterion at the 1280x800 basis, not below it.
function narrowTableColumnWidths(
    slotCount: number,
): Array<number | string | undefined> {
    return [
        40,
        undefined,
        "9.62%",
        "10.47%",
        "6.94%",
        "9.62%",
        "5.56%",
        // Computed rather than written out, so it cannot drift from the pixel
        // track above: 140px is 14.96%, and each 28px slot adds ~2.99% (one
        // slot 17.95%, two 20.94%, three 23.93%).
        `${((actionsTrackWidth(slotCount) / TABLE_BASIS_WIDTH) * 100).toFixed(2)}%`,
    ];
}

// The basis table's width in px, i.e. what a 1280x800 viewport leaves beside
// the docked refine sidebar. Every percentage above is its own pixel track
// over this width, which is what makes the two sets the same table at the
// basis.
const TABLE_BASIS_WIDTH = 936;

// The viewport width the pixel tracks above are measured at, and the width
// at or above which they are used. It is deliberately the same 1280 as the
// visual-evidence desktop viewport rather than a `theme.ts` breakpoint
// token: the two sets of tracks are equal *at* this width by construction,
// so switching anywhere else would put a visible step in the layout. Below
// it the percentage set is not a compromise but the better of the two --
// with the tracks scaling, Title keeps a proportional share instead of
// being handed a remainder that reaches zero at a 575px table.
const TABLE_PIXEL_TRACK_BREAKPOINT = 1280;

/**
 * The `<colgroup>` track widths as CSS rules against the rendered `<col>`
 * elements, rather than as inline `style` attributes on them.
 *
 * Inline styles cannot be overridden by a media query, and FM-175 needs
 * exactly that: one set of tracks at and above the basis width, another
 * below it. Tracks with no declared width are skipped so they stay `auto`
 * in both sets -- that is what makes Title absorb the remainder.
 */
function columnTrackRules(
    widths: Array<number | string | undefined>,
): Record<string, {width: number | string}> {
    return Object.fromEntries(
        widths.flatMap((width, index) =>
            width === undefined
                ? []
                : [[`& colgroup > col:nth-of-type(${index + 1})`, {width}]],
        ),
    );
}

// The table's fixed `<colgroup>` track count, which the spacer rows have to
// span so the fixed layout is not disturbed by a row with a different cell
// count.
const TABLE_COLUMN_COUNT = tableColumnWidths(0).length;

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
    // The two `<colgroup>` track sets, both derived from that count so they
    // still describe the same table at the 936px basis.
    const pixelColumnWidths = useMemo(
        () => tableColumnWidths(actionsSlotCount),
        [actionsSlotCount],
    );
    const narrowColumnWidths = useMemo(
        () => narrowTableColumnWidths(actionsSlotCount),
        [actionsSlotCount],
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
    const [choices] = useState(() => loadChoices());
    // Recomputed from whatever results are currently loaded, so the
    // per-search reset below always selects every value of the search it is
    // resetting for.
    const filterDefaults = useMemo(
        () => defaultFilters(data.searchResults, quickFilters),
        [data.searchResults, quickFilters],
    );
    const [sorting, setSorting] = useState<SortingState>(
        choices.sorting ?? [{id: "epoch", desc: true}],
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
        writeItem(
            STORAGE_KEY,
            JSON.stringify({
                compactRows,
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
        highlightRecent,
        indexerOpen,
        showCovers,
        showDuplicateControls,
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
    // Below 768px the table's `thead` -- and so the header's tri-state
    // checkbox/caret menu -- is hidden by the responsive card layout; this
    // copy keeps bulk selection reachable from the toolbar at that viewport.
    // Both copies share the same selection state and callbacks.
    //
    // FM-181: rendered on the same JavaScript branch the card layout and the
    // refine sheet switch on, not on the `display: {xs, sm}` CSS switch it
    // used to carry. That switch hid this copy from 600px up while `thead`
    // was already hidden from 767px down, so between 600 and 767px the page
    // had no select-all at all. FM-181 also moves it to the start of row 1,
    // where it is reachable without a selection.
    const mobileSelectionMenu = (
        <SelectionMenu
            idPrefix="toolbar"
            onDeselectAll={deselectAllVisible}
            onInvertSelection={invertVisibleSelection}
            onSelectAll={selectAllVisible}
            status={currentSelectionStatus}
        />
    );
    // FM-181: how many refine dimensions are active, for the phone toolbar's
    // badge. The same function `RefineSidebar` disables its "Clear all" on.
    const activeFilters = useMemo(
        () => activeFilterCount(filters, data.searchResults, quickFilters),
        [data.searchResults, filters, quickFilters],
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
                        // FM-181: a phone's sticky region is paid for in rows
                        // of results it hides, so it takes the tighter box.
                        padding: refineSurfaceCompact ? "8px 0" : "16px 0 14px",
                        position: "sticky",
                        top: 0,
                        zIndex: TOOLBAR_STICKY_Z_INDEX,
                    }}
                >
                    {/* FM-055: exactly two rows. Row 1 carries the single
                        count phrase, the paging controls that used to sit in
                        their own non-sticky row above this region, and the
                        "⚙ Display" popover at the row's right end. Row 2 is
                        the one wrapping action row.
                        FM-181: below 768px row 1 is one line -- select-all,
                        a two-number count, three icon controls -- and row 2
                        renders only while something is selected. */}
                    <Stack spacing={refineSurfaceCompact ? 1 : 1.5}>
                        <Stack
                            direction="row"
                            sx={{
                                alignItems: "center",
                                flexWrap: refineSurfaceCompact
                                    ? "nowrap"
                                    : "wrap",
                                gap: refineSurfaceCompact ? 1 : 1.5,
                            }}
                        >
                            {refineSurfaceCompact && mobileSelectionMenu}
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
                                    sx={
                                        refineSurfaceCompact
                                            ? {whiteSpace: "nowrap"}
                                            : undefined
                                    }
                                    variant="subtitle2"
                                >
                                    {/* FM-181: on a phone the phrase is two
                                        numbers. "loaded", "available" and
                                        "filtered" are all inferable from
                                        them (or, for available, from the
                                        paging footer that names the same
                                        count beside the button that acts on
                                        it), the selected count moved to row
                                        2 beside the actions it gates, and
                                        the full sentence is what made this
                                        row wrap. The rejection trigger stays:
                                        it is a control, and nothing else
                                        reaches the breakdown. */}
                                    {refineSurfaceCompact ? (
                                        <>
                                            {filteredResults.length} /{" "}
                                            {data.searchResults.length}
                                        </>
                                    ) : (
                                        <>
                                            {filteredResults.length} of{" "}
                                            {data.searchResults.length} loaded
                                            {moreResultsAvailable &&
                                                ` (${availableResultsPhrase} available)`}
                                            {filteredOutCount > 0 &&
                                                ` · ${filteredOutCount} filtered`}
                                        </>
                                    )}
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
                                    {!refineSurfaceCompact &&
                                        selected.size > 0 && (
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
                            {/* FM-182: below 768px `thead` is hidden and with
                                it the header's `sort-{column}` buttons -- this
                                is the phone's only sort control, sitting
                                between the count and Display just as the mock
                                orders the equivalent controls. It writes the
                                same `sorting` state the desktop headers write,
                                so a viewport change never disagrees with the
                                header's own `aria-sort`. No hidden desktop
                                copy exists: `results-sort-toggle` is absent
                                from the DOM entirely at >= 768px. */}
                            {refineSurfaceCompact && hasResults && (
                                <ResultsSortMenu
                                    columns={table.getAllLeafColumns()}
                                    onSortingChange={setSorting}
                                    sorting={sorting}
                                />
                            )}
                            {!refineSurfaceCompact && onLoadMore && (
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
                                        onClick={() => void requestLoadAll()}
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
                                <Box
                                    // FM-181: the phone's row-1 control
                                    // cluster is three icon buttons, so this
                                    // wrapper becomes a flex row there. The
                                    // desktop branch resolves to exactly the
                                    // `{ml: "auto"}` it has always carried,
                                    // holding its one Display button.
                                    sx={{
                                        ml: "auto",
                                        ...(refineSurfaceCompact
                                            ? {
                                                  alignItems: "center",
                                                  display: "flex",
                                              }
                                            : {}),
                                    }}
                                >
                                    <DisplayOptionsMenu
                                        compact={refineSurfaceCompact}
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
                                        onToggleShowCovers={() =>
                                            setShowCovers((current) => !current)
                                        }
                                        onToggleShowDuplicateControls={() =>
                                            setShowDuplicateControls(
                                                (current) => !current,
                                            )
                                        }
                                        refineSurfaceShown={refineSurfaceShown}
                                        showCovers={showCovers}
                                        showDuplicateControls={
                                            showDuplicateControls
                                        }
                                    />
                                    {/* FM-181: below 768px the refine
                                        surface's trigger lives here rather
                                        than above the table, where it
                                        scrolled away with the results it
                                        filters. The badge is the only thing
                                        that can say a filter is on once the
                                        sections are behind a sheet; it counts
                                        the same dimensions `refine-clear-all`
                                        enables on, and MUI hides it at 0. */}
                                    {refineSurfaceCompact && (
                                        <Badge
                                            badgeContent={activeFilters}
                                            color="primary"
                                        >
                                            <IconButton
                                                aria-expanded={
                                                    refineSurfaceShown
                                                }
                                                aria-haspopup="dialog"
                                                aria-label={
                                                    refineSurfaceShown
                                                        ? REFINE_LABELS.collapse
                                                        : REFINE_LABELS.expand
                                                }
                                                data-testid="refine-sidebar-toggle"
                                                onClick={toggleRefineSurface}
                                                size="small"
                                            >
                                                {/* Owner (2026-09-03): the funnel, not `FilterList` --
                                                    whose three shrinking bars are the glyph most apps
                                                    use for *sort*, and sat next to a real Sort button. */}
                                                <FilterAltOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Badge>
                                    )}
                                    {/* Row 2 holds this on the desktop
                                        branch, but row 2 does not exist on a
                                        phone until something is selected --
                                        and saving a search has nothing to do
                                        with a selection. */}
                                    {refineSurfaceCompact && onSaveSearch && (
                                        <IconButton
                                            aria-busy={savingSearch}
                                            aria-label="Save search"
                                            disabled={savingSearch}
                                            id="save-search"
                                            onClick={() => void onSaveSearch()}
                                            size="small"
                                        >
                                            <BookmarkAddOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                            )}
                        </Stack>
                        {/* FM-181: on a phone the action row is a selection
                            row -- it appears with the first selected result
                            and goes again with the last, so an idle sticky
                            bar costs one line instead of two. At 768px and up
                            it renders exactly as before. */}
                        {hasResults &&
                            (!refineSurfaceCompact || selected.size > 0) &&
                            (dialogs !== null && toasts !== null ? (
                                <DownloadActions
                                    compact={refineSurfaceCompact}
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
                                // FM-181: never on the compact branch, where
                                // row 1 already carries Save search and a
                                // second `save-search` would exist.
                                !refineSurfaceCompact &&
                                onSaveSearch && (
                                    <Stack
                                        data-testid="results-bulk-actions"
                                        direction="row"
                                        sx={{
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            gap: 1,
                                        }}
                                    >
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
                                // FM-162: how many rows this table stands for,
                                // as opposed to how many are currently
                                // mounted. Since the body is virtualized, the
                                // rendered `search-result-row` count is a
                                // function of the viewport; this is the number
                                // that used to be readable by counting them.
                                data-row-count={rowDescriptors.length}
                                sx={(theme) => ({
                                    tableLayout: "fixed",
                                    width: "100%",
                                    ...columnTrackRules(narrowColumnWidths),
                                    [theme.breakpoints.up(
                                        TABLE_PIXEL_TRACK_BREAKPOINT,
                                    )]: columnTrackRules(pixelColumnWidths),
                                    // FM-162: the two virtualization spacer
                                    // rows carry nothing but height -- no
                                    // padding, no card separator at <768px.
                                    // Declared here rather than on the rows
                                    // themselves because the body-cell padding
                                    // rule below is a descendant selector of
                                    // this same `sx` and would otherwise win.
                                    "& tbody > tr[data-virtual-spacer]": {
                                        border: 0,
                                    },
                                    "& tbody > tr[data-virtual-spacer] > td": {
                                        border: 0,
                                        padding: 0,
                                    },
                                    "& tbody > tr > td": {
                                        paddingBottom: compactRows
                                            ? COMPACT_ROW_PADDING_Y
                                            : ROW_PADDING_Y,
                                        paddingTop: compactRows
                                            ? COMPACT_ROW_PADDING_Y
                                            : ROW_PADDING_Y,
                                        // FM-175: top, not the table default
                                        // `middle`. A wrapped title makes its
                                        // row two or three lines tall while
                                        // every other cell still holds one
                                        // line, and a vertically centred row
                                        // then floats Indexer/Category/Size
                                        // halfway down the block with nothing
                                        // to read them against. Aligned to
                                        // the top, each cell's first line box
                                        // starts at the same y as the title's
                                        // first line, which is the "a title's
                                        // first line sits level with the
                                        // Indexer text" the owner asked for
                                        // and the only reading of it that
                                        // survives wrapping (the block's
                                        // centre cannot: the taller the
                                        // title, the further its first line
                                        // is from it).
                                        verticalAlign: "top",
                                    },
                                    // FM-179: the one row shape that reads
                                    // better centred. A row with a cover tile
                                    // has a 56px object in its title cell and
                                    // one line of text in every other cell;
                                    // top-aligned, Indexer/Size/Actions cling
                                    // to the tile's upper edge with 40px of
                                    // empty cell under them, which is the
                                    // same complaint FM-175's rule above
                                    // answers for wrapped titles, mirrored.
                                    // Centred, they line up with the tile --
                                    // and with the title's first line, which
                                    // the title cell's own stack centres on
                                    // the tile in `ResultRow`. Rows without a
                                    // tile are untouched FM-175.
                                    "& tbody > tr[data-has-cover] > td": {
                                        verticalAlign: "middle",
                                    },
                                    // FM-175 (owner request, 2026-09-02): 8px
                                    // horizontal body padding, half MUI's
                                    // stock 16px, so the width the table
                                    // spends on gutters goes to the title
                                    // instead -- 8 cells' worth is ~112px, a
                                    // third of the Title column. A deviation
                                    // from stock `MuiTableCell` density, and
                                    // deliberately authored here rather than
                                    // in `theme.ts`: this is the one table in
                                    // the application whose content is
                                    // squeezed (ADR-0011 forbids it a
                                    // horizontal scrollbar), so every other
                                    // table keeps the stock padding.
                                    //
                                    // Three cells are excluded, each for its
                                    // own reason: the checkbox cell keeps
                                    // MUI's `padding="checkbox"` box
                                    // (`0 0 0 4px`), which is already tighter
                                    // than 8px and is what the header
                                    // checkbox is positioned against; Title
                                    // sets its own left padding in
                                    // `ResultRow` because it also carries the
                                    // per-level nesting indent, and this
                                    // descendant selector would outrank it;
                                    // and Actions is handled just below.
                                    '& tbody > tr > td:not([data-label="Select"]):not([data-label="Title"]):not([data-label="Actions"])':
                                        {
                                            paddingLeft: ROW_PADDING_X,
                                            paddingRight: ROW_PADDING_X,
                                        },
                                    // FM-175: the Actions cell spends its
                                    // right padding too. It is the last cell
                                    // in the row, its content is
                                    // right-aligned icon buttons that already
                                    // carry 4px of their own padding, and the
                                    // 8px would otherwise sit between the
                                    // last icon and the table's edge doing
                                    // nothing. The header cell above drops
                                    // the same padding so the "ACTIONS" label
                                    // stays flush with the icons beneath it.
                                    '& tbody > tr > td[data-label="Actions"]': {
                                        paddingLeft: ROW_PADDING_X,
                                        paddingRight: 0,
                                    },
                                    // FM-175: the row checkbox's visible
                                    // square lines up with the header's.
                                    // Both cells carry MUI's
                                    // `padding="checkbox"` 4px left inset, so
                                    // the two boxes share an x only if the
                                    // row's `Checkbox` adds nothing of its
                                    // own -- its stock 9px padding is exactly
                                    // the 9px offset the header's flat 17x17
                                    // `p: 0` square (`SelectionMenu.tsx`)
                                    // does not have. Removing the padding
                                    // rather than pulling the control left
                                    // with a negative margin keeps it inside
                                    // its cell, clear of the recency stripe
                                    // the same cell draws as an inset shadow
                                    // on its left edge. The control keeps its
                                    // 20px `size="small"` box, its ripple and
                                    // ADR-0013's focus ring, all of which are
                                    // drawn on this root; only the dead space
                                    // around it goes. Authored here rather
                                    // than in `ResultRow` because the compact
                                    // branch below reaches every
                                    // `.MuiCheckbox-root` in the body as a
                                    // descendant of this same `sx` and would
                                    // outrank a per-instance `sx` -- at this
                                    // specificity the alignment holds at both
                                    // densities instead of drifting 2px when
                                    // compact rows are on.
                                    '& tbody > tr > td[data-label="Select"] .MuiCheckbox-root':
                                        {padding: 0},
                                    // FM-175: the row's icons drop from a
                                    // 20px glyph in a 28px button to a 16px
                                    // glyph in a 24px one (the theme's
                                    // `MuiIconButton` 4px padding is
                                    // untouched, so the box follows the
                                    // glyph). At 16px they are the scale of
                                    // the 12-13px text beside them instead of
                                    // half again as tall, which is what stops
                                    // the Actions cell and the title's expand
                                    // controls from setting every row's
                                    // height. Scoped to this table's body by
                                    // descendant selector: `MuiSvgIcon`'s own
                                    // `fontSize="small"` step is a
                                    // theme-level token and every other icon
                                    // in the application keeps it.
                                    '& tbody > tr > td[data-label="Title"] .MuiIconButton-root .MuiSvgIcon-root, & tbody > tr > td[data-label="Actions"] .MuiSvgIcon-root':
                                        {fontSize: ROW_ICON_GLYPH_SIZE},
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
                                        traded Age's and Size's *mathematical*
                                        worst case for the values users
                                        actually see and gave the surplus to
                                        Title, as percentages of the ~896px a
                                        1280x800 viewport leaves beside the
                                        docked refine sidebar. FM-175 (owner
                                        request, 2026-09-02) keeps that trade
                                        and changes how it is expressed: every
                                        column except Title is now a fixed
                                        pixel track sized for its own header
                                        label, and Title carries no width at
                                        all, so it is the single track the
                                        remainder falls into. Measured at that
                                        same basis, with the body cells'
                                        8px horizontal padding (below):

                                        - Table 936px, of which the 40px
                                          checkbox track plus
                                          90+98+65+90+52+140 = 535px of named
                                          tracks leaves Title 361px, i.e. a
                                          345px content box -- up from
                                          FM-150's 349px track / 317px box,
                                          and clear of the 340px FM-175 was
                                          given as its floor. That is the
                                          zero-downloader table; see the
                                          Actions bullet below for what one
                                          and two downloaders leave.
                                        - The named tracks each clear their
                                          own header label's measured width
                                          (uppercase 11px plus the sort glyph
                                          plus the cell's 8px paddings):
                                          Indexer 88/90, Category 96/98, Size
                                          64/65, Details 87/90, Age 51/52.
                                          Age keeps the halved header padding
                                          FM-150 gave it (see the header
                                          cell's own note below); without it
                                          "AGE (glyph)" would need 59px.
                                        - Age and Size keep FM-150's accepted
                                          exposure: `9999d` and `999.99 GB`
                                          are wider than their tracks and
                                          spill left into the neighbouring
                                          column's padding. These cells are
                                          `nowrap`, so nothing reflows and
                                          the value stays legible -- accepted
                                          there, unchanged here.
                                        - Actions is 140px for its fixed
                                          inventory: four 24px detail icons
                                          plus the 24px download, 5x24 plus
                                          four 4px gaps = 136px, so the icon
                                          group never wraps and the
                                          "Downloaded" chip still has a line
                                          to drop to. FM-186 (owner request,
                                          2026-09-05) adds one 24px send
                                          button and one 4px gap per enabled
                                          downloader to that same group, so
                                          the track is
                                          `actionsTrackWidth(count)` =
                                          140 + 28*count -- 168px at one
                                          downloader, 196px at two -- and
                                          both width sets are derived from
                                          that one function rather than
                                          restated.
                                        - Title absorbs the difference, as
                                          the only track with no width: its
                                          content box is 345px with no
                                          downloader, 317px with one and
                                          289px with two. The 289px is below
                                          FM-175's 340px floor and is
                                          accepted by this request, which
                                          asked for the send buttons on the
                                          row and for the track to grow with
                                          the downloader count rather than
                                          for the icons to wrap.
                                        - FM-187 (owner request, 2026-09-05)
                                          adds one more slot of exactly that
                                          size for the send-to-black-hole
                                          button, but only while some loaded
                                          result would render it
                                          (`blackHoleSlot` in
                                          `resultTable.ts`). It is derived
                                          from the results, not the config
                                          alone, because `sendMagnetLinks`
                                          defaults to true and an NZB-only
                                          install must stay at 140px; and from
                                          the *unfiltered* results, so refining
                                          never shifts the columns.

                                        These `<col>` elements carry no width
                                        of their own: both sets of tracks are
                                        CSS rules in the `sx` above, because
                                        an inline width could not be swapped
                                        at a breakpoint. Between the 768px
                                        stacking breakpoint (below which the
                                        `<colgroup>` stops applying at all --
                                        the cells become blocks) and the
                                        1280px basis, the pixel tracks would
                                        add up to more table than there is:
                                        a fixed layout does not scale them
                                        down, it overflows, so
                                        `narrowTableColumnWidths` holds
                                        the same shape as percentages there
                                        and ADR-0011's "no horizontal scroll"
                                        stays true at every width. */}
                                <colgroup>
                                    {pixelColumnWidths.map((_, index) => (
                                        <col key={index} />
                                    ))}
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
                                                                            ? AGE_HEADER_CELL_PADDING_X
                                                                            : HEADER_CELL_PADDING_X,
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
                                                                            // The mock gives the Title
                                                                            // sort button `padding:0
                                                                            // 6px` and every other
                                                                            // column's `0 4px`
                                                                            // (`uimock/NZBHydra
                                                                            // Search.dc.html:270-277`).
                                                                            // FM-175 drops Title's to
                                                                            // zero -- a mock-pixel
                                                                            // deviation, which
                                                                            // ADR-0014 allows freely.
                                                                            // Title is the one
                                                                            // left-aligned header, so
                                                                            // its own padding is what
                                                                            // decides where the word
                                                                            // "TITLE" starts, and the
                                                                            // owner asked for the
                                                                            // titles beneath it to
                                                                            // start at the same x.
                                                                            // The body cell can only
                                                                            // offer its 8px padding
                                                                            // edge; 6px of button
                                                                            // padding on top of the
                                                                            // header's own 8px would
                                                                            // leave the label 6px
                                                                            // adrift of every title
                                                                            // in the column. The
                                                                            // right-aligned headers
                                                                            // keep their 4px, which
                                                                            // is what holds them off
                                                                            // their cell's right
                                                                            // edge.
                                                                            px: isTitle
                                                                                ? 0
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
                                                        // FM-175: the one
                                                        // header cell that
                                                        // does not take the
                                                        // `px: 1` above,
                                                        // because the Actions
                                                        // *body* cell drops
                                                        // its right padding
                                                        // entirely. A label
                                                        // right-aligned 16px
                                                        // -- or even 8px --
                                                        // inside the column
                                                        // whose icons sit
                                                        // flush against the
                                                        // table's edge reads
                                                        // as a misaligned
                                                        // header, so this
                                                        // cell matches the
                                                        // body cell's box
                                                        // rather than the
                                                        // other headers'.
                                                        pl: HEADER_CELL_PADDING_X,
                                                        position: "sticky",
                                                        pr: 0,
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
                                <TableBody ref={tableBodyRef}>
                                    {/* FM-162: the space the rows above the
                                        rendered window would occupy. An
                                        in-flow row, so the fixed table layout
                                        and the <768px card layout both handle
                                        it without knowing it is there. */}
                                    {spacerHeightTop > 0 && (
                                        <TableRow
                                            aria-hidden="true"
                                            data-testid="results-virtual-spacer-top"
                                            data-virtual-spacer="top"
                                        >
                                            <TableCell
                                                colSpan={TABLE_COLUMN_COUNT}
                                                style={{
                                                    height: `${spacerHeightTop}px`,
                                                }}
                                            />
                                        </TableRow>
                                    )}
                                    {virtualRows.map((virtualRow) => {
                                        const row =
                                            rowDescriptors[virtualRow.index];
                                        return (
                                            <ResultRow
                                                coverWidth={
                                                    showCovers
                                                        ? coverWidth
                                                        : undefined
                                                }
                                                dereferer={dereferer}
                                                downloaded={downloadedIds.has(
                                                    row.result.searchResultId,
                                                )}
                                                downloadSettings={settings}
                                                downloaders={downloaders}
                                                duplicateExpanded={
                                                    row.duplicateExpanded
                                                }
                                                duplicateKey={row.duplicateKey}
                                                expandSlots={expandSlots}
                                                indexerColors={indexerColors}
                                                isNewGroup={row.isNewGroup}
                                                key={row.result.searchResultId}
                                                maySeeDetailsDl={
                                                    maySeeDetailsDl
                                                }
                                                nestingLevel={row.nestingLevel}
                                                onDownloaded={handleDownloaded}
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
                                                titleExpanded={
                                                    row.titleExpanded
                                                }
                                                titleGroupKey={
                                                    row.titleGroupKey
                                                }
                                                transport={transport}
                                            />
                                        );
                                    })}
                                    {spacerHeightBottom > 0 && (
                                        <TableRow
                                            aria-hidden="true"
                                            data-testid="results-virtual-spacer-bottom"
                                            data-virtual-spacer="bottom"
                                        >
                                            <TableCell
                                                colSpan={TABLE_COLUMN_COUNT}
                                                style={{
                                                    height: `${spacerHeightBottom}px`,
                                                }}
                                            />
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
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
                <Stack
                    data-testid="results-paging-footer"
                    sx={{gap: 1, padding: "16px 0"}}
                >
                    {moreResultsAvailable && (
                        <Typography component="div" variant="subtitle2">
                            {availableResultsPhrase} available
                        </Typography>
                    )}
                    <Stack direction="row" sx={{gap: 1}}>
                        <Button
                            aria-busy={pagingLoading}
                            data-testid="results-load-more"
                            disabled={!pagingAvailable || pagingLoading}
                            onClick={() => void requestContinuation(false)}
                            size="small"
                            sx={{flex: 1}}
                        >
                            {pagingLoading
                                ? "Loading more results…"
                                : "Load more"}
                        </Button>
                        <Button
                            data-testid="results-load-all"
                            disabled={!pagingAvailable || pagingLoading}
                            onClick={() => void requestLoadAll()}
                            size="small"
                            sx={{flex: 1}}
                        >
                            Load all results
                        </Button>
                    </Stack>
                </Stack>
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
