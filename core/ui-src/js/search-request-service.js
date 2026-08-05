angular
    .module('nzbhydraApp')
    .factory('SearchRequestFactory', SearchRequestFactory);

function SearchRequestFactory() {
    return {
        build: build,
        buildSavedSearch: buildSavedSearch
    };

    // Keep this JSON shape aligned with org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters.
    function build(parameters) {
        parameters = parameters || {};
        return {
            query: parameters.query,
            offset: parameters.offset,
            limit: parameters.limit,
            minsize: parameters.minsize,
            maxsize: parameters.maxsize,
            minage: parameters.minage,
            maxage: parameters.maxage,
            loadAll: parameters.loadAll === true,
            category: parameters.category,
            mode: parameters.mode,
            indexers: parameters.indexers,
            title: parameters.title,
            imdbId: parameters.imdbId,
            tmdbId: parameters.tmdbId,
            tvrageId: parameters.tvrageId,
            tvdbId: parameters.tvdbId,
            tvmazeId: parameters.tvmazeId,
            season: parameters.season,
            episode: parameters.episode,
            searchRequestId: isFinite(Number(parameters.searchRequestId)) ? Number(parameters.searchRequestId) : 0
        };
    }

    function buildSavedSearch(parameters) {
        return {request: build(parameters)};
    }
}
