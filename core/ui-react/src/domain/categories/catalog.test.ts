import {describe, expect, it} from "vitest";

import {createCategoryCatalog} from "./catalog";

describe("createCategoryCatalog", () => {
    it("should preserve validated backend search types", () => {
        const catalog = createCategoryCatalog({
            categoriesConfig: {
                categories: [
                    {name: "Everything", searchType: "SEARCH"},
                    {name: "Cinema", searchType: "MOVIE"},
                    {name: "Series", searchType: "TVSEARCH"},
                ],
                defaultCategory: "Everything",
            },
        });

        expect(catalog.categories).toEqual(
            expect.arrayContaining([
                expect.objectContaining({name: "Cinema", searchType: "MOVIE"}),
                expect.objectContaining({
                    name: "Series",
                    searchType: "TVSEARCH",
                }),
            ]),
        );
    });

    it("should reject an invalid backend search type", () => {
        const catalog = createCategoryCatalog({
            categoriesConfig: {
                categories: [{name: "Cinema", searchType: "MOVIES"}],
                defaultCategory: "Cinema",
            },
        });

        expect(catalog.defaultCategory).toMatchObject({
            name: "All",
            searchType: "SEARCH",
        });
    });

    it("should expose only eligible search indexers with their selection metadata", () => {
        const catalog = createCategoryCatalog({
            categoriesConfig: {
                categories: [{name: "All"}, {name: "Movies"}],
                defaultCategory: "All",
            },
            indexers: [
                {
                    name: "Movies only",
                    categories: ["Movies"],
                    groupNames: ["Movies", ""],
                    searchModuleType: "TORZNAB",
                },
                {name: "Hidden", showOnSearch: false, preselect: true},
                {name: "General", preselect: true},
            ],
        });

        expect(catalog.eligibleIndexers("All")).toEqual([
            {
                name: "General",
                preselect: true,
                groupNames: [],
                searchModuleType: "NEWZNAB",
            },
            {
                name: "Movies only",
                preselect: false,
                groupNames: ["Movies"],
                searchModuleType: "TORZNAB",
            },
        ]);
        expect(
            catalog.eligibleIndexers("Movies").map((indexer) => indexer.name),
        ).toEqual(["General", "Movies only"]);
        expect(catalog.preselectedIndexerNames("Movies")).toEqual(["General"]);
    });
});
