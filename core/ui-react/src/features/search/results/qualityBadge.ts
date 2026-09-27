/**
 * Movie quality indicator badge helpers (legacy `search-result.js`'s
 * `getQualityClass`/`formatQualityWarnings`, restored). The backend only ever
 * sends `qualityRating`/`qualityWarnings` together for movie results with the
 * indicator enabled (`InternalSearchResultProcessor`), so the rendering side
 * needs no config of its own.
 */

/**
 * FM-201: a result's rating as the quality column shows, sorts and filters
 * it -- `undefined` for an unrated result. Legacy's `ng-if` rendered no badge
 * for a falsy rating, and the backend clamps a real one to 1..10
 * (`QualityAnalyzer.getQualityRating`), so a 0 counts as unrated here too
 * rather than as the lowest rating.
 */
export function resultQualityRating(result: {
    qualityRating?: number;
}): number | undefined {
    return result.qualityRating ? result.qualityRating : undefined;
}

/**
 * FM-201: whether the results table carries the quality column -- the safe
 * config's `searching.showQualityIndicator` is on *and* some loaded result has
 * a rating. The caller passes every loaded result, not the filtered ones, so
 * refining never adds or removes the column.
 */
export function showsQualityColumn(
    indicatorEnabled: boolean,
    results: {qualityRating?: number}[],
): boolean {
    return (
        indicatorEnabled &&
        results.some((result) => resultQualityRating(result) !== undefined)
    );
}

/** `getQualityClass` (`search-result.js`): thresholds unchanged. */
export function qualityBadgeSeverity(
    rating: number,
): "success" | "warning" | "error" {
    if (rating >= 7) {
        return "success";
    }
    if (rating >= 4) {
        return "warning";
    }
    return "error";
}

export type QualityTooltipSection = {
    key: "quality" | "critical" | "warning";
    heading: string;
    messages: string[];
};

const PREFIXES: {
    prefix: string;
    key: QualityTooltipSection["key"];
    heading: string;
}[] = [
    {prefix: "[QUALITY]", key: "quality", heading: "Quality factors:"},
    {prefix: "[CRITICAL]", key: "critical", heading: "Critical:"},
    {prefix: "[WARNING]", key: "warning", heading: "Warning:"},
    // `[INFO]` entries are intentionally dropped -- legacy's comment calls
    // them "redundant with quality factors".
];

/**
 * Buckets `qualityWarnings` by prefix, in the fixed section order
 * quality/critical/warning, stripping the prefix and omitting empty
 * sections. An absent or empty list yields no sections; the caller renders
 * "No quality information available" for that case.
 */
export function buildQualityTooltipSections(
    warnings: string[] | undefined,
): QualityTooltipSection[] {
    if (!warnings || warnings.length === 0) {
        return [];
    }
    const buckets = new Map<QualityTooltipSection["key"], string[]>();
    for (const entry of warnings) {
        const match = PREFIXES.find(({prefix}) => entry.startsWith(prefix));
        if (!match) {
            continue;
        }
        const messages = buckets.get(match.key) ?? [];
        messages.push(entry.slice(match.prefix.length).trim());
        buckets.set(match.key, messages);
    }
    return PREFIXES.filter(({key}) => (buckets.get(key)?.length ?? 0) > 0).map(
        ({key, heading}) => ({key, heading, messages: buckets.get(key)!}),
    );
}
