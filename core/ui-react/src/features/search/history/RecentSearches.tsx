import {useQuery} from "@tanstack/react-query";
import {
    Alert,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";

import {getRecentSearches} from "../../../api/recentSearches";
import type {RecentSearch} from "../../../api/recentSearches";
import {ApiTransport} from "../../../api/transport";

export function RecentSearches({
    transport,
    enabled,
    refreshKey,
    onRefill,
    onRepeat,
    onDragStart,
}: {
    transport: ApiTransport;
    enabled: boolean;
    refreshKey: number;
    onRefill(search: RecentSearch): void;
    onRepeat(search: RecentSearch): void;
    onDragStart(search: RecentSearch): void;
}) {
    const recentSearches = useQuery({
        queryKey: ["recent-searches", refreshKey],
        queryFn: () => getRecentSearches(transport),
        enabled,
    });

    if (!enabled || recentSearches.isPending) {
        return enabled ? (
            <CircularProgress aria-label="Loading recent searches" size={24} />
        ) : null;
    }
    if (recentSearches.isError) {
        return (
            <Alert severity="warning">Unable to load recent searches.</Alert>
        );
    }
    if (recentSearches.data.length === 0) {
        return <Typography role="status">No recent searches.</Typography>;
    }
    return (
        <Stack aria-label="Recent searches" spacing={1}>
            <Typography component="h2" variant="h6">
                Recent searches
            </Typography>
            {recentSearches.data.map((search, index) => (
                <Stack
                    direction="row"
                    draggable
                    key={`${search.categoryName}-${search.query}-${search.title}-${index}`}
                    onDragStart={() => onDragStart(search)}
                    spacing={1}
                >
                    <Typography sx={{flexGrow: 1}}>
                        {describeSearch(search)}
                    </Typography>
                    <Button onClick={() => onRefill(search)}>Refill</Button>
                    <Button onClick={() => onRepeat(search)}>Repeat</Button>
                </Stack>
            ))}
        </Stack>
    );
}

function describeSearch(search: RecentSearch): string {
    const identifiers = search.identifiers
        .map(
            ({identifierKey, identifierValue}) =>
                `${identifierKey}: ${identifierValue}`,
        )
        .join(", ");
    return [
        `Category: ${search.categoryName}`,
        `Source: ${describeSource(search.source)}`,
        search.query ? `Query: ${search.query}` : undefined,
        search.title ? `Title: ${search.title}` : undefined,
        identifiers || undefined,
        search.season !== undefined ? `Season: ${search.season}` : undefined,
        search.episode ? `Episode: ${search.episode}` : undefined,
        search.author ? `Author: ${search.author}` : undefined,
    ]
        .filter((value): value is string => value !== undefined)
        .join(", ");
}

function describeSource(source: RecentSearch["source"]): string {
    return source === "INTERNAL"
        ? "Internal"
        : source === "API"
          ? "API"
          : "Unknown";
}
