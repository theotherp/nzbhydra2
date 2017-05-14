angular
    .module('nzbhydraApp')
    .controller('SearchHistoryController', SearchHistoryController);


function SearchHistoryController($scope, $state, SearchHistoryService, ConfigService, history, $sce, $filter) {
    $scope.limit = 100;
    $scope.pagination = {
        current: 1
    };
    $scope.sortModel = {
        column: "time",
        sortMode: 2
    };
    $scope.filterModel = {};

    //Filter options
    $scope.categoriesForFiltering = [];
    _.forEach(ConfigService.getSafe().categoriesConfig.categories, function (category) {
        $scope.categoriesForFiltering.push({label: category.name, id: category.name})
    });
    $scope.preselectedTimeInterval = {beforeDate: null, afterDate: null};
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: 'API'}, {label: "Internal", value: 'INTERNAL'}];

    //Preloaded data
    $scope.searchRequests = history.data.content;
    $scope.totalRequests = history.data.totalElements;

    $scope.update = function () {
        SearchHistoryService.getSearchHistory($scope.pagination.current, $scope.limit, $scope.filterModel, $scope.sortModel).then(function (history) {
            $scope.searchRequests = history.data.content;
            $scope.totalRequests = history.data.totalElements;
        });
    };

    $scope.$on("sort", function (event, column, sortMode) {
        if (sortMode === 0) {
            column = "time";
            sortMode = 2;
        }
        $scope.sortModel = {
            column: column,
            sortMode: sortMode
        };
        $scope.$broadcast("newSortColumn", column);
        $scope.update();
    });

    $scope.$on("filter", function (event, column, filterModel, isActive) {
        if (filterModel.filterValue) {
            $scope.filterModel[column] = filterModel;
        } else {
            delete $scope.filterModel[column];
        }
        $scope.update();
    });


    var keysToParams = {
        "IMDB": "imdbid",
        "TMDB": "tmdbid",
        "TVRAGE": "tvrageid",
        "TVDB": "tvdbid",
        "TVMAZE": "tvmazeid"
    };

    $scope.openSearch = function (request) {
        var stateParams = {};
        for (var i = 0; i < request.identifiers.length; i++) {
            if (request.identifiers[i].identifierKey in keysToParams) {
                var key = keysToParams[request.identifiers[i].identifierKey];
                stateParams[key] = request.identifiers[i].identifierValue;
            }
        }
        if (request.query) {
            stateParams.query = request.query;
        }
        stateParams.mode = request.searchType.toLowerCase();

        if (request.title) {
            stateParams.title = request.title;
        }

        stateParams.category = request.category;

        $state.go("root.search", stateParams, {inherit: false});
    };

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
            var value
            var pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TMDB"
            });
            if (angular.isDefined(pair)) {
                key = "TMDB ID";
                href = "https://www.themoviedb.org/movie/" + pair.identifierValue;
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "IMDB"
            });
            if (angular.isDefined(pair)) {
                key = "IMDB ID";
                href = "https://www.imdb.com/title/tt" + pair.identifierValue;
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TVDB"
            });
            if (angular.isDefined(pair)) {
                key = "TVDB ID";
                href = "https://thetvdb.com/?tab=series&id=" + pair.identifierValue;
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TVRAGE"
            });
            if (angular.isDefined(pair)) {
                key = "TVRage ID";
                href = "internalapi/redirect_rid?rid=" + pair.identifierValue; //TODO
                value = pair.identifierValue;
            }

            href = $filter("dereferer")(href);
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
        if (request.title) {
            result.push("Title: " + request.title);
        }
        return $sce.trustAsHtml(result.join(", "));
    };


}
