import {CircularProgress, Stack, Typography} from "@mui/material";
import {createRoute, type AnyRoute} from "@tanstack/react-router";
import {lazy, Suspense} from "react";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";

/**
 * FM-163: the whole area — shell and tab bodies — is behind `React.lazy`, so
 * none of it (nor `@mui/x-charts` and the `d3-*` packages the dashboard draws
 * with) is in the entry chunk a search-only session downloads. The route
 * *definitions* stay eager: `router.tsx` builds the full tree synchronously,
 * so every path below still matches without loading a byte of this area.
 */
const StatsShell = lazy(() =>
    import("./StatsShell").then((module) => ({default: module.StatsShell})),
);
const StatsDashboardPage = lazy(() =>
    import("./dashboard/StatsDashboardPage").then((module) => ({
        default: module.StatsDashboardPage,
    })),
);
const DownloadHistoryPage = lazy(() =>
    import("./history/DownloadHistoryPage").then((module) => ({
        default: module.DownloadHistoryPage,
    })),
);
const NotificationHistoryPage = lazy(() =>
    import("./history/NotificationHistoryPage").then((module) => ({
        default: module.NotificationHistoryPage,
    })),
);
const SavedSearchesPage = lazy(() =>
    import("./history/SavedSearchesPage").then((module) => ({
        default: module.SavedSearchesPage,
    })),
);
const SearchHistoryPage = lazy(() =>
    import("./history/SearchHistoryPage").then((module) => ({
        default: module.SearchHistoryPage,
    })),
);
const IndexerStatusesPage = lazy(() =>
    import("./indexers/IndexerStatusesPage").then((module) => ({
        default: module.IndexerStatusesPage,
    })),
);

/**
 * The area's `Suspense` fallback, used at two nested boundaries: one on the
 * parent route for the shell itself, and one per tab body inside it, so a tab
 * switch never takes the shell's tab strip down with it. It sits in the
 * content area — the application shell around it never unmounts — and reserves
 * height so nothing below it moves when the chunk lands. A tab switch is a
 * router transition, which React resolves by holding the outgoing body rather
 * than falling back to this at all.
 */
const AREA_FALLBACK = (
    <Stack
        alignItems="center"
        component="main"
        role="status"
        spacing={1}
        sx={{minHeight: 320, pt: 8}}
    >
        <CircularProgress />
        <Typography>Loading history and statistics…</Typography>
    </Stack>
);

/**
 * The history and statistics area's route subtree, in the same shape as
 * `features/config/routes.tsx` and `features/system/routes.tsx`: one `/stats`
 * parent route whose component is the shell, and one child route per tab
 * rendered through the shell's `<Outlet/>`.
 *
 * Before FM-121 these were seven *sibling* routes that each wrapped their own
 * body in a `StatsShell`, so switching tabs unmounted the shell and the whole
 * body subtree, discarding every in-flight and cached query with it. As
 * children of one parent the shell instance survives a tab switch.
 *
 * The guard is a parameter rather than a local: `router.tsx` owns
 * `loginGuard`, and TanStack runs a parent's `beforeLoad` for every matched
 * descendant, so declaring it once here protects all seven tabs exactly as the
 * seven per-route guards did.
 *
 * Three route identities are load-bearing and unchanged:
 *   - the bare `/stats` alias resolves to indexer statuses (the index route
 *     below), matching `StatsShell`'s own default tab -- it is *not* a
 *     redirect, unlike `/config` and `/system`;
 *   - `/stats/stats` is `F-STATS-MAIN`'s canonical aggregate dashboard route
 *     (ADR-0021), distinct from that alias;
 *   - `/stats/$tab` catches any other tab segment and renders the not-found
 *     notice inside the shell.
 */
export function createStatsRoute<TParent extends AnyRoute>(
    parentRoute: TParent,
    transport: ApiTransport,
    bootstrap: BootstrapData,
    beforeLoad: () => void,
    notFound: () => React.ReactNode,
) {
    const statsRoute = createRoute({
        getParentRoute: () => parentRoute,
        path: "stats",
        beforeLoad,
        component: () => (
            <Suspense fallback={AREA_FALLBACK}>
                <StatsShell bootstrap={bootstrap} />
            </Suspense>
        ),
    });
    const indexerStatuses = () => (
        <IndexerStatusesPage bootstrap={bootstrap} transport={transport} />
    );
    // Every tab body is behind its own boundary as well, nested inside the
    // parent's: a tab switch must not take the shell's tab strip down with it
    // while the incoming body's chunk is in flight.
    const child = (path: string, component: () => React.ReactNode) =>
        createRoute({
            getParentRoute: () => statsRoute,
            path,
            component: () => (
                <Suspense fallback={AREA_FALLBACK}>{component()}</Suspense>
            ),
        });
    return statsRoute.addChildren([
        child("/", indexerStatuses),
        child("indexers", indexerStatuses),
        child("stats", () => (
            <StatsDashboardPage bootstrap={bootstrap} transport={transport} />
        )),
        child("searches", () => (
            <SearchHistoryPage bootstrap={bootstrap} transport={transport} />
        )),
        child("saved-searches", () => (
            <SavedSearchesPage bootstrap={bootstrap} transport={transport} />
        )),
        child("downloads", () => (
            <DownloadHistoryPage bootstrap={bootstrap} transport={transport} />
        )),
        child("notifications", () => (
            <NotificationHistoryPage
                bootstrap={bootstrap}
                transport={transport}
            />
        )),
        child("$tab", notFound),
    ]);
}
