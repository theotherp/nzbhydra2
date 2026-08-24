/**
 * `C-HISTORY-REQUEST`, part one: the filter vocabulary every `HistoryWeb`
 * history route shares.
 *
 * The vocabulary is exactly the filter kinds
 * `org.nzbhydra.historystats.History#getHistory` implements -- `freetext`,
 * `checkboxes`, `boolean`, `numberRange` and `time` -- and nothing else. (Its
 * sixth branch, `text`, is an exact-match variant no history surface has ever
 * emitted: legacy's `dataTableDirectives.js` only ever sends the five above.)
 * A route declares its dimensions in this vocabulary; the filter model, the
 * request body (`request.ts`) and the refine bar that edits it
 * (`C-HISTORY-REFINE-BAR`) are all derived from those declarations, so adding
 * a route means declaring dimensions, never extending either abstraction.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- read only via `typeof` below, which derives the exported HistoryFilterKind union.
const HISTORY_FILTER_KINDS = [
    "freetext",
    "checkboxes",
    "boolean",
    "numberRange",
    "time",
] as const;

type HistoryFilterKind = (typeof HISTORY_FILTER_KINDS)[number];

/**
 * The `boolean` value the server itself reads as "no filter"
 * (`History.java`: `filterType.equals("boolean") && !"all".equals(filterValue)`).
 * It is the sentinel a `boolean` dimension's select carries for its
 * unfiltered option, and it never reaches the request body.
 */
export const HISTORY_BOOLEAN_ALL = "all";

type HistoryFilterOption = {
    /** The value sent to the server for this option. */
    value: string;
    /** The option's visible text. */
    label: string;
};

type HistoryDimensionBase = {
    /**
     * Stable UI identity of the dimension: the key its value is held under
     * and the `data-testid` fragment its controls carry. Separate from
     * `column` so a server column name (`access_source`) never leaks into a
     * selector contract.
     */
    id: string;
    /** The server column the filter applies to; the `filterModel` key. */
    column: string;
    /** The dimension's visible label. */
    label: string;
};

export type HistoryDimension =
    | (HistoryDimensionBase & {kind: "freetext"})
    | (HistoryDimensionBase & {
          kind: "checkboxes";
          options: readonly HistoryFilterOption[];
      })
    | (HistoryDimensionBase & {
          kind: "boolean";
          /** Visible text of the unfiltered option (`HISTORY_BOOLEAN_ALL`). */
          allLabel: string;
          options: readonly HistoryFilterOption[];
      })
    | (HistoryDimensionBase & {
          kind: "numberRange";
          minLabel: string;
          maxLabel: string;
      })
    | (HistoryDimensionBase & {
          kind: "time";
          afterLabel: string;
          beforeLabel: string;
      });

export type HistoryFilterValue =
    | {kind: "freetext"; text: string}
    | {kind: "checkboxes"; selected: readonly string[]}
    | {kind: "boolean"; value: string}
    | {kind: "numberRange"; min: string; max: string}
    | {kind: "time"; after: string; before: string};

/** Current filter input, keyed by `HistoryDimension.id`. */
export type HistoryFilterValues = Readonly<Record<string, HistoryFilterValue>>;

/** One `org.nzbhydra.historystats.FilterDefinition` as it goes over the wire. */
type HistoryFilterDefinition = {
    filterType: HistoryFilterKind;
    filterValue: unknown;
};

export type HistoryFilterModel = Record<string, HistoryFilterDefinition>;

/** The unfiltered value of a dimension: what "nothing entered" looks like. */
export function emptyHistoryFilterValue(
    dimension: HistoryDimension,
): HistoryFilterValue {
    switch (dimension.kind) {
        case "freetext":
            return {kind: "freetext", text: ""};
        // ADR-0016: a multi-select starts with nothing selected. There is no
        // preselect-all state, so the empty selection is also the cleared one.
        case "checkboxes":
            return {kind: "checkboxes", selected: []};
        case "boolean":
            return {kind: "boolean", value: HISTORY_BOOLEAN_ALL};
        case "numberRange":
            return {kind: "numberRange", min: "", max: ""};
        case "time":
            return {kind: "time", after: "", before: ""};
    }
}

/**
 * A dimension's current value, falling back to the unfiltered one. Values are
 * held sparsely (an untouched dimension has no entry at all), so a cleared bar
 * is `{}` and never a map of empty values that would have to be kept in sync
 * with the declarations.
 */
export function historyFilterValue(
    values: HistoryFilterValues,
    dimension: HistoryDimension,
): HistoryFilterValue {
    const value = values[dimension.id];
    return value !== undefined && value.kind === dimension.kind
        ? value
        : emptyHistoryFilterValue(dimension);
}

/** Whether the user has entered anything in this dimension. */
export function isHistoryFilterActive(value: HistoryFilterValue): boolean {
    switch (value.kind) {
        case "freetext":
            return value.text.trim().length > 0;
        case "checkboxes":
            return value.selected.length > 0;
        case "boolean":
            return (
                value.value.trim().length > 0 &&
                value.value !== HISTORY_BOOLEAN_ALL
            );
        case "numberRange":
            return value.min.trim().length > 0 || value.max.trim().length > 0;
        case "time":
            return (
                value.after.trim().length > 0 || value.before.trim().length > 0
            );
    }
}

/** How many dimensions currently carry input; what the bar's toggle states. */
export function activeHistoryFilterCount(
    dimensions: readonly HistoryDimension[],
    values: HistoryFilterValues,
): number {
    return dimensions.filter((dimension) =>
        isHistoryFilterActive(historyFilterValue(values, dimension)),
    ).length;
}

/**
 * The `filterModel` half of a `HistoryRequest`. A dimension the user has not
 * filled in contributes no entry at all -- for a multi-select that is ADR-0016's
 * whole point: an empty selection means "all entries", never a value list
 * enumerating every option.
 *
 * No entry carries an `isBoolean` property. The server's `FilterDefinition`
 * still declares that field, but nothing reads it, and since `1fd40c659` boxed
 * it to `Boolean` a request omitting it no longer fails Jackson's
 * implicit-constructor binding (see `MAINTENANCE.md`).
 */
export function historyFilterModel(
    dimensions: readonly HistoryDimension[],
    values: HistoryFilterValues,
): HistoryFilterModel {
    const model: HistoryFilterModel = {};
    for (const dimension of dimensions) {
        const definition = filterDefinition(
            dimension,
            historyFilterValue(values, dimension),
        );
        if (definition) {
            model[dimension.column] = definition;
        }
    }
    return model;
}

function filterDefinition(
    dimension: HistoryDimension,
    value: HistoryFilterValue,
): HistoryFilterDefinition | undefined {
    switch (value.kind) {
        case "freetext": {
            const text = value.text.trim();
            return text
                ? {filterType: "freetext", filterValue: text}
                : undefined;
        }
        case "checkboxes": {
            // Projected through the declared options so the emitted list is
            // exactly the chosen values in a stable order, and a value that is
            // no longer offered (a renamed indexer, say) cannot reach the
            // server.
            const options =
                dimension.kind === "checkboxes" ? dimension.options : [];
            const selected = options
                .map((option) => option.value)
                .filter((option) => value.selected.includes(option));
            return selected.length > 0
                ? {filterType: "checkboxes", filterValue: selected}
                : undefined;
        }
        case "boolean": {
            const chosen = value.value.trim();
            return chosen && chosen !== HISTORY_BOOLEAN_ALL
                ? {filterType: "boolean", filterValue: chosen}
                : undefined;
        }
        case "numberRange": {
            const filterValue: {min?: string; max?: string} = {};
            const min = numericBound(value.min);
            if (min !== undefined) filterValue.min = min;
            const max = numericBound(value.max);
            if (max !== undefined) filterValue.max = max;
            return Object.keys(filterValue).length > 0
                ? {filterType: "numberRange", filterValue}
                : undefined;
        }
        case "time": {
            const filterValue: {after?: string; before?: string} = {};
            const after = toServerTime(value.after);
            if (after !== undefined) filterValue.after = after;
            const before = toServerTime(value.before);
            if (before !== undefined) filterValue.before = before;
            return Object.keys(filterValue).length > 0
                ? {filterType: "time", filterValue}
                : undefined;
        }
    }
}

/**
 * `History.java` interpolates a `numberRange` bound directly into the generated
 * SQL (`String.format("%s > %s", column, map.get("min"))`) rather than binding
 * it as a query parameter, so a bound that is not a plain number is dropped
 * here instead of being sent.
 */
function numericBound(value: string): string | undefined {
    const trimmed = value.trim();
    return /^-?\d+(?:\.\d+)?$/.test(trimmed) ? trimmed : undefined;
}

/** A local `datetime-local` value as the instant the server parses. */
function toServerTime(value: string): string | undefined {
    if (!value.trim()) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
