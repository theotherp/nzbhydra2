import {describe, expect, it} from "vitest";

import {createCategoryCatalog} from "../../../domain/categories/catalog";
import {valuesFromSearch} from "./searchFormModel";

const catalog = createCategoryCatalog({
    categoriesConfig: {
        categories: [{name: "All"}, {name: "Movies"}],
        defaultCategory: "All",
        enableCategorySizes: false,
    },
    indexers: [
        {name: "Preselected", preselect: true},
        {name: "Optional", preselect: false},
        {name: "Unavailable", categories: ["Other"]},
    ],
});

describe("valuesFromSearch", () => {
    it("should keep only the eligible indexers of a selection", () => {
        expect(
            valuesFromSearch(
                {category: "Movies", indexers: "Optional,Unavailable"},
                catalog,
            ).indexers,
        ).toEqual(["Optional"]);
    });

    it("should use the preselected indexers when none of a selection is eligible anymore", () => {
        expect(
            valuesFromSearch(
                {category: "Movies", indexers: "Unavailable,Removed"},
                catalog,
            ).indexers,
        ).toEqual(["Preselected"]);
    });

    it("should keep an explicitly empty selection empty", () => {
        expect(
            valuesFromSearch({category: "Movies", indexers: ""}, catalog)
                .indexers,
        ).toEqual([]);
    });

    it("should keep an explicitly empty selection empty", () => {
        expect(
            valuesFromSearch({category: "Movies", indexers: ""}, catalog)
                .indexers,
        ).toEqual([]);
    });
});
