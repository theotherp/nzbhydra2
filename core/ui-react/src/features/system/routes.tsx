import {createRoute, redirect, type AnyRoute} from "@tanstack/react-router";

import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {SystemAboutTab} from "./about/SystemAboutTab";
import {SystemControlTab} from "./control/SystemControlTab";
import {NewsPage} from "./news/NewsPage";
import {SystemShell} from "./SystemShell";
import {SystemUpdatesTab} from "./updates/SystemUpdatesTab";
import {
    DEFAULT_SYSTEM_TAB,
    SYSTEM_TABS,
    systemTabHref,
    type SystemTab,
} from "./systemTabs";

/**
 * The system area's route subtree. The eight tabs are children of one
 * `/system` route so the tab strip stays mounted across tab changes, the way
 * legacy re-rendered `system.html` for every `root.system.*` state.
 *
 * `placeholder` is the migration placeholder for a tab that has no React body
 * yet (FM-074..FM-076); it is passed in rather than imported so this module
 * does not depend on `router.tsx`, which depends on it.
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
        component: SystemShell,
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
        if (tab.path === "news") {
            return <NewsPage transport={transport} />;
        }
        if (tab.path === "about") {
            return (
                <SystemAboutTab bootstrap={bootstrap} transport={transport} />
            );
        }
        return placeholder();
    };
    const tabRoutes = SYSTEM_TABS.map((tab) =>
        createRoute({
            getParentRoute: () => systemRoute,
            path: tab.path,
            component: () => tabBody(tab),
        }),
    );
    return systemRoute.addChildren([indexRoute, ...tabRoutes]);
}
