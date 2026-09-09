import {Alert, Typography} from "@mui/material";

import type {SearchResponse} from "../../../api/search";

/**
 * FM-192: the results region's alert stack, moved verbatim out of
 * `SearchResults`.
 *
 * A fragment rather than a container: these alerts are direct children of the
 * `search-results` `Stack`, whose `spacing` is a CSS rule against its own
 * children, so introducing a wrapper element here would change the rendered
 * layout. Every condition, message and `data-testid` is the one
 * `SearchResults` rendered before this split.
 */
export function ResultsAlerts({
    allIndexersFailed,
    data,
    hasInvalidPagingCursor,
    pagingError,
}: {
    allIndexersFailed: boolean;
    data: SearchResponse;
    hasInvalidPagingCursor: boolean;
    pagingError: string | undefined;
}) {
    return (
        <>
            {data.indexerLimitWarnings.length > 0 && (
                <Alert data-testid="indexer-limit-warnings" severity="warning">
                    <strong>Indexer quota warning</strong>
                    <ul>
                        {data.indexerLimitWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </Alert>
            )}
            {data.malformedResultCount > 0 && (
                <Alert severity="warning">
                    {data.malformedResultCount} malformed result entries were
                    not displayed.
                </Alert>
            )}
            {Object.keys(data.notPickedIndexersWithReason).length > 0 &&
                data.indexerSearchMetaDatas.length === 0 && (
                    <Alert severity="info">
                        <Typography component="h2" variant="h6">
                            No indexers were picked for this search
                        </Typography>
                        <ul>
                            {Object.entries(
                                data.notPickedIndexersWithReason,
                            ).map(([indexer, reason]) => (
                                <li key={indexer}>
                                    {indexer}: {reason}
                                </li>
                            ))}
                        </ul>
                    </Alert>
                )}
            {allIndexersFailed && (
                <Alert severity="error">
                    Unable to search any indexer successfully; no results
                    available
                </Alert>
            )}
            {!allIndexersFailed &&
                data.indexerSearchMetaDatas.length > 0 &&
                data.numberOfAvailableResults === 0 && (
                    <Alert severity="info">
                        No results were found for this search
                    </Alert>
                )}
            {/* FM-055: the standalone `Rejected N results.` Alert is gone --
                the count now lives in `search-results-summary` as the
                `results-rejected-trigger`, which additionally exposes the
                per-reason breakdown legacy showed in its click-tooltip
                (`search-results.html:170-190`) and React never rendered.
                Review fix: `search-results-summary` (and so the trigger)
                still renders when everything loaded was rejected -- see
                `hasRejectedResults` above -- so this information stays
                reachable in the one state where the "no results" Alert
                above does not fire either (`numberOfAvailableResults`
                includes rejected items server-side). */}
            {data.pagingState === "partial" && (
                <Alert role="status" severity="warning">
                    More results cannot be loaded because the server returned
                    incomplete paging information.
                </Alert>
            )}
            {hasInvalidPagingCursor && (
                <Alert role="status" severity="warning">
                    More results cannot be loaded because the server returned an
                    invalid paging cursor.
                </Alert>
            )}
            {pagingError && (
                <Alert role="alert" severity="error">
                    {pagingError}
                </Alert>
            )}
        </>
    );
}
