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
    _.forEach(ConfigService.getSafe().categories, function (category) {
        $scope.categoriesForFiltering.push({label: category.pretty, id: category.pretty})
    });
    $scope.preselectedTimeInterval = {beforeDate: null, afterDate: null};
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: false}, {label: "Internal", value: true}];

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
        if (sortMode == 0) {
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


    $scope.openSearch = function (request) {
        var stateParams = {};
        if (request.identifier_key == "imdbid") {
            stateParams.imdbid = request.identifier_value;
        } else if (request.identifier_key == "tvdbid" || request.identifier_key == "rid") {
            if (request.identifier_key == "rid") {
                stateParams.rid = request.identifier_value;
            } else {
                stateParams.tvdbid = request.identifier_value;
            }

            if (request.season != "") {
                stateParams.season = request.season;
            }
            if (request.episode != "") {
                stateParams.episode = request.episode;
            }
        }
        if (request.query != "") {
            stateParams.query = request.query;
        }
        if (request.type == "tv") {
            stateParams.mode = "tvsearch"
        } else if (request.type == "movie") {
            stateParams.mode = "movie"
        } else {
            stateParams.mode = "search"
        }

        if (request.movietitle != null) {
            stateParams.title = request.movietitle;
        }
        if (request.tvtitle != null) {
            stateParams.title = request.tvtitle;
        }

        if (request.category) {
            stateParams.category = request.category;
        }

        stateParams.category = request.category;

        $state.go("root.search", stateParams, {inherit: false});
    };

    $scope.formatQuery = function (request) {
        if (request.movietitle != null) {
            return request.movietitle;
        }
        if (request.tvtitle != null) {
            return request.tvtitle;
        }

        if (!request.query && !request.identifier_key && !request.season && !request.episode) {
            return "Update query";
        }
        return request.query;
    };

    $scope.formatAdditional = function (request) {
        var result = [];
        //ID key: ID value
        //season
        //episode
        //author
        //title
        if (request.identifier_key) {
            var href;
            var key;
            if (request.identifier_key == "imdbid") {
                key = "IMDB ID";
                href = "https://www.imdb.com/title/tt"
            } else if (request.identifier_key == "tvdbid") {
                key = "TVDB ID";
                href = "https://thetvdb.com/?tab=series&id="
            } else if (request.identifier_key == "rid") {
                key = "TVRage ID";
                href = "internalapi/redirect_rid?rid="
            } else if (request.identifier_key == "tmdb") {
                key = "TMDV ID";
                href = "https://www.themoviedb.org/movie/"
            }
            href = href + request.identifier_value;
            href = $filter("dereferer")(href);
            result.push(key + ": " + '<a target="_blank" href="' + href + '">' + request.identifier_value + "</a>");
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
