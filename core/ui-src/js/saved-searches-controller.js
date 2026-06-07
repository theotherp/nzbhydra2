/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

angular
    .module('nzbhydraApp')
    .controller('SavedSearchesController', SavedSearchesController);

function SavedSearchesController($scope, $http, $sce, $filter, SearchHistoryService, $httpParamSerializer, $window) {
    $scope.savedSearches = [];

    function formatRange(min, max, unit, suffix) {
        var formattedValue = function (value) {
            return value + unit + (value === 1 ? "" : "s");
        };

        if (min && max) {
            return min + "-" + max + unit + "s" + suffix;
        }
        if (min) {
            return "Min " + formattedValue(min) + suffix;
        }
        if (max) {
            return "Max " + formattedValue(max) + suffix;
        }
    }

    $http.get("internalapi/savedsearches").then(function (response) {
        $scope.savedSearches = response.data || [];
    });

    $scope.formatQuery = function (request) {
        if (request.title) {
            return request.title;
        }

        if (!request.query && request.identifiers.length === 0 && !request.season && !request.episode) {
            return "Update query";
        }
        return request.query;
    };

    $scope.formatAdditional = function (request) {
        var result = [];
        if (request.identifiers.length > 0) {
            var href;
            var key;
            var value;
            var pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TMDB"
            });
            if (angular.isDefined(pair)) {
                key = "TMDB ID";
                href = "https://www.themoviedb.org/movie/" + pair.identifierValue;
                href = $filter("dereferer")(href);
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "IMDB"
            });
            if (angular.isDefined(pair)) {
                key = "IMDB ID";
                href = ("https://www.imdb.com/title/tt" + pair.identifierValue).replace("tttt", "tt");
                href = $filter("dereferer")(href);
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TVDB"
            });
            if (angular.isDefined(pair)) {
                key = "TVDB ID";
                href = "https://thetvdb.com/?tab=series&id=" + pair.identifierValue;
                href = $filter("dereferer")(href);
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TVMAZE"
            });
            if (angular.isDefined(pair)) {
                key = "TVMAZE ID";
                href = "https://www.tvmaze.com/shows/" + pair.identifierValue;
                href = $filter("dereferer")(href);
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TVRAGE"
            });
            if (angular.isDefined(pair)) {
                key = "TVRage ID";
                href = "internalapi/redirectRid/" + pair.identifierValue;
                value = pair.identifierValue;
            }

            result.push(key + ": " + '<a target="_blank" href="' + href + '">' + value + "</a>");
        }
        if (request.season) {
            result.push("Season: " + request.season);
        }
        if (request.episode) {
            result.push("Episode: " + request.episode);
        }
        if (request.author) {
            result.push("Author: " + request.author);
        }
        var ageRange = formatRange(request.minAge, request.maxAge, " day", " old");
        if (ageRange) {
            result.push(ageRange);
        }
        var sizeRange = formatRange(request.minSize, request.maxSize, "MB", "");
        if (sizeRange) {
            result.push(sizeRange);
        }

        return $sce.trustAsHtml(result.join(", "));
    };

    $scope.deleteSearch = function (index) {
        $http.delete("internalapi/savedsearches/" + index).then(function () {
            $scope.savedSearches.splice(index, 1);
        });
    };

    $scope.buildSearchLink = function (request) {
        var params = SearchHistoryService.getStateParamsForRepeatedSearch(request);
        var cleanedParams = {};
        _.each(params, function (value, key) {
            if (!_.isUndefined(value) && value !== null && value !== "") {
                cleanedParams[key] = value;
            }
        });
        var queryString = $httpParamSerializer(cleanedParams);
        var baseElement = $window.document.getElementsByTagName('base')[0];
        var baseHref = baseElement ? baseElement.getAttribute('href') : '';
        if (baseHref && baseHref.charAt(baseHref.length - 1) !== '/') {
            baseHref += '/';
        }
        if (!queryString) {
            return baseHref;
        }
        return baseHref + '?' + queryString;
    };
}
