export type SystemTab = {
    /** URL segment; legacy's exact segments (`nzbhydra.js:396-600`). */
    path: string;
    label: string;
};

/**
 * The eight system tabs, in legacy's order and with legacy's labels
 * (`system-controller.js:44-83`). The segments are a URL contract: they are
 * what an existing bookmark, the legacy shell selector, and the `System`
 * navigation item all point at.
 */
export const SYSTEM_TABS: readonly SystemTab[] = [
    {path: "control", label: "Control"},
    {path: "updates", label: "Updates"},
    {path: "log", label: "Log"},
    {path: "tasks", label: "Tasks"},
    {path: "backup", label: "Backup"},
    {path: "bugreport", label: "Bugreport / Debug"},
    {path: "news", label: "News"},
    {path: "about", label: "About"},
];

export const SYSTEM_ROUTE_BASE = "/system";

/** Legacy's default tab: every `root.system.*` state but Control is reached explicitly. */
export const DEFAULT_SYSTEM_TAB = SYSTEM_TABS[0];

export function systemTabHref(tab: SystemTab): string {
    return `${SYSTEM_ROUTE_BASE}/${tab.path}`;
}

export function systemTabTestId(tab: SystemTab): string {
    return `system-tab-${tab.path}`;
}

/** The tab a pathname belongs to, or the default tab for bare `/system`. */
export function activeSystemTab(pathname: string): SystemTab {
    return (
        SYSTEM_TABS.find((tab) => pathname.endsWith(`/${tab.path}`)) ??
        DEFAULT_SYSTEM_TAB
    );
}
