import type {RecentSearch} from "../../../api/recentSearches";
import type {CategoryCatalog} from "../../../domain/categories/catalog";

export function recentSearchCriteria(
    search: RecentSearch,
    catalog: CategoryCatalog,
): Record<string, string> {
    const criteria: Record<string, string> = {category: search.categoryName};
    if (
        !catalog.categories.some(
            (category) => category.name === search.categoryName,
        )
    ) {
        criteria.category = catalog.defaultCategory.name;
    }
    if (search.query) criteria.query = search.query;
    if (search.title) criteria.title = search.title;
    if (search.season !== undefined) criteria.season = search.season.toString();
    if (search.episode) criteria.episode = search.episode;
    if (search.minAge !== undefined) criteria.minage = search.minAge.toString();
    if (search.maxAge !== undefined) criteria.maxage = search.maxAge.toString();
    if (search.minSize !== undefined)
        criteria.minsize = search.minSize.toString();
    if (search.maxSize !== undefined)
        criteria.maxsize = search.maxSize.toString();
    if (search.selectedIndexers !== undefined) {
        criteria.indexers = search.selectedIndexers.join(",");
    }
    for (const identifier of search.identifiers) {
        const field = identifierFields[identifier.identifierKey];
        if (field) criteria[field] = identifier.identifierValue;
    }
    return criteria;
}

const identifierFields: Record<string, string> = {
    IMDB: "imdbId",
    TMDB: "tmdbId",
    TVDB: "tvdbId",
    TVMAZE: "tvmazeId",
    TVRAGE: "tvrageId",
};
