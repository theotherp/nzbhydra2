import {useQuery} from "@tanstack/react-query";
import {
    Alert,
    Button,
    CircularProgress,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import {useState} from "react";

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
        retry: false,
    });
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const open = Boolean(anchor);

    const trigger = (
        <Button
            aria-controls={open ? "recent-searches-menu" : undefined}
            aria-expanded={open}
            aria-haspopup="menu"
            data-testid="recent-searches-trigger"
            onClick={(event) => setAnchor(event.currentTarget)}
            variant="outlined"
        >
            Recent searches
        </Button>
    );

    if (!enabled) {
        return null;
    }
    return (
        <>
            {trigger}
            <Menu
                anchorEl={anchor}
                anchorOrigin={{horizontal: "left", vertical: "bottom"}}
                id="recent-searches-menu"
                MenuListProps={{"aria-label": "Recent searches"}}
                onClose={() => setAnchor(null)}
                open={open}
                slotProps={{
                    paper: {
                        sx: {
                            maxWidth: "min(420px, calc(100vw - 32px))",
                            width: {xs: "calc(100vw - 32px)", sm: 420},
                        },
                    },
                }}
                transformOrigin={{horizontal: "left", vertical: "top"}}
            >
                {recentSearches.isPending && (
                    <Stack alignItems="center" role="status" sx={{p: 2}}>
                        <CircularProgress
                            aria-label="Loading recent searches"
                            size={24}
                        />
                    </Stack>
                )}
                {recentSearches.isError && (
                    <Alert severity="warning" sx={{m: 1}}>
                        Unable to load recent searches.
                    </Alert>
                )}
                {recentSearches.data?.length === 0 && (
                    <Typography role="status" sx={{p: 2}}>
                        No recent searches.
                    </Typography>
                )}
                {recentSearches.data?.flatMap((search, index) => {
                    const description = describeSearch(search);
                    const key = `${search.categoryName}-${search.query}-${search.title}-${index}`;
                    return [
                        <MenuItem
                            aria-label={`Refill: ${description}`}
                            data-testid="recent-search-entry"
                            draggable
                            key={`${key}-refill`}
                            onClick={() => {
                                onRefill(search);
                                setAnchor(null);
                            }}
                            onDragStart={() => onDragStart(search)}
                            sx={{
                                alignItems: "flex-start",
                                flexDirection: "column",
                            }}
                        >
                            <Typography aria-hidden variant="body2">
                                {description}
                            </Typography>
                            <Typography aria-hidden variant="button">
                                Refill
                            </Typography>
                        </MenuItem>,
                        <MenuItem
                            aria-label={`Repeat: ${description}`}
                            draggable
                            key={`${key}-repeat`}
                            onClick={() => {
                                onRepeat(search);
                                setAnchor(null);
                            }}
                            onDragStart={() => onDragStart(search)}
                            sx={{
                                alignItems: "flex-start",
                                flexDirection: "column",
                            }}
                        >
                            <Typography aria-hidden variant="body2">
                                {description}
                            </Typography>
                            <Typography aria-hidden variant="button">
                                Repeat
                            </Typography>
                        </MenuItem>,
                    ];
                })}
            </Menu>
        </>
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
