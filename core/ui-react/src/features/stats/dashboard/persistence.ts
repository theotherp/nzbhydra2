import {
    allFamiliesSelected,
    STAT_FAMILIES,
    type StatFamilySelection,
} from "../../../api/stats/mainStats";

const INCLUDE_DISABLED_KEY = "hydra.stats-dashboard.include-disabled";
const FAMILIES_KEY = "hydra.stats-dashboard.families";

/**
 * Legacy's default `statsSwichState` (`stats-controller.js`) enables every
 * family except the two per-user share families, which it only defaults on
 * when `historyUserInfoType` can populate them. This mirrors that gating for
 * all four user/host share families -- the Presentation Structure's own
 * card-gating rule (username-or-both for user shares, IP-or-both for host
 * shares) -- rather than legacy's narrower (and inconsistent: it gates
 * `searchSharesPerUser` on the *IP* flag) version of it.
 */
export function defaultFamilySelection(
    showsUsername: boolean,
    showsIp: boolean,
): StatFamilySelection {
    return {
        ...allFamiliesSelected(true),
        downloadSharesPerUser: showsUsername,
        searchSharesPerUser: showsUsername,
        downloadSharesPerIp: showsIp,
        searchSharesPerIp: showsIp,
    };
}

export function loadIncludeDisabled(): boolean | undefined {
    try {
        const raw = getStorage()?.getItem(INCLUDE_DISABLED_KEY);
        if (raw === "true") return true;
        if (raw === "false") return false;
        return undefined;
    } catch {
        return undefined;
    }
}

export function saveIncludeDisabled(value: boolean): void {
    try {
        getStorage()?.setItem(INCLUDE_DISABLED_KEY, String(value));
    } catch {
        // Storage may be unavailable (private mode, quota); persistence is a
        // convenience, not a requirement for the dashboard to function.
    }
}

export function loadFamilySelection(): StatFamilySelection | undefined {
    try {
        const raw = getStorage()?.getItem(FAMILIES_KEY);
        if (!raw) return undefined;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return undefined;
        const record = parsed as Record<string, unknown>;
        const result = {} as StatFamilySelection;
        for (const family of STAT_FAMILIES) {
            if (typeof record[family] !== "boolean") return undefined;
            result[family] = record[family];
        }
        return result;
    } catch {
        return undefined;
    }
}

export function saveFamilySelection(selection: StatFamilySelection): void {
    try {
        getStorage()?.setItem(FAMILIES_KEY, JSON.stringify(selection));
    } catch {
        // See saveIncludeDisabled.
    }
}

function getStorage(): Storage | undefined {
    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
}
