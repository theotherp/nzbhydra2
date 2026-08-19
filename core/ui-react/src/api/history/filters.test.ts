import {describe, expect, it} from "vitest";

import {
    HISTORY_BOOLEAN_ALL,
    activeHistoryFilterCount,
    emptyHistoryFilterValue,
    historyFilterModel,
    historyFilterValue,
    isHistoryFilterActive,
    type HistoryDimension,
    type HistoryFilterValues,
} from "./filters";

const dimensions: HistoryDimension[] = [
    {
        kind: "time",
        id: "time",
        column: "time",
        label: "Time",
        afterLabel: "After",
        beforeLabel: "Before",
    },
    {
        kind: "checkboxes",
        id: "indexer",
        column: "name",
        label: "Indexer",
        options: [
            {value: "Alpha", label: "Alpha"},
            {value: "Beta", label: "Beta"},
            {value: "Gamma", label: "Gamma"},
        ],
    },
    {kind: "freetext", id: "title", column: "title", label: "Title"},
    {
        kind: "boolean",
        id: "source",
        column: "access_source",
        label: "Source",
        allLabel: "All sources",
        options: [
            {value: "INTERNAL", label: "Internal"},
            {value: "API", label: "API"},
        ],
    },
    {
        kind: "numberRange",
        id: "age",
        column: "age",
        label: "Age",
        minLabel: "Minimum age (days)",
        maxLabel: "Maximum age (days)",
    },
];

describe("emptyHistoryFilterValue", () => {
    it("should start every kind unfiltered, with no multi-select preselection", () => {
        expect(dimensions.map(emptyHistoryFilterValue)).toEqual([
            {kind: "time", after: "", before: ""},
            {kind: "checkboxes", selected: []},
            {kind: "freetext", text: ""},
            {kind: "boolean", value: HISTORY_BOOLEAN_ALL},
            {kind: "numberRange", min: "", max: ""},
        ]);
        expect(
            dimensions.map((dimension) =>
                isHistoryFilterActive(emptyHistoryFilterValue(dimension)),
            ),
        ).toEqual([false, false, false, false, false]);
    });

    it("should fall back to the unfiltered value for an absent or mismatched entry", () => {
        const values: HistoryFilterValues = {
            title: {kind: "checkboxes", selected: ["stale"]},
        };
        expect(historyFilterValue(values, dimensions[2])).toEqual({
            kind: "freetext",
            text: "",
        });
        expect(historyFilterValue({}, dimensions[1])).toEqual({
            kind: "checkboxes",
            selected: [],
        });
    });
});

describe("historyFilterModel", () => {
    it("should build one entry per filled dimension, in that dimension's kind and column", () => {
        const values: HistoryFilterValues = {
            time: {
                kind: "time",
                after: "2024-01-01T10:00",
                before: "2024-01-02T10:00",
            },
            indexer: {kind: "checkboxes", selected: ["Gamma", "Alpha"]},
            title: {kind: "freetext", text: "  example  "},
            source: {kind: "boolean", value: "API"},
            age: {kind: "numberRange", min: "2", max: "10"},
        };
        expect(historyFilterModel(dimensions, values)).toEqual({
            time: {
                filterType: "time",
                filterValue: {
                    after: new Date("2024-01-01T10:00").toISOString(),
                    before: new Date("2024-01-02T10:00").toISOString(),
                },
            },
            // Emitted in the declared option order, not the click order.
            name: {filterType: "checkboxes", filterValue: ["Alpha", "Gamma"]},
            title: {filterType: "freetext", filterValue: "example"},
            access_source: {filterType: "boolean", filterValue: "API"},
            age: {
                filterType: "numberRange",
                filterValue: {min: "2", max: "10"},
            },
        });
    });

    it("should never send the server's vestigial isBoolean property", () => {
        const model = historyFilterModel(dimensions, {
            title: {kind: "freetext", text: "x"},
            source: {kind: "boolean", value: "INTERNAL"},
            indexer: {kind: "checkboxes", selected: ["Beta"]},
        });
        for (const definition of Object.values(model)) {
            expect(Object.keys(definition).sort()).toEqual([
                "filterType",
                "filterValue",
            ]);
        }
    });

    it("should contribute no entry for an empty multi-select (ADR-0016)", () => {
        expect(
            historyFilterModel(dimensions, {
                indexer: {kind: "checkboxes", selected: []},
            }),
        ).toEqual({});
    });

    it("should emit exactly the chosen values of a multi-select, dropping values no longer offered", () => {
        expect(
            historyFilterModel(dimensions, {
                indexer: {
                    kind: "checkboxes",
                    selected: ["Beta", "Removed indexer"],
                },
            }),
        ).toEqual({
            name: {filterType: "checkboxes", filterValue: ["Beta"]},
        });
    });

    it("should omit blank, unparsable, and explicitly unfiltered input", () => {
        expect(
            historyFilterModel(dimensions, {
                time: {kind: "time", after: "", before: "not a date"},
                title: {kind: "freetext", text: "   "},
                source: {kind: "boolean", value: HISTORY_BOOLEAN_ALL},
                // `History.java` interpolates a numberRange bound straight
                // into its SQL, so a non-numeric bound is dropped here.
                age: {kind: "numberRange", min: "1 OR 1=1", max: " "},
            }),
        ).toEqual({});
    });

    it("should emit only the bounds and instants that are set", () => {
        expect(
            historyFilterModel(dimensions, {
                time: {kind: "time", after: "2024-03-04T05:06", before: ""},
                age: {kind: "numberRange", min: "", max: "7"},
            }),
        ).toEqual({
            time: {
                filterType: "time",
                filterValue: {
                    after: new Date("2024-03-04T05:06").toISOString(),
                },
            },
            age: {filterType: "numberRange", filterValue: {max: "7"}},
        });
    });
});

describe("activeHistoryFilterCount", () => {
    it("should count the dimensions the user has filled in", () => {
        expect(activeHistoryFilterCount(dimensions, {})).toBe(0);
        expect(
            activeHistoryFilterCount(dimensions, {
                indexer: {kind: "checkboxes", selected: []},
                source: {kind: "boolean", value: HISTORY_BOOLEAN_ALL},
                title: {kind: "freetext", text: " "},
            }),
        ).toBe(0);
        expect(
            activeHistoryFilterCount(dimensions, {
                indexer: {kind: "checkboxes", selected: ["Alpha"]},
                source: {kind: "boolean", value: "API"},
                title: {kind: "freetext", text: "x"},
                age: {kind: "numberRange", min: "", max: "3"},
                time: {kind: "time", after: "2024-01-01T00:00", before: ""},
            }),
        ).toBe(5);
    });
});
