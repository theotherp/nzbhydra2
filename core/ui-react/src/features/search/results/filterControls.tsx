import CloseIcon from "@mui/icons-material/Close";
import {Box, Button, IconButton, Stack, TextField} from "@mui/material";

import {monoFontFamily} from "../../../app/theme";
import type {NumericRange} from "./resultTable";

// Presentation-only filter controls for the `refine-sidebar`, which is the
// single result-filter surface at every viewport since FM-045 removed
// FM-034's inline per-column-header filter popovers and the mobile
// `results-filters` toolbar row (ADR-0009: "no inline filters"). Those two
// removed surfaces were the only callers of FM-039's `MultiFilter` checkbox
// list and of `NumericFilter`'s side-by-side non-`stacked` mode, both of
// which were removed with them rather than left as dead exported code; a
// repository-wide search for `MultiFilter` and for a `stacked`-less
// `NumericFilter` call site confirmed no remaining caller. The sidebar's
// Category/Indexer sections now use `ToggleRowFilter` instead.

/**
 * The mock's flat, full-width Category/Indexer toggle rows: no visible
 * checkbox, the row itself carries the click handler and `aria-pressed`, the
 * entry label sits left and its loaded-result count right.
 *
 * `aria-pressed` on a real `button` (rather than `role="option"` /
 * `aria-selected` inside a `role="listbox"`) is the accessibility pattern
 * chosen here: each row is an independently operable toggle with no roving
 * focus, no active-descendant management, and no single-selection semantics,
 * which is exactly the toggle-button pattern -- and it is the pattern the
 * sidebar's own Quality and Type pills already use, so the whole panel
 * exposes one consistent affordance.
 *
 * Counting semantics are FM-039's, unchanged: `entries` is one value per
 * *loaded* result, so the count beside an entry is its number of loaded
 * results, not its number of results in the currently filtered subset.
 *
 * FM-054 (ADR-0014): the active/hover backgrounds are computed with the
 * theme's own `theme.alpha()` (colorSpace-aware -- see `theme.ts`'s own
 * note on why the standalone `@mui/system` `alpha()` cannot decompose an
 * `oklch()` token) rather than restated as `oklch(... / N)` literals, so
 * they stay tied to `primary.main` and compose with the
 * `dark-dyschromatopsia` variant automatically.
 */
export function ToggleRowFilter({
    entries,
    onChange,
    optionTestId,
    selected,
    testId,
}: {
    entries: string[];
    onChange: (values: string[]) => void;
    optionTestId: string;
    selected: string[];
    testId: string;
}) {
    const counts = new Map<string, number>();
    for (const entry of entries) {
        counts.set(entry, (counts.get(entry) ?? 0) + 1);
    }
    const uniqueEntries = [...counts.keys()].sort((first, second) =>
        first.localeCompare(second),
    );
    return (
        <Stack data-testid={testId} sx={{gap: "1px"}}>
            {uniqueEntries.map((entry) => {
                const active = selected.includes(entry);
                return (
                    <Button
                        aria-pressed={active}
                        data-filter-value={entry}
                        data-testid={optionTestId}
                        key={entry}
                        onClick={() =>
                            onChange(
                                active
                                    ? selected.filter(
                                          (value) => value !== entry,
                                      )
                                    : [...selected, entry],
                            )
                        }
                        // A toggle in *row* shape, at the 8px action radius
                        // rather than a stadium: a full-width list row is not
                        // a pill, and the stadium corners are reserved for
                        // the quality/type pills. `borderRadius` was
                        // `theme.shape.borderRadius` here, which `sx`
                        // multiplies by 8 (see `pillRadius` in
                        // `app/theme.ts`) and so rendered 64px.
                        //
                        // The selected treatment stays deliberately quieter
                        // than the pills' (12% fill and `text.primary`, not
                        // their 16% and `primary.light`) and borderless:
                        // `defaultFilters` starts with every category and
                        // indexer selected, so "active" is the resting state
                        // for whole columns of these rows at once. Painting
                        // them in the pills' full selected language turns the
                        // sidebar into a wall of teal -- verified on a live
                        // search before settling here.
                        sx={(theme) => ({
                            backgroundColor: active
                                ? theme.alpha(theme.palette.primary.main, 0.12)
                                : "transparent",
                            borderRadius: 1,
                            color: active ? "text.primary" : "text.secondary",
                            fontSize: "13px",
                            fontWeight: 400,
                            gap: "8px",
                            justifyContent: "space-between",
                            lineHeight: 1.35,
                            minWidth: 0,
                            px: "9px",
                            py: "7px",
                            textAlign: "left",
                            width: "100%",
                            "&:hover": {
                                backgroundColor: active
                                    ? theme.alpha(
                                          theme.palette.primary.main,
                                          0.12,
                                      )
                                    : "action.hover",
                            },
                        })}
                    >
                        <Box
                            component="span"
                            sx={{
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {entry}
                        </Box>
                        <Box
                            component="span"
                            sx={{
                                color: "surfaces.mutedText",
                                flexShrink: 0,
                                fontFamily: monoFontFamily,
                                fontSize: "11.5px",
                            }}
                        >
                            {counts.get(entry)}
                        </Box>
                    </Button>
                );
            })}
        </Stack>
    );
}

// The mock's own recessed numeric field styling (background/border/radius) is
// the `MuiOutlinedInput` theme default (`app/theme.ts`), and FM-117 moved the
// native spinner-arrow removal there too -- it was the same two rules every
// other `type="number"` field in the application needed and none of them had.
// What is left here is only this surface's own denser numeral treatment: the
// mock's 13px monospace figures, which no other field wants.
const numericFieldSx = {
    flex: 1,
    minWidth: 0,
    "& input": {
        fontFamily: monoFontFamily,
        fontSize: "13px",
    },
} as const;

export function NumericFilter({
    label,
    name,
    range,
    onChange,
    onClear,
    testIdPrefix,
}: {
    label: string;
    name: "size" | "grabs" | "age";
    range: NumericRange;
    onChange: (
        name: "size" | "grabs" | "age",
        bound: keyof NumericRange,
        value: string,
    ) => void;
    onClear: (name: "size" | "grabs" | "age") => void;
    testIdPrefix: string;
}) {
    return (
        <Stack
            data-testid={`filter-toggle-${testIdPrefix}`}
            direction="row"
            sx={{gap: "6px"}}
        >
            <TextField
                onChange={(event) => onChange(name, "min", event.target.value)}
                placeholder="min"
                size="small"
                slotProps={{
                    htmlInput: {
                        "aria-label": `${label} minimum`,
                        "data-testid": `number-filter-min-${testIdPrefix}`,
                    },
                }}
                sx={numericFieldSx}
                type="number"
                value={range.min}
            />
            <TextField
                onChange={(event) => onChange(name, "max", event.target.value)}
                placeholder="max"
                size="small"
                slotProps={{
                    htmlInput: {
                        "aria-label": `${label} maximum`,
                        "data-testid": `number-filter-max-${testIdPrefix}`,
                    },
                }}
                sx={numericFieldSx}
                type="number"
                value={range.max}
            />
            <IconButton
                aria-label={`Clear ${label} filter`}
                data-testid={`number-filter-clear-${testIdPrefix}`}
                disabled={range.min === "" && range.max === ""}
                onClick={() => onClear(name)}
                size="small"
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}
