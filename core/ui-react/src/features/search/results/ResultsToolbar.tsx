import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import {Badge, Box, Button, IconButton, Stack, Typography} from "@mui/material";
import type {SortingState, Table} from "@tanstack/react-table";
import type {ContextType, Dispatch, RefObject, SetStateAction} from "react";

import type {SearchResponse, SearchResult} from "../../../api/search";
import type {DialogContext} from "../../../components/dialogs/dialogs";
import type {ToastContext} from "../../../components/toasts/toasts";
import {DownloadActions} from "./DownloadActions";
import {REFINE_LABELS} from "./RefineSidebar";
import {
    DisplayOptionsMenu,
    RejectedResultsTrigger,
    ResultsSortMenu,
} from "./ResultsPopovers";
import {SelectionMenu} from "./SelectionMenu";
import type {SelectionStatus} from "./resultTable";

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
    effectiveSafeConfig,
    filteredOutCount,
    filteredResults,
    groupEpisodes,
    groupTorrentAndUsenet,
    hasRejectedResults,
    hasResults,
    highlightRecent,
    invertVisibleSelection,
    moreResultsAvailable,
    onLoadMore,
    onSaveSearch,
    pagingAvailable,
    pagingLoading,
    refineSurfaceCompact,
    refineSurfaceShown,
    requestContinuation,
    requestLoadAll,
    savingSearch,
    selectAllVisible,
    selected,
    selectedResults,
    setCompactRows,
    setDownloadedIds,
    setGroupEpisodes,
    setGroupTorrentAndUsenet,
    setHighlightRecent,
    setSelected,
    setShowCovers,
    setShowDuplicateControls,
    setSorting,
    showCovers,
    showDuplicateControls,
    sorting,
    table,
    toasts,
    toggleRefineSurface,
    toolbarRef,
}: {
    activeFilters: number;
    availableResultsPhrase: string;
    compactRows: boolean;
    currentSelectionStatus: SelectionStatus;
    data: SearchResponse;
    deselectAllVisible: () => void;
    dialogs: ContextType<typeof DialogContext>;
    effectiveSafeConfig: unknown;
    filteredOutCount: number;
    filteredResults: SearchResult[];
    groupEpisodes: boolean;
    groupTorrentAndUsenet: boolean;
    hasRejectedResults: boolean;
    hasResults: boolean;
    highlightRecent: boolean;
    invertVisibleSelection: () => void;
    moreResultsAvailable: boolean;
    onLoadMore?: (loadAll: boolean) => Promise<void>;
    onSaveSearch?: () => Promise<void>;
    pagingAvailable: boolean;
    pagingLoading: boolean;
    refineSurfaceCompact: boolean;
    refineSurfaceShown: boolean;
    requestContinuation: (loadAll: boolean) => Promise<void>;
    requestLoadAll: () => Promise<void>;
    savingSearch: boolean;
    selectAllVisible: () => void;
    selected: Set<string>;
    selectedResults: SearchResult[];
    setCompactRows: Dispatch<SetStateAction<boolean>>;
    setDownloadedIds: Dispatch<SetStateAction<Set<string>>>;
    setGroupEpisodes: Dispatch<SetStateAction<boolean>>;
    setGroupTorrentAndUsenet: Dispatch<SetStateAction<boolean>>;
    setHighlightRecent: Dispatch<SetStateAction<boolean>>;
    setSelected: Dispatch<SetStateAction<Set<string>>>;
    setShowCovers: Dispatch<SetStateAction<boolean>>;
    setShowDuplicateControls: Dispatch<SetStateAction<boolean>>;
    setSorting: (next: SortingState) => void;
    showCovers: boolean;
    showDuplicateControls: boolean;
    sorting: SortingState;
    table: Table<SearchResult>;
    toasts: ContextType<typeof ToastContext>;
    toggleRefineSurface: () => void;
    toolbarRef: RefObject<HTMLDivElement | null>;
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
                                disabled={!pagingAvailable || pagingLoading}
                                onClick={() => void requestContinuation(false)}
                                size="small"
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
                                          // Owner (2026-09-07): room
                                          // between the three touch
                                          // targets; they abutted.
                                          gap: 1,
                                      }
                                    : {}),
                            }}
                        >
                            <DisplayOptionsMenu
                                compact={refineSurfaceCompact}
                                compactRows={compactRows}
                                groupEpisodes={groupEpisodes}
                                groupTorrentAndUsenet={groupTorrentAndUsenet}
                                highlightRecent={highlightRecent}
                                onToggleCompactRows={() =>
                                    setCompactRows((current) => !current)
                                }
                                onToggleGroupEpisodes={() =>
                                    setGroupEpisodes((current) => !current)
                                }
                                onToggleGroupTorrentAndUsenet={() =>
                                    setGroupTorrentAndUsenet(
                                        (current) => !current,
                                    )
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
                                refineSurfaceShown={refineSurfaceShown}
                                showCovers={showCovers}
                                showDuplicateControls={showDuplicateControls}
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
