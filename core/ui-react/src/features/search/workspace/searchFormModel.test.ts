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

describe("valuesFromSearch size presets", () => {
    const presetCatalog = createCategoryCatalog({
        categoriesConfig: {
            categories: [
                {name: "All"},
                {name: "Movies", minSizePreset: 500, maxSizePreset: 20000},
            ],
            defaultCategory: "Movies",
            enableCategorySizes: true,
        },
        indexers: [{name: "Preselected", preselect: true}],
    });

    it("should prefill the preset when the URL is not an executed search", () => {
        const values = valuesFromSearch({}, presetCatalog);
        expect([values.minsize, values.maxsize]).toEqual(["500", "20000"]);
    });

    it("should leave the size empty when the URL is an executed search without one", () => {
        const values = valuesFromSearch(
            {
                category: "Movies",
                title: "Gladiator II",
                indexers: "Preselected",
            },
            presetCatalog,
        );
        expect([values.minsize, values.maxsize]).toEqual(["", ""]);
    });

    it("should leave the size empty when repeating a history search without one", () => {
        const values = valuesFromSearch(
            {category: "Movies", query: "gladiator", repeat: "history"},
            presetCatalog,
        );
        expect([values.minsize, values.maxsize]).toEqual(["", ""]);
    });

    it("should keep the sizes an executed search carries", () => {
        const values = valuesFromSearch(
            {category: "Movies", minsize: "100", indexers: "Preselected"},
            presetCatalog,
        );
        expect([values.minsize, values.maxsize]).toEqual(["100", ""]);
    });
});
