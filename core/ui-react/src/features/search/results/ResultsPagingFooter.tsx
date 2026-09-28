import {Box, Button, Stack, Typography} from "@mui/material";

import {LoadMoreButton} from "./LoadMoreButton";

/**
 * FM-192: the phone branch's paging footer, moved verbatim out of
 * `SearchResults`. Its `refineSurfaceCompact && onLoadMore` condition stays at
 * the call site, so this component renders exactly when the region did before.
 */
export function ResultsPagingFooter({
    availableResultsPhrase,
    loadAmounts,
    moreResultsAvailable,
    pagingAvailable,
    pagingLoading,
    requestContinuation,
    requestLoadAll,
    requestLoadAmount,
}: {
    availableResultsPhrase: string;
    loadAmounts: number[];
    moreResultsAvailable: boolean;
    pagingAvailable: boolean;
    pagingLoading: boolean;
    requestContinuation: (loadAll: boolean) => Promise<void>;
    requestLoadAll: () => Promise<void>;
    requestLoadAmount: (amount: number) => Promise<void>;
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
            {/* Two equal columns rather than `flex: 1` on both: a flex item
                never shrinks below its content, so the split "Load more ▾"
                and "Load all results" would come out unequal. */}
            <Box
                sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
            >
                <LoadMoreButton
                    amounts={loadAmounts}
                    footer
                    onLoadAmount={(amount) => void requestLoadAmount(amount)}
                    onLoadMore={() => void requestContinuation(false)}
                    pagingAvailable={pagingAvailable}
                    pagingLoading={pagingLoading}
                />
                <Button
                    data-testid="results-load-all"
                    disabled={!pagingAvailable || pagingLoading}
                    onClick={() => void requestLoadAll()}
                    size="small"
                >
                    Load all results
                </Button>
            </Box>
        </Stack>
    );
}
