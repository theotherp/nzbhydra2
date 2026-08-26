import {describe, expect, it} from "vitest";

import {UNCHANGED_SECRET_MARKER} from "../components";
import {importConfigDraft, importResultLines} from "./indexerImport";
import {
    ALREADY_CONFIGURED_MESSAGE,
    CUSTOM_NEWZNAB_PRESET,
    CUSTOM_TORZNAB_PRESET,
    isAddingAllowed,
    NEWZNAB_PRESETS,
    newIndexerDraft,
    SPECIAL_PRESETS,
    TORZNAB_PRESETS,
} from "./indexerPresets";
import {
    applyCapsCheckResult,
    applyIndexerStates,
    completenessBanner,
    connectionSettingsChanged,
    filterIndexers,
    greaterThanOneValidator,
    greaterThanZeroValidator,
    groupNameSuggestions,
    hourOfDayValidator,
    indexerCategoryOptions,
    INDEXER_SORT_OPTIONS,
    indexerSortFromValue,
    indexerSortValue,
    indexerStateHelp,
    indexerStateLabel,
    indexerTypeLabel,
    mergeCapsCheckResults,
    needsCapsCheck,
    nextIndexerSort,
    noCommaValidator,
    orderedIndexers,
    showsCapabilityControls,
    sortIndexers,
    toggledIndexerState,
    uniqueIndexerNameValidator,
    vipExpirationValidator,
    vipExpiryWarning,
    visibleIndexerFields,
    withUnknownCapabilities,
} from "./indexerSettings";

describe("orderedIndexers", () => {
    it("reproduces legacy's state-then-priority-then-name order", () => {
        const entries = [
            {name: "zulu", state: "ENABLED", score: 0},
            {name: "system", state: "DISABLED_SYSTEM", score: 100},
            {name: "alpha", state: "ENABLED", score: 0},
            {name: "temporary", state: "DISABLED_SYSTEM_TEMPORARY", score: 0},
            {name: "high", state: "ENABLED", score: 10},
            {name: "user", state: "DISABLED_USER", score: 0},
        ];

        expect(orderedIndexers(entries).map(({entry}) => entry.name)).toEqual([
            "high",
            "alpha",
            "zulu",
            "user",
            "temporary",
            "system",
        ]);
    });

    it("keeps every entry's configuration index, not its display position", () => {
        const entries = [
            {name: "b", state: "DISABLED_USER", score: 0},
            {name: "a", state: "ENABLED", score: 0},
        ];

        expect(orderedIndexers(entries)).toEqual([
            {entry: entries[1], index: 1},
            {entry: entries[0], index: 0},
        ]);
    });
});

describe("the list surface's order, filter, and bulk write", () => {
    /** Deliberately not in configuration order, so index ≠ position. */
    const entries = [
        {
            configComplete: true,
            name: "Beta",
            score: 5,
            searchModuleType: "TORZNAB",
            state: "DISABLED_USER",
        },
        {
            configComplete: true,
            name: "alpha",
            score: 50,
            searchModuleType: "NEWZNAB",
            state: "ENABLED",
        },
        {
            configComplete: false,
            name: "Gamma",
            score: 5,
            searchModuleType: "NZBINDEX_API",
            state: "DISABLED_SYSTEM",
        },
    ];

    function names(rows: readonly {entry: {name?: unknown}}[]): unknown[] {
        return rows.map(({entry}) => entry.name);
    }

    it("starts in legacy's order and returns to it after a full header cycle", () => {
        expect(names(sortIndexers(entries, null))).toEqual([
            "alpha",
            "Beta",
            "Gamma",
        ]);

        let sort = nextIndexerSort(null, "name");
        expect(sort).toEqual({direction: "asc", key: "name"});
        sort = nextIndexerSort(sort, "name");
        expect(sort).toEqual({direction: "desc", key: "name"});
        expect(nextIndexerSort(sort, "name")).toBeNull();
        // A different column always starts ascending.
        expect(nextIndexerSort(sort, "priority")).toEqual({
            direction: "asc",
            key: "priority",
        });
    });

    it("sorts each column in both directions, keeping the configuration index", () => {
        expect(sortIndexers(entries, {direction: "asc", key: "name"})).toEqual([
            {entry: entries[1], index: 1},
            {entry: entries[0], index: 0},
            {entry: entries[2], index: 2},
        ]);
        expect(
            names(sortIndexers(entries, {direction: "desc", key: "name"})),
        ).toEqual(["Gamma", "Beta", "alpha"]);

        // Ascending priority is lowest first; the two 5s tie and are broken by
        // name, so the order is total rather than whatever `sort` happened to
        // do with them.
        expect(
            names(sortIndexers(entries, {direction: "asc", key: "priority"})),
        ).toEqual(["Beta", "Gamma", "alpha"]);
        expect(
            names(sortIndexers(entries, {direction: "desc", key: "priority"})),
        ).toEqual(["alpha", "Beta", "Gamma"]);

        // Ascending state is usable first, then the disabled meanings in
        // increasing severity.
        expect(
            names(sortIndexers(entries, {direction: "asc", key: "state"})),
        ).toEqual(["alpha", "Beta", "Gamma"]);
        expect(
            names(sortIndexers(entries, {direction: "desc", key: "state"})),
        ).toEqual(["Gamma", "Beta", "alpha"]);
    });

    it("ranks an unknown state as enabled, exactly as the switch labels it", () => {
        const odd = [
            {name: "known", state: "DISABLED_USER"},
            {name: "odd", state: "SOMETHING_NEW"},
        ];

        expect(
            names(sortIndexers(odd, {direction: "asc", key: "state"})),
        ).toEqual(["odd", "known"]);
    });

    it("filters case-insensitively by substring and finds an unnamed entry by its label", () => {
        const rows = sortIndexers([...entries, {score: 0}], null);

        expect(names(filterIndexers(rows, "a"))).toEqual([
            "alpha",
            "Beta",
            "Gamma",
            undefined,
        ]);
        expect(names(filterIndexers(rows, "  ETA "))).toEqual(["Beta"]);
        expect(filterIndexers(rows, "nothing here")).toEqual([]);
        expect(names(filterIndexers(rows, "unnamed"))).toEqual([undefined]);
        // An empty query is not a filter, and never the same array object.
        expect(filterIndexers(rows, "")).toEqual(rows);
        expect(filterIndexers(rows, "")).not.toBe(rows);
    });

    it("disables only the named entries and returns the others by identity", () => {
        const next = applyIndexerStates(entries, [1], false);

        expect(next[1]).toEqual({...entries[1], state: "DISABLED_USER"});
        expect(next[0]).toBe(entries[0]);
        expect(next[2]).toBe(entries[2]);
    });

    it("refuses to bulk-enable an indexer whose configuration is incomplete", () => {
        const next = applyIndexerStates(entries, [0, 1, 2], true);

        expect(next[0]).toEqual({...entries[0], state: "ENABLED"});
        // Already enabled, so untouched by identity.
        expect(next[1]).toBe(entries[1]);
        // Incomplete: its own switch is inoperable, and bulk is not a way past
        // that.
        expect(next[2]).toBe(entries[2]);
    });

    it("round-trips every ordering through the compact sort control's values", () => {
        for (const option of INDEXER_SORT_OPTIONS) {
            expect(indexerSortValue(indexerSortFromValue(option.value))).toBe(
                option.value,
            );
        }
        expect(indexerSortValue(null)).toBe("default");
        // The seven options are exactly the default plus each key in each
        // direction, so the control can reach every order a header click can.
        expect(INDEXER_SORT_OPTIONS).toHaveLength(7);
        // Anything unrecognised falls back to the default order rather than to
        // a sort that does not exist.
        expect(indexerSortFromValue("default")).toBeNull();
        expect(indexerSortFromValue("nonsense-asc")).toBeNull();
        expect(indexerSortFromValue("name-sideways")).toBeNull();
    });

    it("names each search module type the way its preset does", () => {
        expect(indexerTypeLabel("NEWZNAB")).toBe("Newznab");
        expect(indexerTypeLabel("NZBINDEX_API")).toBe("NZBIndex API");
        expect(indexerTypeLabel("WTFNZB")).toBe("WtfNzb");
        // A constant the backend adds later still reads as words.
        expect(indexerTypeLabel("SOME_NEW_SOURCE")).toBe("Some New Source");
        expect(indexerTypeLabel(undefined)).toBe("Unknown");
    });
});

describe("indexer state", () => {
    it("names each of legacy's four states", () => {
        expect(indexerStateLabel("ENABLED")).toBe("Enabled");
        expect(indexerStateLabel("DISABLED_USER")).toBe("Disabled by user");
        expect(indexerStateLabel("DISABLED_SYSTEM_TEMPORARY")).toBe(
            "Temporary disabled",
        );
        expect(indexerStateLabel("DISABLED_SYSTEM")).toBe("Disabled by system");
    });

    it("always disables as the user", () => {
        expect(toggledIndexerState(false)).toBe("DISABLED_USER");
        expect(toggledIndexerState(true)).toBe("ENABLED");
    });

    it("explains only the two system states", () => {
        expect(indexerStateHelp("ENABLED")).toBeUndefined();
        expect(indexerStateHelp("DISABLED_USER")).toBeUndefined();
        expect(indexerStateHelp("DISABLED_SYSTEM_TEMPORARY")).toContain(
            "reenabled automatically",
        );
        expect(indexerStateHelp("DISABLED_SYSTEM")).toContain(
            "cannot recover by itself",
        );
    });
});

describe("vipExpiryWarning", () => {
    const now = new Date(2026, 7, 20);

    it("warns about an expired subscription", () => {
        expect(vipExpiryWarning({vipExpirationDate: "2026-08-19"}, now)).toBe(
            "VIP access expired on 2026-08-19",
        );
    });

    it("warns about one expiring within a week", () => {
        expect(vipExpiryWarning({vipExpirationDate: "2026-08-25"}, now)).toBe(
            "VIP access will expire on 2026-08-25",
        );
    });

    it("stays quiet for a distant date, Lifetime, nothing, and nonsense", () => {
        expect(
            vipExpiryWarning({vipExpirationDate: "2027-01-01"}, now),
        ).toBeUndefined();
        expect(
            vipExpiryWarning({vipExpirationDate: "Lifetime"}, now),
        ).toBeUndefined();
        expect(vipExpiryWarning({}, now)).toBeUndefined();
        expect(
            vipExpiryWarning({vipExpirationDate: "soon"}, now),
        ).toBeUndefined();
    });
});

describe("visibleIndexerFields", () => {
    it("shows the newznab field set", () => {
        const fields = visibleIndexerFields("NEWZNAB");

        expect(fields).toContain("name");
        expect(fields).toContain("apiPath");
        expect(fields).toContain("hitLimit");
        expect(fields).toContain("customParameters");
        expect(fields).toContain("supportedSearchIds");
        expect(fields).not.toContain("minSeeders");
        expect(fields).not.toContain("generalMinSize");
        expect(fields).not.toContain("password");
    });

    it("adds the torznab-only seeder minimum", () => {
        expect(visibleIndexerFields("TORZNAB")).toContain("minSeeders");
    });

    it("gives WTFNZB a username and password instead of a name", () => {
        const fields = visibleIndexerFields("WTFNZB");

        expect(fields).not.toContain("name");
        expect(fields).toContain("username");
        expect(fields).toContain("password");
        expect(fields).toContain("userAgent");
        expect(fields).not.toContain("apiPath");
    });

    it("drops priority, timeout, and the search-source select for Torbox", () => {
        const fields = visibleIndexerFields("TORBOX");

        expect(fields).not.toContain("score");
        expect(fields).not.toContain("timeout");
        expect(fields).not.toContain("enabledForSearchSource");
        expect(fields).toContain("apiKey");
    });

    it("adds the module-specific fields of NZBIndex and Binsearch", () => {
        expect(visibleIndexerFields("NZBINDEX")).toContain("generalMinSize");
        expect(visibleIndexerFields("BINSEARCH")).toContain(
            "binsearchOtherGroups",
        );
    });

    it("gives ANIZB no category restriction", () => {
        expect(visibleIndexerFields("ANIZB")).not.toContain(
            "enabledCategories",
        );
    });
});

describe("the checks the close sequence runs", () => {
    it("re-tests the connection only for legacy's four watched fields", () => {
        const initial = {
            host: "http://a",
            apiKey: UNCHANGED_SECRET_MARKER,
            apiPath: null,
            username: null,
            password: null,
            score: 0,
        };

        expect(connectionSettingsChanged(initial, {...initial})).toBe(false);
        expect(connectionSettingsChanged(initial, {...initial, score: 5})).toBe(
            false,
        );
        expect(
            connectionSettingsChanged(initial, {...initial, password: "x"}),
        ).toBe(false);
        expect(
            connectionSettingsChanged(initial, {...initial, host: "http://b"}),
        ).toBe(true);
        expect(
            connectionSettingsChanged(initial, {...initial, apiKey: "new"}),
        ).toBe(true);
    });

    it("checks capabilities exactly when either capability list is unknown", () => {
        expect(needsCapsCheck({})).toBe(true);
        expect(needsCapsCheck({supportedSearchIds: []})).toBe(true);
        expect(
            needsCapsCheck({
                supportedSearchIds: [],
                supportedSearchTypes: [],
            }),
        ).toBe(false);
    });

    it("shows the capability controls only for a known newznab or torznab entry", () => {
        expect(showsCapabilityControls("NEWZNAB", false)).toBe(true);
        expect(showsCapabilityControls("TORZNAB", false)).toBe(true);
        expect(showsCapabilityControls("NEWZNAB", true)).toBe(false);
        expect(showsCapabilityControls("BINSEARCH", false)).toBe(false);
    });
});

describe("applyCapsCheckResult", () => {
    const entry = {
        name: "Mock",
        host: "http://mock",
        apiKey: UNCHANGED_SECRET_MARKER,
        score: 7,
        configComplete: false,
        allCapsChecked: false,
    };

    it("copies exactly updateIndexerModel's nine fields", () => {
        const next = applyCapsCheckResult(entry, {
            name: "Renamed by the server",
            // `IndexerChecker.resolveUnchangedSensitiveFields` answers with the
            // *resolved* credential; it must not reach the form.
            apiKey: "the-real-key",
            score: 99,
            supportedSearchIds: ["IMDB"],
            supportedSearchTypes: ["MOVIE"],
            categoryMapping: {categories: []},
            configComplete: true,
            allCapsChecked: true,
            hitLimit: 100,
            downloadLimit: 10,
            state: "ENABLED",
            backend: "NZEDB",
        });

        expect(next).toEqual({
            ...entry,
            supportedSearchIds: ["IMDB"],
            supportedSearchTypes: ["MOVIE"],
            categoryMapping: {categories: []},
            configComplete: true,
            allCapsChecked: true,
            hitLimit: 100,
            downloadLimit: 10,
            state: "ENABLED",
            backend: "NZEDB",
        });
        expect(next.apiKey).toBe(UNCHANGED_SECRET_MARKER);
        expect(next.name).toBe("Mock");
        expect(next.score).toBe(7);
    });

    it("leaves a field the response omits alone", () => {
        expect(applyCapsCheckResult(entry, {configComplete: true})).toEqual({
            ...entry,
            configComplete: true,
        });
    });

    it("makes the capabilities unknown again when the check could not run", () => {
        const cleared = withUnknownCapabilities({
            ...entry,
            supportedSearchIds: ["IMDB"],
            supportedSearchTypes: ["MOVIE"],
        });

        expect(needsCapsCheck(cleared)).toBe(true);
        expect(cleared.name).toBe("Mock");
    });
});

describe("mergeCapsCheckResults", () => {
    function result(indexerConfig: Record<string, unknown>) {
        return {
            allCapsChecked: true,
            configComplete: true,
            indexerConfig: {
                allCapsChecked: true,
                categoryMapping: {categories: []},
                configComplete: true,
                downloadLimit: 10,
                hitLimit: 100,
                state: "ENABLED",
                supportedSearchIds: ["IMDB"],
                supportedSearchTypes: ["MOVIE"],
                ...indexerConfig,
            },
        };
    }

    it("keeps every field the check does not own, including an unsaved edit", () => {
        // The admin renamed nothing but changed the priority and typed a new
        // key while the bulk check was running; a checked entry must come back
        // with those edits intact.
        const entries = [
            {
                allCapsChecked: false,
                apiKey: "typed-while-checking",
                configComplete: false,
                host: "http://mock",
                name: "Mock1",
                score: 42,
                supportedSearchIds: [],
            },
        ];

        const merged = mergeCapsCheckResults(entries, [
            result({
                apiKey: "the-real-key",
                host: "http://somewhere-else",
                name: "Mock1",
                score: 0,
            }),
        ]);

        expect(merged.matched).toBe(1);
        expect(merged.entries[0]).toEqual({
            allCapsChecked: true,
            apiKey: "typed-while-checking",
            categoryMapping: {categories: []},
            configComplete: true,
            downloadLimit: 10,
            hitLimit: 100,
            host: "http://mock",
            name: "Mock1",
            score: 42,
            state: "ENABLED",
            supportedSearchIds: ["IMDB"],
            supportedSearchTypes: ["MOVIE"],
        });
    });

    it("matches by name and leaves unchecked entries identical", () => {
        const untouched = {name: "Mock2", configComplete: false, score: 3};
        const entries = [{name: "Mock1", configComplete: false}, untouched];

        const merged = mergeCapsCheckResults(entries, [
            result({name: "Mock1"}),
        ]);

        expect(merged.matched).toBe(1);
        expect(merged.entries[0].configComplete).toBe(true);
        // Identity, not just equality: nothing was rebuilt.
        expect(merged.entries[1]).toBe(untouched);
    });

    it("changes nothing when no configured indexer is named", () => {
        const entries = [{name: "Mock1", configComplete: false}];

        const merged = mergeCapsCheckResults(entries, [
            result({name: "Somebody else"}),
        ]);

        expect(merged.matched).toBe(0);
        expect(merged.entries[0]).toBe(entries[0]);
    });

    it("never merges into a nameless entry", () => {
        const entries = [{name: null, configComplete: false}];

        const merged = mergeCapsCheckResults(entries, [result({name: null})]);

        expect(merged.matched).toBe(0);
        expect(merged.entries[0].configComplete).toBe(false);
    });
});

describe("the indexer config imports", () => {
    it("seeds legacy's defaults and the IMPORT_CONFIG marker type", () => {
        expect(importConfigDraft("jackett")).toMatchObject({
            host: "http://127.0.0.1:9117",
            name: "Jackett config",
            searchModuleType: "IMPORT_CONFIG",
        });
        expect(importConfigDraft("prowlarr")).toMatchObject({
            host: "http://127.0.0.1:9696",
            name: "Prowlarr config",
            searchModuleType: "IMPORT_CONFIG",
        });
        // The posted entry is the template every imported indexer is cloned
        // from, so the base's own defaults have to travel with it.
        expect(importConfigDraft("jackett")).toMatchObject({
            enabledForSearchSource: "BOTH",
            preselect: true,
            score: 0,
            state: "ENABLED",
        });
    });

    it("reports Jackett's two counts and Prowlarr's three", () => {
        expect(
            importResultLines("jackett", {
                added: 2,
                indexers: [],
                removed: null,
                updated: 1,
            }),
        ).toEqual([
            "Added 2 new trackers from Jackett",
            "Updated 1 trackers from Jackett",
        ]);
        expect(
            importResultLines("prowlarr", {
                added: 2,
                indexers: [],
                removed: 3,
                updated: 1,
            }),
        ).toEqual([
            "Added 2 indexers from Prowlarr",
            "Updated 1 indexers from Prowlarr",
            "Removed 3 indexers no longer in Prowlarr",
        ]);
    });

    it("suppresses the removal line when nothing was removed", () => {
        expect(
            importResultLines("prowlarr", {
                added: 0,
                indexers: [],
                removed: 0,
                updated: 0,
            }),
        ).toEqual([
            "Added 0 indexers from Prowlarr",
            "Updated 0 indexers from Prowlarr",
        ]);
    });
});

describe("completenessBanner", () => {
    it("prefers the incomplete config over the incomplete caps check", () => {
        expect(
            completenessBanner({configComplete: false, allCapsChecked: true}),
        ).toBe("incomplete-config");
        expect(
            completenessBanner({configComplete: true, allCapsChecked: false}),
        ).toBe("incomplete-caps");
        expect(
            completenessBanner({configComplete: true, allCapsChecked: true}),
        ).toBeUndefined();
    });
});

describe("indexer form rules", () => {
    it("rejects a name another indexer already uses and one with a comma", () => {
        const unique = uniqueIndexerNameValidator(["Mock1", "Mock2"]);

        expect(unique("Mock3")).toBe(true);
        expect(unique("Mock1")).toBe('Indexer "Mock1" already exists');
        expect(noCommaValidator("a,b")).toBe("Name may not contain a comma");
        expect(noCommaValidator("ab")).toBe(true);
    });

    it("keeps legacy's numeric limits", () => {
        expect(greaterThanZeroValidator(null)).toBe(true);
        expect(greaterThanZeroValidator(0)).toBe(
            "Value must be greater than 0",
        );
        expect(greaterThanZeroValidator(1)).toBe(true);
        expect(greaterThanOneValidator(1)).toBe("Value must be greater than 1");
        expect(greaterThanOneValidator(2)).toBe(true);
    });

    it("accepts an empty hit reset time and rejects an impossible hour", () => {
        expect(hourOfDayValidator(null)).toBe(true);
        expect(hourOfDayValidator(0)).toBe(true);
        expect(hourOfDayValidator(23)).toBe(true);
        expect(hourOfDayValidator(24)).toBe(
            "24 is not a valid hour of day (0-23)",
        );
    });

    it("keeps legacy's VIP expiry format", () => {
        expect(vipExpirationValidator("")).toBe(true);
        expect(vipExpirationValidator("Lifetime")).toBe(true);
        expect(vipExpirationValidator("2026-01-01")).toBe(true);
        expect(vipExpirationValidator("soon")).toBe(
            "soon is no valid date (must be 'YYYY-MM-DD' or 'Lifetime')",
        );
    });
});

describe("indexerCategoryOptions", () => {
    it("drops the first (all) category, as CategoriesService.getWithoutAll does", () => {
        expect(
            indexerCategoryOptions([
                {name: "All"},
                {name: "Movies"},
                {name: "TV"},
            ]),
        ).toEqual([
            {label: "Movies", value: "Movies"},
            {label: "TV", value: "TV"},
        ]);
        expect(indexerCategoryOptions(undefined)).toEqual([]);
    });
});

describe("groupNameSuggestions", () => {
    it("offers the other indexers' groups, without duplicates or the current ones", () => {
        const entries = [
            {name: "a", groupNames: ["Movies", "Anime", ""]},
            {name: "b", groupNames: ["anime", "Movies"]},
            {name: "c", groupNames: ["Books"]},
        ];

        expect(groupNameSuggestions(entries, 2, ["Movies"])).toEqual([
            "Anime",
            "anime",
        ]);
        expect(groupNameSuggestions(entries, null, [])).toEqual([
            "Anime",
            "anime",
            "Books",
            "Movies",
        ]);
    });
});

describe("add presets", () => {
    it("sorts the newznab presets by lower-cased name", () => {
        const labels = NEWZNAB_PRESETS.map((preset) => preset.label);

        expect(labels).toEqual(
            [...labels].sort((left, right) =>
                left.toLowerCase() < right.toLowerCase() ? -1 : 1,
            ),
        );
        expect(labels).toContain("Binsearch");
        expect(labels).toContain("Torbox (Newznab)");
    });

    it("seeds a host preset with the base plus the preset's own values", () => {
        const geek = NEWZNAB_PRESETS.find(
            (preset) => preset.label === "NZBGeek",
        );

        expect(newIndexerDraft(geek)).toMatchObject({
            name: "NZBGeek",
            host: "https://api.nzbgeek.info",
            searchModuleType: "NEWZNAB",
            score: 0,
            preselect: true,
            configComplete: false,
            enabledForSearchSource: "BOTH",
        });
        // Unknown capabilities are what make the close sequence check them.
        expect(needsCapsCheck(newIndexerDraft(geek))).toBe(true);
    });

    it("seeds an already-complete special preset that skips the caps check", () => {
        const binsearch = NEWZNAB_PRESETS.find(
            (preset) => preset.label === "Binsearch",
        );
        const draft = newIndexerDraft(binsearch);

        expect(draft).toMatchObject({
            searchModuleType: "BINSEARCH",
            host: "https://binsearch.info",
            configComplete: true,
            allCapsChecked: true,
            enabledForSearchSource: "INTERNAL",
        });
        expect(needsCapsCheck(draft)).toBe(false);
    });

    it("seeds the custom newznab entry from the bare base", () => {
        expect(newIndexerDraft(CUSTOM_NEWZNAB_PRESET)).toMatchObject({
            searchModuleType: "NEWZNAB",
            host: null,
            name: null,
        });
    });

    it("seeds the custom torznab entry as an unnamed torznab indexer", () => {
        expect(newIndexerDraft(CUSTOM_TORZNAB_PRESET)).toMatchObject({
            searchModuleType: "TORZNAB",
            state: "ENABLED",
            enabledForSearchSource: "BOTH",
            configComplete: false,
        });
    });

    it("seeds Torbox with the capabilities it is known to have", () => {
        expect(newIndexerDraft(SPECIAL_PRESETS[0])).toMatchObject({
            searchModuleType: "TORBOX",
            supportedSearchIds: ["IMDB"],
            supportedSearchTypes: ["MOVIE", "SEARCH"],
        });
        expect(TORZNAB_PRESETS.map((preset) => preset.label)).toEqual([
            "Jackett/Cardigann",
            "Torbox (Torrents)",
        ]);
    });

    it("refuses a second copy of a single-instance preset only", () => {
        const binsearch = NEWZNAB_PRESETS.find(
            (preset) => preset.label === "Binsearch",
        );
        const geek = NEWZNAB_PRESETS.find(
            (preset) => preset.label === "NZBGeek",
        );

        expect(isAddingAllowed([{name: "Binsearch"}], binsearch)).toBe(false);
        expect(isAddingAllowed([{name: "Other"}], binsearch)).toBe(true);
        expect(isAddingAllowed([{name: "NZBGeek"}], geek)).toBe(true);
        expect(ALREADY_CONFIGURED_MESSAGE).toBe(
            "That predefined indexer is already configured.",
        );
    });
});
