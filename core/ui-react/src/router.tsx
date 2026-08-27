import {Container, Stack, Typography} from "@mui/material";
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
import {createStatsRoute} from "./features/stats/routes";
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
        notFoundComponent: () => <MigrationPlaceholder />,
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
    // F-STATS-SHELL and its six tab bodies live in one parent layout route
    // (`features/stats/routes.tsx`) so the shell survives a tab switch; the
    // `/stats` alias, the `/stats/stats` dashboard and the `/stats/$tab`
    // fallback are all declared there.
    const statsRoute = createStatsRoute(
        rootRoute,
        transport,
        bootstrap,
        loginGuard(bootstrap, "stats"),
        () => <MigrationPlaceholder />,
    );
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
                  <MigrationPlaceholder />
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

/**
 * FM-095: with the legacy shell removed there is nothing left to switch to, so this is no longer a
 * migration placeholder offering a way out -- it is the notice for a route this application does not
 * have. It survives because the stats and system shells route their unknown `$tab` here rather than
 * rendering nothing.
 */
export function MigrationPlaceholder() {
    return (
        <Stack component="main" spacing={3} sx={{py: 8}}>
            <Typography component="h1" variant="h4">
                Page not found
            </Typography>
            <Typography>
                This address does not match any page of NZBHydra.
            </Typography>
        </Stack>
    );
}

function routerBasePath(baseUrl: string): string {
    const path = new URL(baseUrl, window.location.origin).pathname;
    return path === "/" ? path : path.replace(/\/$/, "");
}
