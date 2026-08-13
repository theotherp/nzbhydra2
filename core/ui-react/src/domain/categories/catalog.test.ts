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
});
