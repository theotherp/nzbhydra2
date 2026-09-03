import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {RefineSurfaceLabels, RefineSurfaceTestIds} from "./RefineSurface";
import {RefineSurface} from "./RefineSurface";

// Deliberately not the results page's own vocabulary: the shell states no
// label and no test id of its own, so a second consumer's wording has to work
// exactly as well here as `RefineSidebar.tsx`'s does in the app.
const labels: RefineSurfaceLabels = {
    close: "Close probe filters",
    collapse: "Collapse probe filters",
    done: "Show 7 probes",
    expand: "Expand probe filters",
    heading: "Probe",
    surface: "Probe filters",
};
const testIds: RefineSurfaceTestIds = {
    clearAll: "probe-clear-all",
    close: "probe-close",
    done: "probe-done",
    drawer: "probe-drawer",
    surface: "probe-surface",
    toggle: "probe-toggle",
};

// The shell picks its branch with `useMediaQuery`; jsdom's own `matchMedia`
// never matches anything, so the compact viewport has to be stated explicitly.
// `vi.unstubAllGlobals()` in `afterEach` removes it again.
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

function Surface({
    collapsed = false,
    drawerOpen = false,
    onDrawerOpenChange = vi.fn(),
    stickyOffset,
    summary,
    trigger,
}: {
    collapsed?: boolean;
    drawerOpen?: boolean;
    onDrawerOpenChange?: (open: boolean) => void;
    stickyOffset?: number;
    summary?: string;
    trigger?: "inline" | "external";
}) {
    return (
        <RefineSurface
            clearAllDisabled={false}
            collapsed={collapsed}
            drawerOpen={drawerOpen}
            labels={labels}
            onClearAll={vi.fn()}
            onDrawerOpenChange={onDrawerOpenChange}
            onToggleCollapsed={vi.fn()}
            stickyOffset={stickyOffset}
            summary={summary}
            testIds={testIds}
            trigger={trigger}
        >
            <div data-testid="probe-sections">sections</div>
        </RefineSurface>
    );
}

describe("RefineSurface", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("renders the docked column with the consumer's labels and test ids", () => {
        render(<Surface />);
        const surface = screen.getByTestId(testIds.surface);
        expect(surface.tagName).toBe("NAV");
        expect(surface).toHaveAttribute("aria-label", labels.surface);
        // FM-142: `heading` is the compact trigger's text only. No branch of
        // the docked column renders it as a header caption any more.
        expect(screen.queryByText(labels.heading)).not.toBeInTheDocument();
        expect(screen.getByTestId(testIds.clearAll)).toBeEnabled();
        expect(
            screen.getByRole("button", {name: labels.collapse}),
        ).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByTestId("probe-sections")).toBeInTheDocument();
        expect(screen.queryByTestId(testIds.drawer)).not.toBeInTheDocument();
    });

    // Exactly one branch exists in the DOM at a time, decided in JavaScript
    // rather than by CSS `display`, so no accessible name and no `data-testid`
    // is ever duplicated.
    it("replaces the docked branch with the drawer branch below the breakpoint", () => {
        stubCompactViewport();
        render(<Surface drawerOpen />);
        expect(screen.getByTestId(testIds.drawer)).toBeInTheDocument();
        expect(screen.getAllByTestId(testIds.surface)).toHaveLength(1);
        expect(screen.getAllByTestId(testIds.toggle)).toHaveLength(1);
        expect(screen.getByTestId(testIds.toggle)).toHaveAttribute(
            "aria-haspopup",
            "dialog",
        );
        expect(
            screen.getByRole("button", {name: labels.close}),
        ).toBeInTheDocument();
        expect(screen.getByTestId("probe-sections")).toBeInTheDocument();
        // The trigger's own text is the only place `heading` renders; the
        // drawer's header is captionless like the docked column's.
        expect(screen.getAllByText(labels.heading)).toHaveLength(1);
        expect(screen.getByTestId(testIds.drawer)).not.toHaveTextContent(
            labels.heading,
        );
    });

    // FM-181: the sheet is a three-part column, and the two controls a thumb
    // reaches for are pinned in its footer rather than left at the top of a
    // list that scrolls. The header keeps the summary and the close control.
    it("pins clear-all and done in the compact sheet's footer", () => {
        const onDrawerOpenChange = vi.fn();
        stubCompactViewport();
        render(
            <Surface
                drawerOpen
                onDrawerOpenChange={onDrawerOpenChange}
                summary="2 active filters"
            />,
        );
        const surface = screen.getByTestId(testIds.surface);
        const clearAll = screen.getByTestId(testIds.clearAll);
        // Named exactly as it has always been, and now saying so on screen
        // too -- the docked column's 216px header is what forced the icon.
        expect(clearAll).toHaveAccessibleName("Clear all filters");
        expect(clearAll).toHaveTextContent("Clear all");
        const done = screen.getByTestId(testIds.done);
        expect(done).toHaveTextContent(labels.done);
        // Header first, footer last, sections in between.
        const order = [...surface.children];
        expect(order).toHaveLength(3);
        expect(order[0]).toContainElement(
            screen.getByRole("button", {name: labels.close}),
        );
        expect(order[1]).toContainElement(screen.getByTestId("probe-sections"));
        expect(order[2]).toContainElement(done);
        expect(order[2]).toContainElement(clearAll);
        // The sheet's own body is what scrolls, so the footer cannot be
        // pushed off it however long the sections are.
        expect(getComputedStyle(order[1]).overflowY).toBe("auto");

        fireEvent.click(done);
        expect(onDrawerOpenChange).toHaveBeenCalledWith(false);
    });

    // The results page renders its own badge-carrying trigger inside its one
    // sticky toolbar row, so the shell must emit none -- otherwise
    // `refine-sidebar-toggle` would exist twice at the same width.
    it("renders no trigger of its own when the consumer places one", () => {
        stubCompactViewport();
        const {rerender} = render(<Surface trigger="external" />);
        expect(screen.queryByTestId(testIds.toggle)).not.toBeInTheDocument();
        expect(screen.queryByText(labels.heading)).not.toBeInTheDocument();
        // The sheet itself is unaffected: the consumer drives `drawerOpen`.
        rerender(<Surface drawerOpen trigger="external" />);
        expect(screen.getByTestId(testIds.surface)).toBeInTheDocument();
        expect(screen.queryByTestId(testIds.toggle)).not.toBeInTheDocument();
    });

    // FM-142: the header row cannot hold a text button beside the summary and
    // the toggle at the 248px docked width, so clear-all is icon-only in the
    // docked branch -- named for assistive technology, silent on screen, and
    // still the same `data-testid` and disabled rule its consumers query.
    // (FM-181's sheet has room for the word and says it; see above.)
    it("offers clear-all as a named icon-only control", () => {
        const onClearAll = vi.fn();
        const {rerender} = render(
            <RefineSurface
                clearAllDisabled
                collapsed={false}
                drawerOpen={false}
                labels={labels}
                onClearAll={onClearAll}
                onDrawerOpenChange={vi.fn()}
                onToggleCollapsed={vi.fn()}
                testIds={testIds}
            >
                <div data-testid="probe-sections">sections</div>
            </RefineSurface>,
        );
        const disabled = screen.getByTestId(testIds.clearAll);
        expect(disabled).toBeDisabled();
        expect(disabled).toHaveAccessibleName("Clear all filters");
        expect(disabled.textContent).toBe("");

        rerender(<Surface />);
        const enabled = screen.getByRole("button", {
            name: "Clear all filters",
        });
        expect(enabled).toHaveAttribute("data-testid", testIds.clearAll);
    });

    // Closed, the drawer's own content is unmounted; the trigger stays, and it
    // announces the surface as expandable rather than collapsible.
    it("keeps only the trigger while the compact drawer is closed", () => {
        stubCompactViewport();
        render(<Surface />);
        expect(
            screen.getByRole("button", {name: labels.expand}),
        ).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByTestId(testIds.surface)).not.toBeInTheDocument();
        expect(screen.queryByTestId("probe-sections")).not.toBeInTheDocument();
    });

    // The 48px rail has room for the toggle alone: no clear-all, no summary,
    // and no sections. (Since FM-142 the expanded column carries no caption
    // either, so `heading` is absent in both docked states.)
    it("collapses to a rail carrying only the toggle", () => {
        render(<Surface collapsed />);
        expect(screen.getByTestId(testIds.surface)).toBeInTheDocument();
        expect(screen.queryByText(labels.heading)).not.toBeInTheDocument();
        expect(screen.queryByTestId(testIds.clearAll)).not.toBeInTheDocument();
        expect(screen.queryByTestId("probe-sections")).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", {name: labels.expand}),
        ).toHaveAttribute("aria-expanded", "false");
    });

    // The optional header summary slot ADR-0046 reserves for the history
    // views' active-filter count. A consumer that passes none (the results
    // page) must render no placeholder for it, and the rail hides it with the
    // rest of the header content it has no room for.
    it("renders the header summary only where there is room for it", () => {
        const {rerender} = render(<Surface summary="2 active filters" />);
        expect(screen.getByText("2 active filters")).toBeInTheDocument();
        rerender(<Surface collapsed summary="2 active filters" />);
        expect(screen.queryByText("2 active filters")).not.toBeInTheDocument();
    });

    // FM-055: the docked branch pins itself beneath whatever sticky chrome the
    // consumer measured and sizes its own scroll box against the same value.
    // jsdom lays nothing out, so only the emitted declarations are observable
    // here.
    it.each([
        ["expanded", false],
        ["collapsed rail", true],
    ])("pins the docked %s beneath the sticky offset", (_name, collapsed) => {
        render(<Surface collapsed={collapsed} stickyOffset={90} />);
        const style = getComputedStyle(screen.getByTestId(testIds.surface));
        expect(style.position).toBe("sticky");
        expect(style.top).toBe("90px");
        expect(style.maxHeight).toBe("calc(100vh - 90px)");
        expect(style.overflowY).toBe("auto");
    });

    // A page with no sticky chrome above the surface passes nothing.
    it("pins against the viewport top when no sticky offset is given", () => {
        render(<Surface />);
        const style = getComputedStyle(screen.getByTestId(testIds.surface));
        expect(style.top).toBe("0px");
        expect(style.maxHeight).toBe("calc(100vh - 0px)");
    });
});
