import {CircularProgress, Stack, Typography} from "@mui/material";
import {createRoute, redirect, type AnyRoute} from "@tanstack/react-router";
import {lazy, Suspense} from "react";

import {ApiTransport} from "../../api/transport";
import {
    CONFIG_TABS,
    configTabHref,
    DEFAULT_CONFIG_TAB,
    type ConfigTab,
} from "./configTabs";

/**
 * FM-163: the whole area — shell and tab bodies — is behind `React.lazy`, so
 * none of it is in the entry chunk a search-only session downloads. The route
 * *definitions* stay eager: `router.tsx` builds the full tree synchronously,
 * so every path below still matches without loading a byte of this area.
 */
const ConfigShell = lazy(() =>
    import("./ConfigShell").then((module) => ({default: module.ConfigShell})),
);
const ConfigTabPlaceholder = lazy(() =>
    import("./ConfigTabPlaceholder").then((module) => ({
        default: module.ConfigTabPlaceholder,
    })),
);
const AuthConfigTab = lazy(() =>
    import("./auth/AuthConfigTab").then((module) => ({
        default: module.AuthConfigTab,
    })),
);
const CategoriesConfigTab = lazy(() =>
    import("./categories/CategoriesConfigTab").then((module) => ({
        default: module.CategoriesConfigTab,
    })),
);
const DownloadingConfigTab = lazy(() =>
    import("./downloading/DownloadingConfigTab").then((module) => ({
        default: module.DownloadingConfigTab,
    })),
);
const ExternalToolsConfigTab = lazy(() =>
    import("./external-tools/ExternalToolsConfigTab").then((module) => ({
        default: module.ExternalToolsConfigTab,
    })),
);
const IndexersConfigTab = lazy(() =>
    import("./indexers/IndexersConfigTab").then((module) => ({
        default: module.IndexersConfigTab,
    })),
);
const MainConfigTab = lazy(() =>
    import("./main/MainConfigTab").then((module) => ({
        default: module.MainConfigTab,
    })),
);
const NotificationsConfigTab = lazy(() =>
    import("./notifications/NotificationsConfigTab").then((module) => ({
        default: module.NotificationsConfigTab,
    })),
);
const SearchingConfigTab = lazy(() =>
    import("./searching/SearchingConfigTab").then((module) => ({
        default: module.SearchingConfigTab,
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
        <Typography>Loading the configuration…</Typography>
    </Stack>
);

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
     * The body rendered for a tab. `main` (`F-CONFIG-MAIN`), `auth`
     * (`F-CONFIG-AUTH`), `searching` (`F-CONFIG-SEARCHING`), `categories`
     * (`F-CONFIG-CATEGORIES`), `notifications` (`F-CONFIG-NOTIFICATIONS`),
     * `downloading` (`F-CONFIG-DOWNLOADING`), `externalTools`
     * (`F-CONFIG-EXTERNAL-TOOLS`), and `indexers` (`F-CONFIG-INDEXERS`) are all
     * migrated, so no canonical tab shows the placeholder any more. FM-067 adds
     * the bulk capability recheck and the Jackett/Prowlarr imports to the
     * Indexers body.
     */
    tabComponent: (tab: ConfigTab) => React.ReactNode = (tab) => {
        if (tab.path === "main") {
            return <MainConfigTab transport={transport} />;
        }
        if (tab.path === "auth") {
            return <AuthConfigTab />;
        }
        if (tab.path === "searching") {
            return <SearchingConfigTab transport={transport} />;
        }
        if (tab.path === "categories") {
            return <CategoriesConfigTab />;
        }
        if (tab.path === "notifications") {
            return <NotificationsConfigTab transport={transport} />;
        }
        if (tab.path === "downloading") {
            return <DownloadingConfigTab transport={transport} />;
        }
        if (tab.path === "externalTools") {
            return <ExternalToolsConfigTab transport={transport} />;
        }
        if (tab.path === "indexers") {
            return <IndexersConfigTab transport={transport} />;
        }
        return <ConfigTabPlaceholder tab={tab} />;
    },
) {
    const configRoute = createRoute({
        getParentRoute: () => parentRoute,
        path: "config",
        component: () => (
            <Suspense fallback={AREA_FALLBACK}>
                <ConfigShell transport={transport} />
            </Suspense>
        ),
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
            // Nested inside the parent's boundary: a tab switch must not take
            // the shell's tab strip and save bar down with it while the
            // incoming body's chunk is in flight.
            component: () => (
                <Suspense fallback={AREA_FALLBACK}>
                    {tabComponent(tab)}
                </Suspense>
            ),
        }),
    );
    return configRoute.addChildren([indexRoute, ...tabRoutes]);
}
