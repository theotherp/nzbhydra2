//
angular
    .module('nzbhydraApp')
    .factory('SearchService', SearchService);

function SearchService($http, SearchRequestFactory) {


    var lastExecutedQuery;
    var lastExecutedSearchRequestParameters;
    var lastResults;
    var modalInstance;

    return {
        search: search,
        getLastResults: getLastResults,
        loadMore: loadMore,
        shortcutSearch: shortcutSearch,
        getModalInstance: getModalInstance,
        setModalInstance: setModalInstance,
        getLastExecutedSearchRequestParameters: getLastExecutedSearchRequestParameters,
    };

    function getModalInstance() {
        return modalInstance;
    }

    function setModalInstance(mi) {
        modalInstance = mi;
    }

    function search(searchRequestId, category, query, metaData, season, episode, minsize, maxsize, minage, maxage, indexers, mode) {
        // console.time("search");
        var uri = new URI("internalapi/search");
        var searchRequestParameters = {
            searchRequestId: searchRequestId,
            query: query,
            minsize: minsize,
            maxsize: maxsize,
            minage: minage,
            maxage: maxage,
            category: category,
            mode: mode,
            loadAll: false
        };

        if (!angular.isUndefined(indexers) && indexers !== null) {
            searchRequestParameters.indexers = indexers.split(",");
        }

        if (metaData) {
            searchRequestParameters.title = metaData.title;
            if (category.indexOf("Movies") > -1 || (category.indexOf("20") === 0) || mode === "movie") {
                searchRequestParameters.tmdbId = metaData.tmdbId;
                searchRequestParameters.imdbId = metaData.imdbId;
            } else if (category.indexOf("TV") > -1 || (category.indexOf("50") === 0) || mode === "tvsearch") {
                searchRequestParameters.tvdbId = metaData.tvdbId;
                searchRequestParameters.imdbId = metaData.imdbId;
                searchRequestParameters.tvrageId = metaData.rid;
                searchRequestParameters.tvmazeId = metaData.tvmazeId;
                searchRequestParameters.season = season;
                searchRequestParameters.episode = episode;
            }
        }

        searchRequestParameters = SearchRequestFactory.build(searchRequestParameters);
        lastExecutedQuery = uri;
        lastExecutedSearchRequestParameters = searchRequestParameters;
        return $http.post(uri.toString(), searchRequestParameters).then(processData);
    }

    function loadMore(offset, limit, loadAll) {
        var params = SearchRequestFactory.build(angular.extend({}, lastExecutedSearchRequestParameters, {
            offset: offset,
            limit: limit,
            loadAll: angular.isDefined(loadAll) ? loadAll : false
        }));

        return $http.post(lastExecutedQuery.toString(), params).then(processData);
    }

    function shortcutSearch(searchRequestId) {
        return $http.post("internalapi/shortcutSearch/" + searchRequestId);
    }

    function processData(response) {
        var searchResults = response.data.searchResults;
        var indexerSearchMetaDatas = response.data.indexerSearchMetaDatas;
        var indexerLimitWarnings = response.data.indexerLimitWarnings;
        var numberOfAvailableResults = response.data.numberOfAvailableResults;
        var numberOfRejectedResults = response.data.numberOfRejectedResults;
        var numberOfDuplicateResults = response.data.numberOfDuplicateResults;
        var numberOfAcceptedResults = response.data.numberOfAcceptedResults;
        var numberOfProcessedResults = response.data.numberOfProcessedResults;
        var rejectedReasonsMap = response.data.rejectedReasonsMap;
        var notPickedIndexersWithReason = response.data.notPickedIndexersWithReason;
        var offset = response.data.offset;
        var limit = response.data.limit;

        lastResults = {
            "searchResults": searchResults,
            "indexerSearchMetaDatas": indexerSearchMetaDatas,
            "indexerLimitWarnings": indexerLimitWarnings,
            "numberOfAvailableResults": numberOfAvailableResults,
            "numberOfAcceptedResults": numberOfAcceptedResults,
            "numberOfRejectedResults": numberOfRejectedResults,
            "numberOfProcessedResults": numberOfProcessedResults,
            "numberOfDuplicateResults": numberOfDuplicateResults,
            "rejectedReasonsMap": rejectedReasonsMap,
            "notPickedIndexersWithReason": notPickedIndexersWithReason,
            "offset": offset,
            "limit": limit

        };
        // console.timeEnd("searchonly");
        return lastResults;
    }

    function getLastResults() {
        return lastResults;
    }

    function getLastExecutedSearchRequestParameters() {
        return lastExecutedSearchRequestParameters;
    }
}
