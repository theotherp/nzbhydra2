import {
    Box,
    Button,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import {useState, type ReactNode} from "react";

import {
    HISTORY_BOOLEAN_ALL,
    activeHistoryFilterCount,
    historyFilterValue,
    type HistoryDimension,
    type HistoryFilterValue,
    type HistoryFilterValues,
} from "../../../../api/history/filters";
import {refineSectionGap} from "../../../../app/theme";
import {
    RefineSurface,
    useCompactRefineSurface,
    type RefineSurfaceLabels,
    type RefineSurfaceTestIds,
} from "../../../../components/refine/RefineSurface";
import {useHistoryRefineCollapsed} from "./historyRefineCollapsed";

// This feature's own chrome vocabulary for ADR-0046's shared refine surface.
// Every one of these is a compatibility contract of the history views, not of
// the shell, which states none of them itself.
const TEST_IDS: RefineSurfaceTestIds = {
    clearAll: "history-refine-clear-all",
    close: "history-refine-close",
    drawer: "history-refine-drawer",
    // The container id every history spec and page test has always queried.
    // The shell puts it on whichever branch is live, so it keeps resolving
    // with parallel semantics on the docked column and inside the drawer.
    surface: "history-refine-bar",
    toggle: "history-refine-toggle",
};

type HistoryRefineProps = {
    dimensions: readonly HistoryDimension[];
    onChange: (id: string, value: HistoryFilterValue) => void;
    onClearAll: () => void;
    values: HistoryFilterValues;
};

/**
 * A history route's whole page body: the refine surface as the left sibling of
 * the route's own vertical stack (heading row with its non-filter controls,
 * status and alerts, table, pager).
 *
 * The row/column switch is read from the shell's own
 * `useCompactRefineSurface`, not from a second breakpoint declaration, so the
 * layout flips to a stacked "Refine" trigger at exactly the width the shell
 * swaps its docked column for the drawer.
 *
 * ADR-0011: the surface is a flex *sibling* of the table, never an ancestor of
 * its header cells, so the table's viewport-sticky header keeps pinning
 * against the document and its `TableScrollAffordance` scroller keeps owning
 * the horizontal overflow (ADR-0038).
 */
export function HistoryRefineLayout({
    children,
    dimensions,
    onChange,
    onClearAll,
    values,
}: HistoryRefineProps & {children: ReactNode}) {
    const compact = useCompactRefineSurface();
    return (
        <Stack
            component="main"
            direction={compact ? "column" : "row"}
            spacing={2}
        >
            <HistoryRefineSurface
                dimensions={dimensions}
                onChange={onChange}
                onClearAll={onClearAll}
                values={values}
            />
            <Stack spacing={2} sx={{flex: 1, minWidth: 0}}>
                {children}
            </Stack>
        </Stack>
    );
}

/**
 * `C-HISTORY-REFINE-BAR`: the single filter surface beside a history table.
 *
 * Its public API is the five `org.nzbhydra.historystats.History` filter kinds
 * a route declares (`C-HISTORY-REQUEST`'s `HistoryDimension`), never a list of
 * this or that route's controls -- download history's indexer/result
 * multi-selects, search history's category, and notification history's event
 * types are all the same `checkboxes` kind, so adopting the surface is
 * declaring dimensions, not editing this file.
 *
 * What it owns is state and options: the binding to `HistoryFilterValues`,
 * whose filtering happens server-side through `C-HISTORY-REQUEST` rather than
 * over already-loaded rows, and options each route *declares* rather than
 * derives from the page of results it happens to be showing. Those two
 * differences from the search results' `RefineSidebar` are real and stay.
 *
 * The chrome is no longer its own (ADR-0046, FM-137): the docked column, its
 * collapsed rail, the sub-768px drawer, and the header row all come from
 * `C-REFINE-SURFACE`, the same shell the results sidebar renders through, so
 * the app has one refine concept. Nothing here states a width, a padding, or a
 * transition -- this file passes its domain's labels, test ids, and sections
 * in, and the shell decides where the surface sits and how it collapses.
 */
function HistoryRefineSurface({
    dimensions,
    onChange,
    onClearAll,
    values,
}: HistoryRefineProps) {
    const compact = useCompactRefineSurface();
    const [collapsed, toggleCollapsed] = useHistoryRefineCollapsed();
    // Never persisted, and never seeded from `collapsed`: see
    // `historyRefineCollapsed.ts` and the shell's own `drawerOpen` note.
    const [drawerOpen, setDrawerOpen] = useState(false);
    const activeCount = activeHistoryFilterCount(dimensions, values);
    const summary = activeFilterSummary(activeCount);
    return (
        <RefineSurface
            // The shell's header offers "Clear all" for every consumer; with
            // no dimension set there is nothing for it to clear, which is what
            // this reports. The count itself is what tells a history user that
            // filters are on -- see `refineLabels` below.
            clearAllDisabled={activeCount === 0}
            collapsed={collapsed}
            drawerOpen={drawerOpen}
            labels={refineLabels(compact, summary)}
            onClearAll={onClearAll}
            onDrawerOpenChange={setDrawerOpen}
            onToggleCollapsed={toggleCollapsed}
            // No `stickyOffset`: the shell's default of 0 is correct here.
            // Nothing sticky sits above a `/stats` tab body -- `AppShell`
            // renders its `AppBar` `position="static"` and `StatsShell` pins
            // nothing -- unlike the results page, whose measured toolbar
            // height the sidebar passes down.
            summary={
                compact ? undefined : (
                    <Typography
                        component="span"
                        data-testid="history-refine-summary"
                        // FM-142: the header's left slot, which the removed
                        // "Refine" caption used to hold. It takes the row's
                        // free width (`flex: 1`) and is allowed to shrink
                        // (`minWidth: 0`) so the icon-only clear-all and the
                        // collapse toggle keep their place at the end; `noWrap`
                        // is what stops the 216px inner width of the docked
                        // column from breaking the sentence over two lines, as
                        // FM-137 recorded it doing.
                        noWrap
                        sx={{flex: 1, minWidth: 0}}
                        variant="refineSectionLabel"
                    >
                        {summary}
                    </Typography>
                )
            }
            testIds={TEST_IDS}
        >
            <Stack sx={{gap: refineSectionGap}}>
                {dimensions.map((dimension) => (
                    <HistoryRefineDimension
                        dimension={dimension}
                        key={dimension.id}
                        onChange={onChange}
                        values={values}
                    />
                ))}
            </Stack>
        </RefineSurface>
    );
}

/**
 * ADR-0046: the active-filter summary is where the two refine surfaces stay
 * deliberately different. The results sidebar grows no count -- its disabled
 * "Clear all" already says "nothing is active" there -- but a history user
 * whose sections are hidden behind a collapsed rail or a closed drawer still
 * has to see that a filter is on.
 *
 * The shell renders its `summary` slot only where there is room for it (the
 * expanded column and the open drawer), so the two states that hide it carry
 * the same sentence in the control that reveals them instead: the rail's
 * expand toggle announces it, and the compact trigger shows it as its own
 * visible text -- which is also its accessible name there, so the two never
 * disagree.
 *
 * FM-142: `heading` is the compact trigger's text and nothing else now, so it
 * no longer has a docked variant. The docked column used to render the bare
 * word "Refine" as a header caption; the owner asked for it gone, and what the
 * surface is is said by the sections themselves.
 */
function refineLabels(compact: boolean, summary: string): RefineSurfaceLabels {
    const trigger = `Refine · ${summary}`;
    return {
        close: "Close history filters",
        collapse: compact ? "Hide history filters" : "Collapse history filters",
        expand: compact ? trigger : `Expand history filters, ${summary}`,
        heading: trigger,
        surface: "Refine history",
    };
}

function activeFilterSummary(count: number): string {
    if (count === 0) return "No active filters";
    return count === 1 ? "1 active filter" : `${count} active filters`;
}

function testId(dimension: HistoryDimension, suffix: string): string {
    return `history-refine-${dimension.id}-${suffix}`;
}

type SectionProps<TKind extends HistoryDimension["kind"]> = {
    dimension: Extract<HistoryDimension, {kind: TKind}>;
    onChange: (id: string, value: HistoryFilterValue) => void;
    values: HistoryFilterValues;
};

function HistoryRefineDimension({
    dimension,
    onChange,
    values,
}: {
    dimension: HistoryDimension;
    onChange: (id: string, value: HistoryFilterValue) => void;
    values: HistoryFilterValues;
}) {
    switch (dimension.kind) {
        case "freetext":
            return (
                <FreetextSection
                    dimension={dimension}
                    onChange={onChange}
                    values={values}
                />
            );
        case "checkboxes":
            return (
                <CheckboxesSection
                    dimension={dimension}
                    onChange={onChange}
                    values={values}
                />
            );
        case "boolean":
            return (
                <BooleanSection
                    dimension={dimension}
                    onChange={onChange}
                    values={values}
                />
            );
        case "numberRange":
            return (
                <NumberRangeSection
                    dimension={dimension}
                    onChange={onChange}
                    values={values}
                />
            );
        case "time":
            return (
                <TimeSection
                    dimension={dimension}
                    onChange={onChange}
                    values={values}
                />
            );
    }
}

/**
 * The caption above a section whose controls cannot carry the dimension's name
 * themselves: a multi-select's options, or the two bounds of a range. A
 * single-control section (`freetext`, `boolean`) has no caption at all --
 * its stock MUI control already renders the same text as its own visible
 * label, and a caption would duplicate it.
 */
function SectionCaption({id, label}: {id: string; label: string}) {
    return (
        <Typography component="div" id={id} variant="refineSectionLabel">
            {label}
        </Typography>
    );
}

function Section({
    children,
    dimension,
}: {
    children: ReactNode;
    dimension: HistoryDimension;
}) {
    return (
        <Box
            data-testid={`history-refine-${dimension.id}`}
            sx={{display: "flex", flexDirection: "column", gap: 1}}
        >
            {children}
        </Box>
    );
}

function FreetextSection({
    dimension,
    onChange,
    values,
}: SectionProps<"freetext">) {
    const value = historyFilterValue(values, dimension);
    return (
        <Section dimension={dimension}>
            <TextField
                fullWidth
                label={dimension.label}
                onChange={(event) =>
                    onChange(dimension.id, {
                        kind: "freetext",
                        text: event.target.value,
                    })
                }
                slotProps={{
                    htmlInput: {"data-testid": testId(dimension, "input")},
                }}
                value={value.kind === "freetext" ? value.text : ""}
            />
        </Section>
    );
}

function BooleanSection({
    dimension,
    onChange,
    values,
}: SectionProps<"boolean">) {
    const value = historyFilterValue(values, dimension);
    return (
        <Section dimension={dimension}>
            <TextField
                data-testid={testId(dimension, "select")}
                fullWidth
                label={dimension.label}
                onChange={(event) =>
                    onChange(dimension.id, {
                        kind: "boolean",
                        value: event.target.value,
                    })
                }
                select
                value={
                    value.kind === "boolean" ? value.value : HISTORY_BOOLEAN_ALL
                }
            >
                <MenuItem value={HISTORY_BOOLEAN_ALL}>
                    {dimension.allLabel}
                </MenuItem>
                {dimension.options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
        </Section>
    );
}

/**
 * ADR-0016: nothing is selected initially, an empty selection filters nothing,
 * and there is no select-all or invert control. Each option is a stock
 * `Button` carrying its own pressed state, which is what the theme's
 * `refineChip` variant paints.
 */
function CheckboxesSection({
    dimension,
    onChange,
    values,
}: SectionProps<"checkboxes">) {
    const value = historyFilterValue(values, dimension);
    const selected = value.kind === "checkboxes" ? value.selected : [];
    if (dimension.options.length === 0) return null;
    const captionId = testId(dimension, "label");
    return (
        <Section dimension={dimension}>
            <SectionCaption id={captionId} label={dimension.label} />
            <Box
                aria-labelledby={captionId}
                role="group"
                sx={{display: "flex", flexWrap: "wrap", gap: "6px"}}
            >
                {dimension.options.map((option) => {
                    const active = selected.includes(option.value);
                    return (
                        <Button
                            aria-pressed={active}
                            data-filter-value={option.value}
                            data-testid={testId(dimension, "option")}
                            key={option.value}
                            onClick={() =>
                                onChange(dimension.id, {
                                    kind: "checkboxes",
                                    selected: active
                                        ? selected.filter(
                                              (entry) => entry !== option.value,
                                          )
                                        : [...selected, option.value],
                                })
                            }
                            size="small"
                            variant="refineChip"
                        >
                            {option.label}
                        </Button>
                    );
                })}
            </Box>
        </Section>
    );
}

function NumberRangeSection({
    dimension,
    onChange,
    values,
}: SectionProps<"numberRange">) {
    const value = historyFilterValue(values, dimension);
    const range = value.kind === "numberRange" ? value : {min: "", max: ""};
    const captionId = testId(dimension, "label");
    return (
        <Section dimension={dimension}>
            <SectionCaption id={captionId} label={dimension.label} />
            {/* One column, not the bar's two: both bounds are stacked in a
                docked column, where a side-by-side pair would squeeze each
                field's label into an ellipsis. */}
            <Stack sx={{gap: 1}}>
                <TextField
                    label={dimension.minLabel}
                    onChange={(event) =>
                        onChange(dimension.id, {
                            kind: "numberRange",
                            min: event.target.value,
                            max: range.max,
                        })
                    }
                    slotProps={{
                        htmlInput: {"data-testid": testId(dimension, "min")},
                    }}
                    type="number"
                    value={range.min}
                />
                <TextField
                    label={dimension.maxLabel}
                    onChange={(event) =>
                        onChange(dimension.id, {
                            kind: "numberRange",
                            min: range.min,
                            max: event.target.value,
                        })
                    }
                    slotProps={{
                        htmlInput: {"data-testid": testId(dimension, "max")},
                    }}
                    type="number"
                    value={range.max}
                />
            </Stack>
        </Section>
    );
}

function TimeSection({dimension, onChange, values}: SectionProps<"time">) {
    const value = historyFilterValue(values, dimension);
    const range = value.kind === "time" ? value : {after: "", before: ""};
    const captionId = testId(dimension, "label");
    return (
        <Section dimension={dimension}>
            <SectionCaption id={captionId} label={dimension.label} />
            <Stack sx={{gap: 1}}>
                <TextField
                    label={dimension.afterLabel}
                    onChange={(event) =>
                        onChange(dimension.id, {
                            kind: "time",
                            after: event.target.value,
                            before: range.before,
                        })
                    }
                    slotProps={{
                        htmlInput: {"data-testid": testId(dimension, "after")},
                        inputLabel: {shrink: true},
                    }}
                    type="datetime-local"
                    value={range.after}
                />
                <TextField
                    label={dimension.beforeLabel}
                    onChange={(event) =>
                        onChange(dimension.id, {
                            kind: "time",
                            after: range.after,
                            before: event.target.value,
                        })
                    }
                    slotProps={{
                        htmlInput: {"data-testid": testId(dimension, "before")},
                        inputLabel: {shrink: true},
                    }}
                    type="datetime-local"
                    value={range.before}
                />
            </Stack>
        </Section>
    );
}
