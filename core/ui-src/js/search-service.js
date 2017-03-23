//
angular
    .module('nzbhydraApp')
    .factory('SearchService', SearchService);

function SearchService($http) {


    var lastExecutedQuery;
    var lastResults;

    return {
        search: search,
        getLastResults: getLastResults,
        loadMore: loadMore
    };


    function search(category, query, tmdbid, imdbid, title, tvdbid, rid, season, episode, minsize, maxsize, minage, maxage, indexers, mode) {
        var uri;
        if (category.indexOf("Movies") > -1 || (category.indexOf("20") == 0) || mode == "movie") {
            uri = new URI("internalapi/moviesearch");
            if (angular.isDefined(tmdbid)) {
                uri.addQuery("tmdbid", tmdbid);
            } else if (angular.isDefined(imdbid)) {
                uri.addQuery("imdbid", imdbid);
            } else {
                uri.addQuery("query", query);
            }

        } else if (category.indexOf("TV") > -1 || (category.indexOf("50") == 0) || mode == "tvsearch") {
            uri = new URI("internalapi/tvsearch");
            if (angular.isDefined(tvdbid)) {
                uri.addQuery("tvdbid", tvdbid);
            }
            if (angular.isDefined(rid)) {
                uri.addQuery("rid", rid);
            } else {
                uri.addQuery("query", query);
            }

            if (angular.isDefined(season)) {
                uri.addQuery("season", season);
            }
            if (angular.isDefined(episode)) {
                uri.addQuery("episode", episode);
            }
        } else {
            uri = new URI("internalapi/search");
            uri.addQuery("query", query);
        }
        if (angular.isDefined(title)) {
            uri.addQuery("title", title);
        }
        if (_.isNumber(minsize)) {
            uri.addQuery("minsize", minsize);
        }
        if (_.isNumber(maxsize)) {
            uri.addQuery("maxsize", maxsize);
        }
        if (_.isNumber(minage)) {
            uri.addQuery("minage", minage);
        }
        if (_.isNumber(maxage)) {
            uri.addQuery("maxage", maxage);
        }
        if (!angular.isUndefined(indexers)) {
            uri.addQuery("indexers", decodeURIComponent(indexers));
        }


        uri.addQuery("category", category);
        lastExecutedQuery = uri;
        return $http.get(uri.toString()).then(processData);

    }

    function loadMore(offset, loadAll) {
        lastExecutedQuery.removeQuery("offset");
        lastExecutedQuery.addQuery("offset", offset);
        lastExecutedQuery.addQuery("loadAll", loadAll ? true : false);

        return $http.get(lastExecutedQuery.toString()).then(processData);
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