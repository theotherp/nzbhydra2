import {Box, Tab, Tabs} from "@mui/material";
import {Link, Outlet, useLocation} from "@tanstack/react-router";

import {
    activeSystemTab,
    SYSTEM_TABS,
    systemTabHref,
    systemTabTestId,
} from "./systemTabs";

/**
 * `F-SYSTEM-SHELL`: the administration area's tab strip. Unlike
 * `F-CONFIG-SHELL` it owns no shared state — legacy's `SystemController` gives
 * each tab its own directive and its own requests — so the shell is only the
 * navigation frame around whichever tab body the router matched.
 */
export function SystemShell() {
    const pathname = useLocation({select: (location) => location.pathname});
    const active = activeSystemTab(pathname);
    return (
        <Box component="section" data-testid="system-shell" sx={{py: 3}}>
            <Tabs aria-label="System" value={active.path} variant="scrollable">
                {SYSTEM_TABS.map((tab) => (
                    <Tab
                        component={Link}
                        data-testid={systemTabTestId(tab)}
                        key={tab.path}
                        label={tab.label}
                        to={systemTabHref(tab)}
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
