import {createRoute, type AnyRoute} from "@tanstack/react-router";
import {lazy, Suspense} from "react";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {AreaFallback} from "../../components/AreaFallback";
import {
    createHistorySearchSchema,
    DOWNLOAD_HISTORY_SORT_COLUMNS,
    NOTIFICATION_HISTORY_SORT_COLUMNS,
    SEARCH_HISTORY_SORT_COLUMNS,
    type HistorySearchParams,
} from "./history/historySearchParams";

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

const AREA_FALLBACK = (
    <AreaFallback message="Loading history and statistics…" />
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
    //
    // `validateSearch` is declared here rather than inside the lazy chunk
    // because the router has to resolve a URL's parameters before the chunk it
    // belongs to has loaded. That is not free, and it is worth being exact
    // about what it costs. `historySearchParams.ts` takes the three sort
    // vocabularies as *types* -- erased, so no history page or API client
    // follows them -- but it also imports runtime values: `zod`, this area's
    // `shared/pageSize.ts`, and `HISTORY_BOOLEAN_ALL`/`isHistoryFilterActive`
    // from `api/history/filters.ts`. Those join the eager entry closure. All
    // three are small and dependency-free (`filters.ts` imports nothing at
    // all), and the entry stays well under FM-163's 1,250,000-byte ceiling
    // with them -- measured at 1,085,339 bytes. What is mechanically enforced
    // is the narrower thing `validate:production-assets` checks: that no chart
    // code rides along on the critical path.
    const child = (
        path: string,
        component: () => React.ReactNode,
        validateSearch?: (
            input: Record<string, unknown>,
        ) => HistorySearchParams,
    ) =>
        createRoute({
            getParentRoute: () => statsRoute,
            path,
            validateSearch,
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
        // FM-165: the three history tabs carry their filter, sort and page in
        // the URL, over one shared schema instantiated with each tab's own
        // sort vocabulary. `SavedSearchesPage` has no such state and stays
        // parameterless.
        child(
            "searches",
            () => (
                <SearchHistoryPage
                    bootstrap={bootstrap}
                    transport={transport}
                />
            ),
            createHistorySearchSchema(SEARCH_HISTORY_SORT_COLUMNS),
        ),
        child("saved-searches", () => (
            <SavedSearchesPage bootstrap={bootstrap} transport={transport} />
        )),
        child(
            "downloads",
            () => (
                <DownloadHistoryPage
                    bootstrap={bootstrap}
                    transport={transport}
                />
            ),
            createHistorySearchSchema(DOWNLOAD_HISTORY_SORT_COLUMNS),
        ),
        child(
            "notifications",
            () => (
                <NotificationHistoryPage
                    bootstrap={bootstrap}
                    transport={transport}
                />
            ),
            createHistorySearchSchema(NOTIFICATION_HISTORY_SORT_COLUMNS),
        ),
        child("$tab", notFound),
    ]);
}
