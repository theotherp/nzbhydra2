import {
    Table,
    TableBody,
    TableCell,
    TableRow,
    ThemeProvider,
} from "@mui/material";
import {cleanup, render, screen} from "@testing-library/react";
import {act} from "react";
import {describe, expect, it} from "vitest";

import {createHydraTheme} from "../../app/theme";
import {
    horizontalScrollEdges,
    SCROLL_AFFORDANCE_END_TEST_ID,
    SCROLL_AFFORDANCE_START_TEST_ID,
    TableScrollAffordance,
} from "./TableScrollAffordance";

describe("horizontalScrollEdges", () => {
    it("reports no edge while the content fits", () => {
        expect(
            horizontalScrollEdges({
                clientWidth: 390,
                scrollLeft: 0,
                scrollWidth: 390,
            }),
        ).toEqual({end: false, start: false});
    });

    it("reports only the end edge at the start of a clipped scroller", () => {
        expect(
            horizontalScrollEdges({
                clientWidth: 390,
                scrollLeft: 0,
                scrollWidth: 900,
            }),
        ).toEqual({end: true, start: false});
    });

    it("reports both edges in the middle", () => {
        expect(
            horizontalScrollEdges({
                clientWidth: 390,
                scrollLeft: 200,
                scrollWidth: 900,
            }),
        ).toEqual({end: true, start: true});
    });

    it("clears the end edge once scrolled to the limit", () => {
        expect(
            horizontalScrollEdges({
                clientWidth: 390,
                scrollLeft: 510,
                scrollWidth: 900,
            }),
        ).toEqual({end: false, start: true});
    });

    it("tolerates the sub-pixel shortfall a real scroll end lands on", () => {
        // Chromium reports the fully scrolled position a fraction short of
        // `scrollWidth - clientWidth`; without the slack the affordance would
        // never clear.
        expect(
            horizontalScrollEdges({
                clientWidth: 390.5,
                scrollLeft: 509.2,
                scrollWidth: 900,
            }),
        ).toEqual({end: false, start: true});
    });

    it("ignores a sub-pixel overflow that clips nothing", () => {
        expect(
            horizontalScrollEdges({
                clientWidth: 390,
                scrollLeft: 0,
                scrollWidth: 390.4,
            }),
        ).toEqual({end: false, start: false});
    });
});

/**
 * jsdom lays nothing out, so the metrics are driven onto the scroller rather
 * than measured (ADR-0004: the visual proof is the Playwright run and the
 * strips, not this file).
 */
function driveMetrics(
    element: HTMLElement,
    metrics: {clientWidth: number; scrollLeft: number; scrollWidth: number},
): void {
    for (const [name, value] of Object.entries(metrics)) {
        Object.defineProperty(element, name, {configurable: true, value});
    }
    act(() => {
        element.dispatchEvent(new Event("scroll"));
    });
}

describe("TableScrollAffordance", () => {
    // Rendered under the application's own theme rather than MUI's default,
    // because since FM-156 the fade reads its scrim from `surfaces`, a token
    // set only this application's themes declare -- exactly as `AppShell`
    // mounts it.
    const renderScroller = (
        themeName: Parameters<typeof createHydraTheme>[0] = "grey",
    ) => {
        render(
            <ThemeProvider theme={createHydraTheme(themeName, false)}>
                <TableScrollAffordance scrollerTestId="test-scroller">
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell>Cell</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableScrollAffordance>
            </ThemeProvider>,
        );
        return screen.getByTestId("test-scroller");
    };

    it("shows no affordance while nothing is clipped", () => {
        const scroller = renderScroller();
        driveMetrics(scroller, {
            clientWidth: 390,
            scrollLeft: 0,
            scrollWidth: 390,
        });

        expect(
            screen.queryByTestId(SCROLL_AFFORDANCE_START_TEST_ID),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByTestId(SCROLL_AFFORDANCE_END_TEST_ID),
        ).not.toBeInTheDocument();
    });

    it("marks the clipped edge and clears it once that edge is reached", () => {
        const scroller = renderScroller();

        driveMetrics(scroller, {
            clientWidth: 390,
            scrollLeft: 0,
            scrollWidth: 900,
        });
        expect(
            screen.queryByTestId(SCROLL_AFFORDANCE_START_TEST_ID),
        ).not.toBeInTheDocument();
        expect(
            screen.getByTestId(SCROLL_AFFORDANCE_END_TEST_ID),
        ).toBeInTheDocument();

        driveMetrics(scroller, {
            clientWidth: 390,
            scrollLeft: 200,
            scrollWidth: 900,
        });
        expect(
            screen.getByTestId(SCROLL_AFFORDANCE_START_TEST_ID),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId(SCROLL_AFFORDANCE_END_TEST_ID),
        ).toBeInTheDocument();

        driveMetrics(scroller, {
            clientWidth: 390,
            scrollLeft: 510,
            scrollWidth: 900,
        });
        expect(
            screen.getByTestId(SCROLL_AFFORDANCE_START_TEST_ID),
        ).toBeInTheDocument();
        expect(
            screen.queryByTestId(SCROLL_AFFORDANCE_END_TEST_ID),
        ).not.toBeInTheDocument();
    });

    it("keeps the affordance out of the accessibility tree and out of the way", () => {
        const scroller = renderScroller();
        driveMetrics(scroller, {
            clientWidth: 390,
            scrollLeft: 0,
            scrollWidth: 900,
        });

        const fade = screen.getByTestId(SCROLL_AFFORDANCE_END_TEST_ID);
        expect(fade).toHaveAttribute("aria-hidden", "true");
        expect(fade).toHaveStyle({pointerEvents: "none"});
    });

    // FM-156 moved the fade's scrim off an `alpha(common.black, 0.45)` literal
    // onto the per-theme `surfaces.tableScrollFade` token. A typo in that
    // palette path would not throw -- the gradient would just resolve its
    // first stop to nothing and the affordance would go invisible on every
    // theme at once -- so the rendered gradient is pinned against the token
    // each theme actually declares.
    it("paints the scrim from each theme's own tableScrollFade token", () => {
        for (const name of [
            "grey",
            "bright",
            "dark",
            "dark-dyschromatopsia",
        ] as const) {
            const theme = createHydraTheme(name, false);

            cleanup();
            driveMetrics(renderScroller(name), {
                clientWidth: 390,
                scrollLeft: 0,
                scrollWidth: 900,
            });
            const fade = screen.getByTestId(SCROLL_AFFORDANCE_END_TEST_ID);
            const gradient = getComputedStyle(fade).backgroundImage;

            expect(gradient).toContain(theme.palette.surfaces.tableScrollFade);
            expect(gradient).toContain("transparent");
        }
    });
});
