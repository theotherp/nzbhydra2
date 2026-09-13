import {Button, Stack, Typography} from "@mui/material";

/**
 * FM-192: the phone branch's paging footer, moved verbatim out of
 * `SearchResults`. Its `refineSurfaceCompact && onLoadMore` condition stays at
 * the call site, so this component renders exactly when the region did before.
 */
export function ResultsPagingFooter({
    availableResultsPhrase,
    moreResultsAvailable,
    pagingAvailable,
    pagingLoading,
    requestContinuation,
    requestLoadAll,
}: {
    availableResultsPhrase: string;
    moreResultsAvailable: boolean;
    pagingAvailable: boolean;
    pagingLoading: boolean;
    requestContinuation: (loadAll: boolean) => Promise<void>;
    requestLoadAll: () => Promise<void>;
}) {
    return (
        <Stack
            data-testid="results-paging-footer"
            sx={{gap: 1, padding: "16px 0"}}
        >
            {moreResultsAvailable && (
                <Typography component="div" variant="subtitle2">
                    {availableResultsPhrase} available
                </Typography>
            )}
            <Stack direction="row" sx={{gap: 1}}>
                <Button
                    aria-busy={pagingLoading}
                    data-testid="results-load-more"
                    disabled={!pagingAvailable || pagingLoading}
                    onClick={() => void requestContinuation(false)}
                    size="small"
                    sx={{flex: 1}}
                >
                    {pagingLoading ? "Loading more results…" : "Load more"}
                </Button>
                <Button
                    data-testid="results-load-all"
                    disabled={!pagingAvailable || pagingLoading}
                    onClick={() => void requestLoadAll()}
                    size="small"
                    sx={{flex: 1}}
                >
                    Load all results
                </Button>
            </Stack>
        </Stack>
    );
}
