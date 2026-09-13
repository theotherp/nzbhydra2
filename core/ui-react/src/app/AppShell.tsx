import {
    AppBar,
    Box,
    Button,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
} from "@mui/material";
import {Link, useLocation} from "@tanstack/react-router";
import {useCallback, useState} from "react";

import {createDownloaderStatusLiveTransport} from "../api/live/downloaderStatus";
import {createNotificationsLiveTransport} from "../api/live/notifications";
import {SockJsStompLiveTransport} from "../api/live/transport";
import {ApiTransport} from "../api/transport";
import {
    maySeeAdminArea,
    useSafeConfig,
    type BootstrapData,
    type SafeConfig,
} from "../bootstrap";
import {LoginOutButton} from "../features/auth/LoginOutButton";
import {useThemePreference} from "./ThemePreferenceProvider";
import {themePreferenceOptions, type ThemePreference} from "./theme";
import {DownloaderStatusFooter} from "./status/DownloaderStatusFooter";
import {NotificationToasts} from "./status/NotificationToasts";
import {SessionExpiredDialog} from "./status/SessionExpiredDialog";
import {StartupChecks} from "./status/StartupChecks";
import {UpdateFooterBanners} from "./status/UpdateFooterBanners";

// Vite's `new URL(..., import.meta.url)` asset reference (see Vite's "Public Base
// Path" docs): it lets the bundler emit a base-URL-aware, hashed asset path without
// hardcoding a root-relative URL and without a static `import` requiring an ambient
// `*.png` module declaration.
//
// `banner.png` is legacy's own `static/img/banner-grey-dark.png` (the variant
// legacy's `dark.css`/`grey.css` themes both use for the full-width `#banner`
// masthead): white/green wordmark on a transparent background, which is why
// it's the one variant that reads correctly against this app bar's dark
// `surfaces.bar` -- the app has no light theme to need a second variant for.
const bannerUrl = new URL("../assets/banner.png", import.meta.url).href;

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
    // FM-080: the update footer banners are pinned to the bottom of the
    // viewport, so the main content area's own bottom padding is grown by
    // exactly their rendered height -- otherwise a scrolled route's last
    // content would render underneath them.
    const [footerBannerHeight, setFooterBannerHeight] = useState(0);
    const handleFooterBannerHeightChange = useCallback(
        (height: number) => setFooterBannerHeight(height),
        [],
    );
    // FM-081: the downloader-status footer is pinned below the update
    // banners, and both have to be kept clear of the scroll area — legacy's
    // `footer.js` did the same bookkeeping with hardcoded pixel values.
    const [downloaderFooterHeight, setDownloaderFooterHeight] = useState(0);
    const handleDownloaderFooterHeightChange = useCallback(
        (height: number) => setDownloaderFooterHeight(height),
        [],
    );
    // `C-LIVE-TRANSPORT`, created once per shell mount and shared by the two
    // permanent live subscribers below, so navigating never reconnects them.
    const [liveTransports] = useState(() => {
        const transport = new SockJsStompLiveTransport(bootstrap.baseUrl);
        return {
            downloaderStatus: createDownloaderStatusLiveTransport(transport),
            notifications: createNotificationsLiveTransport(transport),
        };
    });
    const bottomInset = footerBannerHeight + downloaderFooterHeight;

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
                                horizontal={horizontal}
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
                        src={bannerUrl}
                        sx={{height: 32, mr: 3, width: "auto"}}
                    />
                    <Box
                        component="nav"
                        data-testid="app-shell-nav"
                        sx={{display: {xs: "none", md: "block"}}}
                    >
                        {links(undefined, true)}
                    </Box>
                    {/* Legacy's `navbar-right` login/logout affordance. */}
                    <Box sx={{flexGrow: 1}} />
                    {/*
                     * FM-154 (ADR-0049): the theme selector, "in the
                     * upper-right of the nav bar (beside the login/logout
                     * control)" as the ADR places it. Legacy reached the same
                     * setting through Config > Main > Theme, which FM-155
                     * removes.
                     */}
                    <ThemeSelector />
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
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    paddingBottom:
                        bottomInset > 0 ? `${bottomInset}px` : undefined,
                }}
            >
                {children}
            </Box>
            {/*
             * Legacy's checks footer: it rendered nothing here until a check
             * had something to say, and the shell is the one place that stays
             * mounted for the whole application load.
             */}
            <StartupChecks bootstrap={bootstrap} transport={transport} />
            {/*
             * FM-080: legacy's cross-route update banner and automatic-update
             * notice (`hydra-checks-footer.js`, `checks-footer.html`) -- the
             * footer portion of `C-UPDATE-COORDINATOR` that FM-073
             * deliberately left with `F-PLATFORM-LIVE-STATUS`.
             */}
            <UpdateFooterBanners
                bootstrap={bootstrap}
                bottomOffset={downloaderFooterHeight}
                onHeightChange={handleFooterBannerHeightChange}
                transport={transport}
            />
            {/*
             * FM-081: legacy's two cross-route live surfaces
             * (`downloaderStatusFooter.js` and `hydra-checks-footer.js`'s
             * notification channel), mounted here because the shell is the
             * one place that stays mounted across navigation.
             */}
            <DownloaderStatusFooter
                bootstrap={bootstrap}
                liveTransport={liveTransports.downloaderStatus}
                onHeightChange={handleDownloaderFooterHeightChange}
            />
            <NotificationToasts
                bootstrap={bootstrap}
                liveTransport={liveTransports.notifications}
            />
            {/*
             * FM-171 (`C-SESSION-EXPIRY`): mounted here for the same reason as
             * everything above it -- the shell is the one place that stays
             * mounted across navigation, and this affordance has to be
             * singular no matter how many of the page's queries failed at
             * once.
             */}
            <SessionExpiredDialog />
        </Box>
    );
}

/**
 * FM-154 (ADR-0049): the nav-bar theme selector.
 *
 * A stock `Button` in this theme's own neutral `control` variant plus a stock
 * `Menu`, rather than a `TextField select`: the toolbar is the one row in the
 * application with no space for a field's notched label, and a menu is what an
 * "apply one of five settings now" control is anyway. The trigger states the
 * setting *and* its current value ("Theme: Grey"), which is the visible label
 * ADR-0014 asks for and is also what makes the current choice readable without
 * opening anything.
 *
 * The options carry `role="menuitemradio"` with `aria-checked`, because that is
 * what this menu is: one of five mutually exclusive values, exactly one of them
 * current. MUI's `selected` only paints; it announces nothing on a `menuitem`.
 *
 * Keyboard operation and focus indication are entirely stock and deliberately
 * so -- `Button` and `MenuItem` are two of ADR-0013's authored focus-ring
 * families (families B and F), so the trigger and every option already carry
 * the application's one focus indicator, and `Menu` brings its own focus
 * management and type-ahead.
 */
function ThemeSelector() {
    const {preference, setPreference} = useThemePreference();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const current =
        themePreferenceOptions.find((option) => option.value === preference) ??
        themePreferenceOptions[0];

    const choose = (value: ThemePreference) => {
        setPreference(value);
        setAnchor(null);
    };

    return (
        <>
            <Button
                aria-controls={anchor === null ? undefined : THEME_MENU_ID}
                aria-expanded={anchor !== null}
                aria-haspopup="menu"
                data-testid="app-shell-theme-selector"
                id={THEME_TRIGGER_ID}
                onClick={(event) => setAnchor(event.currentTarget)}
                sx={{mr: 1}}
                variant="control"
            >
                Theme: {current.label}
            </Button>
            <Menu
                anchorEl={anchor}
                id={THEME_MENU_ID}
                onClose={() => setAnchor(null)}
                open={anchor !== null}
                // The menu itself carries no `data-testid`: MUI 7's
                // `slotProps` are typed to each slot's own props and reject a
                // `data-*` attribute outright. It needs none -- it is reachable
                // as the `menu` role named by the trigger, and each option has
                // a testid of its own.
                slotProps={{list: {"aria-labelledby": THEME_TRIGGER_ID}}}
            >
                {themePreferenceOptions.map((option) => (
                    <MenuItem
                        aria-checked={option.value === preference}
                        data-testid={`app-shell-theme-option-${option.value}`}
                        key={option.value}
                        onClick={() => choose(option.value)}
                        role="menuitemradio"
                        selected={option.value === preference}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

// The trigger/menu pair's `aria-controls`/`aria-labelledby` relationship needs
// stable DOM ids; the shell renders exactly one selector, so they are constants
// rather than `useId` values.
const THEME_MENU_ID = "app-shell-theme-menu";
const THEME_TRIGGER_ID = "app-shell-theme-selector";

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
//
// FM-154: which accent that is now depends on which ground the item is drawn
// on, because the two are no longer the same surface in every theme. The
// horizontal row is inside the `AppBar`, whose colour MUI derives per palette
// mode — `background.paper` in the dark themes, `primary.main` under
// `bright` — so it takes `surfaces.barAccent`, the token each theme block
// states for exactly this (the dark blocks state their own `primary.main`, so
// nothing about their rendering changes). The mobile drawer's vertical copy is
// an ordinary `Paper` and keeps `primary.main`.
function navigationItemSx(horizontal: boolean, active: boolean) {
    const accent = horizontal ? "surfaces.barAccent" : "primary.main";
    const borderColor = active ? accent : "transparent";
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
function NavigationLabel({
    active,
    horizontal,
    label,
}: {
    active: boolean;
    horizontal: boolean;
    label: string;
}) {
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
                    // The same per-ground accent `navigationItemSx` picks.
                    color: active
                        ? horizontal
                            ? "surfaces.barAccent"
                            : "primary.main"
                        : "inherit",
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
