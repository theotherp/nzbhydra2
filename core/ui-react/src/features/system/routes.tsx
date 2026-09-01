import {createRoute, redirect, type AnyRoute} from "@tanstack/react-router";
import {lazy, Suspense} from "react";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {AreaFallback} from "../../components/AreaFallback";
import {
    DEFAULT_SYSTEM_TAB,
    SYSTEM_TABS,
    systemTabHref,
    type SystemTab,
} from "./systemTabs";

/**
 * FM-163: the whole area — shell and tab bodies — is behind `React.lazy`, so
 * none of it (the Bugreport tab's CPU chart and the chart engine under it
 * included) is in the entry chunk a search-only session downloads. The route
 * *definitions* stay eager: `router.tsx` builds the full tree synchronously,
 * so every path below still matches without loading a byte of this area.
 */
const SystemShell = lazy(() =>
    import("./SystemShell").then((module) => ({default: module.SystemShell})),
);
const SystemAboutTab = lazy(() =>
    import("./about/SystemAboutTab").then((module) => ({
        default: module.SystemAboutTab,
    })),
);
const SystemBackupTab = lazy(() =>
    import("./backups/SystemBackupTab").then((module) => ({
        default: module.SystemBackupTab,
    })),
);
const SystemBugreportTab = lazy(() =>
    import("./bugreport/SystemBugreportTab").then((module) => ({
        default: module.SystemBugreportTab,
    })),
);
const SystemControlTab = lazy(() =>
    import("./control/SystemControlTab").then((module) => ({
        default: module.SystemControlTab,
    })),
);
const SystemLogTab = lazy(() =>
    import("./logs/SystemLogTab").then((module) => ({
        default: module.SystemLogTab,
    })),
);
const NewsPage = lazy(() =>
    import("./news/NewsPage").then((module) => ({default: module.NewsPage})),
);
const SystemTasksTab = lazy(() =>
    import("./tasks/SystemTasksTab").then((module) => ({
        default: module.SystemTasksTab,
    })),
);
const SystemUpdatesTab = lazy(() =>
    import("./updates/SystemUpdatesTab").then((module) => ({
        default: module.SystemUpdatesTab,
    })),
);

const AREA_FALLBACK = <AreaFallback message="Loading the system area…" />;

/**
 * The system area's route subtree. The eight tabs are children of one
 * `/system` route so the tab strip stays mounted across tab changes, the way
 * legacy re-rendered `system.html` for every `root.system.*` state.
 *
 * `placeholder` was the migration placeholder for a tab that had no React
 * body yet; every tab now has one (FM-077 migrated the last, Tasks), so
 * nothing reaches it any more. The parameter is kept -- removing it would
 * only be pure tidying with no behavior change, and this module still does
 * not depend on `router.tsx`, which depends on it.
 */
export function createSystemRoute<TParent extends AnyRoute>(
    parentRoute: TParent,
    transport: ApiTransport,
    bootstrap: BootstrapData,
    placeholder: () => React.ReactNode,
) {
    const systemRoute = createRoute({
        getParentRoute: () => parentRoute,
        path: "system",
        component: () => (
            <Suspense fallback={AREA_FALLBACK}>
                <SystemShell />
            </Suspense>
        ),
    });
    const indexRoute = createRoute({
        getParentRoute: () => systemRoute,
        path: "/",
        beforeLoad: () => {
            throw redirect({to: systemTabHref(DEFAULT_SYSTEM_TAB)});
        },
    });
    const tabBody = (tab: SystemTab): React.ReactNode => {
        if (tab.path === "control") {
            return <SystemControlTab transport={transport} />;
        }
        if (tab.path === "updates") {
            return <SystemUpdatesTab transport={transport} />;
        }
        if (tab.path === "backup") {
            return (
                <SystemBackupTab bootstrap={bootstrap} transport={transport} />
            );
        }
        if (tab.path === "bugreport") {
            return (
                <SystemBugreportTab
                    bootstrap={bootstrap}
                    transport={transport}
                />
            );
        }
        if (tab.path === "log") {
            return <SystemLogTab bootstrap={bootstrap} transport={transport} />;
        }
        if (tab.path === "news") {
            return <NewsPage transport={transport} />;
        }
        if (tab.path === "about") {
            return (
                <SystemAboutTab bootstrap={bootstrap} transport={transport} />
            );
        }
        if (tab.path === "tasks") {
            return (
                <SystemTasksTab bootstrap={bootstrap} transport={transport} />
            );
        }
        return placeholder();
    };
    const tabRoutes = SYSTEM_TABS.map((tab) =>
        createRoute({
            getParentRoute: () => systemRoute,
            path: tab.path,
            // Nested inside the parent's boundary: a tab switch must not take
            // the shell's tab strip down with it while the incoming body's
            // chunk is in flight.
            component: () => (
                <Suspense fallback={AREA_FALLBACK}>{tabBody(tab)}</Suspense>
            ),
        }),
    );
    return systemRoute.addChildren([indexRoute, ...tabRoutes]);
}
