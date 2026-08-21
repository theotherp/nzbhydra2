import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {STAT_FAMILIES, allFamiliesSelected} from "../../../api/stats/mainStats";
import {
    defaultFamilySelection,
    loadFamilySelection,
    loadIncludeDisabled,
    saveFamilySelection,
    saveIncludeDisabled,
} from "./persistence";

// This project's jsdom environment has no explicit `url` configured, which
// leaves `window.localStorage` unavailable in every test (a jsdom "opaque
// origin" limitation -- see the identical note in
// `SearchResults.test.tsx`'s `stubWorkingLocalStorage`). Installed fresh per
// test and removed by `vi.unstubAllGlobals()`.
function stubWorkingLocalStorage(): void {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) =>
            store.has(key) ? (store.get(key) as string) : null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    } satisfies Storage);
}

beforeEach(() => {
    stubWorkingLocalStorage();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("defaultFamilySelection", () => {
    it("enables every family, gating the four user/host share families on historyUserInfoType", () => {
        const selection = defaultFamilySelection(false, false);
        expect(selection.downloadSharesPerUser).toBe(false);
        expect(selection.searchSharesPerUser).toBe(false);
        expect(selection.downloadSharesPerIp).toBe(false);
        expect(selection.searchSharesPerIp).toBe(false);
        for (const family of STAT_FAMILIES) {
            if (
                [
                    "downloadSharesPerUser",
                    "searchSharesPerUser",
                    "downloadSharesPerIp",
                    "searchSharesPerIp",
                ].includes(family)
            ) {
                continue;
            }
            expect(selection[family]).toBe(true);
        }
    });

    it("enables the user-share families only when username or both is configured", () => {
        const selection = defaultFamilySelection(true, false);
        expect(selection.downloadSharesPerUser).toBe(true);
        expect(selection.searchSharesPerUser).toBe(true);
        expect(selection.downloadSharesPerIp).toBe(false);
    });
});

describe("include-disabled persistence", () => {
    it("round-trips through localStorage", () => {
        expect(loadIncludeDisabled()).toBeUndefined();
        saveIncludeDisabled(true);
        expect(loadIncludeDisabled()).toBe(true);
        saveIncludeDisabled(false);
        expect(loadIncludeDisabled()).toBe(false);
    });

    it("returns undefined instead of throwing when getItem itself throws", () => {
        // Some hardened/private-mode browsers let `localStorage` be
        // constructed but throw from individual calls -- same hazard
        // `loadFamilySelection` already guards against below.
        vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
            throw new DOMException("denied", "SecurityError");
        });
        expect(loadIncludeDisabled()).toBeUndefined();
    });
});

describe("family-selection persistence", () => {
    it("round-trips a full selection through localStorage", () => {
        expect(loadFamilySelection()).toBeUndefined();
        const selection = allFamiliesSelected(true);
        saveFamilySelection(selection);
        expect(loadFamilySelection()).toEqual(selection);
    });

    it("ignores a stored value missing a known family key", () => {
        window.localStorage.setItem(
            "hydra.stats-dashboard.families",
            JSON.stringify({avgResponseTimes: true}),
        );
        expect(loadFamilySelection()).toBeUndefined();
    });

    it("ignores unparseable stored JSON", () => {
        window.localStorage.setItem(
            "hydra.stats-dashboard.families",
            "{not json",
        );
        expect(loadFamilySelection()).toBeUndefined();
    });
});
