import {createContext, useContext} from "react";

export type SafeConfig = Record<string, unknown> | null;

export type BootstrapData = {
    username: string | null;
    authType: string | null;
    showLogout: boolean | null;
    maySeeSearch: boolean | null;
    adminRestricted: boolean | null;
    statsRestricted: boolean | null;
    maySeeStats: boolean | null;
    searchRestricted: boolean | null;
    maySeeDetailsDl: boolean | null;
    maySeeAdmin: boolean | null;
    authConfigured: boolean | null;
    showIndexerSelection: boolean | null;
    safeConfig: SafeConfig;
    baseUrl: string;
    serverTimeZone: string | null;
};

/**
 * ADR-0017: the live safe configuration, published by
 * `app/SafeConfigProvider` from a TanStack Query over `API-CONFIG-SAFE` that
 * is seeded with `BootstrapData.safeConfig` and invalidated after every
 * successful config save. `undefined` means "no provider above me", which is
 * only ever the case in focused component tests.
 */
export const SafeConfigContext = createContext<SafeConfig | undefined>(
    undefined,
);

/**
 * Reads the safe configuration the way every consumer must: through the
 * context, so a post-save invalidation reaches it without a page reload.
 * Never copy the returned value into component state — that is exactly the
 * staleness ADR-0017 removed. Falls back to the page's bootstrap value, which
 * is the query's own seed, when rendered without a provider.
 */
export function useSafeConfig(bootstrap: BootstrapData): SafeConfig {
    const live = useContext(SafeConfigContext);
    return live === undefined ? bootstrap.safeConfig : live;
}

/**
 * The single admin-area rule: it gates both the shell's Config navigation item
 * and whether the config routes are reachable at all. Mirrors legacy's
 * `maySeeAdminArea` semantics — with authentication configured a session needs
 * the admin permission unless the admin area is unrestricted; with no
 * authentication configured everyone is an admin.
 */
export function maySeeAdminArea(bootstrap: BootstrapData): boolean {
    const authenticated = bootstrap.username !== null;
    const authConfigured = bootstrap.authConfigured === true;
    if (!authConfigured) {
        return true;
    }
    return authenticated
        ? bootstrap.maySeeAdmin === true || !bootstrap.adminRestricted
        : !bootstrap.adminRestricted;
}

declare global {
    interface Window {
        __NZBHYDRA_BOOTSTRAP__?: unknown;
    }
}

export function getBootstrapData(
    value: unknown = window.__NZBHYDRA_BOOTSTRAP__,
): BootstrapData {
    if (!isBootstrapData(value)) {
        throw new Error("React bootstrap data is missing or invalid");
    }
    return {...value, baseUrl: normalizeBaseUrl(value.baseUrl)};
}

export function normalizeBaseUrl(baseUrl: string): string {
    const normalized = new URL(baseUrl, window.location.origin);
    if (
        normalized.origin !== window.location.origin ||
        normalized.search ||
        normalized.hash
    ) {
        throw new Error(
            "React bootstrap base URL must be same-origin and path-only",
        );
    }
    return normalized.pathname.endsWith("/")
        ? normalized.pathname
        : `${normalized.pathname}/`;
}

function isBootstrapData(value: unknown): value is BootstrapData {
    if (!isRecord(value) || typeof value.baseUrl !== "string") {
        return false;
    }

    return (
        ["username", "authType", "serverTimeZone"].every((key) =>
            isNullableString(value[key]),
        ) &&
        [
            "showLogout",
            "maySeeSearch",
            "adminRestricted",
            "statsRestricted",
            "maySeeStats",
            "searchRestricted",
            "maySeeDetailsDl",
            "maySeeAdmin",
            "authConfigured",
            "showIndexerSelection",
        ].every((key) => isNullableBoolean(value[key])) &&
        (value.safeConfig === null || isRecord(value.safeConfig))
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
    return value === null || typeof value === "string";
}

function isNullableBoolean(value: unknown): value is boolean | null {
    return value === null || typeof value === "boolean";
}
