import {ThemeProvider} from "@mui/material/styles";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createHydraTheme, refineRowBackgrounds} from "../../app/theme";
import {
    RefineMultiselect,
    type RefineMultiselectEntry,
} from "./RefineMultiselect";

const TEST_IDS = {
    list: "demo-list",
    option: "demo-option",
    toggle: "demo-toggle",
};

// FM-188: the same ids plus the three optional selection-action ones, so a
// test can prove both that they are applied when the row renders and that
// supplying them alone renders nothing.
const ACTION_TEST_IDS = {
    ...TEST_IDS,
    all: "demo-all",
    invert: "demo-invert",
    none: "demo-none",
};

// Deliberately not alphabetical: the component must not reorder what it is
// handed, because the history views' declared dimension options carry meaning
// in their declared order.
const entries: RefineMultiselectEntry[] = [
    {label: "Zeta", value: "zeta"},
    {label: "Alpha", value: "alpha"},
    {label: "Mu", value: "mu"},
];

function renderMultiselect(
    props: Partial<Parameters<typeof RefineMultiselect>[0]> = {},
) {
    const onChange = props.onChange ?? vi.fn();
    function Harness() {
        const [open, setOpen] = useState(props.open ?? false);
        return (
            <RefineMultiselect
                entries={props.entries ?? entries}
                groupLabel={props.groupLabel}
                label={props.label ?? "Dimension"}
                onChange={onChange}
                onToggleOpen={() => setOpen((current) => !current)}
                open={open}
                selected={props.selected ?? []}
                selectionActions={props.selectionActions}
                testId={props.testId}
                testIds={props.testIds ?? TEST_IDS}
            />
        );
    }
    render(
        <ThemeProvider theme={createHydraTheme()}>
            <Harness />
        </ThemeProvider>,
    );
    return {onChange};
}

function optionValues(): (string | null)[] {
    return screen
        .getAllByTestId("demo-option")
        .map((option) => option.getAttribute("data-filter-value"));
}

describe("RefineMultiselect", () => {
    afterEach(cleanup);

    it("should render entries in the given order without sorting or dedup", () => {
        renderMultiselect({
            entries: [...entries, {label: "Alpha", value: "alpha-2"}],
            open: true,
        });
        expect(optionValues()).toEqual(["zeta", "alpha", "mu", "alpha-2"]);
    });

    it("should hide its options behind the caption toggle until opened", () => {
        renderMultiselect({groupLabel: "Dimension"});
        const toggle = screen.getByTestId("demo-toggle");
        expect(toggle).toHaveTextContent("Dimension");
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        // MUI's `Collapse` keeps the rows mounted and hides them from the
        // accessibility tree, which is what a role query proves and a
        // `data-testid` query cannot.
        expect(
            screen.queryByRole("group", {name: "Dimension"}),
        ).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("group", {name: "Dimension"})).toBeVisible();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("should add and remove a value without touching the rest of the selection", () => {
        const {onChange} = renderMultiselect({
            open: true,
            selected: ["zeta"],
        });
        const [zeta, alpha] = screen.getAllByTestId("demo-option");
        expect(zeta).toHaveAttribute("aria-pressed", "true");
        expect(alpha).toHaveAttribute("aria-pressed", "false");

        fireEvent.click(alpha);
        expect(onChange).toHaveBeenLastCalledWith(["zeta", "alpha"]);
        fireEvent.click(zeta);
        expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it("should render a count only for the entries that carry one", () => {
        renderMultiselect({
            entries: [
                {count: 3, label: "Zeta", value: "zeta"},
                {label: "Alpha", value: "alpha"},
            ],
            open: true,
        });
        const [zeta, alpha] = screen.getAllByTestId("demo-option");
        expect(zeta).toHaveTextContent("Zeta3");
        expect(alpha).toHaveTextContent("Alpha");
        expect(alpha.textContent).toBe("Alpha");
    });

    it("should name its option group only when a consumer asks for one", () => {
        renderMultiselect({open: true});
        expect(screen.getByTestId("demo-list")).not.toHaveAttribute("role");
        cleanup();

        renderMultiselect({groupLabel: "Indexer", open: true});
        expect(screen.getByTestId("demo-list")).toHaveAttribute(
            "role",
            "group",
        );
    });

    // FM-161. The *values* are the theme's business and `theme.test.ts`
    // measures them on all four palettes; what belongs here is that this
    // component asks for all four of them and puts each one where it belongs,
    // since before FM-161 the hover branch restated the resting fill and a
    // selected row answered a pointer with nothing at all.
    it("should paint all four row states from the theme's own row backgrounds", () => {
        const rowBackground = refineRowBackgrounds(createHydraTheme());
        renderMultiselect({open: true, selected: ["zeta"]});
        const [selected, unselected] = screen.getAllByTestId("demo-option");
        const emitted = [...document.querySelectorAll("style")]
            .map((element) => element.textContent ?? "")
            .join("");
        const rule = (element: Element, suffix: string) => {
            const emotionClass = [...element.classList].find((name) =>
                name.startsWith("css-"),
            );
            // Every block emitted for that class and state, joined: MUI's own
            // `MuiButton` root override contributes a `:hover` block of its
            // own (the text-decoration reset) alongside the one this
            // component's `sx` produces, and both are real rules.
            return [
                ...emitted.matchAll(
                    new RegExp(
                        `\\.${emotionClass ?? ""}${suffix}\\{([^}]*)\\}`,
                        "g",
                    ),
                ),
            ]
                .map((match) => match[1])
                .join("");
        };

        expect(rule(selected, "")).toContain(
            `background-color:${rowBackground.selected}`,
        );
        expect(rule(selected, ":hover")).toContain(
            `background-color:${rowBackground.selectedHover}`,
        );
        expect(rule(unselected, "")).toContain(
            `background-color:${rowBackground.unselected}`,
        );
        expect(rule(unselected, ":hover")).toContain(
            `background-color:${rowBackground.unselectedHover}`,
        );
        // The four are four: no state may restate the one beside it.
        expect(new Set(Object.values(rowBackground)).size).toBe(4);
    });

    // FM-188. The row is opt-in and the history sections deliberately do not
    // take it (ADR-0016), so its absence is as much a contract as its
    // behaviour: supplying the three ids without the prop must still render
    // nothing.
    it("should render no selection actions unless a consumer opts in", () => {
        renderMultiselect({open: true, testIds: ACTION_TEST_IDS});
        for (const testId of ["demo-invert", "demo-all", "demo-none"]) {
            expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        }
        expect(screen.getAllByRole("button")).toHaveLength(
            entries.length + 1, // the option rows and the caption toggle
        );
    });

    it("should compute each selection action's payload from the current entries and selection", () => {
        const {onChange} = renderMultiselect({
            open: true,
            selected: ["mu", "zeta"],
            selectionActions: true,
            testIds: ACTION_TEST_IDS,
        });

        // Entry order, not selection order and not the order the values were
        // handed in: "zeta", "alpha", "mu" is how they render.
        fireEvent.click(screen.getByTestId("demo-invert"));
        expect(onChange).toHaveBeenLastCalledWith(["alpha"]);
        fireEvent.click(screen.getByTestId("demo-all"));
        expect(onChange).toHaveBeenLastCalledWith(["zeta", "alpha", "mu"]);
        fireEvent.click(screen.getByTestId("demo-none"));
        expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it("should invert an empty selection into every entry and a full one into none", () => {
        const {onChange} = renderMultiselect({
            open: true,
            selectionActions: true,
            testIds: ACTION_TEST_IDS,
        });
        fireEvent.click(screen.getByTestId("demo-invert"));
        expect(onChange).toHaveBeenLastCalledWith(["zeta", "alpha", "mu"]);
        cleanup();

        const full = renderMultiselect({
            open: true,
            selected: ["zeta", "alpha", "mu"],
            selectionActions: true,
            testIds: ACTION_TEST_IDS,
        });
        fireEvent.click(screen.getByTestId("demo-invert"));
        expect(full.onChange).toHaveBeenLastCalledWith([]);
    });

    it("should disable every selection action when there is nothing to act on", () => {
        renderMultiselect({
            entries: [],
            open: true,
            selectionActions: true,
            testIds: ACTION_TEST_IDS,
        });
        for (const testId of ["demo-invert", "demo-all", "demo-none"]) {
            expect(screen.getByTestId(testId)).toBeDisabled();
        }
    });

    it("should keep the caption toggle the only control outside the collapse", () => {
        renderMultiselect({
            open: true,
            selectionActions: true,
            testId: "demo-section",
            testIds: ACTION_TEST_IDS,
        });
        const section = screen.getByTestId("demo-section");
        const collapse = section.querySelector(".MuiCollapse-root");
        expect(collapse).not.toBeNull();
        const outsideCollapse = [...section.querySelectorAll("button")].filter(
            (button) => collapse?.contains(button) !== true,
        );
        expect(outsideCollapse).toEqual([screen.getByTestId("demo-toggle")]);
        expect(outsideCollapse[0]).toHaveAttribute("aria-expanded", "true");
        // ... and the actions are inside it, above the first entry row, but
        // outside the option list itself.
        const list = screen.getByTestId("demo-list");
        for (const testId of ["demo-invert", "demo-all", "demo-none"]) {
            const action = screen.getByTestId(testId);
            expect(collapse?.contains(action)).toBe(true);
            expect(list.contains(action)).toBe(false);
            expect(
                action.compareDocumentPosition(
                    screen.getAllByTestId("demo-option")[0],
                ) & Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
        }
    });

    it("should carry a section test id only when a consumer supplies one", () => {
        renderMultiselect({testId: "demo-section"});
        expect(screen.getByTestId("demo-section")).toContainElement(
            screen.getByTestId("demo-toggle"),
        );
    });
});
