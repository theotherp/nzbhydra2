import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import {
    Box,
    Checkbox,
    Chip,
    IconButton,
    Stack,
    TableCell,
    TableRow,
    Tooltip,
} from "@mui/material";
import type {ReactNode} from "react";
import {memo} from "react";

import type {SearchResult} from "../../../api/search";
import type {ApiTransport} from "../../../api/transport";
import {DirectDownloadActions} from "./DownloadActions";
import {ResultDetailLinks} from "./ResultDetailLinks";
import {formatResultDetails, formatResultSize} from "./resultTable";

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
    dereferer,
    downloaded,
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
    dereferer: unknown;
    downloaded: boolean;
    duplicateExpanded: boolean;
    duplicateKey: string;
    // FM-150: how many expand-control slots every row of the current render
    // reserves -- the largest number of expand controls any single visible row
    // carries (0, 1, or both). A row renders its own controls and then pads the
    // rest with same-sized invisible spacers, so the title text of every row at
    // one nesting level starts at the same x whether or not that row can expand
    // anything. The parent computes it because only the parent can see every
    // rendered row.
    expandSlots: number;
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
    const reservedSpacers = Math.max(
        0,
        expandSlots - (showTitleExpand ? 1 : 0) - (showDuplicateExpand ? 1 : 0),
    );
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
                border so it consumes no layout width. FM-054 (ADR-0014): the
                stripe color is computed with the theme's own
                `theme.alpha()` against `primary.main` (colorSpace-aware --
                see `theme.ts`'s note on why the standalone `@mui/system`
                `alpha()` cannot decompose an `oklch()` token) instead of a
                restated `oklch(... / 0.4)` literal. */}
            <TableCell
                data-label="Select"
                padding="checkbox"
                sx={(theme) => ({
                    boxShadow: recent
                        ? `inset 3px 0 0 ${theme.alpha(theme.palette.primary.main, 0.4)}`
                        : undefined,
                })}
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
                            // FM-150: `nowrap`, not the previous `wrap`. The
                            // expand controls are icons now, so the row is
                            // "controls, then title" rather than a chip row a
                            // long title could be pushed under -- and a
                            // wrapped title that slid back under the controls
                            // would break the shared start-of-title x this
                            // cell now guarantees. The title itself still
                            // wraps inside its own box.
                            <Stack
                                alignItems="flex-start"
                                direction="row"
                                flexWrap="nowrap"
                                gap={0.5}
                            >
                                {showTitleExpand && (
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
                                )}
                                {showDuplicateExpand && (
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
                                )}
                                {Array.from(
                                    {length: reservedSpacers},
                                    (_, index) => (
                                        <ExpandSpacer key={index} />
                                    ),
                                )}
                                <Box>{column.value(result)}</Box>
                            </Stack>
                        ) : isIndexer ? (
                            <Stack
                                alignItems="center"
                                direction="row"
                                gap={0.5}
                                justifyContent="flex-end"
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
                    alignItems="center"
                    direction="row"
                    flexWrap="wrap"
                    gap={0.5}
                    justifyContent="flex-end"
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
                        alignItems="center"
                        direction="row"
                        flexWrap="nowrap"
                        gap={0.5}
                        justifyContent="flex-end"
                        sx={{minWidth: 0}}
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
