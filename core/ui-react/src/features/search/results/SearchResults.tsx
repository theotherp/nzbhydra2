import {
    Alert,
    Box,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";

import type {SearchResponse} from "../../../api/search";

export function SearchResults({data}: {data: SearchResponse}) {
    const allIndexersFailed =
        data.indexerSearchMetaDatas.length > 0 &&
        data.indexerSearchMetaDatas.every((indexer) => !indexer.wasSuccessful);
    return (
        <Stack data-testid="search-results" spacing={2} sx={{mt: 4}}>
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
            {data.numberOfRejectedResults > 0 && (
                <Alert severity="info">
                    Rejected {data.numberOfRejectedResults} results.
                </Alert>
            )}
            {data.searchResults.length > 0 && (
                <>
                    <Typography data-testid="search-results-summary">
                        Loaded {data.searchResults.length} of{" "}
                        {data.numberOfAvailableResults} results (rejected{" "}
                        {data.numberOfRejectedResults})
                    </Typography>
                    <Box sx={{maxWidth: "100%", overflowX: "auto"}}>
                        <Table data-testid="search-results-table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Title</TableCell>
                                    <TableCell>Indexer</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Size</TableCell>
                                    <TableCell>Age</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.searchResults.map((result) => (
                                    <TableRow
                                        data-testid="search-result-row"
                                        key={result.searchResultId}
                                    >
                                        <TableCell data-testid="search-result-title">
                                            {result.title}
                                        </TableCell>
                                        <TableCell>{result.indexer}</TableCell>
                                        <TableCell>{result.category}</TableCell>
                                        <TableCell>
                                            {result.size ?? ""}
                                        </TableCell>
                                        <TableCell>
                                            {result.age ?? ""}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </>
            )}
        </Stack>
    );
}
