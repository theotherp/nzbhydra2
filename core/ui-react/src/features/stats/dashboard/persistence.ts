import {
    allFamiliesSelected,
    STAT_FAMILIES,
    type StatFamilySelection,
} from "../../../api/stats/mainStats";
import {readItem} from "../../../domain/storage/browserStorage";
import {
    readPreference,
    writePreference,
} from "../../../services/preferences/userPreferences";

// ADR-0057: both live in the `statsDashboard` section of the user's
// preferences. These keys are read once, to migrate this browser's values.
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
    const value = readPreference("statsDashboard", "includeDisabled", () => {
        const raw = readItem(INCLUDE_DISABLED_KEY);
        return raw === "true" ? true : raw === "false" ? false : undefined;
    });
    return typeof value === "boolean" ? value : undefined;
}

export function saveIncludeDisabled(value: boolean): void {
    writePreference("statsDashboard", "includeDisabled", value);
}

export function loadFamilySelection(): StatFamilySelection | undefined {
    return familySelectionOf(
        readPreference("statsDashboard", "families", legacyFamilySelection),
    );
}

export function saveFamilySelection(selection: StatFamilySelection): void {
    writePreference("statsDashboard", "families", selection);
}

function legacyFamilySelection(): StatFamilySelection | undefined {
    try {
        const raw = readItem(FAMILIES_KEY);
        return raw ? familySelectionOf(JSON.parse(raw)) : undefined;
    } catch {
        return undefined;
    }
}

function familySelectionOf(value: unknown): StatFamilySelection | undefined {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    const result = {} as StatFamilySelection;
    for (const family of STAT_FAMILIES) {
        if (typeof record[family] !== "boolean") return undefined;
        result[family] = record[family];
    }
    return result;
}
