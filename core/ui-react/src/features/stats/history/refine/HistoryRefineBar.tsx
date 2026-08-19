import {
    Box,
    Button,
    Collapse,
    MenuItem,
    Paper,
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

/**
 * `C-HISTORY-REFINE-BAR`: the single filter surface above a history table.
 *
 * Its public API is the five `org.nzbhydra.historystats.History` filter kinds
 * a route declares (`C-HISTORY-REQUEST`'s `HistoryDimension`), never a list of
 * this or that route's controls -- download history's indexer/result
 * multi-selects, search history's category, and notification history's event
 * types are all the same `checkboxes` kind, so adopting the bar is declaring
 * dimensions, not editing this file.
 *
 * It deliberately shares no code with the search results' `RefineSidebar`: that
 * surface filters already-loaded results client-side out of `ResultFilters`,
 * derives its options from those results, and carries ADR-0011's scroll and
 * sticky-offset constraints, none of which exist for server-side history
 * filtering. What the two do share -- the mock's caption, spacing, and
 * selection-pill language -- they share through `app/theme.ts`.
 */
export function HistoryRefineBar({
    dimensions,
    label = "Refine",
    onChange,
    onClearAll,
    values,
}: {
    dimensions: readonly HistoryDimension[];
    /** The surface's own header label; also names its landmark region. */
    label?: string;
    onChange: (id: string, value: HistoryFilterValue) => void;
    onClearAll: () => void;
    values: HistoryFilterValues;
}) {
    // Component-local on purpose: persisting it needs the storage-key decision
    // that `MAINTENANCE.md` still lists as an open candidate.
    const [expanded, setExpanded] = useState(true);
    const activeCount = activeHistoryFilterCount(dimensions, values);
    return (
        <Paper
            aria-label={label}
            component="section"
            data-testid="history-refine-bar"
            elevation={0}
            sx={{
                backgroundColor: "transparent",
                border: "1px solid",
                borderColor: "surfaces.hairlineFaint",
                p: 2,
            }}
        >
            <Stack
                alignItems="center"
                direction="row"
                justifyContent="space-between"
                sx={{gap: 1}}
            >
                <Button
                    aria-controls={SECTIONS_ID}
                    aria-expanded={expanded}
                    data-testid="history-refine-toggle"
                    onClick={() => setExpanded((current) => !current)}
                    size="small"
                    sx={{gap: 1}}
                >
                    <Typography component="span" variant="refineSurfaceLabel">
                        {label}
                    </Typography>{" "}
                    <Typography component="span" variant="refineSectionLabel">
                        {activeFilterSummary(activeCount)}
                    </Typography>
                </Button>
                <Button
                    data-testid="history-refine-clear-all"
                    onClick={onClearAll}
                    size="small"
                >
                    Clear all
                </Button>
            </Stack>
            <Collapse id={SECTIONS_ID} in={expanded}>
                <Box
                    sx={{
                        display: "grid",
                        gap: refineSectionGap,
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(auto-fit, minmax(210px, 1fr))",
                        },
                        pt: refineSectionGap,
                    }}
                >
                    {dimensions.map((dimension) => (
                        <HistoryRefineDimension
                            dimension={dimension}
                            key={dimension.id}
                            onChange={onChange}
                            values={values}
                        />
                    ))}
                </Box>
            </Collapse>
        </Paper>
    );
}

const SECTIONS_ID = "history-refine-sections";

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
            sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                // A multi-select's wrapping options take the whole row; a
                // two-field section (a range, a time window) needs two
                // columns' worth so neither field's label is squeezed into an
                // ellipsis; a single control shares a row with its neighbours.
                // Every section is full width in the single-column layout,
                // where a span would create an implicit second column.
                gridColumn:
                    dimension.kind === "checkboxes"
                        ? "1 / -1"
                        : dimension.kind === "numberRange" ||
                            dimension.kind === "time"
                          ? {xs: "1 / -1", sm: "span 2"}
                          : undefined,
            }}
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
            <Stack direction={{xs: "column", sm: "row"}} sx={{gap: 1}}>
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
                    sx={{flex: 1, minWidth: 0}}
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
                    sx={{flex: 1, minWidth: 0}}
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
            <Stack direction={{xs: "column", sm: "row"}} sx={{gap: 1}}>
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
                    sx={{flex: 1, minWidth: 0}}
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
                    sx={{flex: 1, minWidth: 0}}
                    type="datetime-local"
                    value={range.before}
                />
            </Stack>
        </Section>
    );
}
