import {ThemeProvider} from "@mui/material/styles";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {
    HistoryDimension,
    HistoryFilterValue,
    HistoryFilterValues,
} from "../../../../api/history/filters";
import {createHydraTheme} from "../../../../app/theme";
import {HistoryRefineLayout} from "./HistoryRefineSurface";

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

// This project's jsdom environment configures no `url`, so its opaque origin
// has no `window.localStorage` at all -- the same limitation
// `StatsDashboardPage`'s persistence test documents. Installed per test that
// needs it and removed by `vi.unstubAllGlobals()`.
function stubWorkingLocalStorage(): Map<string, string> {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) =>
            store.has(key) ? (store.get(key) as string) : null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    } satisfies Storage);
    return store;
}

// Below 768px the surface renders inside a `Drawer` instead of the docked
// column, decided by `useMediaQuery` rather than by CSS `display`. jsdom's own
// `matchMedia` never matches anything, so a narrow viewport has to be stated
// explicitly.
function stubCompactViewport(): void {
    vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }));
}

function renderSurface(
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
            <HistoryRefineLayout
                dimensions={overrides.dimensions ?? dimensions}
                onChange={onChange}
                onClearAll={onClearAll}
                values={values}
            >
                <div data-testid="page-body" />
            </HistoryRefineLayout>
        </ThemeProvider>,
    );
    return {onChange, onClearAll};
}

// ADR-0050: a `checkboxes` dimension renders as a `C-REFINE-MULTISELECT` that
// starts collapsed, so its options are in the DOM but hidden from the
// accessibility tree until its caption button is pressed. Every assertion about
// the options themselves opens the section first.
function expandMultiselect(id: string): void {
    fireEvent.click(screen.getByTestId(`history-refine-${id}-toggle`));
}

describe("HistoryRefineSurface", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("should render one labelled surface with a visible label per declared control", () => {
        renderSurface();
        expect(
            screen.getByRole("navigation", {name: "Refine history"}),
        ).toBeVisible();
        expect(screen.getByTestId("history-refine-bar")).toBeVisible();
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
        expandMultiselect("indexer");
        expect(screen.getByRole("group", {name: "Indexer"})).toBeVisible();
    });

    // ADR-0050: collapsed on every mount, with no persistence of its own --
    // the open state is component-local and nothing writes it anywhere.
    it("should render every multi-select collapsed until its caption is pressed", () => {
        const store = stubWorkingLocalStorage();
        renderSurface();
        const toggle = screen.getByTestId("history-refine-indexer-toggle");
        expect(toggle).toHaveTextContent("Indexer");
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(
            screen.queryByRole("group", {name: "Indexer"}),
        ).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("group", {name: "Indexer"})).toBeVisible();
        // Opening a section persists nothing: the only key this surface ever
        // writes is the shell's own collapsed preference.
        expect([...store.keys()]).not.toContain("hydra.history.refine");

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");

        // A remount starts collapsed again, whatever was open before.
        cleanup();
        renderSurface();
        expect(
            screen.getByTestId("history-refine-indexer-toggle"),
        ).toHaveAttribute("aria-expanded", "false");
        expect([...store.keys()]).toHaveLength(0);
    });

    // The results sidebar sorts its derived options; a history dimension's are
    // declared, and the declared order is the rendered order.
    it("should render multi-select options in the dimension's declared order", () => {
        renderSurface(
            {},
            {
                dimensions: [
                    {
                        kind: "checkboxes",
                        id: "result",
                        column: "status",
                        label: "Result",
                        options: [
                            {value: "REQUESTED", label: "Requested"},
                            {value: "NONE", label: "Unknown"},
                            {value: "CONTENT_DOWNLOAD_ERROR", label: "Error"},
                        ],
                    },
                ],
            },
        );
        expandMultiselect("result");
        expect(
            screen
                .getAllByTestId("history-refine-result-option")
                .map((option) => option.getAttribute("data-filter-value")),
        ).toEqual(["REQUESTED", "NONE", "CONTENT_DOWNLOAD_ERROR"]);
    });

    it("should dock the surface as a sibling of the page body, not an ancestor of it", () => {
        renderSurface();
        // ADR-0011: the table's header cells must never sit inside the refine
        // surface, or the table's own sticky header would pin against it.
        const surface = screen.getByTestId("history-refine-bar");
        expect(surface).not.toContainElement(screen.getByTestId("page-body"));
    });

    it("should state the active count in the header summary for no, one, and several filters", () => {
        renderSurface();
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "No active filters",
        );
        cleanup();

        renderSurface({title: {kind: "freetext", text: "example"}});
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "1 active filter",
        );
        cleanup();

        renderSurface({
            title: {kind: "freetext", text: "example"},
            indexer: {kind: "checkboxes", selected: ["Alpha"]},
            source: {kind: "boolean", value: "API"},
        });
        expect(screen.getByTestId("history-refine-summary")).toHaveTextContent(
            "3 active filters",
        );
    });

    it("should collapse the docked column to its rail and keep the active count reachable there", () => {
        stubWorkingLocalStorage();
        renderSurface({title: {kind: "freetext", text: "example"}});
        const toggle = screen.getByTestId("history-refine-toggle");
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(toggle).toHaveAccessibleName("Collapse history filters");

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        // The rail has no room for the sections or the header summary, so the
        // control that reveals them announces the count instead.
        expect(toggle).toHaveAccessibleName(
            "Expand history filters, 1 active filter",
        );
        expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("history-refine-summary"),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("history-refine-clear-all"),
        ).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByLabelText("Title")).toBeVisible();
    });

    it("should persist the collapsed column under the shared history key and restore it on a later mount", () => {
        const store = stubWorkingLocalStorage();
        renderSurface();
        fireEvent.click(screen.getByTestId("history-refine-toggle"));
        expect(store.get("hydra.history.refine")).toBe("collapsed");
        cleanup();

        renderSurface();
        expect(screen.getByTestId("history-refine-toggle")).toHaveAttribute(
            "aria-expanded",
            "false",
        );
        fireEvent.click(screen.getByTestId("history-refine-toggle"));
        expect(store.get("hydra.history.refine")).toBe("expanded");
        cleanup();

        renderSurface();
        expect(screen.getByTestId("history-refine-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
    });

    it("should start expanded when the stored preference is absent or garbage", () => {
        // No storage at all: jsdom's opaque origin, a private window, blocked
        // site data. `C-BROWSER-STORAGE` swallows it and the column opens.
        renderSurface();
        expect(screen.getByTestId("history-refine-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        cleanup();

        const store = stubWorkingLocalStorage();
        store.set("hydra.history.refine", '{"collapsed":true}');
        renderSurface();
        expect(screen.getByTestId("history-refine-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
    });

    it("should open the sections in a bottom sheet below 768px and never persist that it is open", () => {
        const store = stubWorkingLocalStorage();
        stubCompactViewport();
        renderSurface({title: {kind: "freetext", text: "example"}});

        // Exactly one branch is in the DOM: the compact trigger, carrying the
        // active count as its own visible text, and no docked column.
        const toggle = screen.getByTestId("history-refine-toggle");
        expect(toggle).toHaveTextContent("Refine · 1 active filter");
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(
            screen.queryByTestId("history-refine-bar"),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("history-refine-drawer"),
        ).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        // The surface keeps its own id inside the drawer, so a selector
        // written against the docked column still resolves here.
        const drawer = screen.getByTestId("history-refine-drawer");
        expect(drawer).toContainElement(
            screen.getByTestId("history-refine-bar"),
        );
        expect(screen.getByTestId("history-refine-bar")).toBeVisible();
        expect(screen.getByLabelText("Title")).toBeVisible();
        // FM-181: the sheet's footer. A history view has no client-side count
        // to promise, so its done button is the plain verb; clear-all keeps
        // its id and accessible name and gains the word on screen.
        expect(screen.getByTestId("history-refine-done")).toHaveTextContent(
            "Done",
        );
        const clearAll = screen.getByTestId("history-refine-clear-all");
        expect(clearAll).toHaveAccessibleName("Clear all filters");
        expect(clearAll).toHaveTextContent("Clear all");
        expect(store.size).toBe(0);

        fireEvent.click(screen.getByTestId("history-refine-done"));
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        fireEvent.click(toggle);

        fireEvent.click(screen.getByTestId("history-refine-close"));
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(store.size).toBe(0);
    });

    it("should report freetext, boolean, number range, and time input", () => {
        const {onChange} = renderSurface();
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
        const {onChange} = renderSurface();
        expandMultiselect("indexer");
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

        const selected = renderSurface({
            indexer: {kind: "checkboxes", selected: ["Alpha", "Beta"]},
        });
        expandMultiselect("indexer");
        const pressed = screen.getAllByTestId("history-refine-indexer-option");
        expect(pressed[0]).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(pressed[0]);
        expect(selected.onChange).toHaveBeenLastCalledWith("indexer", {
            kind: "checkboxes",
            selected: ["Beta"],
        });
    });

    it("should hide a multi-select that has no options at all", () => {
        renderSurface(
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

    it("should offer one clear-all control for every dimension, live only while something is active", () => {
        renderSurface();
        expect(screen.getByTestId("history-refine-clear-all")).toBeDisabled();
        cleanup();

        const {onClearAll} = renderSurface({
            title: {kind: "freetext", text: "example"},
        });
        const clearAll = screen.getByTestId("history-refine-clear-all");
        expect(clearAll).toBeEnabled();
        fireEvent.click(clearAll);
        expect(onClearAll).toHaveBeenCalledTimes(1);
    });
});
