import {useQuery} from "@tanstack/react-query";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
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
                    paper: {sx: {maxWidth: "calc(100vw - 32px)"}},
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
                {recentSearches.data?.map((search, index) => {
                    const parts = searchDescriptionParts(search);
                    const description = plainTextDescription(parts);
                    const key = `${search.categoryName}-${search.query}-${search.title}-${index}`;
                    return (
                        <MenuItem
                            aria-label={`Repeat: ${description}`}
                            data-testid="recent-search-entry"
                            draggable
                            key={key}
                            onClick={() => {
                                onRepeat(search);
                                setAnchor(null);
                            }}
                            onDragStart={() => onDragStart(search)}
                            sx={{alignItems: "center", gap: 1, pr: 4}}
                        >
                            <Tooltip title="Refill the search form without searching">
                                <IconButton
                                    aria-label={`Refill: ${description}`}
                                    edge="start"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onRefill(search);
                                        setAnchor(null);
                                    }}
                                    size="small"
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Typography
                                component="span"
                                sx={{whiteSpace: "nowrap"}}
                            >
                                {parts.map((part, partIndex) => (
                                    <Box
                                        component="span"
                                        key={`${part.label}-${partIndex}`}
                                    >
                                        {partIndex > 0 ? ", " : ""}
                                        <Box
                                            component="span"
                                            sx={{
                                                color: "text.secondary",
                                                fontStyle: "italic",
                                            }}
                                        >
                                            {part.label}:
                                        </Box>{" "}
                                        {part.value}
                                    </Box>
                                ))}
                            </Typography>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}

type DescriptionPart = {label: string; value: string};

function searchDescriptionParts(search: RecentSearch): DescriptionPart[] {
    const parts: (DescriptionPart | undefined)[] = [
        {label: "Category", value: search.categoryName},
        {label: "Source", value: describeSource(search.source)},
        search.query ? {label: "Query", value: search.query} : undefined,
        search.title ? {label: "Title", value: search.title} : undefined,
        ...search.identifiers.map(({identifierKey, identifierValue}) => ({
            label: identifierKey,
            value: identifierValue,
        })),
        search.season !== undefined
            ? {label: "Season", value: search.season.toString()}
            : undefined,
        search.episode ? {label: "Episode", value: search.episode} : undefined,
        search.author ? {label: "Author", value: search.author} : undefined,
    ];
    return parts.filter((part): part is DescriptionPart => part !== undefined);
}

function plainTextDescription(parts: DescriptionPart[]): string {
    return parts.map(({label, value}) => `${label}: ${value}`).join(", ");
}

function describeSource(source: RecentSearch["source"]): string {
    return source === "INTERNAL"
        ? "Internal"
        : source === "API"
          ? "API"
          : "Unknown";
}
