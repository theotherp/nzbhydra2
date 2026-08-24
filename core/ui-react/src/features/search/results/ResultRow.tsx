import {
    Box,
    Button,
    Checkbox,
    Chip,
    Stack,
    TableCell,
    TableRow,
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
                <Stack
                    alignItems={{xs: "center", sm: "flex-end"}}
                    direction={{xs: "row", sm: "column"}}
                    flexWrap="wrap"
                    gap={0.5}
                    justifyContent="flex-end"
                >
                    {/* FM-082: the NFO action plus the session-gated
                        Binsearch/comments/details links legacy rendered in its
                        own Links column, kept in this cell so no ninth column
                        takes width from Title (ADR-0011). */}
                    <ResultDetailLinks
                        dereferer={dereferer}
                        maySeeDetailsDl={maySeeDetailsDl}
                        result={result}
                        transport={transport}
                    />
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
