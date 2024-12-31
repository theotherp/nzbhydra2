angular
    .module('nzbhydraApp')
    .factory('SearchHistoryService', SearchHistoryService);

function SearchHistoryService($filter, $http) {

    return {
        getSearchHistory: getSearchHistory,
        getSearchHistoryForSearching: getSearchHistoryForSearching,
        formatRequest: formatRequest,
        getStateParamsForRepeatedSearch: getStateParamsForRepeatedSearch
    };

    function getSearchHistoryForSearching() {
        return $http.post("internalapi/history/searches/forsearching").then(function (response) {
            return {
                searchRequests: response.data
            }
        });
    }

    function getSearchHistory(pageNumber, limit, filterModel, sortModel, distinct, onlyCurrentUser) {
        var params = {
            page: pageNumber,
            limit: limit,
            filterModel: filterModel,
            distinct: distinct,
            onlyCurrentUser: onlyCurrentUser
        };
        if (angular.isUndefined(pageNumber)) {
            params.page = 1;
        }
        if (angular.isUndefined(limit)) {
            params.limit = 100;
        }
        if (angular.isUndefined(filterModel)) {
            params.filterModel = {}
        }
        if (!angular.isUndefined(sortModel)) {
            params.sortModel = sortModel;
        } else {
            params.sortModel = {
                column: "time",
                sortMode: 2
            };
        }
        return $http.post("internalapi/history/searches", params).then(function (response) {
            return {
                searchRequests: response.data.content,
                totalRequests: response.data.totalElements
            }
        });
    }

    function formatRequest(request, includeIdLink, includequery, describeEmptySearch, includeTitle) {
        var result = [];
        result.push('<span class="history-title">Category: </span>' + request.categoryName);
        if (includequery && request.query) {
            result.push('<span class="history-title">Query: </span>' + request.query);
        }
        if (request.title && includeTitle) {
            result.push('<span class="history-title">Title: </span>' + request.title);
        } //Only include identifiers if title is unknown
        else if (request.identifiers.length > 0) {
            var href;
            var key;
            var value;
            var identifiers = _.indexBy(request.identifiers, 'identifierKey');
            if ("IMDB" in identifiers) {
                key = "IMDB ID";
                value = identifiers.IMDB.identifierValue;
                href = "https://www.imdb.com/title/tt" + value;
            } else if ("TVDB" in identifiers) {
                key = "TVDB ID";
                value = identifiers.TVDB.identifierValue;
                href = "https://thetvdb.com/?tab=series&id=" + value;
            } else if ("TVRAGE" in identifiers) {
                key = "TVRage ID";
                value = identifiers.TVRAGE.identifierValue;
                href = "internalapi/redirect_rid?rid=" + value;
            } else if ("TMDB" in identifiers) {
                key = "TMDB ID";
                value = identifiers.TMDB.identifierValue;
                href = "https://www.themoviedb.org/movie/" + value;
            }
            href = $filter("dereferer")(href);
            if (includeIdLink) {
                result.push('<span class="history-title">' + key + ': </span><a target="_blank" href="' + href + '">' + value + "</a>");
            } else {
                result.push('<span class="history-title">' + key + ": </span>" + value);
            }
        }
        if (request.season) {
            result.push('<span class="history-title">Season: </span>' + request.season);
        }
        if (request.episode) {
            result.push('<span class="history-title">Episode: </span>' + request.episode);
        }
        if (request.author) {
            result.push('<span class="history-title">Author: </span>' + request.author);
        }
        if (result.length === 0 && describeEmptySearch) {
            result = ['<span class="history-title">Empty search</span>'];
        }

        return result.join(", ");

    }

    function getStateParamsForRepeatedSearch(request) {
        var stateParams = {};
        stateParams.mode = "search";
        var availableIdentifiers = _.pluck(request.identifiers, "identifierKey");
        if (request.searchType === "MOVIE") {
            stateParams.mode = "movie";
        } else if (request.searchType === "TVSEARCH") {
            stateParams.mode = "tvsearch";
        }
        if (request.season) {
            stateParams.season = request.season;
        }
        if (request.episode) {
            stateParams.episode = request.episode;
        }

        _.each(request.identifiers, function (entry) {
            switch (entry.identifierKey) {
                case "TMDB":
                    stateParams.tmdbId = entry.identifierValue;
                    break;
                case "IMDB":
                    stateParams.imdbId = entry.identifierValue;
                    break;
                case "TVMAZE":
                    stateParams.tvmazeId = entry.identifierValue;
                    break;
                case "TVRAGE":
                    stateParams.tvrageId = entry.identifierValue;
                    break;
                case "TVDB":
                    stateParams.tvdbId = entry.identifierValue;
                    break;
            }
        });


        if (request.query !== "") {
            stateParams.query = request.query;
        }

        if (request.title) {
            stateParams.title = request.title;
        }

        if (request.categoryName) {
            stateParams.category = request.categoryName;
        }

        return stateParams;
    }


}