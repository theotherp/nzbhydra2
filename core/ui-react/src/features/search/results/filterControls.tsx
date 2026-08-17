import {Box, Button, Stack, TextField} from "@mui/material";

import {monoFontFamily} from "../../../app/theme";
import {
    countColor,
    inputBackground,
    inputBorderColor,
    rowActiveBackground,
    rowActiveColor,
    rowHoverBackground,
    rowInactiveColor,
} from "./refineStyles";
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
                        sx={{
                            backgroundColor: active
                                ? rowActiveBackground
                                : "transparent",
                            borderRadius: "8px",
                            color: active ? rowActiveColor : rowInactiveColor,
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
                                    ? rowActiveBackground
                                    : rowHoverBackground,
                            },
                        }}
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
                                color: countColor,
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

// The mock's own recessed numeric field (`background:#1c2224;border:1px solid
// rgba(255,255,255,0.1);border-radius:8px;color:#d6dad9;padding:7px
// 9px;font-family:'IBM Plex Mono',monospace;font-size:13px`), with the mock's
// `min`/`max` placeholders in place of MUI's floating labels -- which the
// sidebar's ~216px content width cannot hold beside each other. Each field
// keeps a descriptive accessible name (`Size (MB) minimum`, ...) rather than a
// bare, three-times-repeated "Min"/"Max".
const numericFieldSx = {
    backgroundColor: inputBackground,
    borderRadius: "8px",
    flex: 1,
    minWidth: 0,
    "& .MuiOutlinedInput-root": {backgroundColor: "transparent"},
    "& .MuiOutlinedInput-notchedOutline": {borderColor: inputBorderColor},
    "& input": {
        fontFamily: monoFontFamily,
        fontSize: "13px",
        p: "7px 9px",
        MozAppearance: "textfield",
    },
    "& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button": {
        WebkitAppearance: "none",
        margin: 0,
    },
    "& input::placeholder": {opacity: 1},
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
        <Stack data-testid={`filter-toggle-${testIdPrefix}`} sx={{gap: "6px"}}>
            <Stack direction="row" sx={{gap: "6px"}}>
                <TextField
                    onChange={(event) =>
                        onChange(name, "min", event.target.value)
                    }
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
                    onChange={(event) =>
                        onChange(name, "max", event.target.value)
                    }
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
            </Stack>
            <Stack direction="row" sx={{gap: "6px"}}>
                <Button
                    data-testid={`number-filter-apply-${testIdPrefix}`}
                    size="small"
                    sx={{fontSize: "12px", minWidth: 0, px: "9px"}}
                >
                    Apply
                </Button>
                <Button
                    data-testid={`number-filter-clear-${testIdPrefix}`}
                    onClick={() => onClear(name)}
                    size="small"
                    sx={{fontSize: "12px", minWidth: 0, px: "9px"}}
                >
                    Clear
                </Button>
            </Stack>
        </Stack>
    );
}
