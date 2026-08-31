import {Box, Button, Collapse, Stack} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import {denseControlFontSize, monoFontFamily} from "../../app/theme";

// FM-129: the count beside a toggle row's label, one step under the row's own
// `denseControlFontSize` text so the count reads as an annotation of the label
// rather than as a second column of equal weight. It stays a local named
// constant rather than joining a shared token: this is the only
// count-beside-a-label site in the application, and the size only has to hold
// its relationship to the row label next to it. FM-153 moved it here with the
// rows themselves, from `features/search/results/filterControls.tsx`.
const ROW_COUNT_FONT_SIZE = "11.5px";

/**
 * One option of a `RefineMultiselect`, in the order it is to be rendered.
 *
 * `count` is optional and only the results sidebar supplies it: its options are
 * derived from the loaded results and so have a number of loaded results to
 * annotate them with. The history views declare their options up front and have
 * no such number, so their rows render the label alone.
 */
export type RefineMultiselectEntry = {
    count?: number;
    label: string;
    value: string;
};

export type RefineMultiselectTestIds = {
    list: string;
    option: string;
    toggle: string;
};

/**
 * `C-REFINE-MULTISELECT` (ADR-0050): a refine surface's collapsible
 * multi-select -- a caption button carrying the section's name and
 * `aria-expanded` over a `Collapse` of flat, full-width toggle rows.
 *
 * Controlled and presentational in the strict sense ADR-0046 draws for these
 * surfaces: it holds no state and derives nothing. `entries` render in exactly
 * the order given, with no sorting, dedup, or counting of its own -- the
 * results sidebar derives its options from the loaded results and sorts them,
 * the history views declare theirs and depend on that declared order surviving,
 * and neither rule can live in here without breaking the other. Open state and
 * selection are the consumer's too, so whether either persists is decided where
 * it is owned (the results page persists both through
 * `hydra.search-results.table`; the history views persist neither).
 *
 * The rows carry no visible checkbox: the row itself is the control, with
 * `aria-pressed` on a real `button` rather than `role="option"` /
 * `aria-selected` inside a `role="listbox"`. Each row is an independently
 * operable toggle with no roving focus, no active-descendant management, and no
 * single-selection semantics, which is exactly the toggle-button pattern -- and
 * it is the pattern the refine surfaces' quality and type pills already use, so
 * the whole panel exposes one consistent affordance.
 *
 * FM-054 (ADR-0014): the active/hover backgrounds are computed with the theme's
 * own `theme.alpha()` (colorSpace-aware -- see `theme.ts`'s note on why the
 * standalone `@mui/system` `alpha()` cannot decompose an `oklch()` token)
 * rather than restated as `oklch(... / N)` literals, so they stay tied to
 * `primary.main` and compose with the `dark-dyschromatopsia` variant
 * automatically.
 */
export function RefineMultiselect({
    entries,
    groupLabel,
    label,
    onChange,
    onToggleOpen,
    open,
    selected,
    testId,
    testIds,
}: {
    entries: readonly RefineMultiselectEntry[];
    // Opt-in `role="group"` with this as the group's accessible name, for
    // consumers whose options need to announce themselves as one named set.
    // The history views carry it (their `checkboxes` dimensions have always
    // exposed a named group); the results sidebar passes nothing and its rows
    // stay a bare list of toggles, exactly as they have always rendered.
    groupLabel?: string;
    label: string;
    onChange: (values: string[]) => void;
    onToggleOpen: () => void;
    open: boolean;
    selected: readonly string[];
    // The section container's own id, for consumers whose specs query the
    // section as a whole (the history views' `history-refine-<id>`). Omitted on
    // the results sidebar, whose sections have never carried one.
    testId?: string;
    testIds: RefineMultiselectTestIds;
}) {
    return (
        <Box data-testid={testId}>
            <Button
                aria-expanded={open}
                data-testid={testIds.toggle}
                onClick={onToggleOpen}
                size="small"
                // The section caption's own typography role, spread from the
                // theme rather than restated: this caption is a `Button` (the
                // section is collapsible), so it cannot take `Typography`'s
                // `variant` prop the way a static section caption does, and
                // consuming the variant here is what keeps the two identical.
                sx={(theme) => ({
                    ...theme.typography.refineSectionLabel,
                    justifyContent: "space-between",
                    mb: 1,
                    minWidth: 0,
                    px: 0,
                    py: 0,
                    width: "100%",
                })}
            >
                {label}
                {open ? (
                    <ExpandLessIcon fontSize="small" />
                ) : (
                    <ExpandMoreIcon fontSize="small" />
                )}
            </Button>
            <Collapse in={open}>
                <Stack
                    aria-label={groupLabel}
                    data-testid={testIds.list}
                    role={groupLabel === undefined ? undefined : "group"}
                    sx={{gap: 0.25}}
                >
                    {entries.map((entry) => {
                        const active = selected.includes(entry.value);
                        return (
                            <Button
                                aria-pressed={active}
                                data-filter-value={entry.value}
                                data-testid={testIds.option}
                                key={entry.value}
                                onClick={() =>
                                    onChange(
                                        active
                                            ? selected.filter(
                                                  (value) =>
                                                      value !== entry.value,
                                              )
                                            : [...selected, entry.value],
                                    )
                                }
                                // A toggle in *row* shape, at the 8px action
                                // radius rather than a stadium: a full-width
                                // list row is not a pill, and the stadium
                                // corners are reserved for the quality/type
                                // pills. `borderRadius` was
                                // `theme.shape.borderRadius` here, which `sx`
                                // multiplies by 8 (see `pillRadius` in
                                // `app/theme.ts`) and so rendered 64px.
                                //
                                // The selected treatment stays deliberately
                                // quieter than the pills' (12% fill and
                                // `text.primary`, not their 16% and
                                // `primary.light`) and borderless: the results
                                // sidebar's `defaultFilters` starts with every
                                // category and indexer selected, so "active" is
                                // the resting state for whole columns of these
                                // rows at once. Painting them in the pills'
                                // full selected language turns the sidebar into
                                // a wall of teal -- verified on a live search
                                // before settling here.
                                sx={(theme) => ({
                                    backgroundColor: active
                                        ? theme.alpha(
                                              theme.palette.primary.main,
                                              0.12,
                                          )
                                        : "transparent",
                                    borderRadius: 1,
                                    color: active
                                        ? "text.primary"
                                        : "text.secondary",
                                    fontSize: denseControlFontSize,
                                    fontWeight: 400,
                                    gap: 1,
                                    justifyContent: "space-between",
                                    lineHeight: 1.35,
                                    minWidth: 0,
                                    px: 1,
                                    py: 0.75,
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
                                    {entry.label}
                                </Box>
                                {entry.count !== undefined && (
                                    <Box
                                        component="span"
                                        sx={{
                                            color: "surfaces.mutedText",
                                            flexShrink: 0,
                                            fontFamily: monoFontFamily,
                                            fontSize: ROW_COUNT_FONT_SIZE,
                                        }}
                                    >
                                        {entry.count}
                                    </Box>
                                )}
                            </Button>
                        );
                    })}
                </Stack>
            </Collapse>
        </Box>
    );
}
