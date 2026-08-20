import {Box, Tab, Tabs} from "@mui/material";
import {Link, useLocation} from "@tanstack/react-router";

import {
    useSafeConfig,
    type BootstrapData,
    type SafeConfig,
} from "../../bootstrap";

type StatsShellProps = {bootstrap: BootstrapData; children: React.ReactNode};

export function StatsShell({bootstrap, children}: StatsShellProps) {
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
            <Box sx={{pt: 3}}>{children}</Box>
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
