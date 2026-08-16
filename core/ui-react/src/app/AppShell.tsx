import {
    AppBar,
    Box,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography,
} from "@mui/material";
import {useLocation} from "@tanstack/react-router";
import {useState} from "react";

import type {BootstrapData} from "../bootstrap";

// Vite's `new URL(..., import.meta.url)` asset reference (see Vite's "Public Base
// Path" docs): it lets the bundler emit a base-URL-aware, hashed asset path without
// hardcoding a root-relative URL and without a static `import` requiring an ambient
// `*.png` module declaration.
const logoUrl = new URL("../assets/logo.png", import.meta.url).href;

type AppShellProps = {
    bootstrap: BootstrapData;
    children: React.ReactNode;
};

type NavigationItem = {
    label: string;
    path: string;
    visible: boolean;
};

export function AppShell({bootstrap, children}: AppShellProps) {
    const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
    const navigation = navigationItems(bootstrap);
    const pathname = useLocation({
        select: (location) => location.pathname,
    });

    const links = (onNavigate?: () => void, horizontal = false) => (
        <List
            aria-label="Main navigation"
            sx={
                horizontal
                    ? {display: "flex", flexDirection: "row", gap: 1, py: 0}
                    : undefined
            }
        >
            {navigation
                .filter((item) => item.visible)
                .map((item) => {
                    const active = isActiveNavigationItem(
                        bootstrap.baseUrl,
                        pathname,
                        item,
                    );
                    return (
                        <ListItemButton
                            aria-current={active ? "page" : undefined}
                            component="a"
                            href={applicationPath(bootstrap.baseUrl, item.path)}
                            key={item.path}
                            onClick={onNavigate}
                            sx={{
                                ...(horizontal ? {width: "auto"} : undefined),
                                ...(active
                                    ? activeNavigationItemSx(horizontal)
                                    : undefined),
                            }}
                        >
                            <ListItemText
                                primary={item.label}
                                slotProps={
                                    active
                                        ? {
                                              primary: {
                                                  sx: {
                                                      color: "primary.main",
                                                      fontWeight: 700,
                                                  },
                                              },
                                          }
                                        : undefined
                                }
                            />
                        </ListItemButton>
                    );
                })}
        </List>
    );

    return (
        <Box
            sx={{display: "flex", flexDirection: "column", minHeight: "100vh"}}
        >
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        aria-label="Open navigation"
                        color="inherit"
                        edge="start"
                        onClick={() => setMobileNavigationOpen(true)}
                        sx={{display: {md: "none"}, mr: 1}}
                    >
                        Menu
                    </IconButton>
                    <Box
                        component="img"
                        alt="NZBHydra2"
                        data-testid="app-shell-logo"
                        src={logoUrl}
                        sx={{height: 32, mr: 1, width: "auto"}}
                    />
                    <Typography
                        component="span"
                        sx={{fontWeight: 700, mr: 3}}
                        variant="h6"
                    >
                        NZBHydra2
                    </Typography>
                    <Box
                        component="nav"
                        data-testid="app-shell-nav"
                        sx={{display: {xs: "none", md: "block"}}}
                    >
                        {links(undefined, true)}
                    </Box>
                </Toolbar>
            </AppBar>
            <Drawer
                anchor="left"
                onClose={() => setMobileNavigationOpen(false)}
                open={mobileNavigationOpen}
            >
                <Box component="nav" sx={{minWidth: 240}}>
                    {links(() => setMobileNavigationOpen(false))}
                </Box>
            </Drawer>
            <Box component="main" sx={{flexGrow: 1}}>
                {children}
            </Box>
            <Box component="footer" sx={{p: 2, textAlign: "center"}}>
                <Typography color="text.secondary" variant="body2">
                    NZBHydra2
                </Typography>
            </Box>
        </Box>
    );
}

function navigationItems(bootstrap: BootstrapData): NavigationItem[] {
    const authenticated = bootstrap.username !== null;
    const authConfigured = bootstrap.authConfigured === true;
    const showSearch =
        !authConfigured || authenticated || !bootstrap.searchRestricted;
    const showStats =
        !authConfigured || authenticated
            ? !authConfigured ||
              bootstrap.maySeeStats === true ||
              !bootstrap.statsRestricted
            : !bootstrap.statsRestricted;
    const showAdmin =
        !authConfigured || authenticated
            ? !authConfigured ||
              bootstrap.maySeeAdmin === true ||
              !bootstrap.adminRestricted
            : !bootstrap.adminRestricted;

    return [
        {label: "Search", path: "", visible: showSearch},
        {
            label: keepHistory(bootstrap)
                ? "History & Stats"
                : "Indexer statuses",
            path: "stats/indexers",
            visible: showStats,
        },
        {label: "Config", path: "config/main", visible: showAdmin},
        {label: "System", path: "system/control", visible: showAdmin},
    ];
}

function keepHistory(bootstrap: BootstrapData): boolean {
    return bootstrap.safeConfig?.keepHistory === true;
}

function applicationPath(baseUrl: string, path: string): string {
    return new URL(path, new URL(baseUrl, window.location.origin)).pathname;
}

// A real, visible use of the branded `primary` green as an interactive
// affordance: the current route's nav item gets a green underline/rail plus
// (via the ListItemText `slotProps.primary.sx` above) green, bold label
// text. MUI's `AppBar` defaults `enableColorOnDark` to `false`, so setting
// `color="primary"` on the `AppBar` itself does not render as green under
// `palette.mode: "dark"` — this per-item indicator is the affordance ADR-0007
// actually intended when it said `primary` "drives ... links, focus rings,
// selected states."
function activeNavigationItemSx(horizontal: boolean) {
    return horizontal
        ? {borderBottom: "3px solid", borderBottomColor: "primary.main"}
        : {borderLeft: "3px solid", borderLeftColor: "primary.main"};
}

// Matches a nav item to the current route by comparing only the first path
// segment relative to the app's base URL (e.g. "stats/indexers" and
// "stats/searches" both belong to the "stats" segment), so the top-level nav
// item stays highlighted while browsing any of its sub-routes, without this
// shell file needing to know the full route tree owned by `router.tsx`.
function isActiveNavigationItem(
    baseUrl: string,
    pathname: string,
    item: NavigationItem,
): boolean {
    const basePath = new URL(baseUrl, window.location.origin).pathname;
    const relative = pathname.startsWith(basePath)
        ? pathname.slice(basePath.length)
        : pathname;
    const currentSegment = relative.split("/")[0] ?? "";
    const itemSegment = item.path.split("/")[0] ?? "";
    return currentSegment === itemSegment;
}
