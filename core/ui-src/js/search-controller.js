angular
    .module('nzbhydraApp')
    .controller('SearchController', SearchController);

function SearchController($scope, $http, $stateParams, $state, $window, $filter, $sce, growl, SearchService, focus, ConfigService, HydraAuthService, CategoriesService, blockUI, $element, ModalService, SearchHistoryService) {

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

    //Fill the form with the search values we got from the state params (so that their values are the same as in the current url)
    $scope.mode = $stateParams.mode;
    $scope.categories = _.filter(CategoriesService.getAllCategories(), function (c) {
        return c.mayBeSelected && !(c.ignoreResultsFrom === "INTERNAL" || c.ignoreResults === "BOTH");
    });
    if (angular.isDefined($stateParams.category) && $stateParams.category) {
        $scope.category = CategoriesService.getByName($stateParams.category);
    } else {
        $scope.category = CategoriesService.getDefault();
    }
    $scope.category = (_.isUndefined($stateParams.category) || $stateParams.category === "") ? CategoriesService.getDefault() : CategoriesService.getByName($stateParams.category);
    $scope.tmdbId = $stateParams.tmdbid;
    $scope.tvdbId = $stateParams.tvdbid;
    $scope.imdbId = $stateParams.imdbid;
    $scope.tvmazeId = $stateParams.tvmazeid;
    $scope.rid = $stateParams.rid;
    $scope.title = $stateParams.title;
    $scope.season = $stateParams.season;
    $scope.episode = $stateParams.episode;
    $scope.query = $stateParams.query;
    $scope.minsize = getNumberOrUndefined($stateParams.minsize);
    $scope.maxsize = getNumberOrUndefined($stateParams.maxsize);
    $scope.minage = getNumberOrUndefined($stateParams.minage);
    $scope.maxage = getNumberOrUndefined($stateParams.maxage);
    if (!_.isUndefined($scope.title) && _.isUndefined($scope.query)) {
        //$scope.query = $scope.title;
    }
    if (!angular.isUndefined($stateParams.indexers)) {
        $scope.indexers = decodeURIComponent($stateParams.indexers).split("|");
    }

    $scope.showIndexers = {};

    $scope.searchHistory = [];

    var safeConfig = ConfigService.getSafe();
    $scope.showIndexerSelection = HydraAuthService.getUserInfos().showIndexerSelection;

    //Doesn't belong here but whatever
    var firstStartThreeDaysAgo = ConfigService.getSafe().firstStart < moment().subtract(3, "days").unix();
    var doShowSurvey = (ConfigService.getSafe().pollShown === 0 && firstStartThreeDaysAgo) || ConfigService.getSafe().pollShown === 1;
    if (doShowSurvey) {
        var message;
        if (ConfigService.getSafe().pollShown === 0) {
            message = "Dear user, I would like to ask you to answer a short query about NZB Hydra. It is absolutely anonymous and will not take more than a couple of minutes. You would help me a lot!";
        } else {
            message = "Dear user, thank you for answering my last survey. Unfortunately I'm an idiot and didn't know that SurveyMonkey would only show me the first 100 results. Please be so kind and answer the new survey :-)";
        }
        ModalService.open("User query",
            message, {
                yes: {
                    onYes: function () {
                        $window.open($filter("dereferer")("https://goo.gl/forms/F3PwtEor2krBxLcR2"), "_blank");
                        $http.get("internalapi/pollshown", {params: {selection: 1}});
                        ConfigService.getSafe().pollShown = 2;
                    },
                    text: "Yes, I want to help. Take me there."
                },
                cancel: {
                    onCancel: function () {
                        $http.get("internalapi/pollshown", {params: {selection: 0}});
                        ConfigService.getSafe().pollShown = 0;
                    },
                    text: "Not now. Remind me."
                },
                no: {
                    onNo: function () {
                        $http.get("internalapi/pollshown", {params: {selection: -1}});
                        ConfigService.getSafe().pollShown = -1;
                    },
                    text: "Nah, feck off!"
                }
            });
    }


    $scope.typeAheadWait = 300;
    $scope.selectedItem = "";
    $scope.autocompleteLoading = false;
    $scope.isAskById = $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";
    $scope.isById = {value: true}; //If true the user wants to search by id so we enable autosearch. Was unable to achieve this using a simple boolean
    $scope.availableIndexers = [];
    $scope.autocompleteClass = "autocompletePosterMovies";

    $scope.toggle = function (searchCategory) {
        $scope.category = searchCategory;

        //Show checkbox to ask if the user wants to search by ID (using autocomplete)
        $scope.isAskById = $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";

        focus('searchfield');

        //Hacky way of triggering the autocomplete loading
        var searchModel = $element.find("#searchfield").controller("ngModel");
        if (angular.isDefined(searchModel.$viewValue)) {
            searchModel.$setViewValue(searchModel.$viewValue + " ");
        }

        if (safeConfig.searching.enableCategorySizes) {
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
        if (!$scope.isById.value) {
            return {};
        }

        if ($scope.category.searchType === "MOVIE") {
            return $http.get('internalapi/autocomplete/MOVIE/' + val).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else if ($scope.category.searchType === "TVSEARCH") {
            return $http.get('internalapi/autocomplete/TV/' + val).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else {
            return {};
        }
    };


    $scope.startSearch = function () {
        blockUI.start("Searching...");
        var indexers = angular.isUndefined($scope.indexers) ? undefined : $scope.indexers.join("|");
        SearchService.search($scope.category.name, $scope.query, $scope.tmdbId, $scope.imdbId, $scope.title, $scope.tvdbId, $scope.rid, $scope.season, $scope.episode, $scope.minsize, $scope.maxsize, $scope.minage, $scope.maxage, indexers, $scope.mode).then(function () {
            $state.go("root.search.results", {
                minsize: $scope.minsize,
                maxsize: $scope.maxsize,
                minage: $scope.minage,
                maxage: $scope.maxage
            }, {
                inherit: true
            });
            $scope.tmdbId = undefined;
            $scope.imdbId = undefined;
            $scope.tvdbId = undefined;
        });
    };

    function getSelectedIndexers() {
        var activatedIndexers = _.filter($scope.availableIndexers).filter(function (indexer) {
            return indexer.activated;
        });
        return _.pluck(activatedIndexers, "name").join("|");
    }


    $scope.goToSearchUrl = function () {
        //State params (query parameters) should all be lowercase
        var stateParams = {};
        stateParams.mode = $scope.category.searchType.toLowerCase();
        stateParams.imdbid = $scope.imdbId;
        stateParams.tmdbid = $scope.tmdbId;
        stateParams.tvdbid = $scope.tvdbId;
        stateParams.tvrageid = $scope.tvrageId;
        stateParams.tvmazeid = $scope.tvmazeId;
        stateParams.title = $scope.title;
        stateParams.season = $scope.season;
        stateParams.episode = $scope.episode;
        stateParams.query = $scope.query;
        stateParams.minsize = $scope.minsize;
        stateParams.maxsize = $scope.maxsize;
        stateParams.minage = $scope.minage;
        stateParams.maxage = $scope.maxage;
        stateParams.category = $scope.category.name;
        stateParams.indexers = encodeURIComponent(getSelectedIndexers());
        $state.go("root.search", stateParams, {inherit: false, notify: true, reload: true});
    };

    $scope.repeatSearch = function (request) {
        $state.go("root.search", SearchHistoryService.getStateParamsForRepeatedSearch(request), {inherit: false, notify: true, reload: true});
    };


    $scope.selectAutocompleteItem = function ($item) {
        $scope.selectedItem = $item;
        $scope.title = $item.title;
        if ($item.tmdbId) {
            $scope.tmdbId = $item.tmdbId;
        }
        if ($item.tvdbId) {
            $scope.tvdbId = $item.tvdbId;
        }
        $scope.query = undefined;
        $scope.goToSearchUrl();
    };

    $scope.startQuerySearch = function () {
        if (!$scope.query) {
            growl.error("You didn't enter a query...");
        } else {
            //Reset values because they might've been set from the last search
            $scope.title = undefined;
            $scope.tmdbId = undefined;
            $scope.tvdbId = undefined;
            $scope.season = undefined;
            $scope.episode = undefined;
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
        $scope.indexers[indexer] = !$scope.indexers[indexer]
    };


    function isIndexerPreselected(indexer) {
        if (angular.isUndefined($scope.indexers)) {
            return indexer.preselect;
        } else {
            return _.contains($scope.indexers, indexer.name);
        }

    }


    function getAvailableIndexers() {
        return _.chain(safeConfig.indexers).filter(function (indexer) {
            return indexer.enabled && indexer.showOnSearch && (angular.isUndefined(indexer.categories) || indexer.categories.length === 0 || $scope.category.name.toLowerCase() === "all" || indexer.categories.indexOf($scope.category.name) > -1);
        }).sortBy(function (indexer) {
            return indexer.name.toLowerCase();
        })
            .map(function (indexer) {
                return {name: indexer.name, activated: isIndexerPreselected(indexer), categories: indexer.categories};
            }).value();
    }


    $scope.toggleAllIndexers = function () {
        angular.forEach($scope.availableIndexers, function (indexer) {
            indexer.activated = !indexer.activated;
        })
    };

    $scope.searchInputChanged = function () {
        $scope.$broadcast("searchInputChanged", $scope.query !== $stateParams.query ? $scope.query : null, $scope.minage, $scope.maxage, $scope.minsize, $scope.maxsize);
    };


    $scope.formatRequest = function (request) {
        return $sce.trustAsHtml(SearchHistoryService.formatRequest(request, false, true, true, true));
    };

    $scope.availableIndexers = getAvailableIndexers();


    function getAndSetSearchRequests() {
        SearchHistoryService.getSearchHistoryForSearching().success(function (data) {
            $scope.searchHistory = data;
        });
    }

    if ($scope.mode) {
        $scope.startSearch();
    } else {
        //Getting the search history only makes sense when we're not currently searching
        getAndSetSearchRequests();
    }

    $scope.$on("searchResultsShown", function () {
        getAndSetSearchRequests();
    });


}
