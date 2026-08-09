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
    return value;
}

function isBootstrapData(value: unknown): value is BootstrapData {
    if (!isRecord(value) || typeof value.baseUrl !== "string") {
        return false;
    }

    return [
        "username",
        "authType",
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
        "safeConfig",
        "serverTimeZone",
    ].every((key) => key in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
