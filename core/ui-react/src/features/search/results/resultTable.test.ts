import {describe, expect, it, vi} from "vitest";

import {
    ageInDays,
    defaultFilters,
    groupResults,
    filterResults,
    isRecentResult,
    preselectedQuickFilters,
    RECENT_RESULT_MAX_AGE_DAYS,
    quickFilterKey,
    quickFiltersFromSafeConfig,
    selectionAfterClick,
    selectionStatus,
    selectVisibleResults,
    visibleGroupedResults,
} from "./resultTable";

const results = [
    {
        searchResultId: "1",
        title: "Movie WEB 1080p",
        indexer: "One",
        category: "Movies",
        size: 5 * 1024 * 1024,
        grabs: 3,
        epoch: 1_700_000_000,
    },
    {
        searchResultId: "2",
        title: "Movie BluRay 720p",
        indexer: "Two",
        category: "TV",
        size: 2 * 1024 * 1024,
        seeders: 8,
        epoch: 1_600_000_000,
    },
];

describe("result table transformations", () => {
    it("should parse only enabled safe-config quick filters and preserve valid preselection", () => {
        const safeConfig = {
            searching: {
                showQuickFilterButtons: true,
                customQuickFilterButtons: [
                    "Required=movie !cam,/web.*/",
                    "invalid",
                ],
                preselectQuickFilterButtons: [
                    "source|web",
                    "custom|Required",
                    "custom|Missing",
                ],
            },
        };
        const quickFilters = quickFiltersFromSafeConfig(safeConfig);
        expect(quickFilters.map((filter) => filter.id)).toContain("Required");
        expect(preselectedQuickFilters(safeConfig, quickFilters)).toEqual({
            "source|web": true,
            "custom|Required": true,
        });
        expect(
            quickFiltersFromSafeConfig({
                searching: {showQuickFilterButtons: false},
            }),
        ).toEqual([]);
    });

    it("should apply title, multi-select, numeric, and safe quick-filter matching", () => {
        const quickFilters = quickFiltersFromSafeConfig({
            searching: {
                showQuickFilterButtons: true,
                customQuickFilterButtons: ["Invalid=/[/"],
            },
        });
        const filters = defaultFilters(results, quickFilters);
        filters.title = "movie !web";
        filters.indexers = ["Two"];
        filters.categories = ["TV"];
        filters.size = {min: "1", max: "3"};
        filters.grabs = {min: "8", max: ""};
        expect(
            filterResults(results, filters, quickFilters).map(
                (result) => result.searchResultId,
            ),
        ).toEqual(["2"]);

        filters.quickFilters["custom|Invalid"] = true;
        expect(filterResults(results, filters, quickFilters)).toEqual([]);
        filters.size = {min: "", max: ""};
        expect(filterResults(results, filters, quickFilters)).toEqual([]);
    });

    it("should derive download-type filter options from loaded results rather than a hardcoded NZB/Torrent pair, and never discard an undefined downloadType", () => {
        const withTypes = [
            {...results[0], downloadType: "NZB"},
            {...results[1], downloadType: "TORBOX"},
            {
                ...results[0],
                searchResultId: "3",
                title: "Movie no type",
                downloadType: undefined,
            },
        ];
        const filters = defaultFilters(withTypes, []);
        // Derived, sorted, non-hardcoded: NZB and TORBOX both present, no
        // TORRENT entry invented, no undefined entry.
        expect(filters.downloadTypes).toEqual(["NZB", "TORBOX"]);

        // Restricting to only NZB still keeps the undefined-downloadType
        // result -- it is never governed by this filter dimension.
        filters.downloadTypes = ["NZB"];
        expect(
            filterResults(withTypes, filters, []).map(
                (result) => result.searchResultId,
            ),
        ).toEqual(["1", "3"]);

        // An empty selection excludes every typed result but still keeps the
        // undefined-downloadType one.
        filters.downloadTypes = [];
        expect(
            filterResults(withTypes, filters, []).map(
                (result) => result.searchResultId,
            ),
        ).toEqual(["3"]);

        // A result set with no downloadType values at all derives an empty
        // option list rather than inventing NZB/Torrent defaults.
        expect(defaultFilters(results, []).downloadTypes).toEqual([]);
    });

    it("should use OR semantics for multiple selected source, quality, and other filters", () => {
        const quickFilters = quickFiltersFromSafeConfig({
            searching: {showQuickFilterButtons: true},
        });
        const filters = defaultFilters(results, quickFilters);
        filters.quickFilters = {
            "source|web": true,
            "source|bluray": true,
            "quality|q720p": true,
            "quality|q1080p": true,
            "other|x265": true,
            "other|hevc": true,
        };

        expect(
            filterResults(
                [
                    {...results[0], title: "Movie WEB-DL 1080p x265"},
                    {...results[1], title: "Movie BluRay 720p HEVC"},
                    {...results[1], title: "Movie DVD 480p 3D"},
                ],
                filters,
                quickFilters,
            ).map((result) => result.title),
        ).toEqual(["Movie WEB-DL 1080p x265", "Movie BluRay 720p HEVC"]);
    });

    it("should require every selected custom quick filter text and regex term", () => {
        const quickFilters = quickFiltersFromSafeConfig({
            searching: {
                showQuickFilterButtons: true,
                customQuickFilterButtons: [
                    "Movie=movie !cam",
                    "Web release=/web[- ]?dl/",
                ],
            },
        });
        const filters = defaultFilters(results, quickFilters);
        filters.quickFilters = Object.fromEntries(
            quickFilters
                .filter((filter) => filter.group === "custom")
                .map((filter) => [quickFilterKey(filter), true]),
        );

        expect(
            filterResults(
                [
                    {...results[0], title: "Movie WEB-DL release"},
                    {...results[0], title: "Movie release"},
                    {...results[0], title: "Movie WEB-DL CAM release"},
                ],
                filters,
                quickFilters,
            ).map((result) => result.title),
        ).toEqual(["Movie WEB-DL release"]);
    });

    it("should distinguish a custom label from a built-in quick-filter ID", () => {
        const quickFilters = quickFiltersFromSafeConfig({
            searching: {
                showQuickFilterButtons: true,
                customQuickFilterButtons: ["web=movie"],
            },
        });
        const filters = defaultFilters(results, quickFilters);
        filters.quickFilters["custom|web"] = true;

        expect(filters.quickFilters["source|web"]).toBe(false);
        expect(
            filterResults(results, filters, quickFilters).map(
                (result) => result.searchResultId,
            ),
        ).toEqual(["1", "2"]);
    });

    it("should group normalized titles and duplicates while retaining torrent grouping choices", () => {
        const grouped = groupResults(
            [
                {
                    ...results[0],
                    searchResultId: "a",
                    title: "Example.Show",
                    hash: 1,
                },
                {
                    ...results[0],
                    searchResultId: "b",
                    title: "Example Show",
                    hash: 1,
                },
                {
                    ...results[0],
                    searchResultId: "c",
                    title: "Example_Show",
                    hash: 2,
                    downloadType: "TORRENT",
                },
                {
                    ...results[0],
                    searchResultId: "d",
                    title: "",
                    hash: undefined,
                },
            ],
            {
                groupTorrentAndUsenet: false,
                groupEpisodes: false,
                episodeRequested: false,
            },
        );
        expect(
            grouped.map((group) =>
                group.duplicateGroups.map((duplicates) =>
                    duplicates.map((result) => result.searchResultId),
                ),
            ),
        ).toEqual([[["a", "b"]], [["c"]], [["d"]]]);
        expect(
            groupResults(
                grouped.flatMap((group) => group.duplicateGroups.flat()),
                {
                    groupTorrentAndUsenet: true,
                    groupEpisodes: false,
                    episodeRequested: false,
                },
            ),
        ).toHaveLength(2);
    });

    it("should group eligible TV episodes only when no episode was requested", () => {
        const tvResults = [
            {
                ...results[0],
                searchResultId: "one",
                title: "Show S01E01 WEB",
                category: "TV",
                showtitle: "Show",
                season: "1",
                episode: "1",
            },
            {
                ...results[0],
                searchResultId: "two",
                title: "Different release",
                category: "TV",
                showtitle: "Show",
                season: "1",
                episode: "1",
            },
            {
                ...results[0],
                searchResultId: "three",
                title: "No metadata",
                category: "TV",
            },
        ];
        expect(
            groupResults(tvResults, {
                groupTorrentAndUsenet: false,
                groupEpisodes: true,
                episodeRequested: false,
            }),
        ).toHaveLength(2);
        expect(
            groupResults(tvResults, {
                groupTorrentAndUsenet: false,
                groupEpisodes: true,
                episodeRequested: true,
            }),
        ).toHaveLength(3);
    });

    it("should expose expanded group rows and select only current visible ordering", () => {
        const grouped = groupResults(
            [
                {...results[0], searchResultId: "one", hash: 1},
                {...results[0], searchResultId: "two", hash: 1},
                {
                    ...results[1],
                    searchResultId: "three",
                    title: "Another title",
                    hash: 2,
                },
            ],
            {
                groupTorrentAndUsenet: false,
                groupEpisodes: false,
                episodeRequested: false,
            },
        );
        const collapsed = visibleGroupedResults(grouped, new Set(), new Set());
        expect(collapsed.map((result) => result.searchResultId)).toEqual([
            "one",
            "three",
        ]);
        const expanded = visibleGroupedResults(
            grouped,
            new Set(),
            new Set([`${grouped[0].key}|hash:1`]),
        );
        expect(expanded.map((result) => result.searchResultId)).toEqual([
            "one",
            "two",
            "three",
        ]);
        expect(
            selectVisibleResults(new Set(["one"]), collapsed, "invert"),
        ).toEqual(new Set(["three"]));
        expect(
            selectionAfterClick(
                new Set(),
                expanded,
                "three",
                true,
                "one",
                true,
            ),
        ).toEqual(new Set(["one", "two", "three"]));
    });

    it("should summarize none/some/all selection status over only the visible rows, driving the header tri-state checkbox", () => {
        const visible = [
            {...results[0], searchResultId: "one"},
            {...results[1], searchResultId: "two"},
        ];
        expect(selectionStatus(new Set(), visible)).toBe("none");
        expect(selectionStatus(new Set(["one"]), visible)).toBe("some");
        expect(selectionStatus(new Set(["one", "two"]), visible)).toBe("all");
        // A selected ID that is not currently visible (e.g. filtered out or
        // collapsed) never counts toward "some"/"all": the checkbox reflects
        // only what is presently rendered, not the whole selection set.
        expect(selectionStatus(new Set(["not-visible"]), visible)).toBe("none");
        expect(selectionStatus(new Set(["one", "not-visible"]), visible)).toBe(
            "some",
        );
        // No visible rows at all (e.g. every result filtered out) is "none",
        // never a vacuous "all".
        expect(selectionStatus(new Set(), [])).toBe("none");
        expect(selectionStatus(new Set(["one"]), [])).toBe("none");
    });

    it("should compute an age in days only from a result carrying an epoch", () => {
        withPinnedClock((now) => {
            expect(
                ageInDays({...results[0], epoch: undefined}),
            ).toBeUndefined();
            expect(ageInDays({...results[0], epoch: now})).toBe(0);
            expect(ageInDays({...results[0], epoch: now - 2 * 86_400})).toBe(2);
            // A future epoch (clock skew between the indexer and this host) is
            // clamped to "now" rather than reported as a negative age.
            expect(ageInDays({...results[0], epoch: now + 86_400})).toBe(0);
        });
    });

    it("should flag only results at most three days old as recent", () => {
        expect(RECENT_RESULT_MAX_AGE_DAYS).toBe(3);
        withPinnedClock((now) => {
            const atAge = (days: number) => ({
                ...results[0],
                epoch: now - Math.round(days * 86_400),
            });
            expect(isRecentResult(atAge(0))).toBe(true);
            expect(isRecentResult(atAge(2.9))).toBe(true);
            // Exactly at the threshold is still recent (the mock's `<= 3`).
            expect(isRecentResult(atAge(3))).toBe(true);
            expect(isRecentResult(atAge(3.1))).toBe(false);
            expect(isRecentResult(atAge(40))).toBe(false);
            // No epoch means no computable age, so never flagged -- the same
            // way an unknown age is treated by the age range filter.
            expect(isRecentResult({...results[0], epoch: undefined})).toBe(
                false,
            );
            // The threshold is overridable for callers that need a different
            // window, without changing the default the display preference uses.
            expect(isRecentResult(atAge(5), 7)).toBe(true);
        });
    });
});

// `ageInDays` reads `Date.now()` at sub-second precision, so an epoch derived
// from an unpinned `Math.floor(Date.now() / 1000)` lands a fraction of a day
// *past* the age it was meant to represent -- which would make the `<= 3`
// threshold's own boundary case untestable. Pinning the clock makes both exact.
function withPinnedClock(assertions: (nowInSeconds: number) => void): void {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));
    try {
        assertions(Math.floor(Date.now() / 1_000));
    } finally {
        vi.useRealTimers();
    }
}
