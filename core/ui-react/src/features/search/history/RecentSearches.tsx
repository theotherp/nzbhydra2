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
import {useRef, useState} from "react";

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
    // ADR-0012 (Option A1): the recent-search row's Refill `IconButton` is
    // reachable by keyboard via `ArrowRight`/`ArrowLeft` focus moves between
    // the row and the button, keyed by each entry's stable `key`. These refs
    // are how that focus move is performed imperatively; see the row's and
    // the button's `onKeyDown` handlers below for the mechanism and its
    // version-scoped re-verification duty.
    const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
    const refillButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

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
                            // ADR-0012 (Option A1). `ArrowRight` moves focus
                            // onto this row's nested Refill `IconButton` --
                            // verified unconsumed by the installed
                            // `@mui/material` `7.3.9`'s
                            // `MenuList/MenuList.js` `handleKeyDown` (its
                            // `ArrowDown`/`ArrowUp`/`Home`/`End` branches
                            // don't match, and `"ArrowRight".length !== 1`
                            // so it never reaches the type-ahead branch
                            // either) and `Menu/Menu.js`'s
                            // `handleListKeyDown` (which only intercepts
                            // `Tab`). After any `@mui/material` upgrade this
                            // must be re-verified by re-running the keyboard
                            // spec in `tests/system/tests/search.spec.ts`,
                            // never by re-reading the sources.
                            aria-keyshortcuts="ArrowRight"
                            aria-label={`Repeat: ${description}`}
                            data-testid="recent-search-entry"
                            draggable
                            key={key}
                            onClick={() => {
                                onRepeat(search);
                                setAnchor(null);
                            }}
                            onDragStart={() => onDragStart(search)}
                            onKeyDown={(event) => {
                                if (event.key === "ArrowRight") {
                                    event.preventDefault();
                                    refillButtonRefs.current.get(key)?.focus();
                                }
                            }}
                            ref={(element) => {
                                if (element) {
                                    rowRefs.current.set(key, element);
                                } else {
                                    rowRefs.current.delete(key);
                                }
                            }}
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
                                    onKeyDown={(event) => {
                                        // ADR-0012 (Option A1): this nested
                                        // Refill button's defined focus-stop
                                        // states. `ArrowLeft`/`Escape` return
                                        // focus to the owning row (`Escape`
                                        // also stops propagation so
                                        // `@mui/material` `7.3.9`'s
                                        // `Modal/useModal.js`
                                        // `createHandleKeyDown` never sees it
                                        // and closes the menu).
                                        // `ArrowDown`/`ArrowUp`/`Home`/`End`
                                        // are replayed on the row so
                                        // `MenuList/MenuList.js`
                                        // `handleKeyDown`'s own `moveFocus`
                                        // (sibling-only traversal via
                                        // `nextItem`/`previousItem`) performs
                                        // the identical row-to-row
                                        // navigation it would from the row
                                        // itself, instead of its
                                        // nested-descendant fallback (which
                                        // walks this button's own
                                        // `nextElementSibling`/
                                        // `previousElementSibling` inside the
                                        // row and wraps to
                                        // `list.firstChild`/`list.lastChild`).
                                        // `ArrowRight` is a no-op -- there is
                                        // no second target. `Enter`/`Space`
                                        // activate this native `<button>`
                                        // with no handler added here. After
                                        // any `@mui/material` upgrade this
                                        // must be re-verified by re-running
                                        // the keyboard spec in
                                        // `tests/system/tests/search.spec.ts`,
                                        // never by re-reading the sources.
                                        const row = rowRefs.current.get(key);
                                        switch (event.key) {
                                            case "ArrowLeft":
                                                event.preventDefault();
                                                row?.focus();
                                                break;
                                            case "Escape":
                                                event.preventDefault();
                                                event.stopPropagation();
                                                row?.focus();
                                                break;
                                            case "ArrowDown":
                                            case "ArrowUp":
                                            case "Home":
                                            case "End":
                                                event.preventDefault();
                                                event.stopPropagation();
                                                if (row) {
                                                    row.focus();
                                                    row.dispatchEvent(
                                                        new KeyboardEvent(
                                                            "keydown",
                                                            {
                                                                key: event.key,
                                                                bubbles: true,
                                                                cancelable: true,
                                                            },
                                                        ),
                                                    );
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }}
                                    ref={(element) => {
                                        if (element) {
                                            refillButtonRefs.current.set(
                                                key,
                                                element,
                                            );
                                        } else {
                                            refillButtonRefs.current.delete(
                                                key,
                                            );
                                        }
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
                {/* Discoverability (ADR-0012): one shared hint, not per-row
                    text, so it never repeats once per entry in a menu whose
                    width is content-driven. It is the Menu's *last* child and
                    carries no `tabindex`, which is deliberate: `@mui/material`
                    `7.3.9`'s `MenuList/MenuList.js` does an `activeItemIndex`
                    lookahead over its children that can inject
                    `autoFocus`/`tabIndex: 0` into the first non-disabled
                    child it finds, and `moveFocus` skips any candidate
                    failing `!nextFocus.hasAttribute('tabindex')`. Rendering
                    this only when at least one entry precedes it guarantees a
                    `recent-search-entry` row always claims `activeItemIndex`
                    first, so this node is never a focus stop -- the recorded
                    keyboard trace in `tests/system/tests/search.spec.ts`
                    proves no key ever lands focus here. */}
                {(recentSearches.data?.length ?? 0) > 0 && (
                    <Typography
                        color="text.secondary"
                        sx={{pl: 2, pr: 4, py: 1, whiteSpace: "normal"}}
                        variant="caption"
                    >
                        Press Right Arrow on an entry to refill the search form;
                        Left Arrow or Escape returns.
                    </Typography>
                )}
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
