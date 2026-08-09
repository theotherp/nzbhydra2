import {
    AppBar,
    Box,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Toolbar,
    Typography,
} from "@mui/material";
import {useState} from "react";

import type {BootstrapData} from "../bootstrap";

type AppShellProps = {
    bootstrap: BootstrapData;
    children: React.ReactNode;
};

type NavigationItem = {
    label: string;
    path: string;
    visible: boolean;
};

export function AppShell({bootstrap, children}: AppShellProps) {
    const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
    const navigation = navigationItems(bootstrap);

    const links = (onNavigate?: () => void) => (
        <List aria-label="Main navigation">
            {navigation
                .filter((item) => item.visible)
                .map((item) => (
                    <ListItemButton
                        component="a"
                        href={applicationPath(bootstrap.baseUrl, item.path)}
                        key={item.path}
                        onClick={onNavigate}
                    >
                        <ListItemText primary={item.label} />
                    </ListItemButton>
                ))}
        </List>
    );

    return (
        <Box
            sx={{display: "flex", flexDirection: "column", minHeight: "100vh"}}
        >
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        aria-label="Open navigation"
                        color="inherit"
                        edge="start"
                        onClick={() => setMobileNavigationOpen(true)}
                        sx={{display: {md: "none"}, mr: 1}}
                    >
                        Menu
                    </IconButton>
                    <Typography
                        component="span"
                        sx={{fontWeight: 700, mr: 3}}
                        variant="h6"
                    >
                        NZBHydra2
                    </Typography>
                    <Box
                        component="nav"
                        sx={{display: {xs: "none", md: "block"}}}
                    >
                        <Box sx={{display: "flex", gap: 1}}>{links()}</Box>
                    </Box>
                </Toolbar>
            </AppBar>
            <Drawer
                anchor="left"
                onClose={() => setMobileNavigationOpen(false)}
                open={mobileNavigationOpen}
            >
                <Box component="nav" sx={{minWidth: 240}}>
                    {links(() => setMobileNavigationOpen(false))}
                </Box>
            </Drawer>
            <Box component="main" sx={{flexGrow: 1}}>
                {children}
            </Box>
            <Box component="footer" sx={{p: 2, textAlign: "center"}}>
                <Typography color="text.secondary" variant="body2">
                    NZBHydra2
                </Typography>
            </Box>
        </Box>
    );
}

function navigationItems(bootstrap: BootstrapData): NavigationItem[] {
    const authenticated = bootstrap.username !== null;
    const authConfigured = bootstrap.authConfigured === true;
    const showSearch =
        !authConfigured || authenticated || !bootstrap.searchRestricted;
    const showStats =
        !authConfigured || authenticated
            ? !authConfigured ||
              bootstrap.maySeeStats === true ||
              !bootstrap.statsRestricted
            : !bootstrap.statsRestricted;
    const showAdmin =
        !authConfigured || authenticated
            ? !authConfigured ||
              bootstrap.maySeeAdmin === true ||
              !bootstrap.adminRestricted
            : !bootstrap.adminRestricted;

    return [
        {label: "Search", path: "", visible: showSearch},
        {
            label: keepHistory(bootstrap)
                ? "History & Stats"
                : "Indexer statuses",
            path: "stats/indexers",
            visible: showStats,
        },
        {label: "Config", path: "config/main", visible: showAdmin},
        {label: "System", path: "system/control", visible: showAdmin},
    ];
}

function keepHistory(bootstrap: BootstrapData): boolean {
    return bootstrap.safeConfig?.keepHistory === true;
}

function applicationPath(baseUrl: string, path: string): string {
    return new URL(path, new URL(baseUrl, window.location.origin)).pathname;
}
