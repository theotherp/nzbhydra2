import {describe, expect, it} from "vitest";

import {
    categoryDraftFieldPath,
    categorySearchTypeLabel,
    categorySizeSummary,
    CATEGORY_DRAFT_PATH,
    defaultCategoryEntry,
    newznabCategoryValidator,
    type CategoryValues,
} from "./categoriesSettings";

function category(overrides: Partial<CategoryValues>): CategoryValues {
    return {...defaultCategoryEntry(), ...overrides};
}

describe("F-CONFIG-CATEGORIES newznab category shape", () => {
    /**
     * The shape `NewznabCategoriesDeserializer` parses -- `Splitter.on("&")`
     * then `Integer::valueOf` -- narrowed to digits only.
     */
    it.each(["2010", "2010&11000", "0", "1&2&3"])(
        "should accept %s",
        (token) => {
            expect(newznabCategoryValidator(token)).toBe(true);
        },
    );

    it.each([
        "2010&",
        "&2010",
        "abc",
        "2010,3000",
        "2010 11000",
        "2010&&11000",
        "20.10",
        "",
        " 2010",
    ])("should refuse %s", (token) => {
        expect(newznabCategoryValidator(token)).not.toBe(true);
    });

    /**
     * The one case where the client is stricter than the backend on purpose:
     * `Integer.valueOf("-5")` succeeds, but a newznab category is never
     * negative. Refusing it at entry is a narrowing; the stored value is still
     * kept and flagged elsewhere, never dropped.
     */
    it("should refuse a negative number the backend would parse", () => {
        expect(newznabCategoryValidator("-5")).not.toBe(true);
    });

    it("should name the offending token and the accepted shape", () => {
        expect(newznabCategoryValidator("2010,3000")).toBe(
            '"2010,3000" is not a newznab category. Use a number, or several joined with "&" (for example 2010&11000).',
        );
    });
});

describe("F-CONFIG-CATEGORIES dialog draft path", () => {
    it("should build a draft field's path from the shared draft path", () => {
        expect(CATEGORY_DRAFT_PATH).toBe("categoriesConfig.categoryDraft");
        expect(categoryDraftFieldPath("name")).toBe(
            "categoriesConfig.categoryDraft.name",
        );
        expect(categoryDraftFieldPath("minSizePreset")).toBe(
            "categoriesConfig.categoryDraft.minSizePreset",
        );
    });
});

describe("F-CONFIG-CATEGORIES row summaries", () => {
    it("should label a search type as the Search type select spells it", () => {
        expect(
            categorySearchTypeLabel(category({searchType: "TVSEARCH"})),
        ).toBe("TV");
        expect(categorySearchTypeLabel(category({searchType: "SEARCH"}))).toBe(
            "General",
        );
    });

    it("should show an unknown search type as itself rather than as nothing", () => {
        expect(
            categorySearchTypeLabel({
                ...defaultCategoryEntry(),
                searchType: "COMIC" as CategoryValues["searchType"],
            }),
        ).toBe("COMIC");
    });

    it("should summarize a size preset, both ends and either end alone", () => {
        expect(
            categorySizeSummary(
                category({maxSizePreset: 2000, minSizePreset: 1}),
            ),
        ).toBe("1–2000 MB");
        expect(categorySizeSummary(category({minSizePreset: 10}))).toBe(
            "from 10 MB",
        );
        expect(categorySizeSummary(category({maxSizePreset: 250}))).toBe(
            "up to 250 MB",
        );
        expect(categorySizeSummary(category({}))).toBeNull();
    });
});
