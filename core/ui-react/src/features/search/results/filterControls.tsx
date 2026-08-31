import CloseIcon from "@mui/icons-material/Close";
import {IconButton, Stack, TextField} from "@mui/material";

import {denseControlFontSize, monoFontFamily} from "../../../app/theme";
import type {NumericRange} from "./resultTable";

// The `refine-sidebar`'s numeric range control, which is the single
// result-filter surface's only hand-authored control left. FM-045 removed
// FM-034's inline per-column-header filter popovers and the mobile
// `results-filters` toolbar row (ADR-0009: "no inline filters"); those two
// surfaces were the only callers of FM-039's `MultiFilter` checkbox list and
// of `NumericFilter`'s side-by-side non-`stacked` mode, both removed with them
// rather than left as dead exported code. FM-153 (ADR-0050) moved the
// Category/Indexer toggle rows out to `C-REFINE-MULTISELECT`, shared with the
// history views, and their results-only derivation to `RefineSidebar.tsx`.

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
        fontSize: denseControlFontSize,
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
            sx={{gap: 0.75}}
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
