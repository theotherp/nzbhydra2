angular
    .module('nzbhydraApp')
    .controller('SearchResultsController', SearchResultsController);

//SearchResultsController.$inject = ['blockUi'];
function SearchResultsController($stateParams, $scope, $http, $q, $timeout, $document, blockUI, growl, localStorageService, SearchService, ConfigService, CategoriesService, DebugService, GenericStorageService, ModalService, $uibModal) {
    // console.time("Presenting");

    $scope.limitTo = ConfigService.getSafe().searching.loadLimitInternal;
    $scope.offset = 0;
    $scope.allowZipDownload = ConfigService.getSafe().downloading.fileDownloadAccessType === 'PROXY';

    var indexerColors = {};

    _.each(ConfigService.getSafe().indexers, function (indexer) {
        indexerColors[indexer.name] = indexer.color;
    });

    //Handle incoming data

    $scope.indexersearches = SearchService.getLastResults().indexerSearchMetaDatas;
    $scope.notPickedIndexersWithReason = [];
    _.forEach(SearchService.getLastResults().notPickedIndexersWithReason, function (k, v) {
        $scope.notPickedIndexersWithReason.push({"indexer": v, "reason": k});
    });
    $scope.indexerResultsInfo = {}; //Stores information about the indexerName's searchResults like how many we already retrieved
    $scope.groupExpanded = {};
    $scope.selected = [];
    if ($stateParams.title) {
        $scope.searchTitle = $stateParams.title;
    } else if ($stateParams.query) {
        $scope.searchTitle = $stateParams.query;
    } else {
        $scope.searchTitle = undefined;
    }

    $scope.selectedIds = _.map($scope.selected, function (value) {
        return value.searchResultId;
    });

    //For shift clicking results
    $scope.lastClickedValue = null;

    var allSearchResults = [];
    var sortModel = {};
    $scope.filterModel = {};


    $scope.filterButtonsModel = {
        source: {},
        quality: {},
        other: {},
        custom: {}
    };
    $scope.customFilterButtons = [];

    $scope.filterButtonsModelMap = {
        tv: ['hdtv'],
        camts: ['cam', 'ts'],
        web: ['webrip', 'web-dl', 'webdl'],
        dvd: ['dvd'],
        bluray: ['bluray', 'blu-ray']
    };
    _.each(ConfigService.getSafe().searching.customQuickFilterButtons, function (entry) {
        var split1 = entry.split("=");
        var displayName = split1[0];
        $scope.filterButtonsModelMap[displayName] = split1[1].split(",");
        $scope.customFilterButtons.push(displayName);
    });
    _.each(ConfigService.getSafe().searching.preselectQuickFilterButtons, function (entry) {
        var split1 = entry.split("|");
        var category = split1[0];
        var id = split1[1];
        if (category !== 'source' || $scope.isShowFilterButtonsVideo) {
            $scope.filterButtonsModel[category][id] = true;
        }
    })

    $scope.numberOfFilteredResults = 0;


    if ($stateParams.sortby !== undefined) {
        $stateParams.sortby = $stateParams.sortby.toLowerCase();
        sortModel = {};
        sortModel.reversed = false;
        if ($stateParams.sortby === "title") {
            sortModel.column = "title";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "indexer") {
            sortModel.column = "indexer";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "category") {
            sortModel.column = "category";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "size") {
            sortModel.column = "size";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "details") {
            sortModel.column = "grabs";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "age") {
            sortModel.column = "epoch";
            sortModel.reversed = true;
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 2;
            } else {
                sortModel.sortMode = 1;
            }
        }


    } else if (localStorageService.get("sorting") !== null) {
        sortModel = localStorageService.get("sorting");
    } else {
        sortModel = {
            column: "epoch",
            sortMode: 2,
            reversed: false
        };
    }
    $timeout(function () {
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode, sortModel.reversed);
    }, 10);


    $scope.foo = {
        indexerStatusesExpanded: localStorageService.get("indexerStatusesExpanded") !== null ? localStorageService.get("indexerStatusesExpanded") : false,
        duplicatesDisplayed: localStorageService.get("duplicatesDisplayed") !== null ? localStorageService.get("duplicatesDisplayed") : false,
        groupTorrentAndNewznabResults: localStorageService.get("groupTorrentAndNewznabResults") !== null ? localStorageService.get("groupTorrentAndNewznabResults") : false,
        sumGrabs: localStorageService.get("sumGrabs") !== null ? localStorageService.get("sumGrabs") : true,
        scrollToResults: localStorageService.get("scrollToResults") !== null ? localStorageService.get("scrollToResults") : true,
        showCovers: localStorageService.get("showCovers") !== null ? localStorageService.get("showCovers") : true,
        groupEpisodes: localStorageService.get("groupEpisodes") !== null ? localStorageService.get("groupEpisodes") : true,
        expandGroupsByDefault: localStorageService.get("expandGroupsByDefault") !== null ? localStorageService.get("expandGroupsByDefault") : false,
        showDownloadedIndicator: localStorageService.get("showDownloadedIndicator") !== null ? localStorageService.get("showDownloadedIndicator") : true,
        hideAlreadyDownloadedResults: localStorageService.get("hideAlreadyDownloadedResults") !== null ? localStorageService.get("hideAlreadyDownloadedResults") : true,
        showResultsAsZipButton: localStorageService.get("showResultsAsZipButton") !== null ? localStorageService.get("showResultsAsZipButton") : true,
        alwaysShowTitles: localStorageService.get("alwaysShowTitles") !== null ? localStorageService.get("alwaysShowTitles") : true
    };


    $scope.isShowFilterButtons = ConfigService.getSafe().searching.showQuickFilterButtons;
    $scope.isShowFilterButtonsVideo = $scope.isShowFilterButtons && ($stateParams.category.toLowerCase().indexOf("tv") > -1 || $stateParams.category.toLowerCase().indexOf("movie") > -1 || ConfigService.getSafe().searching.alwaysShowQuickFilterButtons);
    $scope.isShowCustomFilterButtons = ConfigService.getSafe().searching.customQuickFilterButtons.length > 0;

    $scope.shared = {
        isGroupEpisodes: $scope.foo.groupEpisodes && $stateParams.category.toLowerCase().indexOf("tv") > -1 && $stateParams.episode === undefined,
        expandGroupsByDefault: $scope.foo.expandGroupsByDefault,
        showDownloadedIndicator: $scope.foo.showDownloadedIndicator,
        hideAlreadyDownloadedResults: $scope.foo.hideAlreadyDownloadedResults,
        alwaysShowTitles: $scope.foo.alwaysShowTitles
    };

    if ($scope.shared.isGroupEpisodes) {
        GenericStorageService.get("isGroupEpisodesHelpShown", true).then(function (response) {
            if (!response.data) {
                ModalService.open("Sorting of TV episodes", 'When searching in the TV categories results are automatically grouped by episodes. This makes it easier to download one episode each. You can disable this feature any time using the "Display options" button to the upper left.', {
                    yes: {
                        text: "OK"
                    }
                });
                GenericStorageService.put("isGroupEpisodesHelpShown", true, true);
            }

        })
    }

    $scope.loadMoreEnabled = false;
    $scope.totalAvailableUnknown = false;
    $scope.expandedTitlegroups = [];
    $scope.optionsOptions = [
        {id: "duplicatesDisplayed", label: "Show duplicate display triggers"},
        {id: "groupTorrentAndNewznabResults", label: "Group torrent and usenet results"},
        {id: "sumGrabs", label: "Use sum of grabs / seeders for filtering / sorting of groups"},
        {id: "scrollToResults", label: "Scroll to results when finished"},
        {id: "showCovers", label: "Show movie covers in results"},
        {id: "groupEpisodes", label: "Group TV results by season/episode"},
        {id: "expandGroupsByDefault", label: "Expand groups by default"},
        {id: "alwaysShowTitles", label: "Always show result titles (even when grouped)"},
        {id: "showDownloadedIndicator", label: "Show already downloaded indicator"},
        {id: "hideAlreadyDownloadedResults", label: "Hide already downloaded results"}
    ];
    if ($scope.allowZipDownload) {
        $scope.optionsOptions.push({id: "showResultsAsZipButton", label: "Show button to download results as ZIP"});
    }
    $scope.optionsSelectedModel = [];
    for (var key in $scope.optionsOptions) {
        if ($scope.foo[$scope.optionsOptions[key]["id"]]) {
            $scope.optionsSelectedModel.push($scope.optionsOptions[key].id);
        }
    }

    $scope.optionsExtraSettings = {
        showSelectAll: false,
        showDeselectAll: false,
        buttonText: "Display options"
    };

    $scope.optionsEvents = {
        onToggleItem: function (item, newValue) {
            if (item.id === "duplicatesDisplayed") {
                toggleDuplicatesDisplayed(newValue);
            } else if (item.id === "groupTorrentAndNewznabResults") {
                toggleGroupTorrentAndNewznabResults(newValue);
            } else if (item.id === "sumGrabs") {
                toggleSumGrabs(newValue);
            } else if (item.id === "scrollToResults") {
                toggleScrollToResults(newValue);
            } else if (item.id === "showCovers") {
                toggleShowCovers(newValue);
            } else if (item.id === "groupEpisodes") {
                toggleGroupEpisodes(newValue);
            } else if (item.id === "expandGroupsByDefault") {
                toggleExpandGroups(newValue);
            } else if (item.id === "showDownloadedIndicator") {
                toggleDownloadedIndicator(newValue);
            } else if (item.id === "hideAlreadyDownloadedResults") {
                toggleHideAlreadyDownloadedResults(newValue);
            } else if (item.id === "showResultsAsZipButton") {
                toggleShowResultsAsZipButton(newValue);
            } else if (item.id === "alwaysShowTitles") {
                toggleAlwaysShowTitles(newValue);
            }
        }
    };

    function toggleDuplicatesDisplayed(value) {
        localStorageService.set("duplicatesDisplayed", value);
        $scope.$broadcast("duplicatesDisplayed", value);
        $scope.foo.duplicatesDisplayed = value;
        $scope.shared.duplicatesDisplayed = value;
    }

    function toggleGroupTorrentAndNewznabResults(value) {
        localStorageService.set("groupTorrentAndNewznabResults", value);
        $scope.foo.groupTorrentAndNewznabResults = value;
        $scope.shared.groupTorrentAndNewznabResults = value;
        blockAndUpdate();
    }

    function toggleSumGrabs(value) {
        localStorageService.set("sumGrabs", value);
        $scope.foo.sumGrabs = value;
        $scope.shared.sumGrabs = value;
        blockAndUpdate();
    }

    function toggleScrollToResults(value) {
        localStorageService.set("scrollToResults", value);
        $scope.foo.scrollToResults = value;
        $scope.shared.scrollToResults = value;
    }

    function toggleShowCovers(value) {
        localStorageService.set("showCovers", value);
        $scope.foo.showCovers = value;
        $scope.shared.showCovers = value;
        $scope.$broadcast("toggleShowCovers", value);
    }

    function toggleGroupEpisodes(value) {
        localStorageService.set("groupEpisodes", value);
        $scope.shared.isGroupEpisodes = value;
        $scope.foo.isGroupEpisodes = value;
        blockAndUpdate();
    }

    function toggleExpandGroups(value) {
        localStorageService.set("expandGroupsByDefault", value);
        $scope.shared.isExpandGroupsByDefault = value;
        $scope.foo.isExpandGroupsByDefault = value;
        blockAndUpdate();
    }

    function toggleDownloadedIndicator(value) {
        localStorageService.set("showDownloadedIndicator", value);
        $scope.shared.showDownloadedIndicator = value;
        $scope.foo.showDownloadedIndicator = value;
        blockAndUpdate();
    }

    function toggleHideAlreadyDownloadedResults(value) {
        localStorageService.set("hideAlreadyDownloadedResults", value);
        $scope.foo.hideAlreadyDownloadedResults = value;
        blockAndUpdate();
    }

    function toggleShowResultsAsZipButton(value) {
        localStorageService.set("showResultsAsZipButton", value);
        $scope.shared.showResultsAsZipButton = value;
        $scope.foo.showResultsAsZipButton = value;
    }

    function toggleAlwaysShowTitles(value) {
        localStorageService.set("alwaysShowTitles", value);
        $scope.shared.alwaysShowTitles = value;
        $scope.foo.alwaysShowTitles = value;
        $scope.$broadcast("toggleAlwaysShowTitles", value);
    }


    $scope.indexersForFiltering = [];
    _.forEach($scope.indexersearches, function (indexer) {
        $scope.indexersForFiltering.push({label: indexer.indexerName, id: indexer.indexerName})
    });
    $scope.categoriesForFiltering = [];
    _.forEach(CategoriesService.getWithoutAll(), function (category) {
        $scope.categoriesForFiltering.push({label: category.name, id: category.name})
    });
    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerResultsInfo[ps.indexerName.toLowerCase()] = {loadedResults: ps.loaded_results};
    });

    setDataFromSearchResult(SearchService.getLastResults(), []);
    $scope.$emit("searchResultsShown");

    if (!SearchService.getLastResults().searchResults || SearchService.getLastResults().searchResults.length === 0 || $scope.allResultsFiltered || $scope.numberOfAcceptedResults === 0) {
        //Close modal instance because no search results will be rendered that could trigger the closing
        console.log("CLosing status window");
        SearchService.getModalInstance().close();
        $scope.doShowResults = true;
    } else {
        console.log("Will leave the closing of the status window to finishRendering. # of search results: " + SearchService.getLastResults().searchResults.length + ". All results filtered: " + $scope.allResultsFiltered);
    }

    //Returns the content of the property (defined by the current sortPredicate) of the first group element
    $scope.firstResultPredicate = firstResultPredicate;

    function firstResultPredicate(item) {
        return item[0][$scope.sortPredicate];
    }

    //Returns the unique group identifier which allows angular to keep track of the grouped search results even after filtering, making filtering by indexers a lot faster (albeit still somewhat slow...)
    $scope.groupId = groupId;

    function groupId(item) {
        return item[0][0].searchResultId;
    }

    $scope.onFilterButtonsModelChange = function () {
        console.log($scope.filterButtonsModel);
        blockAndUpdate();
    };

    function blockAndUpdate() {
        startBlocking("Sorting / filtering...").then(function () {
            [$scope.filteredResults, $scope.filterReasons] = sortAndFilter(allSearchResults);
            localStorageService.set("sorting", sortModel);
        });
    }

    //Block the UI and return after timeout. This way we make sure that the blocking is done before angular starts updating the model/view. There's probably a better way to achieve that?
    function startBlocking(message) {
        var deferred = $q.defer();
        blockUI.start(message);
        $timeout(function () {
            deferred.resolve();
        }, 10);
        return deferred.promise;
    }

    $scope.$on("sort", function (event, column, sortMode, reversed) {
        if (sortMode === 0) {
            sortModel = {
                column: "epoch",
                sortMode: 2,
                reversed: true
            };
        } else {
            sortModel = {
                column: column,
                sortMode: sortMode,
                reversed: reversed
            };
        }
        $timeout(function () {
            $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode, sortModel.reversed);
        }, 10);
        blockAndUpdate();
    });

    $scope.$on("filter", function (event, column, filterModel, isActive) {
        if (filterModel.filterValue && isActive) {
            $scope.filterModel[column] = filterModel;
        } else {
            delete $scope.filterModel[column];
        }
        blockAndUpdate();
    });

    $scope.resort = function () {
    };

    function getCleanedTitle(element) {
        try {
            return element.title.toLowerCase().replace(/[\s\-\._]/ig, "");
        } catch (e) {
            console.error("Unable to clean title for result " + element);
        }
    }

    function getGroupingString(element) {

        var groupingString;
        if ($scope.shared.isGroupEpisodes) {
            groupingString = (element.showtitle + "x" + element.season + "x" + element.episode).toLowerCase().replace(/[\._\-]/ig, "");
            if (groupingString === "nullxnullxnull") {
                groupingString = getCleanedTitle(element);
            }
        } else {
            groupingString = getCleanedTitle(element);
            if (!$scope.foo.groupTorrentAndNewznabResults) {
                groupingString = groupingString + element.downloadType;
            }
        }
        return groupingString;
    }

    function sortAndFilter(results) {
        var query;
        var words;
        var filterReasons = {
            "tooSmall": 0,
            "tooLarge": 0,
            "tooYoung": 0,
            "tooOld": 0,
            "tooFewGrabs": 0,
            "tooManyGrabs": 0,
            "title": 0,
            "tooindexer": 0,
            "category": 0,
            "tooOld": 0,
            "quickFilter": 0,
            "alreadyDownloaded": 0


        };

        if ("title" in $scope.filterModel) {
            query = $scope.filterModel.title.filterValue;
            if (!(query.startsWith("/") && query.endsWith("/"))) {
                words = query.toLowerCase().split(/[\s.\-]+/);
            }
        }

        function filter(item) {
            if (item.title === null || item.title === undefined) {
                //https://github.com/theotherp/nzbhydra2/issues/690
                console.error("Item without title: " + JSON.stringify(item))
            }
            if ("size" in $scope.filterModel) {
                var filterValue = $scope.filterModel.size.filterValue;
                if (angular.isDefined(filterValue.min) && item.size / 1024 / 1024 < filterValue.min) {
                    filterReasons["tooSmall"] = filterReasons["tooSmall"] + 1;
                    return false;
                }
                if (angular.isDefined(filterValue.max) && item.size / 1024 / 1024 > filterValue.max) {
                    filterReasons["tooLarge"] = filterReasons["tooLarge"] + 1;
                    return false;
                }
            }

            if ("epoch" in $scope.filterModel) {
                var filterValue = $scope.filterModel.epoch.filterValue;

                if (angular.isDefined(filterValue.min)) {
                    var min = filterValue.min;
                    if (min.endsWith("h")) {
                        min = min.replace("h", "");
                        var age = moment.utc().diff(moment.unix(item.epoch), "hours");
                    } else if (min.endsWith("m")) {
                        min = min.replace("m", "");
                        var age = moment.utc().diff(moment.unix(item.epoch), "minutes");
                    } else {
                        var age = moment.utc().diff(moment.unix(item.epoch), "days");
                    }
                    min = Number(min);
                    if (age < min) {
                        filterReasons["tooYoung"] = filterReasons["tooYoung"] + 1;
                        return false;
                    }
                }

                if (angular.isDefined(filterValue.max)) {
                    var max = filterValue.max;
                    if (max.endsWith("h")) {
                        max = max.replace("h", "");
                        var age = moment.utc().diff(moment.unix(item.epoch), "hours");
                    } else if (max.endsWith("m")) {
                        max = max.replace("m", "");
                        var age = moment.utc().diff(moment.unix(item.epoch), "minutes");
                    } else {
                        var age = moment.utc().diff(moment.unix(item.epoch), "days");
                    }
                    max = Number(max);
                    if (age > max) {
                        filterReasons["tooOld"] = filterReasons["tooOld"] + 1;
                        return false;
                    }
                }
            }


            if ("grabs" in $scope.filterModel) {
                var filterValue = $scope.filterModel.grabs.filterValue;
                if (angular.isDefined(filterValue.min)) {
                    if ((item.seeders !== null && item.seeders < filterValue.min) || (item.seeders === null && item.grabs !== null && item.grabs < filterValue.min)) {
                        filterReasons["tooFewGrabs"] = filterReasons["tooFewGrabs"] + 1;
                        return false;
                    }
                }
                if (angular.isDefined(filterValue.max)) {
                    if ((item.seeders !== null && item.seeders > filterValue.max) || (item.seeders === null && item.grabs !== null && item.grabs > filterValue.max)) {
                        filterReasons["tooManyGrabs"] = filterReasons["tooManyGrabs"] + 1;
                        return false;
                    }
                }
            }

            if ("title" in $scope.filterModel) {
                var ok;
                if (query.startsWith("/") && query.endsWith("/")) {
                    ok = item.title.toLowerCase().match(new RegExp(query.substr(1, query.length - 2), "gi"));
                } else {
                    ok = _.every(words, function (word) {
                        if (word.startsWith("!")) {
                            if (word.length === 1) {
                                return true;
                            }
                            return item.title.toLowerCase().indexOf(word.substring(1).toLowerCase()) === -1;
                        }
                        return item.title.toLowerCase().indexOf(word.toLowerCase()) > -1;
                    });
                }

                if (!ok) {
                    filterReasons["title"] = filterReasons["title"] + 1;
                    return false;
                }
            }
            if ("indexer" in $scope.filterModel) {
                if (_.indexOf($scope.filterModel.indexer.filterValue, item.indexer) === -1) {
                    filterReasons["title"] = filterReasons["title"] + 1;
                    return false;
                }
            }
            if ("category" in $scope.filterModel) {
                if (_.indexOf($scope.filterModel.category.filterValue, item.category) === -1) {
                    filterReasons["category"] = filterReasons["category"] + 1;
                    return false;
                }
            }
            if ($scope.filterButtonsModel.source !== null) {
                var mustContain = [];
                _.each($scope.filterButtonsModel.source, function (value, key) { //key is something like 'camts', value is true or false
                    if (value) {
                        Array.prototype.push.apply(mustContain, $scope.filterButtonsModelMap[key]);
                    }
                });
                if (mustContain.length > 0) {
                    var containsAtLeastOne = _.any(mustContain, function (word) {
                        return item.title.toLowerCase().indexOf(word.toLowerCase()) > -1
                    });
                    if (!containsAtLeastOne) {
                        console.debug(item.title + " does not contain any of the words " + JSON.stringify(mustContain));
                        filterReasons["quickFilter"] = filterReasons["quickFilter"] + 1;
                        return false;
                    }
                }
            }
            if ($scope.filterButtonsModel.quality !== null && !_.isEmpty($scope.filterButtonsModel.quality)) {
                //key is something like 'q720p', value is true or false.
                var requiresAnyOf = _.keys(_.pick($scope.filterButtonsModel.quality, function (value, key) {
                    return value
                }));
                if (requiresAnyOf.length === 0) {
                    return true;
                }

                var containsAtLeastOne = _.any(requiresAnyOf, function (required) {
                    if (item.title.toLowerCase().indexOf(required.substring(1).toLowerCase()) > -1) {
                        //We need to remove the "q" which is there because keys may not start with a digit
                        return true;
                    }
                })
                if (!containsAtLeastOne) {
                    console.debug(item.title + " does not contain any of the qualities " + JSON.stringify(requiresAnyOf));
                    filterReasons["quickFilter"] = filterReasons["quickFilter"] + 1;
                    return false;
                }
            }
            if ($scope.filterButtonsModel.other !== null && !_.isEmpty($scope.filterButtonsModel.other)) {
                var requiresAnyOf = _.keys(_.pick($scope.filterButtonsModel.other, function (value, key) {
                    return value
                }));
                if (requiresAnyOf.length === 0) {
                    return true;
                }
                var containsAtLeastOne = _.any(requiresAnyOf, function (required) {
                    if (item.title.toLowerCase().indexOf(required.substring(1).toLowerCase()) > -1) {
                        //We need to remove the "q" which is there because keys may not start with a digit
                        return true;
                    }
                })
                if (!containsAtLeastOne) {
                    console.debug(item.title + " does not contain any of the 'other' values " + JSON.stringify(requiresAnyOf));
                    filterReasons["quickFilter"] = filterReasons["quickFilter"] + 1;
                    return false;
                }
            }
            if ($scope.filterButtonsModel.custom !== null && !_.isEmpty($scope.filterButtonsModel.custom)) {

                var quickFilterWords = [];
                var quickFilterRegexes = [];
                _.each($scope.filterButtonsModel.custom, function (value, key) { //key is something like 'camts', value is true or false
                    if (value) {
                        _.each($scope.filterButtonsModelMap[key], function (string) {
                            if (string.startsWith("/") && string.endsWith("/")) {
                                quickFilterRegexes.push(string);
                            } else {
                                Array.prototype.push.apply(quickFilterWords, string.split(" "));
                            }
                        });
                    }
                });
                if (quickFilterWords.length !== 0) {
                    var allMatch = _.all(quickFilterWords, function (word) {
                        if (word.startsWith("!")) {
                            if (word.length === 1) {
                                return true;
                            }
                            return item.title.toLowerCase().indexOf(word.substring(1).toLowerCase()) === -1;
                        }
                        return item.title.toLowerCase().indexOf(word.toLowerCase()) > -1;
                    })

                    if (!allMatch) {
                        console.debug(item.title + " does not match all the terms of " + JSON.stringify(quickFilterWords));
                        filterReasons["quickFilter"] = filterReasons["quickFilter"] + 1;
                        return false;
                    }
                }
                if (quickFilterRegexes.length !== 0) {
                    var allMatch = _.all(quickFilterRegexes, function (regex) {
                        return new RegExp(regex.toLowerCase().slice(1, -1)).test(item.title.toLowerCase());
                    })

                    if (!allMatch) {
                        console.debug(item.title + " does not match all the regexes of " + JSON.stringify(quickFilterRegexes));
                        filterReasons["quickFilter"] = filterReasons["quickFilter"] + 1;
                        return false;
                    }
                }

            }

            if ($scope.foo.hideAlreadyDownloadedResults && item.downloadedAt !== null) {
                filterReasons["alreadyDownloaded"] = filterReasons["alreadyDownloaded"] + 1;
                return false;
            }

            return true;
        }


        var sortPredicateKey = sortModel.column;
        var sortReversed = sortModel.reversed;

        function getSortPredicateValue(containgObject) {
            var sortPredicateValue;
            if (sortPredicateKey === "grabs") {
                if (containgObject["seeders"] !== null) {
                    sortPredicateValue = containgObject["seeders"];
                } else if (containgObject["grabs"] !== null) {
                    sortPredicateValue = containgObject["grabs"];
                } else {
                    sortPredicateValue = 0;
                }
            } else if (sortPredicateKey === "title") {
                sortPredicateValue = getCleanedTitle(containgObject);
            } else if (sortPredicateKey === "indexer") {
                sortPredicateValue = containgObject["indexer"].toLowerCase();
            } else {
                sortPredicateValue = containgObject[sortPredicateKey];
            }
            return sortPredicateValue;
        }

        function createSortedHashgroups(titleGroup) {
            function createHashGroup(hashGroup) {
                //Sorting hash group's contents should not matter for size and age and title but might for category (we might remove this, it's probably mostly unnecessary)
                var sortedHashGroup = _.sortBy(hashGroup, function (item) {
                    var sortPredicateValue = getSortPredicateValue(item);
                    return sortReversed ? -sortPredicateValue : sortPredicateValue;
                });
                //Now sort the hash group by indexer score (inverted) so that the result with the highest indexer score is shown on top (or as the only one of a hash group if it's collapsed)
                sortedHashGroup = _.sortBy(sortedHashGroup, function (item) {
                    return item.indexerscore * -1;
                });
                return sortedHashGroup;
            }

            function getHashGroupFirstElementSortPredicate(hashGroup) {
                if (sortPredicateKey === "title") {
                    //Sorting a title group internally by title doesn't make sense so fall back to sorting by age so that newest result is at the top
                    return ((10000000000 * hashGroup[0]["indexerscore"]) + hashGroup[0]["epoch"]) * -1;
                }
                return getSortPredicateValue(hashGroup[0]);
            }

            var grouped = _.groupBy(titleGroup, "hash");
            var mapped = _.map(grouped, createHashGroup);
            var sorted = _.sortBy(mapped, getHashGroupFirstElementSortPredicate);
            if (sortModel.sortMode === 2 && sortPredicateKey !== "title") {
                sorted = sorted.reverse();
            }

            return sorted;
        }

        function getTitleGroupFirstElementsSortPredicate(titleGroup) {
            var sortPredicateValue;
            if (sortPredicateKey === "grabs" && $scope.foo.sumGrabs) {
                var sumOfGrabs = 0;
                _.each(titleGroup, function (element1) {
                    _.each(element1, function (element2) {
                        sumOfGrabs += getSortPredicateValue(element2);
                    })
                });

                sortPredicateValue = sumOfGrabs;
            } else {
                sortPredicateValue = getSortPredicateValue(titleGroup[0][0]);
            }
            return sortPredicateValue
        }

        _.each(results, function (result) {
            var indexerColor = indexerColors[result.indexer];
            if (indexerColor === undefined || indexerColor === null) {
                return "";
            }
            result.style = "background-color: " + indexerColor.replace("rgb", "rgba").replace(")", ",0.5)")
        });

        var filtered = _.filter(results, filter);
        $scope.numberOfFilteredResults = results.length - filtered.length;
        $scope.allResultsFiltered = results.length > 0 && ($scope.numberOfFilteredResults === results.length);
        console.log("Filtered " + $scope.numberOfFilteredResults + " out of " + results.length);
        var newSelected = $scope.selected;
        _.forEach($scope.selected, function (x) {
            if (x === undefined) {
                return;
            }
            if (filtered.indexOf(x) === -1) {
                $scope.$broadcast("toggleSelection", x, false);
                newSelected.splice($scope.selected.indexOf(x), 1);
            }
        });
        $scope.selected = newSelected;

        var grouped = _.groupBy(filtered, getGroupingString);

        var mapped = _.map(grouped, createSortedHashgroups);
        var sorted = _.sortBy(mapped, getTitleGroupFirstElementsSortPredicate);
        if (sortModel.sortMode === 2) {
            sorted = sorted.reverse();
        }

        var filteredResults = [];
        var countTitleGroups = 0;
        var countResultsUntilTitleGroupLimitReached = 0;
        _.forEach(sorted, function (titleGroup) {
            var titleGroupIndex = 0;
            countTitleGroups++;

            _.forEach(titleGroup, function (duplicateGroup) {
                var duplicateIndex = 0;
                _.forEach(duplicateGroup, function (result) {
                    try {
                        result.titleGroupIndicator = getGroupingString(result);
                        result.titleGroupIndex = titleGroupIndex;
                        result.duplicateGroupIndex = duplicateIndex;
                        result.duplicatesLength = duplicateGroup.length;
                        result.titlesLength = titleGroup.length;
                        filteredResults.push(result);
                        duplicateIndex += 1;
                        if (countTitleGroups <= $scope.limitTo) {
                            countResultsUntilTitleGroupLimitReached++;
                        }
                        if (duplicateGroup.length > 1)
                            $scope.countDuplicates += (duplicateGroup.length - 1)
                    } catch (e) {
                        console.error("Error while processing result " + result, e);
                    }
                });
                titleGroupIndex += 1;
            });
        });
        $scope.limitTo = Math.max($scope.limitTo, countResultsUntilTitleGroupLimitReached);

        $scope.$broadcast("calculateDisplayState");

        return [filteredResults, filterReasons];
    }

    $scope.toggleTitlegroupExpand = function toggleTitlegroupExpand(titleGroup) {
        $scope.groupExpanded[titleGroup[0][0].title] = !$scope.groupExpanded[titleGroup[0][0].title];
        $scope.groupExpanded[titleGroup[0][0].hash] = !$scope.groupExpanded[titleGroup[0][0].hash];
    };

    $scope.stopBlocking = stopBlocking;

    function stopBlocking() {
        blockUI.reset();
    }

    function setDataFromSearchResult(data, previousSearchResults) {
        allSearchResults = previousSearchResults.concat(data.searchResults);
        allSearchResults = uniq(allSearchResults);
        [$scope.filteredResults, $scope.filterReasons] = sortAndFilter(allSearchResults);

        $scope.numberOfAvailableResults = data.numberOfAvailableResults;
        $scope.rejectedReasonsMap = data.rejectedReasonsMap;
        $scope.anyResultsRejected = !_.isEmpty(data.rejectedReasonsMap);
        $scope.anyIndexersSearchedSuccessfully = _.any(data.indexerSearchMetaDatas, function (x) {
            return x.wasSuccessful;
        });
        $scope.numberOfAcceptedResults = data.numberOfAcceptedResults;
        $scope.numberOfRejectedResults = data.numberOfRejectedResults;
        $scope.numberOfProcessedResults = data.numberOfProcessedResults;
        $scope.numberOfDuplicateResults = data.numberOfDuplicateResults;
        $scope.numberOfLoadedResults = allSearchResults.length;
        $scope.indexersearches = data.indexerSearchMetaDatas;

        $scope.loadMoreEnabled = ($scope.numberOfLoadedResults + $scope.numberOfRejectedResults < $scope.numberOfAvailableResults) || _.any(data.indexerSearchMetaDatas, function (x) {
            return x.hasMoreResults;
        });
        $scope.totalAvailableUnknown = _.any(data.indexerSearchMetaDatas, function (x) {
            return !x.totalResultsKnown;
        });

        if (!$scope.foo.indexerStatusesExpanded && _.any(data.indexerSearchMetaDatas, function (x) {
            return !x.wasSuccessful;
        })) {
            growl.info("Errors occurred during searching, Check indexer statuses")
        }
        //Only show those categories in filter that are actually present in the results
        $scope.categoriesForFiltering = [];
        var allUsedCategories = _.uniq(_.pluck(allSearchResults, "category"));
        _.forEach(CategoriesService.getWithoutAll(), function (category) {
            if (allUsedCategories.indexOf(category.name) > -1) {
                $scope.categoriesForFiltering.push({label: category.name, id: category.name})
            }
        });
    }

    function uniq(searchResults) {
        var seen = {};
        var out = [];
        var len = searchResults.length;
        var j = 0;
        for (var i = 0; i < len; i++) {
            var item = searchResults[i];
            if (seen[item.searchResultId] !== 1) {
                seen[item.searchResultId] = 1;
                out[j++] = item;
            }
        }
        return out;
    }

    $scope.loadMore = loadMore;

    function loadMore(loadAll) {
        startBlocking(loadAll ? "Loading all results..." : "Loading more results...").then(function () {
            $scope.loadingMore = true;
            var limit = loadAll ? $scope.numberOfAvailableResults - $scope.numberOfProcessedResults : null;
            SearchService.loadMore($scope.numberOfLoadedResults, limit, loadAll).then(function (data) {
                setDataFromSearchResult(data, allSearchResults);
                $scope.loadingMore = false;
                //stopBlocking();
            });
        });
    }


    $scope.countResults = countResults;

    function countResults() {
        return allSearchResults.length;
    }

    $scope.invertSelection = function invertSelection() {
        $scope.$broadcast("invertSelection");
    };

    $scope.deselectAll = function deselectAll() {
        $scope.$broadcast("deselectAll");
    };

    $scope.selectAll = function selectAll() {
        $scope.$broadcast("selectAll");
    };

    $scope.toggleIndexerStatuses = function () {
        $scope.foo.indexerStatusesExpanded = !$scope.foo.indexerStatusesExpanded;
        localStorageService.set("indexerStatusesExpanded", $scope.foo.indexerStatusesExpanded);
    };

    $scope.getRejectedReasonsTooltip = function () {
        if (_.isEmpty($scope.rejectedReasonsMap)) {
            return "No rejected results";
        } else {
            var tooltip = "<span >Rejected results:<span><br>";
            tooltip += '<table class="rejected-tooltip-table"><thead><tr><th width="50px">Count</th><th>Reason</th></tr></thead>';
            _.forEach($scope.rejectedReasonsMap, function (count, reason) {
                tooltip += '<tr><td>' + count + '</td><td>' + reason + '</td></tr>';
            });
            tooltip += '</table>';
            tooltip += '<br>';
            tooltip += "<span >Filtered results:<span><br>";
            tooltip += '<table class="rejected-tooltip-table"><thead><tr><th width="50px">Count</th><th>Reason</th></tr></thead>';
            _.forEach($scope.filterReasons, function (count, reason) {
                if (count > 0) {
                    tooltip += '<tr><td>' + count + '</td><td>' + reason + '</td></tr>';
                }
            });
            tooltip += '</table>';
            tooltip += '<br>'
            return tooltip;
        }
    };


    $scope.$on("checkboxClicked", function (event, originalEvent, newCheckedValue, clickTargetElement) {
        if (originalEvent.shiftKey && $scope.lastClickedElement) {
            $scope.$broadcast("shiftClick", Number($scope.lastClickedValue), $scope.lastClickedElement, clickTargetElement);
        }
        $scope.lastClickedElement = clickTargetElement;
        $scope.lastClickedValue = newCheckedValue;
    });

    $scope.$on("toggleTitleExpansionUp", function ($event, value, titleGroupIndicator) {
        $scope.$broadcast("toggleTitleExpansionDown", value, titleGroupIndicator);
    });

    $scope.$on("toggleDuplicateExpansionUp", function ($event, value, hash) {
        $scope.$broadcast("toggleDuplicateExpansionDown", value, hash);
    });

    $scope.$on("selectionUp", function ($event, result, value) {
        var index = $scope.selected.indexOf(result);
        if (value && index === -1) {
            $scope.selected.push(result);
        } else if (!value && index > -1) {
            $scope.selected.splice(index, 1);
        }
    });

    $scope.downloadNzbsCallback = function (addedIds) {
        if (addedIds !== null && addedIds.length > 0) {
            growl.info("Removing downloaded NZBs from selection");
            var toRemove = _.filter($scope.selected, function (x) {
                return addedIds.indexOf(Number(x.searchResultId)) > -1;
            });
            var newSelected = $scope.selected;
            _.forEach(toRemove, function (x) {
                $scope.$broadcast("toggleSelection", x, false);
                newSelected.splice($scope.selected.indexOf(x), 1);
            });
            $scope.selected = newSelected;
        }
    };


    $scope.filterRejectedZero = function () {
        return function (entry) {
            return entry[1] > 0;
        }
    };

    $scope.onPageChange = function (newPageNumber, oldPageNumber) {
        _.each($scope.selected, function (x) {
            $scope.$broadcast("toggleSelection", x, true);
        })
    };

    $scope.$on("onFinishRender", function () {
        console.log("Finished rendering results.")
        $scope.doShowResults = true;
        $timeout(function () {
            if ($scope.foo.scrollToResults) {
                var searchResultsElement = angular.element(document.getElementById('display-options'));
                $document.scrollToElement(searchResultsElement, 0, 500);
            }
            stopBlocking();
            console.log("Closing search status window because rendering is finished.")
            SearchService.getModalInstance().close();
        }, 1);
    });

    if (ConfigService.getSafe().emby.embyApiKey) {
        if ($stateParams.mode === "tvsearch") {
            $http.get("internalapi/emby/isSeriesAvailable?tvdbId=" + $stateParams.tvdbId).then(function (result) {
                console.log("Show already available on emby: " + result.data);
                $scope.showEmbyResults = result.data;
                $scope.embyType = "show";
            });

        } else if ($stateParams.mode === "movie") {
            $http.get("internalapi/emby/isMovieAvailable?tmdbId=" + $stateParams.tmdbId).then(function (result) {
                console.log("Movie already available on emby: " + result.data);
                $scope.showEmbyResults = result.data;
                $scope.embyType = "movie";
            });
        }
    }


    $timeout(function () {
        DebugService.print();
    }, 3000);


}
