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
