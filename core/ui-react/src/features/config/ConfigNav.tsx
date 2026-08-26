import CategoryIcon from "@mui/icons-material/Category";
import DownloadIcon from "@mui/icons-material/Download";
import ExtensionIcon from "@mui/icons-material/Extension";
import LockIcon from "@mui/icons-material/Lock";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import TuneIcon from "@mui/icons-material/Tune";
import {
    Box,
    Button,
    Drawer,
    FormControlLabel,
    Paper,
    Stack,
    Switch,
    Tab,
    Tabs,
    useMediaQuery,
} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {Link} from "@tanstack/react-router";
import type {ReactElement} from "react";
import {useState} from "react";

import type {ConfigTab} from "./configTabs";
import {CONFIG_TABS, configTabHref, configTabTestId} from "./configTabs";

const NAV_WIDTH = 232;

const CONFIG_TAB_ICONS: Readonly<Record<string, ReactElement>> = {
    auth: <LockIcon fontSize="small" />,
    categories: <CategoryIcon fontSize="small" />,
    downloading: <DownloadIcon fontSize="small" />,
    externalTools: <ExtensionIcon fontSize="small" />,
    indexers: <StorageIcon fontSize="small" />,
    main: <TuneIcon fontSize="small" />,
    notifications: <NotificationsIcon fontSize="small" />,
    searching: <SearchIcon fontSize="small" />,
};

/**
 * `F-CONFIG-SHELL`'s settings navigation: the eight canonical configuration
 * sections as a left column, plus the two shell-level controls (the advanced
 * toggle and the API help button) at its foot.
 *
 * Still a MUI `Tabs`/`Tab` set, only vertical: the entries are one selected-one
 * -at-a-time set of panels over a single form, which is exactly what the tab
 * pattern means, and keeping it preserves the `tab`/`tablist` roles, the
 * selected state, and every `config-tab-*` selector the suite navigates by.
 *
 * Below the `md` breakpoint a 232px column would take most of a phone's width
 * from the settings themselves, so the identical entries render inside a
 * temporary `Drawer` instead — the `RefineSidebar.tsx` idiom, and decided in
 * JavaScript (`useMediaQuery`) rather than by CSS `display` so exactly one copy
 * of every control, accessible name, and `data-testid` exists at a time.
 */
export function ConfigNav({
    activeTabPath,
    dirtyTabs,
    invalidTabs,
    onOpenApiHelp,
    onToggleAdvanced,
    showAdvanced,
}: {
    activeTabPath: ConfigTab["path"];
    dirtyTabs: ReadonlySet<ConfigTab["path"]>;
    invalidTabs: ReadonlySet<ConfigTab["path"]>;
    onOpenApiHelp: () => void;
    onToggleAdvanced: (value: boolean) => void;
    showAdvanced: boolean;
}) {
    const theme = useTheme();
    const compact = useMediaQuery(theme.breakpoints.down("md"));
    // Always starts closed: the drawer is an on-demand overlay over the
    // settings it navigates, never a remembered preference.
    const [drawerOpen, setDrawerOpen] = useState(false);

    const entries = (
        <Tabs
            aria-label="Configuration"
            orientation="vertical"
            sx={{
                // Layout only: vertical tabs are centered and fixed-height by
                // default, which reads as a column of buttons rather than a
                // list of sections.
                "& .MuiTab-root": {
                    alignItems: "center",
                    justifyContent: "flex-start",
                    minHeight: 44,
                    textAlign: "left",
                },
            }}
            value={activeTabPath}
            variant="scrollable"
        >
            {CONFIG_TABS.map((tab) => (
                <Tab
                    component={Link}
                    data-testid={configTabTestId(tab)}
                    icon={CONFIG_TAB_ICONS[tab.path]}
                    iconPosition="start"
                    key={tab.path}
                    label={
                        <ConfigNavLabel
                            dirty={dirtyTabs.has(tab.path)}
                            invalid={invalidTabs.has(tab.path)}
                            tab={tab}
                        />
                    }
                    onClick={() => setDrawerOpen(false)}
                    to={configTabHref(tab)}
                    value={tab.path}
                />
            ))}
        </Tabs>
    );

    const foot = (
        <Stack alignItems="flex-start" spacing={1} sx={{pt: 2}}>
            <FormControlLabel
                control={
                    <Switch
                        checked={showAdvanced}
                        data-testid="config-advanced-toggle"
                        onChange={(event) =>
                            onToggleAdvanced(event.target.checked)
                        }
                    />
                }
                label="Advanced settings"
            />
            <Button
                data-testid="config-api-help"
                onClick={onOpenApiHelp}
                type="button"
            >
                API?
            </Button>
        </Stack>
    );

    if (compact) {
        return (
            <>
                <Button
                    aria-expanded={drawerOpen}
                    aria-haspopup="dialog"
                    data-testid="config-nav-open"
                    onClick={() => setDrawerOpen(true)}
                    startIcon={<MenuIcon />}
                    sx={{alignSelf: "flex-start"}}
                    variant="control"
                >
                    Sections
                </Button>
                <Drawer
                    anchor="left"
                    onClose={() => setDrawerOpen(false)}
                    open={drawerOpen}
                    slotProps={{
                        paper: {
                            sx: {
                                backgroundImage: "none",
                                maxWidth: "100%",
                                p: 2,
                                width: `min(${NAV_WIDTH + 32}px, 88vw)`,
                            },
                        },
                    }}
                >
                    <Box
                        aria-label="Configuration sections"
                        component="nav"
                        data-testid="config-nav"
                    >
                        {entries}
                        {foot}
                    </Box>
                </Drawer>
            </>
        );
    }

    return (
        <Paper
            aria-label="Configuration sections"
            component="nav"
            data-testid="config-nav"
            elevation={0}
            sx={{
                alignSelf: "flex-start",
                backgroundColor: "transparent",
                borderRadius: 0,
                borderRight: "1px solid",
                borderRightColor: "surfaces.hairlineFaint",
                flexShrink: 0,
                pr: 1,
                width: NAV_WIDTH,
            }}
        >
            {entries}
            {foot}
        </Paper>
    );
}

function ConfigNavLabel({
    dirty,
    invalid,
    tab,
}: {
    dirty: boolean;
    invalid: boolean;
    tab: ConfigTab;
}) {
    return (
        <Stack
            alignItems="center"
            direction="row"
            spacing={1}
            sx={{width: "100%"}}
        >
            <Box component="span" sx={{flexGrow: 1}}>
                {tab.label}
            </Box>
            {invalid && (
                <ConfigNavDot
                    color="error.main"
                    label={`${tab.label} has invalid settings`}
                    testId={`config-nav-invalid-${tab.path}`}
                />
            )}
            {dirty && (
                <ConfigNavDot
                    color="warning.main"
                    label={`${tab.label} has unsaved changes`}
                    testId={`config-nav-dirty-${tab.path}`}
                />
            )}
        </Stack>
    );
}

/**
 * A section's state marker. The `aria-label` — not the colour — is what carries
 * the meaning: the palette role is a second, redundant channel, so the badge
 * still reads for anyone who cannot separate the two hues. `borderRadius` here
 * is the geometry that makes a dot a dot, not a design radius (ADR-0014).
 */
function ConfigNavDot({
    color,
    label,
    testId,
}: {
    color: string;
    label: string;
    testId: string;
}) {
    return (
        <Box
            aria-label={label}
            component="span"
            data-testid={testId}
            role="img"
            sx={{
                backgroundColor: color,
                borderRadius: "50%",
                flexShrink: 0,
                height: 8,
                width: 8,
            }}
        />
    );
}
