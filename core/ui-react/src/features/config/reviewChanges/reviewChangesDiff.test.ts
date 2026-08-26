import {describe, expect, it} from "vitest";

import {UNCHANGED_SECRET_MARKER} from "../components";
import {settingTestId} from "../components/settings";
import {
    computeConfigChanges,
    isHiddenSetting,
    isSecretSettingPath,
    reviewChangeTestId,
    reviewValueText,
    type ReviewChange,
} from "./reviewChangesDiff";

function changesOf(
    previous: unknown,
    current: unknown,
    dirtyFields: unknown,
): ReviewChange[] {
    return computeConfigChanges({current, dirtyFields, previous});
}

describe("reviewValueText", () => {
    it("renders booleans as on/off and absences as (empty)", () => {
        expect(reviewValueText(true)).toBe("on");
        expect(reviewValueText(false)).toBe("off");
        expect(reviewValueText(null)).toBe("(empty)");
        expect(reviewValueText(undefined)).toBe("(empty)");
        expect(reviewValueText("")).toBe("(empty)");
        expect(reviewValueText([])).toBe("(empty)");
        expect(reviewValueText(0)).toBe("0");
        expect(reviewValueText(["a", "b"])).toBe("a, b");
    });
});

describe("computeConfigChanges: scalars", () => {
    it("labels a known setting from the index and names its tab and fieldset", () => {
        const changes = changesOf(
            {main: {port: 5076}},
            {main: {port: 5080}},
            {main: {port: true}},
        );
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({
            id: "main.port",
            kind: "setting",
            label: "Port",
            newText: "5080",
            oldText: "5076",
            origin: "Main › Hosting",
            status: null,
        });
    });

    it("falls back to the raw path for a setting the index does not know", () => {
        const changes = changesOf(
            {main: {somethingNewer: 1}},
            {main: {somethingNewer: 2}},
            {main: {somethingNewer: true}},
        );
        expect(changes[0]).toMatchObject({
            label: "main.somethingNewer",
            // The section still resolves to its tab even with no index entry.
            origin: "Main",
        });
    });

    it("gives a setting row the same testid stem as its config-setting row", () => {
        const changes = changesOf(
            {main: {logging: {logGc: false}}},
            {main: {logging: {logGc: true}}},
            {main: {logging: {logGc: true}}},
        );
        expect(reviewChangeTestId(changes[0])).toBe(
            `config-review-entry-${settingTestId("main.logging.logGc")}`,
        );
        expect(changes[0]).toMatchObject({newText: "on", oldText: "off"});
    });

    it("drops a path that was touched and then reverted by hand", () => {
        const changes = changesOf(
            {main: {host: "0.0.0.0", port: 5076}},
            {main: {host: "0.0.0.0", port: 5080}},
            {main: {host: true, port: true}},
        );
        expect(changes.map((change) => change.id)).toEqual(["main.port"]);
    });

    it("ignores passthrough keys the UI never modelled and never dirtied", () => {
        const changes = changesOf(
            {emby: {host: "http://emby"}, genericStorage: {a: 1}, main: {}},
            {emby: {host: "http://emby"}, genericStorage: {a: 1}, main: {}},
            {},
        );
        expect(changes).toEqual([]);
    });

    it("reports an unmodelled section a passthrough edit did dirty", () => {
        const changes = changesOf(
            {emby: {host: "http://emby"}},
            {emby: {host: "http://other"}},
            {emby: {host: true}},
        );
        expect(changes[0]).toMatchObject({
            label: "emby.host",
            newText: "http://other",
            origin: "Other settings",
        });
    });

    it("treats a list of plain values as one setting, not one row per element", () => {
        const changes = changesOf(
            {main: {proxyIgnoreDomains: ["a"]}},
            {main: {proxyIgnoreDomains: ["a", "b"]}},
            {main: {proxyIgnoreDomains: [true, true]}},
        );
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({
            id: "main.proxyIgnoreDomains",
            newText: "a, b",
            oldText: "a",
        });
    });
});

describe("computeConfigChanges: secrets", () => {
    it("recognizes a secret by path whatever it holds", () => {
        expect(isSecretSettingPath("main.proxyPassword")).toBe(true);
        expect(isSecretSettingPath("main.proxyUsername")).toBe(true);
        expect(isSecretSettingPath("main.sslKeyStorePassword")).toBe(true);
        expect(isSecretSettingPath("auth.oidcClientSecret")).toBe(true);
        expect(isSecretSettingPath("main.apiKey")).toBe(true);
        expect(isSecretSettingPath("auth.users.0.password")).toBe(true);
        expect(isSecretSettingPath("main.host")).toBe(false);
    });

    it("hides a masked value even on a path it does not recognize", () => {
        expect(
            isHiddenSetting("main.host", UNCHANGED_SECRET_MARKER, "typed"),
        ).toBe(true);
        expect(
            isHiddenSetting("main.host", "typed", UNCHANGED_SECRET_MARKER),
        ).toBe(true);
        expect(isHiddenSetting("main.host", "a", "b")).toBe(false);
    });

    it("renders neither side of an edited masked secret", () => {
        const changes = changesOf(
            {main: {proxyPassword: UNCHANGED_SECRET_MARKER}},
            {main: {proxyPassword: "hunter2"}},
            {main: {proxyPassword: true}},
        );
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({
            label: "Proxy password",
            newText: "(hidden)",
            oldText: "(hidden)",
            status: "changed",
        });
        expect(JSON.stringify(changes)).not.toContain("hunter2");
        expect(JSON.stringify(changes)).not.toContain(UNCHANGED_SECRET_MARKER);
    });

    it("hides a clear-text secret on both sides", () => {
        const changes = changesOf(
            {main: {sslKeyStorePassword: "old-store-pw"}},
            {main: {sslKeyStorePassword: "new-store-pw"}},
            {main: {sslKeyStorePassword: true}},
        );
        expect(changes[0]).toMatchObject({
            newText: "(hidden)",
            oldText: "(hidden)",
            status: "changed",
        });
        expect(JSON.stringify(changes)).not.toContain("store-pw");
    });
});

describe("computeConfigChanges: list sections", () => {
    const geek = {name: "NZBGeek", score: 1, apiKey: UNCHANGED_SECRET_MARKER};
    const planet = {name: "NZBPlanet", score: 2};

    it("summarizes an edited entry once, by name, with no values", () => {
        const changes = changesOf(
            {indexers: [geek, planet]},
            {indexers: [{...geek, score: 9}, planet]},
            {indexers: [{name: false, score: true, apiKey: false}]},
        );
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({
            id: "indexers.NZBGeek",
            kind: "entry",
            label: "Indexers: NZBGeek",
            newText: null,
            oldText: null,
            origin: "Indexers › Indexers",
            status: "edited",
        });
        expect(reviewChangeTestId(changes[0])).toBe(
            "config-review-entry-indexers-NZBGeek",
        );
    });

    it("never renders a per-entry credential, even when it is the edit", () => {
        const changes = changesOf(
            {indexers: [geek]},
            {indexers: [{...geek, apiKey: "real-secret-key"}]},
            {indexers: [{apiKey: true}]},
        );
        expect(changes).toHaveLength(1);
        expect(changes[0].status).toBe("edited");
        expect(JSON.stringify(changes)).not.toContain("real-secret-key");
    });

    it("reports added and removed entries by name, not by position", () => {
        const changes = changesOf(
            {indexers: [geek, planet]},
            {indexers: [planet, {name: "NZBFinder"}]},
            // Removing the first entry re-marks every surviving entry.
            {indexers: [{name: true}, {name: true}, {name: true}]},
        );
        expect(changes.map((change) => [change.label, change.status])).toEqual([
            ["Indexers: NZBGeek", "removed"],
            ["Indexers: NZBFinder", "added"],
        ]);
    });

    it("keys users by username, which is the identity the save resolves", () => {
        const changes = changesOf(
            {auth: {users: [{username: "alice", maySeeAdmin: false}]}},
            {auth: {users: [{username: "alice", maySeeAdmin: true}]}},
            {auth: {users: [{maySeeAdmin: true}]}},
        );
        expect(changes[0]).toMatchObject({
            id: "auth.users.alice",
            label: "Users: alice",
            origin: "Authorization › Users",
            status: "edited",
        });
    });

    it("falls back to positions for a list whose entries carry no key", () => {
        const changes = changesOf(
            {searching: {customMappings: [{from: "a"}]}},
            {searching: {customMappings: [{from: "b"}, {from: "c"}]}},
            {searching: {customMappings: [{from: true}, {from: true}]}},
        );
        expect(changes.map((change) => [change.label, change.status])).toEqual([
            ["Custom mappings: entry 1", "edited"],
            ["Custom mappings: entry 2", "added"],
        ]);
    });

    it("falls back to positions when a freshly added entry is still blank", () => {
        const changes = changesOf(
            {downloading: {downloaders: [{name: "sab"}]}},
            {downloading: {downloaders: [{name: "sab"}, {name: ""}]}},
            {downloading: {downloaders: [{name: false}, {name: true}]}},
        );
        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({
            label: "Downloaders: entry 2",
            status: "added",
        });
    });

    it("says nothing about a list that was rebuilt into the same entries", () => {
        const changes = changesOf(
            {categoriesConfig: {categories: [{name: "movies", min: 1}]}},
            {categoriesConfig: {categories: [{name: "movies", min: 1}]}},
            {categoriesConfig: {categories: [{name: true, min: true}]}},
        );
        expect(changes).toEqual([]);
    });

    it("summarizes an entry list that did not exist before as added", () => {
        const changes = changesOf(
            {notificationConfig: {}},
            {notificationConfig: {entries: [{eventType: "RESULT_DOWNLOAD"}]}},
            {notificationConfig: {entries: [{eventType: true}]}},
        );
        expect(changes[0]).toMatchObject({
            label: "Notifications: entry 1",
            origin: "Notifications › Notifications",
            status: "added",
        });
    });
});

describe("computeConfigChanges: mixed", () => {
    it("lists a scalar on one tab and a list entry on another together", () => {
        const changes = changesOf(
            {
                indexers: [{name: "NZBGeek", score: 1}],
                main: {logging: {logGc: false}},
            },
            {
                indexers: [{name: "NZBGeek", score: 9}],
                main: {logging: {logGc: true}},
            },
            {
                indexers: [{score: true}],
                main: {logging: {logGc: true}},
            },
        );
        expect(changes.map((change) => change.id)).toEqual([
            "indexers.NZBGeek",
            "main.logging.logGc",
        ]);
    });

    it("returns nothing for a dirty tree with no dirty leaf", () => {
        expect(
            changesOf({main: {}}, {main: {}}, {main: {host: false}}),
        ).toEqual([]);
        expect(changesOf({}, {}, undefined)).toEqual([]);
    });
});
