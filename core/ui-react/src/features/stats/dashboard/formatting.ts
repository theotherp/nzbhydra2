/**
 * The dashboard's shared number rendering.
 *
 * The backend sends most of its ratios as raw doubles (`55.714287`), and the
 * legacy page rounded them in the template with Angular's `number:1`/`number:0`
 * filters. FM-172 restores that: one form for every percentage the stats
 * feature renders -- one decimal and a trailing `%` -- so no cell, tile, stat
 * or chart label states a ratio differently from its neighbour.
 */

/** The decimals every stats percentage is rendered to. */
const PERCENT_DIGITS = 1;

/**
 * A percentage, or the empty string for an absent value -- the same "render
 * nothing rather than a placeholder" rule the table cells already follow, so
 * the composite cells below can decide their own punctuation.
 */
export function formatPercent(value: number | undefined): string {
    return value === undefined ? "" : `${value.toFixed(PERCENT_DIGITS)}%`;
}

/** A plain number to a fixed number of decimals; empty for an absent value. */
export function formatNumber(
    value: number | undefined,
    digits: number,
): string {
    return value === undefined ? "" : value.toFixed(digits);
}
