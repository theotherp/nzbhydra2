import {describe, expect, it} from "vitest";

import {savedSearchCriteria} from "./savedSearchCriteria";

describe("savedSearchCriteria", () => {
    it("should round trip complete saved criteria through the canonical workspace shape", () => {
        expect(
            savedSearchCriteria(
                {
                    categoryName: "TV",
                    query: "extra",
                    title: "Show",
                    season: 2,
                    episode: "3",
                    minAge: 1,
                    maxAge: 4,
                    minSize: 10,
                    maxSize: 20,
                    identifiers: [
                        {identifierKey: "TVDB", identifierValue: "42"},
                    ],
                },
                {
                    categories: [category("All"), category("TV")],
                    defaultCategory: category("All"),
                    enableCategorySizes: false,
                    eligibleIndexers: () => [],
                    preselectedIndexerNames: () => [],
                },
            ),
        ).toEqual({
            category: "TV",
            query: "extra",
            title: "Show",
            season: "2",
            episode: "3",
            minage: "1",
            maxage: "4",
            minsize: "10",
            maxsize: "20",
            tvdbId: "42",
        });
    });
});

function category(name: string) {
    return {
        name,
        searchType: "SEARCH" as const,
        mayBeSelected: true,
        minSizePreset: undefined,
        maxSizePreset: undefined,
    };
}
