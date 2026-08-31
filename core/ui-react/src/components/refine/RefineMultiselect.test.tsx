import {ThemeProvider} from "@mui/material/styles";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createHydraTheme} from "../../app/theme";
import {
    RefineMultiselect,
    type RefineMultiselectEntry,
} from "./RefineMultiselect";

const TEST_IDS = {
    list: "demo-list",
    option: "demo-option",
    toggle: "demo-toggle",
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

    it("should carry a section test id only when a consumer supplies one", () => {
        renderMultiselect({testId: "demo-section"});
        expect(screen.getByTestId("demo-section")).toContainElement(
            screen.getByTestId("demo-toggle"),
        );
    });
});
