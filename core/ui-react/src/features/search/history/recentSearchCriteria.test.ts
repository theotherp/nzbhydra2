import {describe, expect, it} from "vitest";

import {createCategoryCatalog} from "../../../domain/categories/catalog";
import {recentSearchCriteria} from "./recentSearchCriteria";

const catalog = createCategoryCatalog({
    categoriesConfig: {
        categories: [{name: "All"}, {name: "Movies"}],
        defaultCategory: "All",
        enableCategorySizes: true,
    },
    indexers: [
        {name: "Eligible", preselect: true},
        {name: "Unavailable", categories: ["Other"]},
    ],
});

describe("recentSearchCriteria", () => {
    it("should transform every supported present criterion", () => {
        expect(
            recentSearchCriteria(
                {
                    categoryName: "Movies",
                    query: "additional",
                    title: "Movie",
                    season: 2,
                    episode: "3",
                    minAge: 1,
                    maxAge: 2,
                    minSize: 3,
                    maxSize: 4,
                    selectedIndexers: ["Eligible", "Unavailable"],
                    identifiers: [
                        {identifierKey: "IMDB", identifierValue: "tt1"},
                        {identifierKey: "TMDB", identifierValue: "2"},
                        {identifierKey: "TVDB", identifierValue: "3"},
                        {identifierKey: "TVMAZE", identifierValue: "4"},
                        {identifierKey: "TVRAGE", identifierValue: "5"},
                    ],
                },
                catalog,
            ),
        ).toEqual({
            category: "Movies",
            query: "additional",
            title: "Movie",
            season: "2",
            episode: "3",
            minage: "1",
            maxage: "2",
            minsize: "3",
            maxsize: "4",
            indexers: "Eligible,Unavailable",
            imdbId: "tt1",
            tmdbId: "2",
            tvdbId: "3",
            tvmazeId: "4",
            tvrageId: "5",
        });
    });

    it("should omit absent criteria so existing canonical defaults apply", () => {
        expect(
            recentSearchCriteria(
                {categoryName: "Movies", identifiers: []},
                catalog,
            ),
        ).toEqual({category: "Movies"});
    });
});
