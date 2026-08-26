import {describe, expect, it} from "vitest";

import {CONFIG_TABS} from "../configTabs";
import {
    SETTINGS_INDEX,
    settingsIndexForTab,
    settingsIndexHref,
    settingsSearchOptionTestId,
    type SettingsIndexEntry,
} from "./settingsIndex";
import {
    searchSettings,
    settingMatchesQuery,
    settingsSearchGroup,
    settingsSearchOptionDetail,
} from "./settingsSearchMatching";

function entry(path: string): SettingsIndexEntry {
    const found = SETTINGS_INDEX.find((candidate) => candidate.path === path);
    if (found === undefined) {
        throw new Error(`Not in the settings index: ${path}`);
    }
    return found;
}

describe("C-CONFIG-SETTINGS-INDEX shape", () => {
    it("should hold one record per path", () => {
        const seen = new Set<string>();
        const duplicates = SETTINGS_INDEX.filter((candidate) => {
            const isDuplicate = seen.has(candidate.path);
            seen.add(candidate.path);
            return isDuplicate;
        }).map((candidate) => candidate.path);

        expect(duplicates).toEqual([]);
    });

    it("should name only tabs that exist and cover every one of them", () => {
        const segments = CONFIG_TABS.map((tab) => tab.path);

        expect([
            ...new Set(SETTINGS_INDEX.map((candidate) => candidate.tab)),
        ]).toEqual(segments);
        for (const segment of segments) {
            expect(
                settingsIndexForTab(segment).length,
                `${segment} contributes no searchable entry`,
            ).toBeGreaterThan(0);
        }
    });

    it("should keep each tab's entries contiguous, as Autocomplete grouping needs", () => {
        const order = SETTINGS_INDEX.map((candidate) => candidate.tab);
        const firstSeen = order.filter(
            (tab, position) => order.indexOf(tab) === position,
        );

        // Rebuilding the sequence from the first appearance of each tab must
        // reproduce it exactly; any tab whose entries were split into two runs
        // would make `groupBy` emit its header twice.
        expect(order).toEqual(
            firstSeen.flatMap((tab) =>
                Array<string>(order.filter((each) => each === tab).length).fill(
                    tab,
                ),
            ),
        );
    });

    it("should anchor a row on its setting row and a list section on the list", () => {
        for (const candidate of SETTINGS_INDEX) {
            if (candidate.kind === "row") {
                expect(candidate.anchorTestId).toBe(
                    `config-setting-${candidate.path.replaceAll(".", "-")}`,
                );
            } else {
                expect(candidate.anchorTestId).not.toMatch(/^config-setting-/);
            }
        }
    });

    it("should give every entry a route into its own tab", () => {
        expect(settingsIndexHref(entry("searching.coverSize"))).toBe(
            "/config/searching",
        );
        expect(settingsIndexHref(entry("externalTools.externalTools"))).toBe(
            "/config/externalTools",
        );
    });

    it("should derive a stable option test id from the path", () => {
        expect(settingsSearchOptionTestId(entry("main.logging.logGc"))).toBe(
            "config-search-option-main-logging-logGc",
        );
    });

    it("should index one entry per list section, not one per entry field", () => {
        const sections = SETTINGS_INDEX.filter(
            (candidate) => candidate.kind === "section",
        ).map((candidate) => candidate.path);

        expect(sections).toEqual([
            "auth.users",
            "searching.customMappings",
            "categoriesConfig.categories",
            "downloading.downloaders",
            "externalTools.externalTools",
            "indexers",
            "notificationConfig.entries",
        ]);
    });
});

describe("settings search matching", () => {
    it("should match a label case-insensitively, on a substring", () => {
        expect(settingMatchesQuery(entry("main.apiKey"), "api key")).toBe(true);
        expect(settingMatchesQuery(entry("main.apiKey"), "PI K")).toBe(true);
        expect(settingMatchesQuery(entry("main.apiKey"), "apikey")).toBe(false);
    });

    it("should match help text as well as the label", () => {
        // Nothing in this setting's label says "garbage collection".
        const logGc = entry("main.logging.logGc");
        expect(logGc.label).not.toMatch(/garbage/i);
        expect(settingMatchesQuery(logGc, "garbage collection")).toBe(true);
    });

    it("should find a setting by a word that only its help text carries", () => {
        expect(searchSettings("umlauts").map((hit) => hit.path)).toContain(
            "searching.replaceUmlauts",
        );
        expect(searchSettings("docker").map((hit) => hit.path)).toEqual([
            "main.showUpdateBannerOnDocker",
            "downloading.sendMagnetLinks",
        ]);
    });

    it("should return every entry for an empty or blank query", () => {
        expect(searchSettings("")).toHaveLength(SETTINGS_INDEX.length);
        expect(searchSettings("   ")).toHaveLength(SETTINGS_INDEX.length);
    });

    it("should return nothing for a query no setting mentions", () => {
        expect(searchSettings("zzzznosuchsetting")).toEqual([]);
    });

    it("should keep hits in index order so their groups stay contiguous", () => {
        const hits = searchSettings("restart");
        const tabs = hits.map((hit) => hit.tab);

        expect(hits.length).toBeGreaterThan(1);
        expect([...new Set(tabs)]).toEqual(
            tabs.filter((tab, position) => tabs.indexOf(tab) === position),
        );
    });

    it("should search across tabs, not only the open one", () => {
        expect([
            ...new Set(searchSettings("apply").map((hit) => hit.tab)),
        ]).toEqual(["main", "auth", "searching", "notifications"]);
    });
});

describe("settings search presentation", () => {
    it("should group an option under its tab's display name", () => {
        expect(settingsSearchGroup(entry("auth.authType"))).toBe(
            "Authorization",
        );
        expect(
            settingsSearchGroup(entry("externalTools.syncOnConfigChange")),
        ).toBe("External Tools");
    });

    it("should show the fieldset as an option's detail line", () => {
        expect(settingsSearchOptionDetail(entry("main.logging.logGc"))).toBe(
            "Logging",
        );
    });

    it("should fall back to the tab name for a row outside any fieldset", () => {
        const tabLevel = entry("categoriesConfig.enableCategorySizes");

        expect(tabLevel.fieldset).toBeNull();
        expect(settingsSearchOptionDetail(tabLevel)).toBe("Categories");
    });

    it("should flag a row advanced when its own prop or its fieldset says so", () => {
        // Own prop, in a plain fieldset.
        expect(entry("main.urlBase").advanced).toBe(true);
        // Inherited from a wholly advanced fieldset, with no prop of its own.
        expect(entry("main.logging.logGc").advanced).toBe(true);
        // Neither.
        expect(entry("main.host").advanced).toBe(false);
    });
});
