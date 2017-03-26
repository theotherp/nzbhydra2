//
angular
    .module('nzbhydraApp')
    .factory('SearchService', SearchService);

function SearchService($http) {


    var lastExecutedQuery;
    var lastExecutedSearchRequestParameters;
    var lastResults;

    return {
        search: search,
        getLastResults: getLastResults,
        loadMore: loadMore
    };


    function search(category, query, tmdbid, imdbid, title, tvdbid, rid, season, episode, minsize, maxsize, minage, maxage, indexers, mode) {
        var uri;
        var searchRequestParameters = {};
        searchRequestParameters.query = query;
        searchRequestParameters.title = title;
        searchRequestParameters.minsize = minsize;
        searchRequestParameters.maxsize = maxsize;
        searchRequestParameters.minage = minage;
        searchRequestParameters.maxage = maxage;
        if (!angular.isUndefined(indexers) && indexers !== null) {
            searchRequestParameters.indexers = indexers.split(",");
        }

        searchRequestParameters.category = category;

        if (category.indexOf("Movies") > -1 || (category.indexOf("20") == 0) || mode == "movie") {
            uri = new URI("internalapi/search/movie");

            searchRequestParameters.tmdbId = tmdbid;
            searchRequestParameters.imdbId = imdbid;

        } else if (category.indexOf("TV") > -1 || (category.indexOf("50") == 0) || mode == "tvsearch") {
            uri = new URI("internalapi/search/tv");

            searchRequestParameters.tvdbId = tvdbid;
            searchRequestParameters.tvrageId = rid;
            searchRequestParameters.season = season;
            searchRequestParameters.episode = episode;
        } else {
            uri = new URI("internalapi/search");
        }

        lastExecutedQuery = uri;
        lastExecutedSearchRequestParameters = searchRequestParameters;
        return $http.post(uri.toString(), searchRequestParameters).then(processData);
    }

    function loadMore(offset, loadAll) {
        lastExecutedSearchRequestParameters.offset = offset;
        lastExecutedSearchRequestParameters.loadAll = loadAll;

        return $http.post(lastExecutedQuery.toString(), lastExecutedSearchRequestParameters).then(processData); //TODO: loadMore/loadAll: see above
    }

    function processData(response) {
        var searchResults = response.data.searchResults;
        var indexerSearchMetaDatas = response.data.indexerSearchMetaDatas;
        var numberOfAvailableResults = response.data.numberOfAvailableResults;
        var numberOfRejectedResults = response.data.numberOfRejectedResults;
        var numberOfResults = response.data.numberOfResults;
        var rejectedReasonsMap = response.data.rejectedReasonsMap


        lastResults = {
            "searchResults": searchResults,
            "indexerSearchMetaDatas": indexerSearchMetaDatas,
            "numberOfAvailableResults": numberOfAvailableResults,
            "numberOfResults": numberOfResults,
            "numberOfRejectedResults": numberOfRejectedResults,
            "rejectedReasonsMap": rejectedReasonsMap
        };
        return lastResults;
    }

    function getLastResults() {
        return lastResults;
    }
}