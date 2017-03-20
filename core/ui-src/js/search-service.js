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
        var results = response.data.results;
        var indexersearches = response.data.indexersearches;
        var total = response.data.total;
        var rejected = response.data.rejected;
        var resultsCount = results.length;


        //Sum up response times of indexers from individual api accesses
        //TODO: Move this to search result controller because we need to update it every time we loaded more results
        _.each(indexersearches, function (ps) {
            if (ps.did_search) {
                ps.averageResponseTime = _.reduce(ps.apiAccesses, function (memo, rp) {
                    return memo + rp.response_time;
                }, 0);
                ps.averageResponseTime = ps.averageResponseTime / ps.apiAccesses.length;
            }
        });

        lastResults = {"results": results, "indexersearches": indexersearches, "total": total, "resultsCount": resultsCount, "rejected": rejected};
        return lastResults;
    }

    function getLastResults() {
        return lastResults;
    }
}