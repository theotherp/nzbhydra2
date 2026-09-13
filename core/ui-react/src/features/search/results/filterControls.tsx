import CloseIcon from "@mui/icons-material/Close";
import {IconButton, Stack, TextField} from "@mui/material";
import {useCallback, useEffect, useRef, useState} from "react";

import {denseControlFontSize, monoFontFamily} from "../../../app/theme";
import type {NumericRange} from "./resultTable";

/**
 * How long a free-text filter control waits after the last keystroke before
 * committing its value into the shared `ResultFilters` state.
 *
 * Every commit re-filters, re-sorts and re-groups every loaded result, rewrites
 * the selection, recomputes `hasActiveFilters`, writes the persisted choices to
 * `localStorage` synchronously and re-renders the whole table
 * (`SearchResults.tsx`). Doing that once per keystroke made typing into "Title
 * contains" -- the most used control on the results page -- visibly lag on a
 * large result set. Long enough to coalesce a burst of typing, short enough
 * that a user who stops typing sees the table follow immediately.
 */
export const FILTER_COMMIT_DELAY_MS = 175;

/**
 * Keeps a text filter's value local while the user is typing and commits it
 * once the typing stops, so the caller's expensive filter pipeline runs once
 * per burst rather than once per keystroke.
 *
 * The committed value stays the single source of truth: a change that did not
 * come from this control -- "Clear all", the per-range clear button, filters
 * restored from `localStorage` -- is adopted immediately and cancels any
 * pending commit, so the input can never keep showing a value the filters no
 * longer hold.
 */
export function useDebouncedFilterValue(
    value: string,
    commit: (next: string) => void,
): [string, (next: string) => void] {
    // `committed` is the upstream value this control last rendered against.
    // When the two disagree the change came from outside -- "Clear all", the
    // per-range clear button, filters restored from `localStorage`, or this
    // control's own commit landing -- and the draft is replaced during render
    // (React's "adjust state when a prop changes" pattern) rather than in an
    // effect, which would paint one frame of a field contradicting the table
    // beside it.
    const [state, setState] = useState({committed: value, draft: value});
    if (value !== state.committed) {
        setState({committed: value, draft: value});
    }
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const latestCommit = useRef(commit);
    useEffect(() => {
        latestCommit.current = commit;
    });
    // A commit still in flight belongs to a draft that no longer exists.
    useEffect(() => {
        clearTimeout(timer.current);
    }, [value]);
    useEffect(() => () => clearTimeout(timer.current), []);
    const change = useCallback((next: string) => {
        setState((current) => ({...current, draft: next}));
        clearTimeout(timer.current);
        timer.current = setTimeout(
            () => latestCommit.current(next),
            FILTER_COMMIT_DELAY_MS,
        );
    }, []);
    return [value === state.committed ? state.draft : value, change];
}

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
    const [min, changeMin] = useDebouncedFilterValue(range.min, (next) =>
        onChange(name, "min", next),
    );
    const [max, changeMax] = useDebouncedFilterValue(range.max, (next) =>
        onChange(name, "max", next),
    );
    return (
        <Stack
            data-testid={`filter-toggle-${testIdPrefix}`}
            direction="row"
            sx={{gap: 0.75}}
        >
            <TextField
                onChange={(event) => changeMin(event.target.value)}
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
                value={min}
            />
            <TextField
                onChange={(event) => changeMax(event.target.value)}
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
                value={max}
            />
            <IconButton
                aria-label={`Clear ${label} filter`}
                data-testid={`number-filter-clear-${testIdPrefix}`}
                disabled={min === "" && max === ""}
                onClick={() => onClear(name)}
                size="small"
            >
                <CloseIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}
