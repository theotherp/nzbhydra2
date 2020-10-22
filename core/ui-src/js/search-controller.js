angular
    .module('nzbhydraApp')
    .controller('SearchController', SearchController);

function SearchController($scope, $http, $stateParams, $state, $uibModal, $timeout, $sce, growl, SearchService, focus, ConfigService, HydraAuthService, CategoriesService, $element, SearchHistoryService) {

    function getNumberOrUndefined(number) {
        if (_.isUndefined(number) || _.isNaN(number) || number === "") {
            return undefined;
        }
        number = parseInt(number);
        if (_.isNumber(number)) {
            return number;
        } else {
            return undefined;
        }
    }

    var searchRequestId = 0;
    var isSearchCancelled = false;
    var epochEnter;

    //Fill the form with the search values we got from the state params (so that their values are the same as in the current url)
    $scope.mode = $stateParams.mode;
    $scope.query = "";
    $scope.selectedItem = null;
    $scope.categories = _.filter(CategoriesService.getAllCategories(), function (c) {
        return c.mayBeSelected && !(c.ignoreResultsFrom === "INTERNAL" || c.ignoreResultsFrom === "BOTH");
    });
    $scope.minsize = getNumberOrUndefined($stateParams.minsize);
    $scope.maxsize = getNumberOrUndefined($stateParams.maxsize);
    if (angular.isDefined($stateParams.category) && $stateParams.category) {
        $scope.category = CategoriesService.getByName($stateParams.category);
    } else {
        $scope.category = CategoriesService.getDefault();
        $scope.minsize = $scope.category.minSizePreset;
        $scope.maxsize = $scope.category.maxSizePreset;
    }
    $scope.category = _.isNullOrEmpty($stateParams.category) ? CategoriesService.getDefault() : CategoriesService.getByName($stateParams.category);
    $scope.season = $stateParams.season;
    $scope.episode = $stateParams.episode;
    $scope.query = $stateParams.query;

    $scope.minage = getNumberOrUndefined($stateParams.minage);
    $scope.maxage = getNumberOrUndefined($stateParams.maxage);
    if (angular.isDefined($stateParams.indexers)) {
        $scope.indexers = decodeURIComponent($stateParams.indexers).split(",");
    }
    if (angular.isDefined($stateParams.title) || (angular.isDefined($stateParams.tmdbId) || angular.isDefined($stateParams.imdbId) || angular.isDefined($stateParams.tvmazeId) || angular.isDefined($stateParams.rid) || angular.isDefined($stateParams.tvdbId))) {
        var width = calculateWidth($stateParams.title) + 30;
        $scope.selectedItemWidth = width + "px";
        $scope.selectedItem = {
            tmdbId: $stateParams.tmdbId,
            imdbId: $stateParams.imdbId,
            tvmazeId: $stateParams.tvmazeId,
            rid: $stateParams.rid,
            tvdbId: $stateParams.tvdbId,
            title: $stateParams.title
        }
    }

    $scope.showIndexers = {};

    $scope.searchHistory = [];

    var safeConfig = ConfigService.getSafe();
    $scope.showIndexerSelection = HydraAuthService.getUserInfos().showIndexerSelection;


    $scope.typeAheadWait = 300;

    $scope.autocompleteLoading = false;
    $scope.isAskById = $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";
    $scope.isById = {value: $scope.selectedItem !== null || angular.isUndefined($scope.mode) || $scope.mode === null}; //If true the user wants to search by id so we enable autosearch. Was unable to achieve this using a simple boolean. Set to false if last search was not by ID
    $scope.availableIndexers = [];
    $scope.selectedIndexers = [];
    $scope.autocompleteClass = "autocompletePosterMovies";

    $scope.toggleCategory = function (searchCategory) {
        var oldCategory = $scope.category;
        $scope.category = searchCategory;

        //Show checkbox to ask if the user wants to search by ID (using autocomplete)
        if ($scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE") {
            $scope.isAskById = true;
            $scope.isById.value = true;
        } else {
            $scope.isAskById = false;
            $scope.isById.value = false;
        }

        if (oldCategory.searchType !== searchCategory.searchType) {
            $scope.selectedItem = null;
        }

        focus('searchfield');

        //Hacky way of triggering the autocomplete loading
        var searchModel = $element.find("#searchfield").controller("ngModel");
        if (angular.isDefined(searchModel.$viewValue)) {
            searchModel.$setViewValue(searchModel.$viewValue + " ");
        }

        if (safeConfig.categoriesConfig.enableCategorySizes) {
            var min = searchCategory.minSizePreset;
            var max = searchCategory.maxSizePreset;
            if (_.isNumber(min)) {
                $scope.minsize = min;
            } else {
                $scope.minsize = "";
            }
            if (_.isNumber(max)) {
                $scope.maxsize = max;
            } else {
                $scope.maxsize = "";
            }
        }

        $scope.availableIndexers = getAvailableIndexers();
    };

    // Any function returning a promise object can be used to load values asynchronously
    $scope.getAutocomplete = function (val) {
        $scope.autocompleteLoading = true;
        //Expected model returned from API:
        //label: What to show in the results
        //title: Will be used for file search
        //value: Will be used as extraInfo (ttid oder tvdb id)
        //poster: url of poster to show

        //Don't use autocomplete if checkbox is disabled
        if (!$scope.isById.value || $scope.selectedItem) {
            return {};
        }

        if ($scope.category.searchType === "MOVIE") {
            return $http.get('internalapi/autocomplete/MOVIE/', {params: {input: val}}).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else if ($scope.category.searchType === "TVSEARCH") {
            return $http.get('internalapi/autocomplete/TV/', {params: {input: val}}).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else {
            return {};
        }
    };

    $scope.onTypeAheadEnter = function () {
        if (angular.isDefined(epochEnter)) {
            //Very hacky way of preventing a press of "enter" to select an autocomplete item from triggering a search
            //This is called *after* selectAutoComplete() is called
            var epochEnterNow = (new Date).getTime();
            var diff = epochEnterNow - epochEnter;
            if (diff > 50) {
                $scope.initiateSearch();
            }
        } else {
            $scope.initiateSearch();
        }
    };

    $scope.onTypeAheadKeyDown = function (event) {
        if (event.keyCode === 8) {
            if ($scope.query === "") {
                $scope.clearAutocomplete();
            }
        }
    };

    $scope.onDropOnQueryInput = function (event) {
        if ($scope.searchHistoryDragged === null || $scope.searchHistoryDragged === undefined) {
            return;
        }

        $scope.category = CategoriesService.getByName($scope.searchHistoryDragged.categoryName);
        $scope.season = $scope.searchHistoryDragged.season;
        $scope.episode = $scope.searchHistoryDragged.episode;
        $scope.query = $scope.searchHistoryDragged.query;

        if ($scope.searchHistoryDragged.title != null) {
            var width = calculateWidth($scope.searchHistoryDragged.title) + 30;
            $scope.selectedItemWidth = width + "px";
        }

        var tvmaze = _.findWhere($scope.searchHistoryDragged.identifiers, {identifierKey: "TVMAZE"});
        var tmdb = _.findWhere($scope.searchHistoryDragged.identifiers, {identifierKey: "TMDB"});
        var imdb = _.findWhere($scope.searchHistoryDragged.identifiers, {identifierKey: "IMDB"});
        var tvdb = _.findWhere($scope.searchHistoryDragged.identifiers, {identifierKey: "TVDB"});
        $scope.selectedItem = {
            tmdbId: tmdb === undefined ? null : tmdb.identifierValue,
            imdbId: imdb === undefined ? null : imdb.identifierValue,
            tvmazeId: tvmaze === undefined ? null : tvmaze.identifierValue,
            tvdbId: tvdb === undefined ? null : tvdb.identifierValue,
            title: $scope.searchHistoryDragged.title
        }

        event.preventDefault();

        $scope.searchHistoryDragged = null;
        focus('searchfield');
        $scope.status.isopen = false;
    }

    $scope.$on("searchHistoryDrag", function (event, data) {
        $scope.searchHistoryDragged = JSON.parse(data);
    })

    //Is called when the search page is opened with params, either because the user initiated the search (which triggered a goTo to this page) or because a search URL was entered
    $scope.startSearch = function () {
        isSearchCancelled = false;
        searchRequestId = Math.round(Math.random() * 99999);
        var modalInstance = $scope.openModal(searchRequestId);

        var indexers = angular.isUndefined($scope.indexers) ? undefined : $scope.indexers.join(",");
        SearchService.search(searchRequestId, $scope.category.name, $scope.query, $scope.selectedItem, $scope.season, $scope.episode, $scope.minsize, $scope.maxsize, $scope.minage, $scope.maxage, indexers, $scope.mode).then(function () {
                //modalInstance.close();
                SearchService.setModalInstance(modalInstance);
                if (!isSearchCancelled) {
                    $state.go("root.search.results", {
                        minsize: $scope.minsize,
                        maxsize: $scope.maxsize,
                        minage: $scope.minage,
                        maxage: $scope.maxage
                    }, {
                        inherit: true
                    });
                }
            },
            function () {
                modalInstance.close();
            });
    };

    $scope.openModal = function openModal(searchRequestId) {
        return $uibModal.open({
            templateUrl: 'static/html/search-state.html',
            controller: SearchUpdateModalInstanceCtrl,
            size: "md",
            backdrop: "static",
            backdropClass: "waiting-cursor",
            resolve: {
                searchRequestId: function () {
                    return searchRequestId;
                },
                onCancel: function () {
                    function cancel() {
                        isSearchCancelled = true;
                    }

                    return cancel;
                }
            }
        });
    };

    $scope.goToSearchUrl = function () {
        //State params (query parameters) should all be lowercase
        var stateParams = {};
        stateParams.mode = $scope.category.searchType.toLowerCase();
        stateParams.imdbId = $scope.selectedItem === null ? null : $scope.selectedItem.imdbId;
        stateParams.tmdbId = $scope.selectedItem === null ? null : $scope.selectedItem.tmdbId;
        stateParams.tvdbId = $scope.selectedItem === null ? null : $scope.selectedItem.tvdbId;
        stateParams.tvrageId = $scope.selectedItem === null ? null : $scope.selectedItem.tvrageId;
        stateParams.tvmazeId = $scope.selectedItem === null ? null : $scope.selectedItem.tvmazeId;
        stateParams.title = $scope.selectedItem === null ? null : $scope.selectedItem.title;
        stateParams.season = $scope.season;
        stateParams.episode = $scope.episode;
        stateParams.query = $scope.query;
        stateParams.minsize = $scope.minsize;
        stateParams.maxsize = $scope.maxsize;
        stateParams.minage = $scope.minage;
        stateParams.maxage = $scope.maxage;
        stateParams.category = $scope.category.name;
        stateParams.indexers = encodeURIComponent($scope.selectedIndexers.join(","));
        $state.go("root.search", stateParams, {inherit: false, notify: true, reload: true});
    };

    $scope.repeatSearch = function (request) {
        var stateParams = SearchHistoryService.getStateParamsForRepeatedSearch(request);
        stateParams.indexers = encodeURIComponent($scope.selectedIndexers.join(","));
        $state.go("root.search", stateParams, {inherit: false, notify: true, reload: true});
    };

    $scope.searchBoxTooltip = "Prefix terms with -- to exclude'";
    $scope.$watchGroup(['isAskById', 'selectedItem'], function () {
        if (!$scope.isAskById) {
            $scope.searchBoxTooltip = "Prefix terms with -- to exclude";
        } else if ($scope.selectedItem === null) {
            $scope.searchBoxTooltip = "Enter search terms for autocomplete";
        } else {
            $scope.searchBoxTooltip = "Enter additional search terms to limit the query";
        }
    });

    $scope.clearAutocomplete = function () {
        $scope.selectedItem = null;
        $scope.query = ""; //Input is now for autocomplete and not for limiting the results
        focus('searchfield');
    };

    $scope.clearQuery = function () {
        $scope.selectedItem = null;
        $scope.query = "";
        focus('searchfield');
    };

    function calculateWidth(text) {
        var canvas = calculateWidth.canvas || (calculateWidth.canvas = document.createElement("canvas"));
        var context = canvas.getContext("2d");
        context.font = "13px Roboto";
        return context.measureText(text).width;
    }

    $scope.selectAutocompleteItem = function ($item) {
        $scope.selectedItem = $item;
        $scope.query = "";
        epochEnter = (new Date).getTime();
        var width = calculateWidth($item.title) + 30;
        $scope.selectedItemWidth = width + "px";
    };

    $scope.initiateSearch = function () {
        if ($scope.selectedIndexers.length === 0) {
            growl.error("You didn't select any indexers");
            return;
        }
        if ($scope.selectedItem) {
            //Movie or tv show was selected
            $scope.goToSearchUrl();
        } else {
            //Simple query search
            $scope.goToSearchUrl();
        }
    };

    $scope.autocompleteActive = function () {
        return $scope.isAskById;
    };

    $scope.seriesSelected = function () {
        return $scope.category.searchType === "TVSEARCH";
    };

    $scope.toggleIndexer = function (indexer) {
        $scope.availableIndexers[indexer.name].activated = !$scope.availableIndexers[indexer.name].activated;
    };

    function isIndexerPreselected(indexer) {
        if (angular.isUndefined($scope.indexers)) {
            return indexer.preselect;
        } else {
            return _.contains($scope.indexers, indexer.name);
        }
    }

    function getAvailableIndexers() {
        var alreadySelected = $scope.selectedIndexers;
        var previouslyAvailable = _.pluck($scope.availableIndexers, "name");
        $scope.selectedIndexers = [];
        var availableIndexersList = _.chain(safeConfig.indexers).filter(function (indexer) {
            if (!indexer.showOnSearch) {
                return false;
            }
            var categorySelectedForIndexer = (angular.isUndefined(indexer.categories) || indexer.categories.length === 0 || $scope.category.name.toLowerCase() === "all" || indexer.categories.indexOf($scope.category.name) > -1);
            return categorySelectedForIndexer;
        }).sortBy(function (indexer) {
            return indexer.name.toLowerCase();
        })
            .map(function (indexer) {
                return {
                    name: indexer.name,
                    activated: isIndexerPreselected(indexer),
                    preselect: indexer.preselect,
                    categories: indexer.categories,
                    searchModuleType: indexer.searchModuleType
                };
            }).value();
        _.forEach(availableIndexersList, function (x) {
            var deselectedBefore = (_.indexOf(previouslyAvailable, x.name) > -1 && _.indexOf(alreadySelected, x.name) === -1);
            var selectedBefore = (_.indexOf(previouslyAvailable, x.name) > -1 && _.indexOf(alreadySelected, x.name) > -1);
            if ((x.activated && !deselectedBefore) || selectedBefore) {
                $scope.selectedIndexers.push(x.name);
            }
        });
        return availableIndexersList;
    }


    $scope.formatRequest = function (request) {
        return $sce.trustAsHtml(SearchHistoryService.formatRequest(request, false, true, true, true));
    };

    $scope.availableIndexers = getAvailableIndexers();

    function getAndSetSearchRequests() {
        SearchHistoryService.getSearchHistoryForSearching().then(function (response) {
            $scope.searchHistory = response.searchRequests;
        });
    }

    if ($scope.mode) {
        $scope.startSearch();
    } else {
        //Getting the search history only makes sense when we're not currently searching
        _.defer(getAndSetSearchRequests);
    }

    $scope.$on("searchResultsShown", function () {
        _.defer(getAndSetSearchRequests); //Defer because otherwise the results are only shown when this returns which may take a while with big databases
    });
}

angular
    .module('nzbhydraApp')
    .controller('SearchUpdateModalInstanceCtrl', SearchUpdateModalInstanceCtrl);

function SearchUpdateModalInstanceCtrl($scope, $interval, SearchService, $uibModalInstance, searchRequestId, onCancel) {

    var updateSearchMessagesInterval = undefined;
    var loggedSearchFinished = false;
    $scope.messages = [];
    $scope.indexerSelectionFinished = false;
    $scope.indexersSelected = 0;
    $scope.indexersFinished = 0;

    updateSearchMessagesInterval = $interval(function () {
        SearchService.getSearchState(searchRequestId).then(function (response) {
                $scope.indexerSelectionFinished = response.data.indexerSelectionFinished;
                $scope.searchFinished = response.data.searchFinished;
                $scope.indexersSelected = response.data.indexersSelected;
                $scope.indexersFinished = response.data.indexersFinished;
                $scope.progressMax = response.data.indexersSelected;
                if ($scope.progressMax > response.data.indexersSelected) {
                    $scope.progressMax = ">=" + response.data.indexersSelected;
                }
                if (response.data.messages) {
                    $scope.messages = response.data.messages;
                }
                if ($scope.searchFinished && !loggedSearchFinished) {
                    $scope.messages.push("Finished searching. Preparing results...");
                    loggedSearchFinished = true;
                }
            },
            function () {
                $interval.cancel(updateSearchMessagesInterval);
            }
        );
    }, 100);

    $scope.cancelSearch = function () {
        if (angular.isDefined(updateSearchMessagesInterval)) {
            $interval.cancel(updateSearchMessagesInterval);
        }
        onCancel();
        $uibModalInstance.dismiss();
    };


    $scope.$on('$destroy', function () {
        if (angular.isDefined(updateSearchMessagesInterval)) {
            $interval.cancel(updateSearchMessagesInterval);
        }
    });


}

angular
    .module('nzbhydraApp').directive('draggable', ['$rootScope', function ($rootScope) {
    return {
        restrict: 'A',
        link: function (scope, el, attrs, controller) {

            el.bind("dragstart", function (e) {
                $rootScope.$emit("searchHistoryDrag", el.attr("data-request"));
                $rootScope.$broadcast("searchHistoryDrag", el.attr("data-request"));
            });
        }
    }
}]);

