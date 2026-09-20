import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
    Box,
    Checkbox,
    Chip,
    IconButton,
    Popover,
    Stack,
    TableCell,
    TableRow,
    Tooltip,
} from "@mui/material";
import type {SxProps, Theme} from "@mui/material";
import type {
    FocusEvent as ReactFocusEvent,
    KeyboardEvent as ReactKeyboardEvent,
    PointerEvent as ReactPointerEvent,
    ReactNode,
} from "react";
import {memo, useState} from "react";

import {isAbsoluteCoverUrl, type SearchResult} from "../../../api/search";
import type {ApiTransport} from "../../../api/transport";
import type {
    Downloader,
    downloadSettings,
} from "../../../domain/downloads/actions";
import {CoverLightbox} from "./CoverLightbox";
import {DirectDownloadActions} from "./DownloadActions";
import {
    buildQualityTooltipSections,
    qualityBadgeSeverity,
} from "./qualityBadge";
import {ResultDetailLinks} from "./ResultDetailLinks";
import {SendToBlackHoleButton} from "./SendToBlackHoleButton";
import {SendToDownloaderButtons} from "./SendToDownloaderButtons";
import {formatResultDetails, formatResultSize} from "./resultTable";

/**
 * FM-176: the two expand-control slots the current render reserves in every
 * row's title cell, in render order -- `title` (left) then `duplicate`
 * (right). A slot is reserved as soon as one visible row carries that control;
 * rows without it render an `ExpandSpacer` there. `duplicate` is additionally
 * gated by the "Show duplicate expand controls" display option, so with the
 * option off no duplicate control and no slot for one exists at all.
 */
export type ExpandSlots = {
    duplicate: boolean;
    title: boolean;
};

type ResultColumn = {
    align: "left" | "right";
    id: string;
    label: string;
    testId?: string;
    value: (result: SearchResult) => ReactNode;
};

// FM-175: the title cell's horizontal padding, in theme spacing units. The
// same 8px `SearchResults.tsx` gives every other body cell (`ROW_PADDING_X`
// there), restated here because this is the one cell whose left padding also
// carries the nesting indent and therefore cannot be set from the table.
const TITLE_CELL_PADDING_X = 1;

/**
 * The body cells' style blocks. Every rule below used to be authored as one
 * `sx` object per cell per row, rebuilt whenever a row rendered; there are
 * only three shapes, two of which are constant, so they are built here once
 * instead. The declarations, their values and their order are unchanged --
 * the keys that were `undefined` in the shared object simply do not appear in
 * the shape that never set them, which emits the same CSS.
 */
const BODY_CELL_SX: SxProps<Theme> = {whiteSpace: "nowrap"};

/**
 * The recency flag's second, independent property: the age column's
 * accent-teal text color (the mock's `ageColor: isNew ? ACC_HI : ...`, read
 * from the theme as `primary.light` so the `dark-dyschromatopsia` variant
 * composes with it). Only the flagged state is styled -- an unflagged row
 * keeps exactly the color it had before FM-041, so the default rendering is
 * unchanged.
 */
const RECENT_AGE_CELL_SX: SxProps<Theme> = {
    color: "primary.light",
    whiteSpace: "nowrap",
};

/**
 * The recency flag's left-edge accent stripe, drawn on the row's first cell --
 * see the cell's own comment below. A module-level callback rather than an
 * inline one so its identity is stable across every row and every render.
 */
const RECENT_SELECT_CELL_SX = (theme: Theme) => ({
    boxShadow: `inset 3px 0 0 ${theme.alpha(theme.palette.primary.main, 0.4)}`,
});

/**
 * The title cell, the one body cell whose style depends on the row: it carries
 * the per-level nesting indent on top of the shared 8px horizontal padding.
 *
 * FM-042 (ADR-0011, sub-decision E-title (i)): `overflowWrap` is the modern
 * spelling of legacy's `.text-break` (`type.less:31-34`'s `word-wrap:
 * break-word; word-break: break-word`, applied to the title cell by
 * `search-result.html:3`). Release titles are dot-separated with no spaces, so
 * `white-space: normal` alone would not wrap them -- `overflow-wrap: anywhere`
 * is what lets a long, unbroken title wrap across multiple lines instead of
 * spilling into the next column. Not ellipsis and not a clamp: both were
 * presented and neither was selected: the owner's stated reason is that this
 * component has no `<Tooltip>`/`title=` recovery affordance anywhere, so
 * hiding a title's tail would have no way back.
 *
 * FM-175: the padding is the same 8px as every other body cell, but it is
 * authored here rather than in the table's `sx` because only this cell adds
 * the nesting indent on top of it -- a descendant selector on the table would
 * outrank a per-cell `pl` and flatten the hierarchy. One nesting level is
 * still 16px, unchanged; only the level-0 base moved from 16px to 8px.
 */
function titleCellSx(nestingLevel: number): SxProps<Theme> {
    return {
        overflowWrap: "anywhere",
        pl: TITLE_CELL_PADDING_X + nestingLevel * 2,
        pr: TITLE_CELL_PADDING_X,
        whiteSpace: "normal",
    };
}

// FM-179: the cover thumbnail's fixed box, in px.
//
// `COVER_TILE_HEIGHT` is three lines of the title cell's own text: body cells
// inherit MUI's `body2` 1.43 line-height and the title renders the shared
// `denseControlFontSize` 13px role, so one line is 18.59px and three are
// 55.77px. 56px is that, rounded -- a thumbnail as tall as the tallest row
// this table produces without one, so a covered row is not taller than a
// three-line coverless neighbour.
//
// `COVER_TILE_MIN_WIDTH` is what a 2:3 poster -- the shape every cover the
// backend serves has -- occupies at the tile's 54px inner height: 36px, plus
// the 1px border on each side. It is a *minimum*, not a width, and it is the
// whole point of the tile: the row reserves this footprint the moment it
// renders, before the image has loaded, so a late image lands inside a box
// that already has its final geometry instead of growing the row under the
// user's cursor.
const COVER_TILE_HEIGHT = 56;
const COVER_TILE_MIN_WIDTH = 38;

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
        // FM-082: legacy's full Details cell (`search-result.html:53-63`) --
        // grabs, then `seeders / peers` -- not the single `seeders ?? grabs`
        // value React collapsed it to. The column's *sorting* accessor is
        // deliberately unchanged.
        align: "right",
        id: "grabs",
        label: "Details",
        testId: "search-result-details",
        value: (result) => formatResultDetails(result),
    },
    {
        align: "right",
        id: "epoch",
        label: "Age",
        value: (result) => result.age ?? "",
    },
];

export const ResultRow = memo(function ResultRow({
    coverWidth,
    dereferer,
    downloaded,
    downloaders,
    downloadSettings: settings,
    duplicateExpanded,
    duplicateKey,
    expandSlots,
    indexerColors,
    isNewGroup,
    maySeeDetailsDl,
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
    transport,
}: {
    // FM-177: the width, in px, one cover is rendered at -- `undefined` while
    // the "Show covers" display option is off, which is what makes the option
    // reserve no width at all rather than render a zero-width image. A
    // primitive rather than the whole safe config, so the memoized row keeps
    // its `memo` comparison (the same reason `recent` and `indexerColors` are
    // resolved by the parent).
    coverWidth?: number;
    dereferer: unknown;
    downloaded: boolean;
    // FM-186: the enabled downloaders whose send buttons this row's Actions
    // cell renders, as one reference the parent memoizes on the live safe
    // config -- for the same reason `indexerColors` is passed that way rather
    // than as the config itself: this row is `memo`ized, and a config object
    // is rebuilt (name-for-name identical) by every unrelated config save.
    downloaders: Downloader[];
    // FM-187: the black hole configuration this row's send-to-black-hole
    // button is gated on, passed as one parent-memoized reference for exactly
    // the same `memo` reason as `downloaders` above.
    downloadSettings: ReturnType<typeof downloadSettings>;
    duplicateExpanded: boolean;
    duplicateKey: string;
    // FM-150/FM-176: which expand-control slots every row of the current
    // render reserves. The parent computes it because only the parent can see
    // every rendered row: a slot exists as soon as *any* visible row carries
    // that control, and every row then renders either its own control or a
    // same-sized invisible spacer in it, so the title text of every row at one
    // nesting level starts at the same x whether or not that row can expand
    // anything.
    //
    // FM-176 made the slots positional (they were a plain count before, padded
    // after the row's own controls): the left slot is always the title-group
    // control and the right slot always the duplicate control, so a
    // duplicate-only row renders [spacer][duplicate] and never puts its
    // duplicate control where a neighbouring row shows its group control.
    expandSlots: ExpandSlots;
    // FM-096: indexer name -> validated `rgb(r,g,b)` colour, built once per
    // config change in the parent (`indexerColorsFromSafeConfig`) and passed
    // down as this stable reference -- looking it up here rather than
    // rebuilding it per row keeps `ResultRow`'s `memo` meaningful.
    indexerColors: Record<string, string>;
    isNewGroup: boolean;
    maySeeDetailsDl: boolean;
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
    transport: ApiTransport;
}) {
    // FM-177: the two cover shapes the backend emits (see `SearchResult.cover`).
    // The absolute one is used verbatim; the proxied `cache/...` one is
    // resolved against the application base through the transport, so it keeps
    // working under a non-root base URL -- a hardcoded root path would not.
    const coverSrc =
        coverWidth !== undefined && result.cover !== undefined
            ? isAbsoluteCoverUrl(result.cover)
                ? result.cover
                : transport.browserTransferUrl(result.cover)
            : undefined;
    return (
        <TableRow
            // FM-179: "this row renders a cover tile", which is what the
            // table's `sx` keys its one middle-align rule on (`SearchResults.
            // tsx`). An attribute rather than a per-row `sx` prop: the rule
            // has to reach every *cell* of this row, and a descendant selector
            // authored once on the table is both cheaper than eight cell-level
            // overrides and the shape FM-175's `verticalAlign: top` rule
            // already has. Absent, not `"false"`, when there is no tile, so
            // the selector is a plain attribute presence test.
            {...(coverSrc !== undefined ? {"data-has-cover": ""} : {})}
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
                border so it consumes no layout width. FM-054 (ADR-0014): the
                stripe color is computed with the theme's own
                `theme.alpha()` against `primary.main` (colorSpace-aware --
                see `theme.ts`'s note on why the standalone `@mui/system`
                `alpha()` cannot decompose an `oklch()` token) instead of a
                restated `oklch(... / 0.4)` literal. */}
            <TableCell
                data-label="Select"
                padding="checkbox"
                sx={recent ? RECENT_SELECT_CELL_SX : undefined}
            >
                <Checkbox
                    checked={selected}
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
                    slotProps={{
                        input: {
                            "aria-label": `Select ${result.title}`,
                        },
                    }}
                />
            </TableCell>
            {resultColumns.map((column) => {
                const isTitle = column.id === "title";
                // FM-096: the swatch needs the config-derived `indexerColors`
                // map, which `resultColumns`' `value(result)` cannot see (it
                // is a module constant, built once, with no config in
                // scope) -- so this column is special-cased here, the same
                // way the title column already is for its expand buttons,
                // rather than widening `ResultColumn.value`'s signature for
                // one column.
                const isIndexer = column.id === "indexer";
                const indexerColor = isIndexer
                    ? indexerColors[result.indexer]
                    : undefined;
                return (
                    <TableCell
                        align={column.align}
                        data-label={column.label}
                        data-testid={column.testId}
                        key={column.id}
                        sx={
                            isTitle
                                ? titleCellSx(nestingLevel)
                                : recent && column.id === "epoch"
                                  ? RECENT_AGE_CELL_SX
                                  : BODY_CELL_SX
                        }
                    >
                        {isTitle ? (
                            // FM-150: `nowrap`, not the previous `wrap`. The
                            // expand controls are icons now, so the row is
                            // "controls, then title" rather than a chip row a
                            // long title could be pushed under -- and a
                            // wrapped title that slid back under the controls
                            // would break the shared start-of-title x this
                            // cell now guarantees. The title itself still
                            // wraps inside its own box.
                            <Stack
                                direction="row"
                                sx={{
                                    // FM-179: a row with a cover tile centres
                                    // its title's first line, indexer, size
                                    // and actions on the 56px tile (the
                                    // table's `data-has-cover` rule does the
                                    // other cells; this does the title cell's
                                    // own stack). Without a tile the row is
                                    // unchanged FM-175 top alignment.
                                    alignItems:
                                        coverSrc !== undefined
                                            ? "center"
                                            : "flex-start",
                                    flexWrap: "nowrap",
                                    gap: 0.5,
                                }}
                            >
                                {/* Slot 1 (left) is always the title-group
                                    control, slot 2 (right) always the
                                    duplicate one: whichever a row cannot
                                    offer, it reserves with a spacer instead of
                                    sliding the other control leftwards. */}
                                {expandSlots.title &&
                                    (showTitleExpand ? (
                                        <ExpandControl
                                            expanded={titleExpanded}
                                            collapsedIcon={
                                                <KeyboardArrowRightIcon fontSize="small" />
                                            }
                                            expandedIcon={
                                                <KeyboardArrowDownIcon fontSize="small" />
                                            }
                                            label={
                                                titleExpanded
                                                    ? "Collapse group"
                                                    : "Expand group"
                                            }
                                            onToggle={() =>
                                                onToggleTitleExpansion(
                                                    titleGroupKey,
                                                )
                                            }
                                        />
                                    ) : (
                                        <ExpandSpacer />
                                    ))}
                                {expandSlots.duplicate &&
                                    (showDuplicateExpand ? (
                                        <ExpandControl
                                            expanded={duplicateExpanded}
                                            collapsedIcon={
                                                <UnfoldMoreIcon fontSize="small" />
                                            }
                                            expandedIcon={
                                                <UnfoldLessIcon fontSize="small" />
                                            }
                                            label={
                                                duplicateExpanded
                                                    ? "Collapse duplicates"
                                                    : "Expand duplicates"
                                            }
                                            onToggle={() =>
                                                onToggleDuplicateExpansion(
                                                    duplicateKey,
                                                )
                                            }
                                        />
                                    ) : (
                                        <ExpandSpacer />
                                    ))}
                                {/* FM-177/FM-179: the cover, between the
                                    expand slots and the title text (legacy's
                                    position, `search-result.html:23-24`), as
                                    a fixed-height framed thumbnail that
                                    opens the full-size image on hover, focus
                                    or tap. */}
                                {coverSrc !== undefined &&
                                    coverWidth !== undefined && (
                                        <CoverThumbnail
                                            coverWidth={coverWidth}
                                            src={coverSrc}
                                            title={result.title}
                                        />
                                    )}
                                {/* Movie quality indicator (`search-result.html:33-38`).
                                    `qualityRating` is only ever populated
                                    alongside `qualityWarnings` for a movie
                                    result with the config flag on, so
                                    presence is the whole gate -- and, like
                                    legacy's `ng-if`, a rating of 0 renders
                                    nothing. */}
                                {result.qualityRating ? (
                                    <QualityBadge
                                        rating={result.qualityRating}
                                        warnings={result.qualityWarnings}
                                    />
                                ) : null}
                                <Box>{column.value(result)}</Box>
                            </Stack>
                        ) : isIndexer ? (
                            <Stack
                                direction="row"
                                sx={{
                                    alignItems: "center",
                                    gap: 0.5,
                                    justifyContent: "flex-end",
                                }}
                            >
                                {indexerColor !== undefined && (
                                    <Box
                                        aria-hidden
                                        data-testid="search-result-indexer-swatch"
                                        sx={{
                                            bgcolor: indexerColor,
                                            border: 1,
                                            borderColor: "divider",
                                            borderRadius: 0.5,
                                            flexShrink: 0,
                                            height: (theme) =>
                                                theme.spacing(1.5),
                                            width: (theme) =>
                                                theme.spacing(1.5),
                                        }}
                                    />
                                )}
                                {column.value(result)}
                            </Stack>
                        ) : (
                            column.value(result)
                        )}
                    </TableCell>
                );
            })}
            <TableCell align="right" data-label="Actions">
                {/* FM-150: a row at every breakpoint. This stack used to
                    switch to `column` at `sm` and up, which is what put the
                    download on a line of its own no matter how much room the
                    cell had. `flexWrap` stays on for the "Downloaded" chip --
                    the one item here that is not an icon -- which may still
                    drop below the icons in a narrow Actions column. */}
                <Stack
                    direction="row"
                    sx={{
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 0.5,
                        justifyContent: "flex-end",
                    }}
                >
                    {/* FM-150: the icons are one non-wrapping group, so the
                        download shares a line with the detail links instead of
                        being wrapped onto a line of its own -- `ResultDetailLinks`
                        is itself a flex container, and as a sibling flex item its
                        full four-icon width would otherwise claim the whole first
                        line and push the download below it. Inside this group the
                        links keep their own wrapping (ADR-0011: this cell must be
                        able to shrink), so in a narrow Actions column they fold
                        into a block with the download beside it rather than
                        forcing the row taller by a whole control. */}
                    <Stack
                        direction="row"
                        sx={{
                            alignItems: "center",
                            flexWrap: "nowrap",
                            gap: 0.5,
                            justifyContent: "flex-end",
                            minWidth: 0,
                        }}
                    >
                        {/* FM-082: the NFO action plus the session-gated
                            Binsearch/comments/details links legacy rendered in
                            its own Links column, kept in this cell so no ninth
                            column takes width from Title (ADR-0011). */}
                        <ResultDetailLinks
                            dereferer={dereferer}
                            maySeeDetailsDl={maySeeDetailsDl}
                            result={result}
                            transport={transport}
                        />
                        <DirectDownloadActions
                            iconOnly
                            onDownloaded={() =>
                                onDownloaded(result.searchResultId)
                            }
                            result={result}
                        />
                        {/* FM-186: legacy's per-downloader send icons, in
                            legacy's own position -- after the direct download
                            (`search-result.html`'s row: the direct link, then
                            one `addable-nzb` per enabled downloader). Inside
                            the non-wrapping group, so they stay on the
                            download's line; the Actions track is widened by
                            one slot per downloader to hold them
                            (`actionsTrackWidth` in `resultTable.ts`). */}
                        <SendToDownloaderButtons
                            downloaders={downloaders}
                            onDownloaded={() =>
                                onDownloaded(result.searchResultId)
                            }
                            result={result}
                            transport={transport}
                        />
                        {/* FM-187: legacy's `save-or-send-file`, last in the
                            group and in legacy's own position -- after the
                            downloader icons (`search-result.html:122`, one
                            control for every non-TORBOX row). It reserves the
                            same 28px Actions slot a downloader does, but only
                            when some loaded row actually renders it
                            (`blackHoleSlot` in `resultTable.ts`). */}
                        <SendToBlackHoleButton
                            onDownloaded={() =>
                                onDownloaded(result.searchResultId)
                            }
                            result={result}
                            settings={settings}
                            transport={transport}
                        />
                    </Stack>
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

/**
 * Movie quality indicator badge (`search-result.html:33-38`). A `Chip` is
 * the stock component for a coloured, labelled pill -- no bespoke `Box`
 * needed here, unlike `CoverThumbnail` below. Colour is chosen by severity
 * (`qualityBadgeSeverity`), never a literal: high/medium/low map onto
 * `success`/`warning`/`error`, the same palette roles the "Downloaded" chip
 * above already draws from.
 */
function QualityBadge({
    rating,
    warnings,
}: {
    rating: number;
    warnings?: string[];
}) {
    return (
        <Tooltip
            placement="right"
            title={<QualityTooltipContent warnings={warnings} />}
        >
            <Chip
                color={qualityBadgeSeverity(rating)}
                data-testid="search-result-quality-badge"
                label={rating}
                size="small"
            />
        </Tooltip>
    );
}

const QUALITY_SECTION_ICONS = {
    quality: (
        <MovieOutlinedIcon fontSize="inherit" sx={{color: "text.secondary"}} />
    ),
    critical: (
        <ErrorOutlineIcon fontSize="inherit" sx={{color: "error.main"}} />
    ),
    warning: (
        <WarningAmberIcon fontSize="inherit" sx={{color: "warning.main"}} />
    ),
} as const;

/** `formatQualityWarnings` (`search-result.js`), as a structured node rather
 * than the legacy HTML string -- the messages come from parsed release
 * titles and must never be interpreted as markup. */
function QualityTooltipContent({warnings}: {warnings?: string[]}) {
    const sections = buildQualityTooltipSections(warnings);
    if (sections.length === 0) {
        return <>No quality information available</>;
    }
    return (
        <Stack spacing={1}>
            {sections.map((section) => (
                <Box key={section.key}>
                    <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{alignItems: "center"}}
                    >
                        {QUALITY_SECTION_ICONS[section.key]}
                        <Box component="span" sx={{fontWeight: "bold"}}>
                            {section.heading}
                        </Box>
                    </Stack>
                    <Box component="ul" sx={{margin: 0, paddingLeft: 2.5}}>
                        {section.messages.map((message, index) => (
                            <Box component="li" key={index}>
                                {message}
                            </Box>
                        ))}
                    </Box>
                </Box>
            ))}
        </Stack>
    );
}

/**
 * FM-179: one row's cover, as a fixed-height framed thumbnail that shows the
 * full-size image in a `Popover` on hover and on focus.
 *
 * **The two surfaces (FM-196).** Hover and focus open the popover beside the
 * row -- a glance, which the pointer or the Tab key takes away again. A click,
 * a tap, Enter or Space open `CoverLightbox` instead, the full image centred
 * over a backdrop, which is the enlarge legacy had. They never overlap: the
 * click that opens the dialog closes the popover in the same commit, and the
 * popover stays suppressed until the dialog has finished leaving -- at which
 * point the focus MUI hands back to the trigger has it open again, which is
 * the state a keyboard user was in before. See the click handler for why that
 * ordering is not merely cosmetic.
 *
 * **Why a tile at all.** FM-177 rendered the raw poster at `searching.
 * coverSize` px wide: at 2:3 that is a ~190px row, and it only became that
 * tall once the image arrived, so every covered row reflowed under the
 * cursor. The tile fixes the height (`COVER_TILE_HEIGHT`) and reserves the
 * footprint (`COVER_TILE_MIN_WIDTH`) before the first byte of the image, so
 * the row's height is settled at mount. The virtualizer's `measureElement`
 * path stays exactly as it was: an image wider than the reserved minimum
 * still takes width from the title and can change how many lines it wraps to,
 * and FM-162 needs that observer for every other late height change anyway.
 *
 * **Why a `Box`, not a MUI component.** MUI has no thumbnail/framed-image
 * component (`Avatar` is a fixed square/circle with its own fallback
 * behaviour, `Card` a surface with elevation and its own padding), so the
 * frame is authored here (ADR-0014's "deviation from stock MUI needs a
 * justification at the site"). Every value it uses is a theme token --
 * `shape.borderRadius`, `palette.divider`, `palette.action.hover` -- and no
 * colour or radius literal appears.
 *
 * **Why a `Popover`, not a `Tooltip`.** A `Tooltip`'s `title` becomes the
 * child's accessible name or description, which would overwrite the trigger's
 * own "Show cover for ..." name with the image element; and its paper is a
 * 300px-capped text surface, so putting a poster in one means restyling
 * component internals. The popover is non-interactive by construction
 * (`pointerEvents: none`, and the three `disable*Focus` props), so it can
 * never take focus off the row -- which is what keeps `Escape` handled on the
 * trigger and the trigger still focused afterwards. The lightbox is the
 * opposite on every count, and deliberately so: it is modal, it takes focus,
 * and its own `Escape` is MUI's.
 */
function CoverThumbnail({
    coverWidth,
    src,
    title,
}: {
    coverWidth: number;
    src: string;
    title: string;
}) {
    const [state, setState] = useState<"loading" | "loaded" | "failed">(
        "loading",
    );
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    // Distinct from `lightboxOpen`: it stays true through the dialog's exit
    // transition, until MUI has really taken it out of the DOM. See
    // `previewOpen` below.
    const [lightboxMounted, setLightboxMounted] = useState(false);
    const failed = state === "failed";
    // The preview is suppressed for as long as the lightbox is on screen, so
    // the two surfaces cannot overlap even though the trigger holds an anchor
    // again the moment the closing dialog hands focus back. Without it the
    // preview would mount *behind* a fading-out lightbox, and -- because MUI's
    // `ModalManager` hands a container's scroll lock to whichever modal
    // claimed it first -- would then keep the page locked until the pointer
    // left the thumbnail.
    const previewOpen = anchorEl !== null && !lightboxMounted;
    // The frame. Identical in all three states -- that is what makes a broken
    // cover a quiet empty tile rather than a hole in the row.
    const tileSx = {
        bgcolor: "action.hover",
        borderColor: "divider",
        borderRadius: 1,
        borderStyle: "solid",
        borderWidth: "1px",
        boxSizing: "border-box",
        display: "block",
        flexShrink: 0,
        height: COVER_TILE_HEIGHT,
        // The image is clipped, never letterboxed: `max-width` is the
        // configured full-size width (ADR-0054), so an unusually wide cover
        // cannot eat the title column.
        maxWidth: coverWidth,
        minWidth: COVER_TILE_MIN_WIDTH,
        overflow: "hidden",
        p: 0,
    } as const;
    if (failed) {
        // No `<img>` at all, rather than a hidden one: `display: none` still
        // leaves a broken-image element in the row, and a hidden element with
        // a failed `src` is exactly what paints the browser's broken-image
        // glyph in some engines. Not a button either -- there is nothing to
        // show -- and out of the accessibility tree entirely.
        return (
            <Box
                aria-hidden
                data-cover-state="failed"
                data-testid="search-result-cover-tile"
                sx={tileSx}
            />
        );
    }
    const close = () => setAnchorEl(null);
    return (
        <>
            <Box
                aria-expanded={previewOpen}
                aria-haspopup="dialog"
                // The trigger's only text. The row's title is already the
                // row's accessible content and the thumbnail keeps `alt=""`,
                // so this name is what makes the control announce as an
                // action on *this* row rather than as a second copy of it.
                aria-label={`Show cover for ${title}`}
                component="button"
                data-cover-state={state}
                data-testid="search-result-cover-tile"
                onBlur={close}
                // FM-196: a click enlarges, it no longer toggles the preview.
                // Every gesture that reaches a button as a click -- a mouse
                // click, a tap, Enter, Space -- opens the lightbox, from any
                // starting state, so there is nothing here to decide and none
                // of FM-179's three gesture refs survive. Those refs existed
                // only because a real tap arrives as `pointerenter:touch ->
                // pointerleave:touch -> mouseenter -> focus -> click`
                // (measured in Chromium touch emulation) and an Enter/Space
                // press as `focus -> click`: with the click toggling, the
                // focus a few milliseconds earlier had already opened the
                // preview and the click shut it again. A click that only ever
                // opens a second surface cannot have that bug.
                //
                // The preview is closed in the same commit rather than left
                // to the `onBlur` the dialog's focus trap triggers a moment
                // later, and that ordering is load-bearing: MUI's
                // `ModalManager` handles the *container*, and the first modal
                // to claim `document.body` decides its scroll lock for every
                // modal that joins it (`ModalManager.mount` only calls
                // `handleContainer` when `containerInfo.restore` is unset). A
                // lightbox opened while the preview still holds the body
                // would inherit the preview's `disableScrollLock` and leave
                // the page scrolling behind its backdrop. Closing here
                // releases the container first -- the popover sets no
                // `closeAfterTransition`, so its `ModalManager.remove` runs
                // on this commit, before the dialog's `add` -- and the
                // `onBlur` that follows is then a no-op backstop.
                onClick={() => {
                    close();
                    setLightboxMounted(true);
                    setLightboxOpen(true);
                }}
                onKeyDown={(event: ReactKeyboardEvent) => {
                    if (event.key === "Escape" && previewOpen) {
                        // Handled here, not by the popover's `onClose`: the
                        // popover is `pointerEvents: none` and never holds
                        // focus, so nothing else would see the key -- and
                        // closing from the trigger leaves focus on the
                        // trigger, where the keyboard user still is.
                        event.preventDefault();
                        event.stopPropagation();
                        close();
                    }
                }}
                // Pointer events rather than `mouseenter`/`mouseleave` for
                // exactly one reason: a touch tap synthesizes a whole hover
                // sequence around its click -- `pointerenter:touch` and,
                // immediately after it, `pointerleave:touch` -- and neither is
                // a hover a finger can hold. Both branches are therefore
                // guarded on the pointer type: touch neither opens the preview
                // by "hovering" nor closes it by "leaving" a moment later, and
                // tap-to-enlarge is left to focus and click, which is the
                // affordance legacy's `$uibModal` had
                // (`search-result.js:222-238`). An unknown pointer type is
                // treated as a mouse.
                onPointerEnter={(event: ReactPointerEvent<HTMLElement>) => {
                    if (event.pointerType !== "touch") {
                        setAnchorEl(event.currentTarget);
                    }
                }}
                onPointerLeave={(event: ReactPointerEvent<HTMLElement>) => {
                    if (event.pointerType !== "touch") {
                        close();
                    }
                }}
                onFocus={(event: ReactFocusEvent<HTMLElement>) => {
                    setAnchorEl(event.currentTarget);
                }}
                sx={{...tileSx, cursor: "pointer"}}
                type="button"
            >
                <Box
                    alt=""
                    component="img"
                    data-testid="search-result-cover"
                    // FM-177's rules, unchanged: `alt=""` because the title
                    // beside it is already the row's accessible content, and
                    // the browser decides when to fetch it.
                    loading="lazy"
                    onError={() => {
                        setAnchorEl(null);
                        setState("failed");
                    }}
                    onLoad={() => setState("loaded")}
                    src={src}
                    // Height-driven: the tile's inner height decides the
                    // rendered size and the aspect ratio decides the width, so
                    // a 2:3 poster lands exactly in the width the tile already
                    // reserved and the row does not move.
                    sx={{display: "block", height: "100%", width: "auto"}}
                />
            </Box>
            <Popover
                anchorEl={anchorEl}
                anchorOrigin={{horizontal: "right", vertical: "center"}}
                data-testid="search-result-cover-popover"
                // The three that keep focus where it is: the popover must
                // never become the focused element, or tabbing to a thumbnail
                // would move the keyboard user out of the table.
                disableAutoFocus
                disableEnforceFocus
                disableRestoreFocus
                // And the fourth: `Modal`'s scroll lock would take the
                // document's scrollbar away and compensate with body padding
                // the instant a cursor crossed a thumbnail -- a page-wide
                // reflow, on hover, in the one task whose subject is not
                // reflowing. A preview that opens on hover must leave the
                // page it floats over exactly as it was.
                disableScrollLock
                onClose={close}
                open={previewOpen}
                // The paper's surface, border and radius are the `MuiPopover`
                // theme default (`app/theme.ts`); only its padding is stated,
                // to zero, so the image reaches the frame's edge.
                slotProps={{paper: {sx: {p: 0}}}}
                sx={{pointerEvents: "none"}}
                transformOrigin={{horizontal: "left", vertical: "center"}}
            >
                <Box
                    alt=""
                    component="img"
                    src={src}
                    sx={{display: "block", height: "auto", width: coverWidth}}
                />
            </Popover>
            {/* FM-196. `keepMounted` is left off, so a closed lightbox is not
                in the DOM at all -- with a hundred covered rows on screen
                that is a hundred dialogs' worth of nothing -- while the
                `open` prop (rather than a conditional render here) keeps
                MUI's exit transition and its focus restoration intact. */}
            <CoverLightbox
                onClose={() => setLightboxOpen(false)}
                onExited={() => setLightboxMounted(false)}
                open={lightboxOpen}
                src={src}
                title={title}
            />
        </>
    );
}

/**
 * One of the title cell's two expand toggles, in the icon-button anatomy
 * `ResultDetailLinks` already uses (`IconButton size="small"` + a
 * `fontSize="small"` icon inside a `Tooltip`). FM-150 replaced the previous
 * text buttons: the words cost the Title column more width than the two
 * controls are worth, and the icon state (chevron for a title group, unfold
 * for duplicates) reads at a glance in a dense table.
 *
 * The accessible name is the same text the buttons carried before -- "Expand
 * group"/"Collapse group"/"Expand duplicates"/"Collapse duplicates" -- and the
 * tooltip repeats it verbatim, so the visible label and the announced name
 * never diverge.
 */
function ExpandControl({
    collapsedIcon,
    expanded,
    expandedIcon,
    label,
    onToggle,
}: {
    collapsedIcon: ReactNode;
    expanded: boolean;
    expandedIcon: ReactNode;
    label: string;
    onToggle: () => void;
}) {
    return (
        <Tooltip title={label}>
            <IconButton
                aria-expanded={expanded}
                aria-label={label}
                onClick={onToggle}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onToggle();
                    }
                }}
                size="small"
            >
                {expanded ? expandedIcon : collapsedIcon}
            </IconButton>
        </Tooltip>
    );
}

/**
 * The width one unrendered expand control reserves, so titles at the same
 * nesting level start at the same x whether or not their row can expand
 * anything.
 *
 * Deliberately the same `IconButton size="small"` + `fontSize="small"` icon as
 * a real control rather than a `Box` with a measured width: that keeps the
 * reservation exact by construction -- including under the "compact rows"
 * density, whose descendant overrides retune icon-button padding for every
 * `.MuiIconButton-root` in the table body. `visibility: hidden` (not
 * `display: none`) is what makes it occupy the space while removing it from
 * the tab order, and `aria-hidden` keeps it out of the accessibility tree, so
 * it is neither reachable nor announced.
 */
function ExpandSpacer() {
    return (
        <IconButton
            aria-hidden
            data-testid="search-result-expand-spacer"
            size="small"
            sx={{visibility: "hidden"}}
            tabIndex={-1}
        >
            <KeyboardArrowRightIcon fontSize="small" />
        </IconButton>
    );
}
