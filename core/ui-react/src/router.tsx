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
    const routeTree = rootRoute.addChildren([searchRoute, newsRoute]);

    return createRouter({
        basepath: routerBasePath(bootstrap.baseUrl),
        routeTree,
    });
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
