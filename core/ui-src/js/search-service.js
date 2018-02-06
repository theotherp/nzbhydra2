//
angular
  .module('nzbhydraApp')
  .factory('SearchService', SearchService);

function SearchService($http) {


  var lastExecutedQuery;
  var lastExecutedSearchRequestParameters;
  var lastResults;
  var modalInstance;

  return {
    search: search,
    getLastResults: getLastResults,
    loadMore: loadMore,
    getSearchState: getSearchState,
    getModalInstance: getModalInstance,
    setModalInstance: setModalInstance,
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
    var searchRequestParameters = {};
    searchRequestParameters.searchRequestId = searchRequestId;
    searchRequestParameters.query = query;
    searchRequestParameters.minsize = minsize;
    searchRequestParameters.maxsize = maxsize;
    searchRequestParameters.minage = minage;
    searchRequestParameters.maxage = maxage;
    searchRequestParameters.category = category;
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
        searchRequestParameters.tvrageid = metaData.rid;
        searchRequestParameters.tvmazeid = metaData.rid;
        searchRequestParameters.season = season;
        searchRequestParameters.episode = episode;
      }
    }

    lastExecutedQuery = uri;
    lastExecutedSearchRequestParameters = searchRequestParameters;
    return $http.post(uri.toString(), searchRequestParameters).then(processData);
  }

  function loadMore(offset, limit, loadAll) {
    lastExecutedSearchRequestParameters.offset = offset;
    lastExecutedSearchRequestParameters.limit = limit;
    lastExecutedSearchRequestParameters.loadAll = angular.isDefined(loadAll) ? loadAll : false;

    return $http.post(lastExecutedQuery.toString(), lastExecutedSearchRequestParameters).then(processData);
  }

  function getSearchState(searchRequestId) {
    return $http.get("internalapi/search/state", {
      params: {
        searchrequestid: searchRequestId
      }
    });
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
    // console.timeEnd("searchonly");
    return lastResults;
  }

  function getLastResults() {
    return lastResults;
  }
}
