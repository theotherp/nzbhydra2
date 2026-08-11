import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {createCategoryCatalog} from "../../../domain/categories/catalog";
import {
    canonicalSearch,
    SearchWorkspace,
    valuesFromSearch,
} from "./SearchWorkspace";

const catalog = createCategoryCatalog({
    categoriesConfig: {
        defaultCategory: "All",
        enableCategorySizes: true,
        categories: [
            {name: "All", minSizePreset: 10, maxSizePreset: 100},
            {name: "Movies", minSizePreset: 20, maxSizePreset: 200},
        ],
    },
    indexers: [{name: "Mock", preselect: true}],
});

describe("SearchWorkspace", () => {
    it("should restore canonical URL values and category size presets", () => {
        expect(
            valuesFromSearch(
                {query: "hello", category: "Movies", minage: "2"},
                catalog,
            ),
        ).toEqual({
            query: "hello",
            category: "Movies",
            minage: "2",
            maxage: "",
            minsize: "20",
            maxsize: "200",
        });
        expect(
            canonicalSearch({
                query: "hello",
                category: "Movies",
                minage: "",
                maxage: "",
                minsize: "",
                maxsize: "",
            }),
        ).toEqual({query: "hello", category: "Movies"});
    });

    it("should submit valid numeric criteria", async () => {
        const submitted = vi.fn();
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({}, catalog)}
                onSubmit={submitted}
            />,
        );
        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "hello"},
        });
        fireEvent.change(screen.getByLabelText("Minimum age (days)"), {
            target: {value: "3"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() =>
            expect(submitted.mock.calls[0]?.[0]).toEqual(
                expect.objectContaining({query: "hello", minage: "3"}),
            ),
        );
    });
});
