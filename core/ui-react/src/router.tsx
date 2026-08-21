import {Button, Container, Stack, Typography} from "@mui/material";
import {
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    redirect,
    type AnyRoute,
} from "@tanstack/react-router";
import {ApiTransport} from "./api/transport";

import {AppShell} from "./app/AppShell";
import {maySeeAdminArea, type BootstrapData} from "./bootstrap";
import {LoginPage} from "./features/auth/LoginPage";
import {
    LOGIN_ROUTE,
    redirectsToLogin,
    type ProtectedArea,
} from "./features/auth/permissions";
import {createConfigRoute} from "./features/config/routes";
import {SearchPage} from "./features/search/SearchPage";
import {DownloadHistoryPage} from "./features/stats/history/DownloadHistoryPage";
import {NotificationHistoryPage} from "./features/stats/history/NotificationHistoryPage";
import {SavedSearchesPage} from "./features/stats/history/SavedSearchesPage";
import {SearchHistoryPage} from "./features/stats/history/SearchHistoryPage";
import {IndexerStatusesPage} from "./features/stats/indexers/IndexerStatusesPage";
import {StatsDashboardPage} from "./features/stats/dashboard/StatsDashboardPage";
import {StatsShell} from "./features/stats/StatsShell";
import {createSystemRoute} from "./features/system/routes";

export function createAppRouter(bootstrap: BootstrapData) {
    const transport = new ApiTransport(bootstrap.baseUrl);
    const rootRoute = createRootRoute({
        component: () => (
            <AppShell bootstrap={bootstrap} transport={transport}>
                <Container maxWidth={false} sx={{maxWidth: 1700}}>
                    <Outlet />
                </Container>
            </AppShell>
        ),
        notFoundComponent: () => (
            <MigrationPlaceholder baseUrl={bootstrap.baseUrl} />
        ),
    });
    // The login form is reachable in every session's route tree: an anonymous
    // FORM session is sent here by the guards below, and a logged-in one can
    // still open it directly, exactly like legacy's unguarded `root.login`.
    const loginRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "login",
        component: () => (
            <LoginPage bootstrap={bootstrap} transport={transport} />
        ),
    });
    const searchRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        beforeLoad: loginGuard(bootstrap, "search"),
        component: () => (
            <SearchPage bootstrap={bootstrap} transport={transport} />
        ),
    });
    const savedSearchesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/saved-searches",
        beforeLoad: loginGuard(bootstrap, "stats"),
        component: () => (
            <StatsShell bootstrap={bootstrap}>
                <SavedSearchesPage
                    bootstrap={bootstrap}
                    transport={transport}
                />
            </StatsShell>
        ),
    });
    const searchHistoryRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/searches",
        beforeLoad: loginGuard(bootstrap, "stats"),
        component: () => (
            <StatsShell bootstrap={bootstrap}>
                <SearchHistoryPage
                    bootstrap={bootstrap}
                    transport={transport}
                />
            </StatsShell>
        ),
    });
    const downloadHistoryRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/downloads",
        beforeLoad: loginGuard(bootstrap, "stats"),
        component: () => (
            <StatsShell bootstrap={bootstrap}>
                <DownloadHistoryPage
                    bootstrap={bootstrap}
                    transport={transport}
                />
            </StatsShell>
        ),
    });
    const notificationHistoryRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/notifications",
        beforeLoad: loginGuard(bootstrap, "stats"),
        component: () => (
            <StatsShell bootstrap={bootstrap}>
                <NotificationHistoryPage
                    bootstrap={bootstrap}
                    transport={transport}
                />
            </StatsShell>
        ),
    });
    const statsRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats",
        beforeLoad: loginGuard(bootstrap, "stats"),
        component: () => (
            <StatsPage bootstrap={bootstrap} transport={transport} />
        ),
    });
    const indexerStatusesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/indexers",
        beforeLoad: loginGuard(bootstrap, "stats"),
        component: () => (
            <StatsPage bootstrap={bootstrap} transport={transport} />
        ),
    });
    // F-STATS-MAIN's canonical route (ADR-0021): the redesigned aggregate
    // dashboard, distinct from the bare `/stats` alias above (which still
    // resolves to indexer statuses, matching `StatsShell`'s own default tab).
    const statsDashboardRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/stats",
        beforeLoad: loginGuard(bootstrap, "stats"),
        component: () => (
            <StatsShell bootstrap={bootstrap}>
                <StatsDashboardPage
                    bootstrap={bootstrap}
                    transport={transport}
                />
            </StatsShell>
        ),
    });
    const statsFallbackRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/$tab",
        beforeLoad: loginGuard(bootstrap, "stats"),
        component: () => (
            <StatsShell bootstrap={bootstrap}>
                <MigrationPlaceholder baseUrl={bootstrap.baseUrl} />
            </StatsShell>
        ),
    });
    // A session that may not see the admin area never gets a config route to
    // reach: without it `/config/...` falls through to the migration
    // placeholder, exactly like any unmigrated route.
    //
    // The same rule covers the whole `/system` area, News included: every
    // legacy `root.system.*` state resolves `loginRequired(..., "admin")`
    // (`nzbhydra.js:396-600`), so `/system/news` is admin-gated here even
    // though it used to be the one React route outside the gate. The
    // `API-NEWS-LIST` endpoint's own `ROLE_USER` protection is unchanged.
    //
    // FM-078 adds legacy's one exception to that fall-through: under FORM
    // authentication `loginRequired` sent a session that may not see the area
    // to the login form instead of leaving it on a dead route, so those two
    // path prefixes are then claimed by redirect-only routes. With any other
    // authentication type the fall-through above is unchanged.
    const adminRoutes = maySeeAdminArea(bootstrap)
        ? [
              createConfigRoute(rootRoute, transport),
              createSystemRoute(rootRoute, transport, bootstrap, () => (
                  <MigrationPlaceholder baseUrl={bootstrap.baseUrl} />
              )),
          ]
        : bootstrap.authType === "FORM"
          ? createLoginRedirectRoutes(rootRoute, [
                "config",
                "config/$",
                "system",
                "system/$",
            ])
          : [];
    const routeTree = rootRoute.addChildren([
        loginRoute,
        searchRoute,
        statsRoute,
        indexerStatusesRoute,
        statsDashboardRoute,
        savedSearchesRoute,
        searchHistoryRoute,
        downloadHistoryRoute,
        notificationHistoryRoute,
        statsFallbackRoute,
        ...adminRoutes,
    ]);

    return createRouter({
        basepath: routerBasePath(bootstrap.baseUrl),
        routeTree,
    });
}

/**
 * Legacy's `loginRequired` resolver as a route guard (`nzbhydra.js:692-715`).
 * The decision is a pure function of the session's bootstrap object, which is
 * fixed for the lifetime of this route tree — a session change re-enters the
 * application through a full document navigation (see
 * `features/auth/navigation.ts`), so there is nothing reactive here.
 */
function loginGuard(bootstrap: BootstrapData, area: ProtectedArea) {
    return () => {
        if (redirectsToLogin(bootstrap, area)) {
            throw redirect({to: LOGIN_ROUTE});
        }
    };
}

/** Redirect-only routes claiming the path prefixes of a blocked area. */
function createLoginRedirectRoutes<TParent extends AnyRoute>(
    parentRoute: TParent,
    paths: string[],
) {
    return paths.map((path) =>
        createRoute({
            getParentRoute: () => parentRoute,
            path,
            beforeLoad: () => {
                throw redirect({to: LOGIN_ROUTE});
            },
        }),
    );
}

function StatsPage({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    return (
        <StatsShell bootstrap={bootstrap}>
            <IndexerStatusesPage bootstrap={bootstrap} transport={transport} />
        </StatsShell>
    );
}

export function MigrationPlaceholder({baseUrl}: {baseUrl: string}) {
    return (
        <Stack component="main" spacing={3} sx={{py: 8}}>
            <Typography component="h1" variant="h4">
                React migration placeholder
            </Typography>
            <Typography>
                This route has not yet been migrated to React.
            </Typography>
            <Button
                component="a"
                href={legacySwitchUrl(baseUrl)}
                variant="contained"
            >
                Switch to legacy UI
            </Button>
        </Stack>
    );
}

function routerBasePath(baseUrl: string): string {
    const path = new URL(baseUrl, window.location.origin).pathname;
    return path === "/" ? path : path.replace(/\/$/, "");
}

function legacySwitchUrl(baseUrl: string): string {
    const base = new URL(baseUrl, window.location.origin);
    const currentPath = window.location.pathname.startsWith(base.pathname)
        ? window.location.pathname.slice(base.pathname.length - 1)
        : window.location.pathname;
    const selector = new URL("ui/legacy", base);
    selector.searchParams.set("redirect", currentPath + window.location.search);
    return selector.toString();
}
