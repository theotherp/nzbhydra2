import {Button, Container, Stack, Typography} from "@mui/material";
import {
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
} from "@tanstack/react-router";

import {AppShell} from "./app/AppShell";
import type {BootstrapData} from "./bootstrap";
import {ApiTransport} from "./api/transport";
import {NewsPage} from "./features/system/news/NewsPage";
import {SearchPage} from "./features/search/SearchPage";
import {StatsShell} from "./features/stats/StatsShell";
import {IndexerStatusesPage} from "./features/stats/indexers/IndexerStatusesPage";
import {SavedSearchesPage} from "./features/stats/history/SavedSearchesPage";

export function createAppRouter(bootstrap: BootstrapData) {
    const transport = new ApiTransport(bootstrap.baseUrl);
    const rootRoute = createRootRoute({
        component: () => (
            <AppShell bootstrap={bootstrap}>
                <Container maxWidth="md">
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
    const routeTree = rootRoute.addChildren([
        searchRoute,
        newsRoute,
        statsRoute,
        indexerStatusesRoute,
        savedSearchesRoute,
        statsFallbackRoute,
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
