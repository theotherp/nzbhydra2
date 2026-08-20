import {createRoute, redirect, type AnyRoute} from "@tanstack/react-router";

import {ApiTransport} from "../../api/transport";
import {ConfigShell} from "./ConfigShell";
import {ConfigTabPlaceholder} from "./ConfigTabPlaceholder";
import {
    CONFIG_TABS,
    configTabHref,
    DEFAULT_CONFIG_TAB,
    type ConfigTab,
} from "./configTabs";
import {MainConfigTab} from "./main/MainConfigTab";

/**
 * The configuration area's route subtree. The eight tabs are *children* of one
 * `/config` route on purpose: the shell — and with it the single React Hook
 * Form holding the whole `BaseConfig` — stays mounted while the admin moves
 * between tabs, so edits made on one tab are still in the form (and in the
 * PUT body) after visiting another.
 */
export function createConfigRoute<TParent extends AnyRoute>(
    parentRoute: TParent,
    transport: ApiTransport,
    /**
     * The body rendered for a tab. `main` is migrated (`F-CONFIG-MAIN`); the
     * remaining seven still show the placeholder and are replaced tab by tab
     * by FM-060 onwards.
     */
    tabComponent: (tab: ConfigTab) => React.ReactNode = (tab) =>
        tab.path === "main" ? (
            <MainConfigTab transport={transport} />
        ) : (
            <ConfigTabPlaceholder tab={tab} />
        ),
) {
    const configRoute = createRoute({
        getParentRoute: () => parentRoute,
        path: "config",
        component: () => <ConfigShell transport={transport} />,
    });
    const indexRoute = createRoute({
        getParentRoute: () => configRoute,
        path: "/",
        beforeLoad: () => {
            throw redirect({to: configTabHref(DEFAULT_CONFIG_TAB)});
        },
    });
    const tabRoutes = CONFIG_TABS.map((tab) =>
        createRoute({
            getParentRoute: () => configRoute,
            path: tab.path,
            component: () => tabComponent(tab),
        }),
    );
    return configRoute.addChildren([indexRoute, ...tabRoutes]);
}
