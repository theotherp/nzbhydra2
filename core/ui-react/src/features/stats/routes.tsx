import {createRoute, type AnyRoute} from "@tanstack/react-router";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {StatsDashboardPage} from "./dashboard/StatsDashboardPage";
import {DownloadHistoryPage} from "./history/DownloadHistoryPage";
import {NotificationHistoryPage} from "./history/NotificationHistoryPage";
import {SavedSearchesPage} from "./history/SavedSearchesPage";
import {SearchHistoryPage} from "./history/SearchHistoryPage";
import {IndexerStatusesPage} from "./indexers/IndexerStatusesPage";
import {StatsShell} from "./StatsShell";

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
        component: () => <StatsShell bootstrap={bootstrap} />,
    });
    const indexerStatuses = () => (
        <IndexerStatusesPage bootstrap={bootstrap} transport={transport} />
    );
    const child = (path: string, component: () => React.ReactNode) =>
        createRoute({
            getParentRoute: () => statsRoute,
            path,
            component,
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
