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
    safeConfig: Record<string, unknown> | null;
    baseUrl: string;
    serverTimeZone: string | null;
};

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
