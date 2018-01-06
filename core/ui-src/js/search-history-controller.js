angular
    .module('nzbhydraApp')
    .controller('SearchHistoryController', SearchHistoryController);


function SearchHistoryController($scope, $state, SearchHistoryService, ConfigService, history, $sce, $filter, $timeout, $http, $uibModal) {
    $scope.limit = 100;
    $scope.pagination = {
        current: 1
    };
    var sortModel = {
        column: "time",
        sortMode: 2
    };
    $timeout(function () {
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode);
    }, 10);
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

    var anyUsername = false;
    var anyIp = false;
    for (var request in $scope.searchRequests) {
        if (request.username) {
            anyUsername = true;
        }
        if (request.ip) {
            anyIp = true;
        }
        if (anyIp && anyUsername) {
            break;
        }
    }
    $scope.columnSizes = {
        time: 10,
        query: 30,
        category: 10,
        additionalParameters: 22,
        source: 8,
        username: 10,
        ip: 10
    };
    if (ConfigService.getSafe().logging.historyUserInfoType === "NONE" || (!anyUsername && !anyIp)) {
        $scope.columnSizes.username = 0;
        $scope.columnSizes.ip = 0;
        $scope.columnSizes.query += 10;
        $scope.columnSizes.additionalParameters += 10;
    } else if (ConfigService.getSafe().logging.historyUserInfoType === "IP") {
        $scope.columnSizes.username = 0;
        $scope.columnSizes.query += 5;
        $scope.columnSizes.additionalParameters += 5;
    } else if (ConfigService.getSafe().logging.historyUserInfoType === "USERNAME") {
        $scope.columnSizes.ip = 0;
        $scope.columnSizes.query += 5;
        $scope.columnSizes.additionalParameters += 5;
    }

    $scope.update = function () {
        SearchHistoryService.getSearchHistory($scope.pagination.current, $scope.limit, $scope.filterModel, sortModel).then(function (history) {
            $scope.searchRequests = history.data.content;
            $scope.totalRequests = history.data.totalElements;
        });
    };

    $scope.$on("sort", function (event, column, sortMode) {
        if (sortMode === 0) {
            sortModel = {
                column: "time",
                sortMode: 2
            };
        } else {
            sortModel = {
                column: column,
                sortMode: sortMode
            };
        }
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode);
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
        $state.go("root.search", SearchHistoryService.getStateParamsForRepeatedSearch(request), {inherit: false, notify: true, reload: true});
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
                href = "https://www.imdb.com/title/tt" + pair.identifierValue;
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
        return $sce.trustAsHtml(result.join(", "));
    };

    $scope.showDetails = function (searchId) {

        function ModalInstanceCtrl($scope, $uibModalInstance, $http, searchId) {
            $http.get("internalapi/history/searches/details/" + searchId).then(function (data) {
                $scope.details = data.data;
            });
        }

        $uibModal.open({
            templateUrl: 'static/html/search-history-details-modal.html',
            controller: ModalInstanceCtrl,
            size: "md",
            resolve: {
                searchId: function () {
                    return searchId;
                }
            }
        });


    }

}

