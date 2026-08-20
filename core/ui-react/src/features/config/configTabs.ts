export type ConfigTab = {
    /** URL segment; legacy's exact segments (`nzbhydra.js:44-250`). */
    path: string;
    label: string;
};

/**
 * The eight canonical configuration tabs, in legacy's order
 * (`config-controller.js:195-259`). The segments are a URL contract: they are
 * what an existing bookmark, the legacy shell selector, and the `Config`
 * navigation item all point at.
 */
export const CONFIG_TABS: readonly ConfigTab[] = [
    {path: "main", label: "Main"},
    {path: "auth", label: "Authorization"},
    {path: "searching", label: "Searching"},
    {path: "categories", label: "Categories"},
    {path: "downloading", label: "Downloading"},
    {path: "externalTools", label: "External Tools"},
    {path: "indexers", label: "Indexers"},
    {path: "notifications", label: "Notifications"},
];

export const CONFIG_ROUTE_BASE = "/config";

export const DEFAULT_CONFIG_TAB = CONFIG_TABS[0];

export function configTabHref(tab: ConfigTab): string {
    return `${CONFIG_ROUTE_BASE}/${tab.path}`;
}

export function configTabTestId(tab: ConfigTab): string {
    return `config-tab-${tab.path}`;
}

/** The tab a pathname belongs to, or the default tab for bare `/config`. */
export function activeConfigTab(pathname: string): ConfigTab {
    return (
        CONFIG_TABS.find((tab) => pathname.endsWith(`/${tab.path}`)) ??
        DEFAULT_CONFIG_TAB
    );
}

/**
 * Whether a target location stays inside the configuration area. Written
 * against a pathname that may or may not still carry the application's base
 * path, because the unsaved-changes guard sees both shapes.
 */
export function isConfigLocation(pathname: string): boolean {
    return (
        pathname.endsWith(CONFIG_ROUTE_BASE) ||
        pathname.includes(`${CONFIG_ROUTE_BASE}/`)
    );
}
