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
        loadMore: loadMore,
        getMessages: getMessages
    };


    function search(searchRequestId, category, query, tmdbid, imdbId, title, tvdbId, rid, season, episode, minsize, maxsize, minage, maxage, indexers, mode) {
        var uri = new URI("internalapi/search");
        var searchRequestParameters = {};
        searchRequestParameters.searchRequestId = searchRequestId;
        searchRequestParameters.query = query;
        searchRequestParameters.title = title;
        searchRequestParameters.minsize = minsize;
        searchRequestParameters.maxsize = maxsize;
        searchRequestParameters.minage = minage;
        searchRequestParameters.maxage = maxage;
        searchRequestParameters.category = category;
        if (!angular.isUndefined(indexers) && indexers !== null) {
            searchRequestParameters.indexers = indexers.split("|");
        }

        if (category.indexOf("Movies") > -1 || (category.indexOf("20") === 0) || mode === "movie") {
            searchRequestParameters.tmdbId = tmdbid;
            searchRequestParameters.imdbId = imdbId;
        } else if (category.indexOf("TV") > -1 || (category.indexOf("50") === 0) || mode === "tvsearch") {
            searchRequestParameters.tvdbId = tvdbId;
            searchRequestParameters.tvrageId = rid;
            searchRequestParameters.season = season;
            searchRequestParameters.episode = episode;
        }

        lastExecutedQuery = uri;
        lastExecutedSearchRequestParameters = searchRequestParameters;
        return $http.post(uri.toString(), searchRequestParameters).then(processData);
    }

    function loadMore(offset, limit) {
        lastExecutedSearchRequestParameters.offset = offset;
        lastExecutedSearchRequestParameters.limit = limit;

        return $http.post(lastExecutedQuery.toString(), lastExecutedSearchRequestParameters).then(processData);
    }

    function getMessages(searchRequestId) {
        return $http.get("internalapi/search/messages", {params: {searchrequestid: searchRequestId}});
    }

    function processData(response) {
        var searchResults = response.data.searchResults;
        var indexerSearchMetaDatas = response.data.indexerSearchMetaDatas;
        var numberOfAvailableResults = response.data.numberOfAvailableResults;
        var numberOfRejectedResults = response.data.numberOfRejectedResults;
        var numberOfAcceptedResults = response.data.numberOfAcceptedResults;
        var numberOfProcessedResults = response.data.numberOfProcessedResults;
        var rejectedReasonsMap = response.data.rejectedReasonsMap;
        var notPickedIndexersWithReason = response.data.notPickedIndexersWithReason;

        lastResults = {
            "searchResults": searchResults,
            "indexerSearchMetaDatas": indexerSearchMetaDatas,
            "numberOfAvailableResults": numberOfAvailableResults,
            "numberOfAcceptedResults": numberOfAcceptedResults,
            "numberOfRejectedResults": numberOfRejectedResults,
            "numberOfProcessedResults": numberOfProcessedResults,
            "rejectedReasonsMap": rejectedReasonsMap,
            "notPickedIndexersWithReason": notPickedIndexersWithReason

        };
        return lastResults;
    }

    function getLastResults() {
        return lastResults;
    }
}