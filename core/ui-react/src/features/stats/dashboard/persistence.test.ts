import {describe, expect, it, vi} from "vitest";

import {STAT_FAMILIES, allFamiliesSelected} from "../../../api/stats/mainStats";
import {
    defaultFamilySelection,
    loadFamilySelection,
    loadIncludeDisabled,
    saveFamilySelection,
    saveIncludeDisabled,
} from "./persistence";
import {userPreferences} from "../../../services/preferences/userPreferences";

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
    it("round-trips through the user's preferences", () => {
        expect(loadIncludeDisabled()).toBeUndefined();
        saveIncludeDisabled(true);
        expect(loadIncludeDisabled()).toBe(true);
        saveIncludeDisabled(false);
        expect(loadIncludeDisabled()).toBe(false);
        expect(userPreferences().read("statsDashboard")).toEqual({
            includeDisabled: false,
        });
        expect(window.localStorage.length).toBe(0);
    });

    it("migrates the value this browser stored", () => {
        window.localStorage.setItem(
            "hydra.stats-dashboard.include-disabled",
            "true",
        );
        expect(loadIncludeDisabled()).toBe(true);
        expect(userPreferences().read("statsDashboard")).toEqual({
            includeDisabled: true,
        });
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
    it("round-trips a full selection through the user's preferences", () => {
        expect(loadFamilySelection()).toBeUndefined();
        const selection = allFamiliesSelected(true);
        saveFamilySelection(selection);
        expect(loadFamilySelection()).toEqual(selection);
        expect(userPreferences().read("statsDashboard")).toEqual({
            families: selection,
        });
    });

    it("migrates the selection this browser stored", () => {
        const selection = allFamiliesSelected(false);
        window.localStorage.setItem(
            "hydra.stats-dashboard.families",
            JSON.stringify(selection),
        );
        expect(loadFamilySelection()).toEqual(selection);
        expect(userPreferences().read("statsDashboard")).toEqual({
            families: selection,
        });
    });

    it("ignores a stored selection missing a known family key", () => {
        userPreferences().write("statsDashboard", {
            families: {avgResponseTimes: true},
        });
        expect(loadFamilySelection()).toBeUndefined();
    });

    it("ignores a value this browser stored missing a known family key", () => {
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
