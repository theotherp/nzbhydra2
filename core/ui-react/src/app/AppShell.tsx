import {
    AppBar,
    Box,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    Toolbar,
    Typography,
} from "@mui/material";
import {Link, useLocation} from "@tanstack/react-router";
import {useState} from "react";

import {ApiTransport} from "../api/transport";
import {
    maySeeAdminArea,
    useSafeConfig,
    type BootstrapData,
    type SafeConfig,
} from "../bootstrap";
import {LoginOutButton} from "../features/auth/LoginOutButton";

// Vite's `new URL(..., import.meta.url)` asset reference (see Vite's "Public Base
// Path" docs): it lets the bundler emit a base-URL-aware, hashed asset path without
// hardcoding a root-relative URL and without a static `import` requiring an ambient
// `*.png` module declaration.
const logoUrl = new URL("../assets/logo.png", import.meta.url).href;

type AppShellProps = {
    bootstrap: BootstrapData;
    children: React.ReactNode;
    transport: ApiTransport;
};

type NavigationItem = {
    label: string;
    path: string;
    visible: boolean;
};

export function AppShell({bootstrap, children, transport}: AppShellProps) {
    const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
    const navigation = navigationItems(bootstrap, useSafeConfig(bootstrap));
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
                            component={Link}
                            key={item.path}
                            to={navigationTo(item.path)}
                            onClick={onNavigate}
                            sx={navigationItemSx(horizontal, active)}
                        >
                            <NavigationLabel
                                active={active}
                                label={item.label}
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
                    {/* Legacy's `navbar-right` login/logout affordance. */}
                    <Box sx={{flexGrow: 1}} />
                    <LoginOutButton
                        bootstrap={bootstrap}
                        transport={transport}
                    />
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

function navigationItems(
    bootstrap: BootstrapData,
    safeConfig: SafeConfig,
): NavigationItem[] {
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
    // FM-058: shared with the config routes' own guard so a session that may
    // not see the admin area can neither see the item nor reach the route.
    const showAdmin = maySeeAdminArea(bootstrap);

    return [
        {label: "Search", path: "", visible: showSearch},
        {
            label:
                safeConfig?.keepHistory === true
                    ? "History & Stats"
                    : "Indexer statuses",
            path: "stats/indexers",
            visible: showStats,
        },
        {label: "Config", path: "config/main", visible: showAdmin},
        {label: "System", path: "system/control", visible: showAdmin},
    ];
}

function navigationTo(path: string): string {
    return `/${path}`;
}

// A real, visible use of the branded `primary` green as an interactive
// affordance: the current route's nav item gets a green underline/rail plus
// (via `NavigationLabel` below) green, bold label text. MUI's `AppBar`
// defaults `enableColorOnDark` to `false`, so setting `color="primary"` on
// the `AppBar` itself does not render as green under `palette.mode: "dark"`
// — this per-item indicator is the affordance ADR-0007 actually intended
// when it said `primary` "drives ... links, focus rings, selected states."
//
// The border is always reserved at full width/color-transparent rather than
// added only when active, so selecting an item never changes its box size
// (which used to shove neighboring items sideways) — only its color
// transitions, in both directions.
function navigationItemSx(horizontal: boolean, active: boolean) {
    const borderColor = active ? "primary.main" : "transparent";
    return {
        ...(horizontal ? {width: "auto"} : undefined),
        ...(horizontal
            ? {borderBottom: "3px solid", borderBottomColor: borderColor}
            : {borderLeft: "3px solid", borderLeftColor: borderColor}),
        transition: "border-color 200ms ease-in-out",
    };
}

// Renders the label as two stacked copies in the same grid cell: a hidden
// always-bold copy that reserves the wider of the two widths, and the real,
// visible copy that only changes color (animatable) rather than font-weight
// (not smoothly animatable, and would otherwise resize the box). This keeps
// nav items a constant width whether active or not.
function NavigationLabel({label, active}: {label: string; active: boolean}) {
    return (
        <Box sx={{display: "inline-grid"}}>
            <Typography
                aria-hidden
                component="span"
                sx={{
                    fontWeight: 700,
                    gridArea: "1 / 1",
                    visibility: "hidden",
                    whiteSpace: "nowrap",
                }}
            >
                {label}
            </Typography>
            <Typography
                component="span"
                sx={{
                    color: active ? "primary.main" : "inherit",
                    fontWeight: active ? 700 : 400,
                    gridArea: "1 / 1",
                    transition: "color 200ms ease-in-out",
                    whiteSpace: "nowrap",
                }}
            >
                {label}
            </Typography>
        </Box>
    );
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
