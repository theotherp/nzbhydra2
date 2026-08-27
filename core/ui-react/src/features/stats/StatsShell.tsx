import {Box, Tab, Tabs} from "@mui/material";
import {Link, Outlet, useLocation} from "@tanstack/react-router";

import {
    useSafeConfig,
    type BootstrapData,
    type SafeConfig,
} from "../../bootstrap";

type StatsShellProps = {bootstrap: BootstrapData};

/**
 * `F-STATS-SHELL`: the history and statistics area's tab strip. It is the
 * component of the one `/stats` *parent* route (`routes.tsx`), so the strip --
 * and every tab body's react-query cache entry with it -- stays mounted while
 * the user moves between tabs. Rendering the matched tab through `<Outlet/>`
 * rather than through `children` is what makes that possible: seven sibling
 * routes each wrapping their body in their own `StatsShell` unmounted and
 * remounted the whole subtree on every tab switch (FM-121).
 */
export function StatsShell({bootstrap}: StatsShellProps) {
    const pathname = useLocation({select: (location) => location.pathname});
    const tabs = statsTabs(useSafeConfig(bootstrap));
    const active =
        tabs.find((tab) => pathname.endsWith(`/${tab.path}`))?.path ??
        "indexers";
    return (
        <Box component="section" sx={{py: 3}}>
            <Tabs
                aria-label="History and statistics"
                value={active}
                variant="scrollable"
            >
                {tabs.map((tab) => (
                    <Tab
                        component={Link}
                        key={tab.path}
                        label={tab.label}
                        to={`/stats/${tab.path}`}
                        value={tab.path}
                    />
                ))}
            </Tabs>
            <Box sx={{pt: 3}}>
                <Outlet />
            </Box>
        </Box>
    );
}

function statsTabs(safeConfig: SafeConfig) {
    const history = safeConfig?.keepHistory === true;
    return [
        {label: "Indexer statuses", path: "indexers"},
        ...(history
            ? [
                  {label: "Search history", path: "searches"},
                  {label: "Saved searches", path: "saved-searches"},
                  {label: "Download history", path: "downloads"},
              ]
            : []),
        {label: "Notification history", path: "notifications"},
        ...(history ? [{label: "Stats", path: "stats"}] : []),
    ];
}
