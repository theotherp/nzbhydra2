import {Button, Container, Stack, Typography} from "@mui/material";
import {
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
} from "@tanstack/react-router";
import {ApiTransport} from "./api/transport";

import {AppShell} from "./app/AppShell";
import {maySeeAdminArea, type BootstrapData} from "./bootstrap";
import {createConfigRoute} from "./features/config/routes";
import {SearchPage} from "./features/search/SearchPage";
import {DownloadHistoryPage} from "./features/stats/history/DownloadHistoryPage";
import {NotificationHistoryPage} from "./features/stats/history/NotificationHistoryPage";
import {SavedSearchesPage} from "./features/stats/history/SavedSearchesPage";
import {SearchHistoryPage} from "./features/stats/history/SearchHistoryPage";
import {IndexerStatusesPage} from "./features/stats/indexers/IndexerStatusesPage";
import {StatsShell} from "./features/stats/StatsShell";
import {NewsPage} from "./features/system/news/NewsPage";

export function createAppRouter(bootstrap: BootstrapData) {
    const transport = new ApiTransport(bootstrap.baseUrl);
    const rootRoute = createRootRoute({
        component: () => (
            <AppShell bootstrap={bootstrap}>
                <Container maxWidth={false} sx={{maxWidth: 1700}}>
                    <Outlet />
                </Container>
            </AppShell>
        ),
        notFoundComponent: () => (
            <MigrationPlaceholder baseUrl={bootstrap.baseUrl} />
        ),
    });
    const newsRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "system/news",
        component: () => <NewsPage transport={transport} />,
    });
    const searchRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
        component: () => (
            <SearchPage bootstrap={bootstrap} transport={transport} />
        ),
    });
    const savedSearchesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/saved-searches",
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
        component: () => (
            <StatsPage bootstrap={bootstrap} transport={transport} />
        ),
    });
    const indexerStatusesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/indexers",
        component: () => (
            <StatsPage bootstrap={bootstrap} transport={transport} />
        ),
    });
    const statsFallbackRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "stats/$tab",
        component: () => (
            <StatsShell bootstrap={bootstrap}>
                <MigrationPlaceholder baseUrl={bootstrap.baseUrl} />
            </StatsShell>
        ),
    });
    // A session that may not see the admin area never gets a config route to
    // reach: without it `/config/...` falls through to the migration
    // placeholder, exactly like any unmigrated route.
    const configRoutes = maySeeAdminArea(bootstrap)
        ? [createConfigRoute(rootRoute, transport)]
        : [];
    const routeTree = rootRoute.addChildren([
        searchRoute,
        newsRoute,
        statsRoute,
        indexerStatusesRoute,
        savedSearchesRoute,
        searchHistoryRoute,
        downloadHistoryRoute,
        notificationHistoryRoute,
        statsFallbackRoute,
        ...configRoutes,
    ]);

    return createRouter({
        basepath: routerBasePath(bootstrap.baseUrl),
        routeTree,
    });
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
