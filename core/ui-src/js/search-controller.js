angular
    .module('nzbhydraApp')
    .controller('SearchController', SearchController);

function SearchController($scope, $http, $stateParams, $state, $uibModal, $timeout, $sce, growl, SearchService, focus, ConfigService, HydraAuthService, CategoriesService, $element, SearchHistoryService, GuidedTourService, uiTourService) {

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
    $scope.availableIndexers = [];
    $scope.selectedIndexers = [];
    $scope.availableIndexerOptions = [];
    $scope.indexerSelectionActions = [];
    $scope.indexerSelectionSettings = {
        showSelectedValues: false,
        noSelectedText: 'Select indexers'
    };
    $scope.autocompleteClass = "autocompletePosterMovies";

    // ─── Guided Tour ────────────────────────────────────────────────
    $scope.tourActive = GuidedTourService.isTourActive();
    $scope.tourHidden = false;
    $scope.showTourButton = false;

    function applyTourHiddenState(hidden) {
        $scope.tourHidden = hidden;
        $scope.showTourButton = !safeConfig.disableTour && !hidden;
    }

    function hideTourForever() {
        if ($scope.tourHidden || safeConfig.disableTour) {
            return;
        }
        applyTourHiddenState(true);
        $http.put('internalapi/guidedtour/hide').catch(function () {
            // Ignore errors — hide locally regardless
        });
    }

    if (!safeConfig.disableTour) {
        $http.get('internalapi/guidedtour/hidden').then(function (response) {
            applyTourHiddenState(!!response.data);
        }).catch(function () {
            $scope.showTourButton = true;
        });
    }

    // Page-load cleanup: if no tour is running on the frontend, ensure
    // demo mode is deactivated on the backend (handles stale sessions
    // from closed tabs or browser crashes during a tour).
    if (!$scope.tourActive) {
        $http.delete('internalapi/demomode').catch(function () {
            // Ignore errors — this is a best-effort cleanup
        });
    }

    $scope.startGuidedTour = function () {
        if ($scope.tourHidden || safeConfig.disableTour) {
            return;
        }
        $scope.tourActive = true;
        GuidedTourService.startTour();
    };

    $scope.hideTourForever = function () {
        hideTourForever();
    };

    $scope.onTourReady = function () {
        var tour = uiTourService.getTour();
        if (tour) {
            GuidedTourService.registerSearchSteps(tour);
        }
    };

    $scope.onTourEnd = function () {
        if (!GuidedTourService.isSoftEnd()) {
            hideTourForever();
        }
        GuidedTourService.endTour();
    };

    $scope.$on('tourEnded', function () {
        $scope.tourActive = false;
        $scope.query = '';
        $scope.selectedItem = null;
        $scope.category = CategoriesService.getDefault();
        $scope.isAskById = $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";
    });

    $scope.toggleCategory = function (searchCategory) {
        var oldCategory = $scope.category;
        $scope.category = searchCategory;

        //Show checkbox to ask if the user wants to search by ID (using autocomplete)
        if ($scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE") {
            $scope.isAskById = true;
        } else {
            $scope.isAskById = false;
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

        if (!$scope.isAskById || $scope.selectedItem) {
            return {};
        }

        if ($scope.category.searchType === "MOVIE") {
            return $http.get('internalapi/autocomplete/MOVIE', {params: {input: val}}).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else if ($scope.category.searchType === "TVSEARCH") {
            return $http.get('internalapi/autocomplete/TV', {params: {input: val}}).then(function (response) {
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
                    var goOptions = {inherit: true};
                    if (GuidedTourService.isTourActive()) {
                        // During the tour, tell UI-Router to only reload the
                        // child state.  The keep-loop in transitionTo() skips
                        // the ownParams.$$equals() check for all ancestors of
                        // the reload state, so root.search (and its ui-tour
                        // directive) stays alive even when URL params change.
                        goOptions.reload = "root.search.results";
                        // Don't update the URL – the tour uses demo data and
                        // we don't want browser-back to replay it.
                        goOptions.location = false;
                    }
                    $state.go("root.search.results", {
                        minsize: $scope.minsize,
                        maxsize: $scope.maxsize,
                        minage: $scope.minage,
                        maxage: $scope.maxage
                    }, goOptions);
                }
            },
            function (err) {
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
        $scope.searchBoxPlaceholder = "Search";
        if (!$scope.isAskById) {
            $scope.searchBoxTooltip = "Prefix terms with -- to exclude";
        } else if ($scope.selectedItem === null) {
            $scope.searchBoxTooltip = "Enter search terms. You can pick an autocomplete result or just search what you typed";
            $scope.searchBoxPlaceholder = "Type for autocomplete";
        } else {
            $scope.searchBoxTooltip = "Enter additional search terms to limit the query";
            $scope.searchBoxPlaceholder = "Additional query";
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
        if (angular.isDefined($scope.status)) {
            $scope.status.isopen = false;
        }
        epochEnter = (new Date).getTime();
        var width = calculateWidth($item.title) + 30;
        $scope.selectedItemWidth = width + "px";
    };

    $scope.initiateSearch = function () {
        if ($scope.selectedIndexers.length === 0 && !GuidedTourService.isTourActive()) {
            growl.error("You didn't select any indexers");
            return;
        }

        if (GuidedTourService.isTourActive()) {
            // During the tour we must NOT call goToSearchUrl() because it does
            // $state.go("root.search", ..., {reload: true}) which destroys the
            // ui-tour directive (and the tour instance) and recreates the
            // SearchController.
            //
            // We also must NOT silently update the parent state params with
            // $state.go("root.search", stateParams, {notify:false, reload:false})
            // because the subsequent startSearch() does
            // $state.go("root.search.results", ..., {inherit:true}) which
            // re-enters the parent state with the new params, causing UI-Router
            // to destroy and recreate the parent view (and the ui-tour directive).
            //
            // Instead, just set $scope.mode directly and call startSearch().
            // The URL won't reflect the search params, but that's fine for the tour.
            $scope.mode = $scope.category.searchType.toLowerCase();
            $scope.startSearch();
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

    function selectIndexersByPredicate(predicate) {
        $scope.selectedIndexers.splice(0, $scope.selectedIndexers.length);
        Array.prototype.push.apply($scope.selectedIndexers,
            _.pluck(_.filter($scope.availableIndexers, predicate), 'name'));
    }

    function buildIndexerDropdownOptions(availableIndexers) {
        var hasTorznabIndexers = _.some(availableIndexers, function (indexer) {
            return indexer.searchModuleType === 'TORZNAB';
        });

        var usenetIndexers = _.filter(availableIndexers, function (indexer) {
            return indexer.searchModuleType !== 'TORZNAB';
        });
        var torznabIndexers = _.filter(availableIndexers, function (indexer) {
            return indexer.searchModuleType === 'TORZNAB';
        });

        return _.map(usenetIndexers.concat(torznabIndexers), function (indexer) {
            return {
                id: indexer.name,
                label: indexer.name,
                group: hasTorznabIndexers ? (indexer.searchModuleType === 'TORZNAB' ? 'Torznab indexers' : 'Usenet indexers') : ''
            };
        });
    }

    function buildIndexerSelectionActions(availableIndexers) {
        var actions = [
            {
                label: 'Reset to preselection',
                iconClass: 'glyphicon glyphicon-repeat',
                action: function () {
                    selectIndexersByPredicate(function (indexer) {
                        return indexer.preselect;
                    });
                }
            },
            {
                label: 'Invert selection',
                iconClass: 'glyphicon glyphicon-retweet',
                action: function () {
                    _.forEach(availableIndexers, function (indexer) {
                        var index = _.indexOf($scope.selectedIndexers, indexer.name);
                        if (index === -1) {
                            $scope.selectedIndexers.push(indexer.name);
                        } else {
                            $scope.selectedIndexers.splice(index, 1);
                        }
                    });
                }
            }
        ];

        if (_.some(availableIndexers, function (indexer) {
            return indexer.searchModuleType === 'TORZNAB';
        })) {
            actions.push({
                label: 'Select all usenet indexers',
                iconClass: 'glyphicon glyphicon-hdd',
                action: function () {
                    selectIndexersByPredicate(function (indexer) {
                        return indexer.searchModuleType !== 'TORZNAB';
                    });
                }
            });
            actions.push({
                label: 'Select all torznab indexers',
                iconClass: 'glyphicon glyphicon-magnet',
                action: function () {
                    selectIndexersByPredicate(function (indexer) {
                        return indexer.searchModuleType === 'TORZNAB';
                    });
                }
            });
        }

        return actions;
    }

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
        $scope.selectedIndexers.splice(0, $scope.selectedIndexers.length);
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
        $scope.availableIndexerOptions = buildIndexerDropdownOptions(availableIndexersList);
        $scope.indexerSelectionActions = buildIndexerSelectionActions(availableIndexersList);
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

    if ($scope.mode && !GuidedTourService.isTourActive()) {
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

function SearchUpdateModalInstanceCtrl($scope, $interval, SearchService, $uibModalInstance, searchRequestId, onCancel, bootstrapped) {

    var loggedSearchFinished = false;
    $scope.messages = [];
    $scope.indexerSelectionFinished = false;
    $scope.indexersSelected = 0;
    $scope.indexersFinished = 0;
    $scope.buttonText = "Cancel";
    $scope.buttonTooltip = "Cancel search and return to search mask";
    $scope.btnType = "btn-danger";

    var socket = new SockJS(bootstrapped.baseUrl + 'websocket');
    var stompClient = Stomp.over(socket);
    stompClient.debug = null;
    stompClient.connect({}, function (frame) {
        stompClient.subscribe('/topic/searchState', function (message) {
            var data = JSON.parse(message.body);
            if (searchRequestId !== data.searchRequestId) {
                return;
            }
            $scope.searchFinished = data.searchFinished;
            $scope.indexersSelected = data.indexersSelected;
            $scope.indexersFinished = data.indexersFinished;
            $scope.progressMax = data.indexersSelected;
            if ($scope.progressMax > data.indexersSelected) {
                $scope.progressMax = ">=" + data.indexersSelected;
            }
            if ($scope.indexersFinished > 0) {
                $scope.buttonText = "Show results";
                $scope.buttonTooltip = "Show results that have already been loaded";
                $scope.btnType = "btn-warning";
            }
            if (data.messages) {
                $scope.messages = data.messages;
            }
            if ($scope.searchFinished && !loggedSearchFinished) {
                $scope.messages.push("Finished searching. Preparing results...");
                loggedSearchFinished = true;
            }
        });
    });

    $scope.shortcutSearch = function () {
        SearchService.shortcutSearch(searchRequestId);
        // onCancel();
        // $uibModalInstance.dismiss();
    };

    $scope.hasResults = function (message) {
        return /^[^0]\d+.*/.test(message);
    };

    // Clean up WebSocket connection to prevent memory leaks
    function cleanupWebSocket() {
        if (stompClient !== null) {
            try {
                stompClient.disconnect();
            } catch (ignored) {
            }
            stompClient = null;
        }
        if (socket !== null) {
            try {
                socket.close();
            } catch (ignored) {
            }
            socket = null;
        }
    }

    $scope.$on('$destroy', cleanupWebSocket);

    // Also cleanup when modal is closed/dismissed
    $uibModalInstance.result.finally(cleanupWebSocket);

}

angular
    .module('nzbhydraApp').directive('draggable', ['$rootScope', function ($rootScope) {
    return {
        restrict: 'A',
        link: function (scope, el, attrs, controller) {
            var dragHandler = function (e) {
                $rootScope.$emit("searchHistoryDrag", el.attr("data-request"));
                $rootScope.$broadcast("searchHistoryDrag", el.attr("data-request"));
            };

            el.bind("dragstart", dragHandler);

            // Clean up event handler to prevent memory leaks
            scope.$on('$destroy', function () {
                el.unbind("dragstart", dragHandler);
            });
        }
    }
}]);

