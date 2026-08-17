import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import type {NumericRange} from "./resultTable";

// Shared, presentation-only filter controls reused across the inline
// per-column-header popovers (FM-034), the mobile `results-filters` toolbar
// row, and the persistent `refine-sidebar` (FM-039). Kept feature-scoped and
// dependency-free of any single consumer's layout so all three surfaces stay
// bound to the exact same rendering/testid contract for a given field.

export function MultiFilter({
    label,
    testId,
    entries,
    selected,
    onChange,
    showCounts = false,
}: {
    label?: string;
    testId: string;
    entries: string[];
    selected: string[];
    onChange: (values: string[]) => void;
    showCounts?: boolean;
}) {
    const counts = new Map<string, number>();
    for (const entry of entries) {
        counts.set(entry, (counts.get(entry) ?? 0) + 1);
    }
    const uniqueEntries = [...counts.keys()].sort((first, second) =>
        first.localeCompare(second),
    );
    return (
        <Box data-testid={testId}>
            {label && <Typography variant="subtitle2">{label}</Typography>}
            {uniqueEntries.map((entry) => (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={selected.includes(entry)}
                            onChange={(event) =>
                                onChange(
                                    event.target.checked
                                        ? [...selected, entry]
                                        : selected.filter(
                                              (value) => value !== entry,
                                          ),
                                )
                            }
                            size="small"
                        />
                    }
                    key={entry}
                    label={
                        showCounts ? (
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                sx={{minWidth: 0, width: "100%"}}
                            >
                                <Box
                                    component="span"
                                    sx={{
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
                                        color: "text.secondary",
                                        flexShrink: 0,
                                        ml: 1,
                                    }}
                                >
                                    {counts.get(entry)}
                                </Box>
                            </Stack>
                        ) : (
                            entry
                        )
                    }
                    sx={showCounts ? {ml: 0, mr: 0, width: "100%"} : undefined}
                />
            ))}
        </Box>
    );
}

export function NumericFilter({
    label,
    name,
    range,
    onChange,
    onClear,
    stacked = false,
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
    // When true, the minimum/maximum fields stack vertically with short
    // "Min"/"Max" labels instead of rendering side by side with each field's
    // full "{label} minimum"/"{label} maximum" floating label. Existing
    // callers (the header popovers, the mobile `results-filters` row) omit
    // this and keep their prior byte-identical rendering; the narrow
    // `refine-sidebar` (FM-039) opts in because its own section heading
    // already states the field's subject (e.g. "Size (MB)"), and the
    // side-by-side full-label layout truncates illegibly at the sidebar's
    // ~208px content width.
    stacked?: boolean;
    testIdPrefix?: string;
}) {
    const prefix = testIdPrefix ?? name;
    return (
        <Stack
            data-testid={`filter-toggle-${prefix}`}
            direction={stacked ? "column" : "row"}
            gap={1}
        >
            <TextField
                fullWidth={stacked}
                label={stacked ? "Min" : `${label} minimum`}
                onChange={(event) => onChange(name, "min", event.target.value)}
                size="small"
                slotProps={{
                    htmlInput: {"data-testid": `number-filter-min-${prefix}`},
                }}
                type="number"
                value={range.min}
            />
            <TextField
                fullWidth={stacked}
                label={stacked ? "Max" : `${label} maximum`}
                onChange={(event) => onChange(name, "max", event.target.value)}
                size="small"
                slotProps={{
                    htmlInput: {"data-testid": `number-filter-max-${prefix}`},
                }}
                type="number"
                value={range.max}
            />
            {stacked ? (
                <Stack direction="row" gap={1}>
                    <Button
                        data-testid={`number-filter-apply-${prefix}`}
                        size="small"
                    >
                        Apply
                    </Button>
                    <Button
                        data-testid={`number-filter-clear-${prefix}`}
                        onClick={() => onClear(name)}
                        size="small"
                    >
                        Clear
                    </Button>
                </Stack>
            ) : (
                <>
                    <Button
                        data-testid={`number-filter-apply-${prefix}`}
                        size="small"
                    >
                        Apply
                    </Button>
                    <Button
                        data-testid={`number-filter-clear-${prefix}`}
                        onClick={() => onClear(name)}
                        size="small"
                    >
                        Clear
                    </Button>
                </>
            )}
        </Stack>
    );
}
