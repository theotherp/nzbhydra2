import {ThemeProvider} from "@mui/material/styles";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {
    HistoryDimension,
    HistoryFilterValue,
    HistoryFilterValues,
} from "../../../../api/history/filters";
import {createHydraTheme} from "../../../../app/theme";
import {HistoryRefineBar} from "./HistoryRefineBar";

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

function renderBar(
    values: HistoryFilterValues = {},
    overrides: {
        dimensions?: HistoryDimension[];
        onChange?: (id: string, value: HistoryFilterValue) => void;
        onClearAll?: () => void;
    } = {},
) {
    const onChange = overrides.onChange ?? vi.fn();
    const onClearAll = overrides.onClearAll ?? vi.fn();
    render(
        <ThemeProvider theme={createHydraTheme()}>
            <HistoryRefineBar
                dimensions={overrides.dimensions ?? dimensions}
                onChange={onChange}
                onClearAll={onClearAll}
                values={values}
            />
        </ThemeProvider>,
    );
    return {onChange, onClearAll};
}

describe("HistoryRefineBar", () => {
    afterEach(cleanup);

    it("should render one labelled surface with a visible label per declared control", () => {
        renderBar();
        expect(screen.getByRole("region", {name: "Refine"})).toBeVisible();
        for (const label of [
            "After",
            "Before",
            "Title",
            "Minimum age (days)",
            "Maximum age (days)",
        ]) {
            expect(screen.getByLabelText(label)).toBeVisible();
        }
        expect(
            screen.getByRole("combobox", {name: "Source"}),
        ).toHaveTextContent("All sources");
        expect(screen.getByRole("group", {name: "Indexer"})).toBeVisible();
    });

    it("should collapse and expand its sections, stating how many filters are active", async () => {
        renderBar({title: {kind: "freetext", text: "example"}});
        const toggle = screen.getByTestId("history-refine-toggle");
        expect(toggle).toHaveAccessibleName("Refine 1 active filter");
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        const sections = document.getElementById(
            toggle.getAttribute("aria-controls") ?? "",
        );
        expect(sections).not.toHaveClass("MuiCollapse-hidden");
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        await waitFor(() => expect(sections).toHaveClass("MuiCollapse-hidden"));
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        await waitFor(() =>
            expect(sections).not.toHaveClass("MuiCollapse-hidden"),
        );
    });

    it("should state the active count for no, one, and several filters", () => {
        renderBar();
        expect(
            screen.getByTestId("history-refine-toggle"),
        ).toHaveAccessibleName("Refine No active filters");
        cleanup();
        renderBar({
            title: {kind: "freetext", text: "example"},
            indexer: {kind: "checkboxes", selected: ["Alpha"]},
            source: {kind: "boolean", value: "API"},
        });
        expect(
            screen.getByTestId("history-refine-toggle"),
        ).toHaveAccessibleName("Refine 3 active filters");
    });

    it("should report freetext, boolean, number range, and time input", () => {
        const {onChange} = renderBar();
        fireEvent.change(screen.getByLabelText("Title"), {
            target: {value: "example"},
        });
        expect(onChange).toHaveBeenLastCalledWith("title", {
            kind: "freetext",
            text: "example",
        });
        fireEvent.change(screen.getByLabelText("Minimum age (days)"), {
            target: {value: "3"},
        });
        expect(onChange).toHaveBeenLastCalledWith("age", {
            kind: "numberRange",
            min: "3",
            max: "",
        });
        fireEvent.change(screen.getByLabelText("Before"), {
            target: {value: "2024-01-02T10:00"},
        });
        expect(onChange).toHaveBeenLastCalledWith("time", {
            kind: "time",
            after: "",
            before: "2024-01-02T10:00",
        });
        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Source"}));
        fireEvent.click(screen.getByRole("option", {name: "Internal"}));
        expect(onChange).toHaveBeenLastCalledWith("source", {
            kind: "boolean",
            value: "INTERNAL",
        });
    });

    it("should select and deselect multi-select values without a preselect-all or invert control", () => {
        const {onChange} = renderBar();
        const group = screen.getByRole("group", {name: "Indexer"});
        const options = within(group).getAllByTestId(
            "history-refine-indexer-option",
        );
        expect(options.map((option) => option.textContent)).toEqual([
            "Alpha",
            "Beta",
        ]);
        for (const option of options) {
            expect(option).toHaveAttribute("aria-pressed", "false");
        }
        expect(
            within(group).queryByRole("button", {name: /invert|select all/i}),
        ).not.toBeInTheDocument();
        fireEvent.click(options[1]);
        expect(onChange).toHaveBeenLastCalledWith("indexer", {
            kind: "checkboxes",
            selected: ["Beta"],
        });
        cleanup();

        const selected = renderBar({
            indexer: {kind: "checkboxes", selected: ["Alpha", "Beta"]},
        });
        const pressed = screen.getAllByTestId("history-refine-indexer-option");
        expect(pressed[0]).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(pressed[0]);
        expect(selected.onChange).toHaveBeenLastCalledWith("indexer", {
            kind: "checkboxes",
            selected: ["Beta"],
        });
    });

    it("should hide a multi-select that has no options at all", () => {
        renderBar(
            {},
            {
                dimensions: [
                    {
                        kind: "checkboxes",
                        id: "indexer",
                        column: "name",
                        label: "Indexer",
                        options: [],
                    },
                ],
            },
        );
        expect(
            screen.queryByRole("group", {name: "Indexer"}),
        ).not.toBeInTheDocument();
    });

    it("should offer one clear-all control for every dimension", () => {
        const {onClearAll} = renderBar({
            title: {kind: "freetext", text: "example"},
        });
        fireEvent.click(screen.getByTestId("history-refine-clear-all"));
        expect(onClearAll).toHaveBeenCalledTimes(1);
    });
});
