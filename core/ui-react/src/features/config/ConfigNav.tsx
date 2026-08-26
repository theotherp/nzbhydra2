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
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Stack,
    Switch,
    Tab,
    Tabs,
    Typography,
    useMediaQuery,
} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {Link} from "@tanstack/react-router";
import type {ReactElement} from "react";
import {useEffect, useLayoutEffect, useState} from "react";

import type {ConfigTab} from "./configTabs";
import {CONFIG_TABS, configTabHref, configTabTestId} from "./configTabs";
import type {FieldsetNavEntry} from "./fieldsetNav";
import {fieldsetNavAnchorTestId} from "./fieldsetNav";

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
    activeTabLabel,
    activeTabPath,
    dirtyTabs,
    fieldsets,
    invalidTabs,
    onOpenApiHelp,
    onToggleAdvanced,
    showAdvanced,
}: {
    /** The active tab's `label`, heading the "on this page" list (ADR-0028). */
    activeTabLabel: string;
    activeTabPath: ConfigTab["path"];
    dirtyTabs: ReadonlySet<ConfigTab["path"]>;
    /** FM-102: the active tab's mounted fieldsets, in DOM order. */
    fieldsets: readonly FieldsetNavEntry[];
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
    const currentFieldsetId = useScrollspy(fieldsets);
    const saveBarHeight = useSaveBarHeight();

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

    // Scrolls without a route change (ADR-0028's binding constraints keep the
    // URL untouched) and always closes the mobile drawer too -- an admin who
    // opened it to pick a section is done with it the moment they land on one,
    // whichever viewport they are on.
    const scrollToFieldset = (entry: FieldsetNavEntry) => {
        setDrawerOpen(false);
        const barHeight =
            document
                .querySelector<HTMLElement>('[data-testid="config-save-bar"]')
                ?.getBoundingClientRect().height ?? 0;
        // The theme's own base spacing unit, not a literal: a little breathing
        // room below the sticky bar so the legend the anchor points at is not
        // flush against it.
        const gap = parseFloat(theme.spacing(1));
        const top =
            entry.node.getBoundingClientRect().top +
            window.scrollY -
            barHeight -
            gap;
        window.scrollTo({behavior: "smooth", top: Math.max(top, 0)});
    };

    // FM-102 / ADR-0028: a sibling below `entries`, never a `Tabs` child --
    // headed with the active tab's name so its scope reads unambiguously
    // sitting under all eight entries. Absent (no heading either) for a tab
    // whose body mounted no `ConfigFieldset`.
    const anchorList =
        fieldsets.length === 0 ? null : (
            <Box
                aria-label={`${activeTabLabel} on this page`}
                component="nav"
                sx={{pt: 2}}
            >
                <Typography
                    color="text.secondary"
                    component="p"
                    // Its own testid rather than a role/text lookup: the
                    // heading's text is the active tab's own label, which
                    // `ConfigNavLabel` already renders once per `Tab` above --
                    // exactly the strict-mode collision the per-tab specs must
                    // stay clear of (Acceptance).
                    data-testid="config-nav-anchor-list-heading"
                    sx={{px: 2}}
                    variant="overline"
                >
                    {activeTabLabel}
                </Typography>
                <List dense disablePadding>
                    {fieldsets.map((entry) => {
                        const current = entry.id === currentFieldsetId;
                        return (
                            <ListItemButton
                                aria-current={current ? "location" : undefined}
                                component="button"
                                data-testid={fieldsetNavAnchorTestId(
                                    entry.label,
                                )}
                                key={entry.id}
                                onClick={() => scrollToFieldset(entry)}
                                sx={{
                                    borderLeft: "3px solid",
                                    borderLeftColor: current
                                        ? "primary.main"
                                        : "transparent",
                                    pl: 1.5,
                                    py: 0.25,
                                }}
                                type="button"
                            >
                                <ListItemText
                                    primary={entry.label}
                                    slotProps={{
                                        primary: {
                                            sx: {
                                                fontWeight: current
                                                    ? theme.typography
                                                          .fontWeightBold
                                                    : theme.typography
                                                          .fontWeightRegular,
                                            },
                                        },
                                    }}
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            </Box>
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
                        {anchorList}
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
                // `alignSelf` keeps the column content-height inside the
                // shell's flex row instead of stretching to the tab body's
                // height, which is what lets `position: sticky` have anything
                // to stick within.
                alignSelf: "flex-start",
                backgroundColor: "transparent",
                borderRadius: 0,
                borderRight: "1px solid",
                borderRightColor: "surfaces.hairlineFaint",
                flexShrink: 0,
                // ADR-0030: the docked column stays put while the tab body
                // scrolls. Without this the anchor list scrolls off the top
                // with the page — the exact defect ADR-0028 cited when it put
                // the list here — and the tab entries go with it, so an admin
                // deep in Main had to scroll back up to reach Searching.
                //
                // Pinned *below* the save bar, which is itself `top: 0`
                // sticky at `zIndex.appBar`, so the offset is that bar's
                // measured height rather than a layout constant. The
                // `maxHeight` and internal scroll are not optional: eight tab
                // entries plus up to ten anchors plus the foot can exceed a
                // short viewport, and a sticky box taller than the viewport
                // silently clips whatever hangs off its bottom.
                maxHeight: `calc(100vh - ${saveBarHeight}px)`,
                overflowY: "auto",
                position: "sticky",
                pr: 1,
                top: saveBarHeight,
                width: NAV_WIDTH,
            }}
        >
            {entries}
            {anchorList}
            {foot}
        </Paper>
    );
}

/**
 * ADR-0030: the sticky save bar's rendered height, which is the offset the
 * docked nav column has to sit below. Measured rather than assumed — the bar
 * wraps its own row on a narrow desktop and grows a dirty summary and a
 * Discard button while the form is unsaved, so its height is a runtime fact.
 *
 * The bar is found by its testid rather than passed in: it is `ConfigShell`'s
 * sibling, not this component's child, and `ConfigSaveBar.tsx` is outside this
 * task's fence, so there is nothing to thread a ref through. The guarded
 * `ResizeObserver` is the `UpdateFooterBanners`/`SearchResults` idiom — jsdom
 * implements none, where the initial measurement is zero anyway because
 * nothing is laid out; the real geometry is system-test and capture territory.
 */
function useSaveBarHeight(): number {
    const [height, setHeight] = useState(0);

    useLayoutEffect(() => {
        const bar = document.querySelector<HTMLElement>(
            '[data-testid="config-save-bar"]',
        );
        if (bar === null) {
            return undefined;
        }
        // Always re-read the border box, including from inside the observer:
        // `ResizeObserverEntry.contentRect` is the *content* box, and the bar
        // is a padded `Paper`, so trusting it pinned the column ~24px too high
        // and let the bar paint over the first tab entry (seen in the capture).
        const measure = () => setHeight(bar.getBoundingClientRect().height);
        measure();
        if (typeof ResizeObserver === "undefined") {
            return undefined;
        }
        const observer = new ResizeObserver(() => measure());
        observer.observe(bar);
        return () => observer.disconnect();
    }, []);

    return height;
}

/**
 * FM-102: which fieldset is "currently in view", by scroll position rather
 * than `IntersectionObserver` — both are acceptance-listed as the
 * implementer's choice, and a plain scroll listener needs no `rootMargin`
 * tuned to the sticky bar's height, which changes with viewport width and
 * dirty state. The current fieldset is the last one (in DOM order) whose top
 * has scrolled to or past the sticky bar's bottom edge, so the marker follows
 * the section actually visible just below the bar rather than one about to
 * scroll under it.
 *
 * jsdom lays out nothing -- every `getBoundingClientRect()` here returns
 * zeroes in a component test, so this hook's actual behaviour is
 * system-test-only territory (`config.spec.ts`); a unit test can assert no
 * more than that it renders without throwing for an empty fieldset list.
 */
function useScrollspy(fieldsets: readonly FieldsetNavEntry[]): string | null {
    const [currentId, setCurrentId] = useState<string | null>(null);

    useEffect(() => {
        // Nothing to observe; the empty case is handled below by simply not
        // trusting whatever `currentId` happened to hold from a previous tab
        // rather than by resetting it here (React Compiler flags a direct
        // `setState` at an effect's top level as a cascading-render risk).
        if (fieldsets.length === 0) {
            return undefined;
        }
        let frame = 0;
        const updateCurrent = () => {
            const barHeight =
                document
                    .querySelector<HTMLElement>(
                        '[data-testid="config-save-bar"]',
                    )
                    ?.getBoundingClientRect().height ?? 0;
            // The current section is the last one (in DOM order) whose top has
            // scrolled up past an activation line a third of the viewport
            // below the bar, not the bar's own edge: `scrollToFieldset`
            // deliberately leaves a gap below the bar for breathing room, and
            // an admin's own scrolling settles a fieldset's legend anywhere
            // near the top of the visible area, not pixel-flush against the
            // bar. A fixed fraction rather than a pixel count keeps the same
            // behaviour across viewport heights.
            const activationLine = barHeight + window.innerHeight * 0.3;
            // The page has scrolled as far as it can when the last fieldset
            // is short, or trailing enough, that its top never reaches the
            // activation line -- Main's own "Other" is exactly this case, a
            // handful of rows with only the form's bottom padding beneath
            // them. Scrolled to the document's own end, the last fieldset is
            // current regardless of where its top landed, the same way a
            // page's final in-view heading is "current" once there is
            // nothing left to scroll past.
            //
            // Guarded on the page actually being scrollable at all. A
            // document's `scrollHeight` is never less than its `clientHeight`,
            // so on a tab short enough to fit the viewport -- Downloading,
            // Notifications and External Tools render two top-level fieldsets
            // each, Authorization four -- the end test is satisfied at scroll
            // position 0 and would mark the *last* fieldset current before the
            // admin had scrolled anything.
            const documentElement = document.documentElement;
            const scrollable =
                documentElement.scrollHeight > documentElement.clientHeight;
            const atDocumentEnd =
                scrollable &&
                window.scrollY + window.innerHeight >=
                    documentElement.scrollHeight - 1;
            let current = fieldsets[0].id;
            if (atDocumentEnd) {
                current = fieldsets[fieldsets.length - 1].id;
            } else {
                for (const entry of fieldsets) {
                    if (
                        entry.node.getBoundingClientRect().top <= activationLine
                    ) {
                        current = entry.id;
                    }
                }
            }
            setCurrentId(current);
        };
        const onScroll = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updateCurrent);
        };
        updateCurrent();
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", onScroll);
        };
    }, [fieldsets]);

    return fieldsets.length === 0 ? null : currentId;
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
