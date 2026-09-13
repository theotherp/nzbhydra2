import {Box, TableContainer} from "@mui/material";
import {useEffect, useRef, useState, type ReactNode} from "react";

/**
 * `C-TABLE-SCROLL-AFFORDANCE` (ADR-0038).
 *
 * At narrow widths several tables are wider than the viewport. ADR-0029's
 * remedy is that the *container* scrolls rather than the page, but a container
 * that scrolls silently looks exactly like a table that ends where it is
 * clipped. This wrapper is ADR-0038's "one shared affordance mechanism": it
 * renders the scrolling `TableContainer` and paints a fade over whichever edge
 * currently hides content, so "there is more that way" is visible, and clears
 * that edge's fade the moment it is scrolled to its limit.
 *
 * It deliberately does not set a width floor. The width at which a table's
 * columns stop being squeezed into mid-word wrapping is a fact about that
 * table's own columns, so each consumer declares its own measured `minWidth`
 * on its `<Table>`, with the measurement justified at the site.
 */

/** The affordance overlays, addressable from system tests. */
export const SCROLL_AFFORDANCE_START_TEST_ID = "table-scroll-affordance-start";
export const SCROLL_AFFORDANCE_END_TEST_ID = "table-scroll-affordance-end";

export interface HorizontalScrollMetrics {
    clientWidth: number;
    scrollLeft: number;
    scrollWidth: number;
}

export interface ScrollEdges {
    /** Content is clipped past the left edge. */
    start: boolean;
    /** Content is clipped past the right edge. */
    end: boolean;
}

/**
 * A whole pixel of slack. Browsers report these three widths as fractional
 * CSS pixels, and a container scrolled fully to its end routinely lands a
 * fraction short of `scrollWidth - clientWidth`; without the slack the end
 * affordance would never clear on such a table, which is precisely the
 * behavior ADR-0038 asks for.
 */
const EDGE_EPSILON = 1;

/**
 * Pure, so the affordance's semantics can be unit-tested against driven
 * metrics rather than against a jsdom layout that has none (ADR-0004).
 */
export function horizontalScrollEdges({
    clientWidth,
    scrollLeft,
    scrollWidth,
}: HorizontalScrollMetrics): ScrollEdges {
    if (scrollWidth - clientWidth <= EDGE_EPSILON) {
        return {end: false, start: false};
    }
    return {
        end: scrollLeft + clientWidth < scrollWidth - EDGE_EPSILON,
        start: scrollLeft > EDGE_EPSILON,
    };
}

export function TableScrollAffordance({
    children,
    scrollerTestId,
}: {
    children: ReactNode;
    /**
     * Test id for the scrolling element itself -- the element whose
     * `scrollWidth`/`clientWidth` a system test measures.
     */
    scrollerTestId: string;
}) {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const [edges, setEdges] = useState<ScrollEdges>({end: false, start: false});

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller === null) {
            return undefined;
        }
        const measure = () => {
            const next = horizontalScrollEdges(scroller);
            setEdges((current) =>
                current.start === next.start && current.end === next.end
                    ? current
                    : next,
            );
        };
        measure();
        scroller.addEventListener("scroll", measure, {passive: true});
        // The `ConfigNav`/`SearchResults` idiom: jsdom implements no
        // `ResizeObserver`, and there is nothing laid out there to observe
        // anyway. Both the scroller (viewport changes) and its content (rows
        // arriving, a column toggled on) can change the clipping.
        if (typeof ResizeObserver === "undefined") {
            return () => scroller.removeEventListener("scroll", measure);
        }
        const observer = new ResizeObserver(measure);
        observer.observe(scroller);
        const content = scroller.firstElementChild;
        if (content !== null) {
            observer.observe(content);
        }
        return () => {
            scroller.removeEventListener("scroll", measure);
            observer.disconnect();
        };
    }, []);

    return (
        <Box sx={{position: "relative"}}>
            <TableContainer
                data-testid={scrollerTestId}
                ref={scrollerRef}
                sx={{overflowX: "auto"}}
            >
                {children}
            </TableContainer>
            {edges.start ? <EdgeFade side="left" /> : null}
            {edges.end ? <EdgeFade side="right" /> : null}
        </Box>
    );
}

/**
 * Decoration only: `aria-hidden` and non-interactive, because the information
 * it carries ("more content that way") is already available to assistive
 * technology through the scroll container itself, and a screen reader
 * announcing an empty gradient strip would be noise.
 *
 * The gradient's *shape* is authored here rather than in `theme.ts` because
 * MUI has no component for it to override -- ADR-0014's rule is that a
 * *standard* need gets a standard component and its look from the theme, and
 * this is a non-standard need. Its *colour* is not authored here: FM-156 moved
 * the scrim onto the per-theme `surfaces.tableScrollFade` token, because the
 * `alpha(common.black, 0.45)` this used to composite was measured against the
 * dark grounds that were once the only ones, and on `bright` it smeared black
 * over the text it crosses. The token's doc comment carries the measurements.
 */
function EdgeFade({side}: {side: "left" | "right"}) {
    return (
        <Box
            aria-hidden
            data-testid={
                side === "left"
                    ? SCROLL_AFFORDANCE_START_TEST_ID
                    : SCROLL_AFFORDANCE_END_TEST_ID
            }
            sx={(theme) => ({
                background: `linear-gradient(to ${side === "left" ? "right" : "left"}, ${
                    theme.palette.surfaces.tableScrollFade
                }, transparent)`,
                bottom: 0,
                pointerEvents: "none",
                position: "absolute",
                top: 0,
                width: theme.spacing(3),
                [side]: 0,
            })}
        />
    );
}
