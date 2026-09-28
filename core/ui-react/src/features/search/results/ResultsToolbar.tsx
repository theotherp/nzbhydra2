import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import {
    Badge,
    Box,
    Button,
    IconButton,
    Link,
    Stack,
    Typography,
} from "@mui/material";
import type {SortingState, Table} from "@tanstack/react-table";
import type {
    ContextType,
    Dispatch,
    ReactNode,
    RefObject,
    SetStateAction,
} from "react";

import type {SearchResponse, SearchResult} from "../../../api/search";
import type {DialogContext} from "../../../components/dialogs/dialogs";
import type {ToastContext} from "../../../components/toasts/toasts";
import {downloadSettings} from "../../../domain/downloads/actions";
import {DownloadActions} from "./DownloadActions";
import {LoadMoreButton} from "./LoadMoreButton";
import {REFINE_LABELS} from "./refineLabels";
import {
    DisplayOptionsMenu,
    RejectedResultsTrigger,
    ResultsSortMenu,
} from "./ResultsPopovers";
import {SelectionMenu} from "./SelectionMenu";
import type {HideableResultColumn, SelectionStatus} from "./resultTable";

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

// The sticky background every pinned region shares, so rows/content
// scrolling underneath a sticky region never show through it. The same
// token `theme.ts`'s scrollbar `styleOverrides` already reads for the page
// background (see that file's `mockPalette.backgroundDefault`), reused
// here rather than restated as a new literal.
//
// FM-192: exported because the results table's three sticky header cells
// pin directly beneath this toolbar and share its background by definition;
// `HEADER_STICKY_Z_INDEX`, its counterpart above, has only one consumer and
// lives with the table.
export const STICKY_BACKGROUND = "background.default";

/**
 * FM-192: the sticky results toolbar, moved verbatim out of `SearchResults`.
 *
 * Its `showToolbar` condition stays at the call site, so this component renders
 * exactly when the region did before. Everything it needs arrives as a prop:
 * `SearchResults` remains the data pipeline, and the display choices and the
 * selection reach it from the two hooks that now own them.
 */
export function ResultsToolbar({
    activeFilters,
    availableResultsPhrase,
    compactRows,
    currentSelectionStatus,
    data,
    deselectAllVisible,
    dialogs,
    downloadedCount,
    effectiveSafeConfig,
    expandGroupsByDefault,
    filteredOutCount,
    filteredResults,
    groupEpisodes,
    groupTitles,
    groupTorrentAndUsenet,
    hasRejectedResults,
    hasResults,
    hideDownloaded,
    highlightRecent,
    indexerFailureCount,
    indexerSummaryAllowed,
    invertVisibleSelection,
    moreResultsAvailable,
    onLoadMore,
    onSaveSearch,
    onRevealIndexerSummary,
    onToggleExpandGroupsByDefault,
    pagingAvailable,
    pagingLoading,
    refineSurfaceCompact,
    refineSurfaceShown,
    loadAmounts,
    loadPageSize,
    requestContinuation,
    requestLoadAll,
    requestLoadAmount,
    savingSearch,
    selectAllVisible,
    selected,
    selectedResults,
    setColumnShown,
    setCompactRows,
    setDownloadedIds,
    setGroupEpisodes,
    setGroupTitles,
    setGroupTorrentAndUsenet,
    setHideDownloaded,
    setHighlightRecent,
    setSelected,
    setShowCovers,
    setShowDuplicateControls,
    setShowIndexerSummary,
    setShowZipButton,
    setSorting,
    showCategoryColumn,
    showCovers,
    showDetailsColumn,
    showDuplicateControls,
    showIndexerSummary,
    showZipButton,
    sorting,
    table,
    toasts,
    toggleRefineSurface,
    toolbarRef,
    topPager,
}: {
    activeFilters: number;
    availableResultsPhrase: string;
    compactRows: boolean;
    currentSelectionStatus: SelectionStatus;
    data: SearchResponse;
    deselectAllVisible: () => void;
    dialogs: ContextType<typeof DialogContext>;
    // FM-198: the entry's count -- every loaded result carrying a
    // `downloadedAt`, computed once in `SearchResults` regardless of this
    // option's own state.
    downloadedCount: number;
    effectiveSafeConfig: unknown;
    expandGroupsByDefault: boolean;
    filteredOutCount: number;
    filteredResults: SearchResult[];
    groupEpisodes: boolean;
    groupTitles: boolean;
    groupTorrentAndUsenet: boolean;
    hasRejectedResults: boolean;
    hasResults: boolean;
    // FM-198: legacy's "Hide already downloaded results"
    // (`search-results-controller.js:170,210` at `3ce28441e^`), off by
    // default here; see `useResultDisplayChoices`.
    hideDownloaded: boolean;
    highlightRecent: boolean;
    // FM-199: searched indexers that failed, shown as a hint in the count
    // phrase while the indexer summary is hidden.
    indexerFailureCount: number;
    // Whether this user may see the indexer summary at all (their indexer
    // selection is not restricted). Without it the failure hint is plain
    // text and the Display menu has no summary entry.
    indexerSummaryAllowed: boolean;
    invertVisibleSelection: () => void;
    moreResultsAvailable: boolean;
    onLoadMore?: (loadAll: boolean, limit?: number) => Promise<number | void>;
    onSaveSearch?: () => Promise<void>;
    // FM-199: re-shows and expands the indexer summary.
    onRevealIndexerSummary: () => void;
    // Not a `Dispatch` like its neighbours: flipping this option also drops
    // the per-group expansion overrides, which only `SearchResults` holds.
    onToggleExpandGroupsByDefault: () => void;
    pagingAvailable: boolean;
    pagingLoading: boolean;
    refineSurfaceCompact: boolean;
    refineSurfaceShown: boolean;
    requestContinuation: (loadAll: boolean) => Promise<void>;
    requestLoadAll: () => Promise<void>;
    /** The amounts "Load more ▾" offers (`loadMoreAmounts`). */
    loadAmounts: number[];
    /** What the plain "Load N more" loads. */
    loadPageSize: number;
    requestLoadAmount: (amount: number) => Promise<void>;
    savingSearch: boolean;
    selectAllVisible: () => void;
    selected: Set<string>;
    selectedResults: SearchResult[];
    // FM-200: shows or hides the Category or Details column. Not a
    // `Dispatch`: `SearchResults` also clears that column's refine filter and
    // the hook falls back from a sort on it.
    setColumnShown: (column: HideableResultColumn, shown: boolean) => void;
    setCompactRows: Dispatch<SetStateAction<boolean>>;
    setDownloadedIds: Dispatch<SetStateAction<Set<string>>>;
    setGroupEpisodes: Dispatch<SetStateAction<boolean>>;
    setGroupTitles: Dispatch<SetStateAction<boolean>>;
    setGroupTorrentAndUsenet: Dispatch<SetStateAction<boolean>>;
    setHideDownloaded: Dispatch<SetStateAction<boolean>>;
    setHighlightRecent: Dispatch<SetStateAction<boolean>>;
    setSelected: Dispatch<SetStateAction<Set<string>>>;
    setShowCovers: Dispatch<SetStateAction<boolean>>;
    setShowDuplicateControls: Dispatch<SetStateAction<boolean>>;
    setShowIndexerSummary: Dispatch<SetStateAction<boolean>>;
    setShowZipButton: Dispatch<SetStateAction<boolean>>;
    setSorting: (next: SortingState) => void;
    showCategoryColumn: boolean;
    showCovers: boolean;
    showDetailsColumn: boolean;
    showDuplicateControls: boolean;
    showIndexerSummary: boolean;
    // FM-197: the browser-local preference; see `useResultDisplayChoices`.
    showZipButton: boolean;
    sorting: SortingState;
    table: Table<SearchResult>;
    toasts: ContextType<typeof ToastContext>;
    toggleRefineSurface: () => void;
    toolbarRef: RefObject<HTMLDivElement | null>;
    /** The compact results pager, or `null` while nothing is paged. */
    topPager: ReactNode;
}) {
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
    // FM-197: derived once, from the live config
    // (`downloadSettings(effectiveSafeConfig).zip`), and passed to both the
    // Display popover's entry and `DownloadActions`'s button/menu-item so
    // neither can disagree about whether a server-built ZIP is even
    // possible.
    const zipButtonAllowed = downloadSettings(effectiveSafeConfig).zip;
    const mobileSelectionMenu = (
        <SelectionMenu
            idPrefix="toolbar"
            onDeselectAll={deselectAllVisible}
            onInvertSelection={invertVisibleSelection}
            onSelectAll={selectAllVisible}
            status={currentSelectionStatus}
        />
    );
    return (
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
                        flexWrap: refineSurfaceCompact ? "nowrap" : "wrap",
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
                                        count={data.numberOfRejectedResults}
                                        reasons={data.rejectedReasonsMap}
                                    />
                                </>
                            )}
                            {/* FM-199 (owner, 2026-09-26): with the
                                indexer summary hidden a failed indexer
                                would be silent again, so the phrase names
                                it, and activating it brings the summary
                                back expanded. Same inline `Link` anatomy
                                as the rejection trigger beside it; the
                                warning colour is the header's own "N
                                failed". */}
                            {(!showIndexerSummary || !indexerSummaryAllowed) &&
                                indexerFailureCount > 0 && (
                                    <>
                                        {" · "}
                                        {indexerSummaryAllowed ? (
                                            <Link
                                                component="button"
                                                data-testid="results-indexer-failures"
                                                onClick={onRevealIndexerSummary}
                                                sx={{color: "warning.main"}}
                                                type="button"
                                            >
                                                {indexerFailurePhrase(
                                                    indexerFailureCount,
                                                )}
                                            </Link>
                                        ) : (
                                            <Box
                                                component="span"
                                                data-testid="results-indexer-failures"
                                                sx={{color: "warning.main"}}
                                            >
                                                {indexerFailurePhrase(
                                                    indexerFailureCount,
                                                )}
                                            </Box>
                                        )}
                                    </>
                                )}
                            {!refineSurfaceCompact && selected.size > 0 && (
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
                            columns={table.getVisibleLeafColumns()}
                            onSortingChange={setSorting}
                            sorting={sorting}
                        />
                    )}
                    {!refineSurfaceCompact && onLoadMore && (
                        <>
                            <LoadMoreButton
                                amounts={loadAmounts}
                                pageSize={loadPageSize}
                                onLoadAmount={(amount) =>
                                    void requestLoadAmount(amount)
                                }
                                onLoadMore={() =>
                                    void requestContinuation(false)
                                }
                                pagingAvailable={pagingAvailable}
                                pagingLoading={pagingLoading}
                            />
                            <Button
                                data-testid="results-load-all"
                                disabled={!pagingAvailable || pagingLoading}
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
                            // With results paged, the desktop cluster
                            // holds the compact pager as well, left of
                            // Display, and lays the two out the same way,
                            // at the 1.5 gap the rest of the desktop row
                            // already uses.
                            sx={{
                                ml: "auto",
                                ...(refineSurfaceCompact || topPager
                                    ? {
                                          alignItems: "center",
                                          display: "flex",
                                          // Owner (2026-09-07): room
                                          // between the three touch
                                          // targets; they abutted.
                                          gap: refineSurfaceCompact ? 1 : 1.5,
                                      }
                                    : {}),
                            }}
                        >
                            {topPager}
                            <DisplayOptionsMenu
                                compact={refineSurfaceCompact}
                                compactRows={compactRows}
                                downloadedCount={downloadedCount}
                                expandGroupsByDefault={expandGroupsByDefault}
                                groupEpisodes={groupEpisodes}
                                groupTitles={groupTitles}
                                groupTorrentAndUsenet={groupTorrentAndUsenet}
                                hideDownloaded={hideDownloaded}
                                highlightRecent={highlightRecent}
                                onToggleCategoryColumn={() =>
                                    setColumnShown(
                                        "category",
                                        !showCategoryColumn,
                                    )
                                }
                                onToggleCompactRows={() =>
                                    setCompactRows((current) => !current)
                                }
                                onToggleDetailsColumn={() =>
                                    setColumnShown("grabs", !showDetailsColumn)
                                }
                                onToggleExpandGroupsByDefault={
                                    onToggleExpandGroupsByDefault
                                }
                                onToggleGroupEpisodes={() =>
                                    setGroupEpisodes((current) => !current)
                                }
                                onToggleGroupTitles={() =>
                                    setGroupTitles((current) => !current)
                                }
                                onToggleGroupTorrentAndUsenet={() =>
                                    setGroupTorrentAndUsenet(
                                        (current) => !current,
                                    )
                                }
                                onToggleHideDownloaded={() =>
                                    setHideDownloaded((current) => !current)
                                }
                                onToggleHighlightRecent={() =>
                                    setHighlightRecent((current) => !current)
                                }
                                onToggleRefineSurface={toggleRefineSurface}
                                onToggleShowCovers={() =>
                                    setShowCovers((current) => !current)
                                }
                                onToggleShowDuplicateControls={() =>
                                    setShowDuplicateControls(
                                        (current) => !current,
                                    )
                                }
                                onToggleShowZipButton={() =>
                                    setShowZipButton((current) => !current)
                                }
                                onToggleShowIndexerSummary={() =>
                                    setShowIndexerSummary((current) => !current)
                                }
                                refineSurfaceShown={refineSurfaceShown}
                                showCategoryColumn={showCategoryColumn}
                                showCovers={showCovers}
                                showDetailsColumn={showDetailsColumn}
                                showDuplicateControls={showDuplicateControls}
                                indexerSummaryAllowed={indexerSummaryAllowed}
                                showIndexerSummary={showIndexerSummary}
                                showZipButton={showZipButton}
                                zipButtonAllowed={zipButtonAllowed}
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
                                        aria-expanded={refineSurfaceShown}
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
                                                downloadIdFor(result).split(
                                                    ".",
                                                )[0],
                                            ),
                                        ),
                                    )
                                    .map((result) => result.searchResultId);
                                setDownloadedIds(
                                    (current) =>
                                        new Set([...current, ...affected]),
                                );
                                setSelected(
                                    (current) =>
                                        new Set(
                                            [...current].filter(
                                                (id) => !affected.includes(id),
                                            ),
                                        ),
                                );
                            }}
                            onSaveSearch={onSaveSearch}
                            results={selectedResults}
                            // FM-159 (ADR-0017): the *live* config,
                            // so a downloader added, removed, or
                            // edited in Config -> Downloading becomes
                            // (or stops being) a send target in
                            // already-rendered results without a
                            // reload. Falls back to the bootstrap
                            // seed with no provider above.
                            safeConfig={effectiveSafeConfig}
                            savingSearch={savingSearch}
                            showZipButton={showZipButton}
                            zipButtonAllowed={zipButtonAllowed}
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
    );
}

function downloadIdFor(result: SearchResult): string {
    return result.downloadId ?? result.searchResultId;
}

function indexerFailurePhrase(count: number): string {
    return `${count} ${count === 1 ? "indexer" : "indexers"} failed`;
}
