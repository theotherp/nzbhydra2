angular
    .module('nzbhydraApp')
    .controller('SearchResultsController', SearchResultsController);

//SearchResultsController.$inject = ['blockUi'];
function SearchResultsController($stateParams, $scope, $q, $timeout, $document, blockUI, growl, localStorageService, SearchService, ConfigService, CategoriesService, DebugService) {
    // console.time("Presenting");
    DebugService.log("foobar");
    $scope.limitTo = 100;
    $scope.offset = 0;
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
    $scope.lastClickedRowIndex = null;
    $scope.lastClickedValue = null;

    var allSearchResults = [];
    var sortModel = {};
    $scope.filterModel = {};

    $scope.isShowFilterButtons = ConfigService.getSafe().searching.showQuickFilterButtons;
    $scope.isShowFilterButtonsMovie = $scope.isShowFilterButtons && $stateParams.category.toLowerCase().indexOf("movie") > -1;
    $scope.isShowFilterButtonsTv = $scope.isShowFilterButtons && $stateParams.category.toLowerCase().indexOf("tv") > -1;
    $scope.filterButtonsModel = {
        source: {},
        quality: {}
    };
    $scope.filterButtonsModelMap = {
        tv: ['hdtv'],
        camts: ['cam', 'ts'],
        web: ['webrip', 'web-dl', 'webdl'],
        dvd: ['dvd'],
        bluray: ['bluray', 'blu-ray']
    };
    if (localStorageService.get("sorting") !== null) {
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
        scrollToResults: localStorageService.get("scrollToResults") !== null ? localStorageService.get("scrollToResults") : true
    };
    $scope.loadMoreEnabled = false;
    $scope.totalAvailableUnknown = false;
    $scope.expandedTitlegroups = [];
    $scope.optionsOptions = [
        {id: "duplicatesDisplayed", label: "Show duplicate display triggers"},
        {id: "groupTorrentAndNewznabResults", label: "Group torrent and usenet results"},
        {id: "sumGrabs", label: "Use sum of grabs / seeders for filtering / sorting of groups"},
        {id: "scrollToResults", label: "Scroll to results when finished"}
    ];
    $scope.optionsSelectedModel = [];
    for (var key in $scope.optionsOptions) {
        if ($scope.foo[$scope.optionsOptions[key].id]) {
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
            console.log(item.id + ": " + newValue);
            if (item.id === "duplicatesDisplayed") {
                toggleDuplicatesDisplayed(newValue);
            } else if (item.id === "groupTorrentAndNewznabResults") {
                toggleGroupTorrentAndNewznabResults(newValue);
            } else if (item.id === "sumGrabs") {
                toggleSumGrabs(newValue);
            } else if (item.id === "scrollToResults") {
                toggleScrollToResults(newValue);
            }
        }
    };

    function toggleDuplicatesDisplayed(value) {
        localStorageService.set("duplicatesDisplayed", value);
        $scope.$broadcast("duplicatesDisplayed", value);
        $scope.foo.duplicatesDisplayed = value;
    }

    function toggleGroupTorrentAndNewznabResults(value) {
        localStorageService.set("groupTorrentAndNewznabResults", value);
        $scope.foo.groupTorrentAndNewznabResults = value;
        blockAndUpdate();
    }

    function toggleSumGrabs(value) {
        localStorageService.set("sumGrabs", value);
        $scope.foo.sumGrabs = value;
        blockAndUpdate();
    }

    function toggleScrollToResults(value) {
        localStorageService.set("scrollToResults", value);
        $scope.foo.scrollToResults = value;
    }


    $scope.indexersForFiltering = [];
    _.forEach($scope.indexersearches, function (indexer) {
        $scope.indexersForFiltering.push({label: indexer.indexerName, id: indexer.indexerName});
    });
    $scope.categoriesForFiltering = [];
    _.forEach(CategoriesService.getWithoutAll(), function (category) {
        $scope.categoriesForFiltering.push({label: category.name, id: category.name});
    });
    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerResultsInfo[ps.indexerName.toLowerCase()] = {loadedResults: ps.loaded_results};
    });

    setDataFromSearchResult(SearchService.getLastResults(), []);
    $scope.$emit("searchResultsShown");
    if (!SearchService.getLastResults().searchResults || SearchService.getLastResults().searchResults.length === 0) {
        //Close modal instance because no search results will be rendered that could trigger the closing
        SearchService.getModalInstance().close();
        $scope.doShowResults = true;
    }
    //stopBlocking();

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
        blockAndUpdate();
    };

    function blockAndUpdate() {
        startBlocking("Sorting / filtering...").then(function () {
            $scope.filteredResults = sortAndFilter(allSearchResults);
            //stopBlocking();
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
        return element.title.toLowerCase().replace(/[\s\-\._]/ig, "");
    }

    function getGroupingString(element) {
        var groupingString = getCleanedTitle(element);
        if (!$scope.foo.groupTorrentAndNewznabResults) {
            groupingString = groupingString + element.downloadType;
        }
        return groupingString;
    }

    function sortAndFilter(results) {
        // console.time("sortAndFilter");
        var query;
        var words;
        if ("title" in $scope.filterModel) {
            query = $scope.filterModel.title.filterValue;
            words = query.toLowerCase().split(/[\s.\-]+/);
        }

        function filter(item) {
            if ("size" in $scope.filterModel) {
                var filterValue = $scope.filterModel.size.filterValue;
                if (angular.isDefined(filterValue.min) && item.size / 1024 / 1024 < filterValue.min) {
                    return false;
                }
                if (angular.isDefined(filterValue.max) && item.size / 1024 / 1024 > filterValue.max) {
                    return false;
                }
            }

            if ("epoch" in $scope.filterModel) {
                var filterValue = $scope.filterModel.epoch.filterValue;
                var ageDays = moment.utc().diff(moment.unix(item.epoch), "days");
                if (angular.isDefined(filterValue.min) && ageDays < filterValue.min) {
                    return false;
                }
                if (angular.isDefined(filterValue.max) && ageDays > filterValue.max) {
                    return false;
                }
            }

            if ("grabs" in $scope.filterModel) {
                var filterValue = $scope.filterModel.grabs.filterValue;
                if (angular.isDefined(filterValue.min)) {
                    if ((item.seeders !== null && item.seeders < filterValue.min) || (item.seeders === null && item.grabs !== null && item.grabs < filterValue.min)) {
                        return false;
                    }
                }
                if (angular.isDefined(filterValue.max)) {
                    if ((item.seeders !== null && item.seeders > filterValue.max) || (item.seeders === null && item.grabs !== null && item.grabs > filterValue.max)) {
                        return false;
                    }
                }
            }

            if ("title" in $scope.filterModel) {
                var ok = _.every(words, function (word) {
                    return item.title.toLowerCase().indexOf(word) > -1;
                });
                if (!ok) return false;
            }
            if ("indexer" in $scope.filterModel) {
                if (_.indexOf($scope.filterModel.indexer.filterValue, item.indexer) === -1) {
                    return false;
                }
            }
            if ("category" in $scope.filterModel) {
                if (_.indexOf($scope.filterModel.category.filterValue, item.category) === -1) {
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
                        return item.title.toLowerCase().indexOf(word) > -1;
                    });
                    if (!containsAtLeastOne) {
                        return false;
                    }
                }
            }
            if ($scope.filterButtonsModel.quality !== null && !_.isEmpty($scope.filterButtonsModel.quality)) {
                var containsAtLeastOne = false;
                var anyRequired = false;
                _.each($scope.filterButtonsModel.quality, function (value, key) { //key is something like 'q720p', value is true or false
                    anyRequired = anyRequired || value;
                    if (value && item.title.toLowerCase().indexOf(key.substring(1)) > -1) {
                        containsAtLeastOne = true;
                    }
                });
                return !anyRequired || containsAtLeastOne;
            }

            return true;
        }



        var sortPredicateKey = sortModel.column;
        var sortReversed = sortModel.reversed;

        function getSortPredicateValue(containgObject) {
            var sortPredicateValue;
            if (sortPredicateKey === "grabs") {
                if (containgObject.seeders !== null) {
                    sortPredicateValue = containgObject.seeders;
                } else if (containgObject.grabs !== null) {
                    sortPredicateValue = containgObject.grabs;
                } else {
                    sortPredicateValue = 0;
                }
            } else if (sortPredicateKey === "title") {
                sortPredicateValue = getCleanedTitle(containgObject);
            } else if (sortPredicateKey === "indexer") {
                sortPredicateValue = containgObject.indexer.toLowerCase();
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
                    return hashGroup[0].epoch * -1;
                }
                var sortPredicateValue = getSortPredicateValue(hashGroup[0]);
                return sortPredicateValue;
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
                    });
                });

                sortPredicateValue = sumOfGrabs;
            } else {
                sortPredicateValue = getSortPredicateValue(titleGroup[0][0]);
            }
            return sortPredicateValue;
        }

        var filtered = _.filter(results, filter);
        var newSelected = $scope.selected;
        _.forEach($scope.selected, function (x) {
            if (filtered.indexOf(x) === -1) {
                console.log("Removing " + x.title + " from selected results because it's being hidden");
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

        $scope.lastClickedRowIndex = null;

        var filteredResults = [];
        _.forEach(sorted, function (titleGroup) {
            var titleGroupIndex = 0;
            _.forEach(titleGroup, function (duplicateGroup) {
                var duplicateIndex = 0;
                _.forEach(duplicateGroup, function (result) {
                    result.titleGroupIndicator = getGroupingString(result);
                    result.titleGroupIndex = titleGroupIndex;
                    result.duplicateGroupIndex = duplicateIndex;
                    result.duplicatesLength = duplicateGroup.length;
                    result.titlesLength = titleGroup.length;
                    filteredResults.push(result);
                    duplicateIndex += 1;
                });
                titleGroupIndex += 1;
            });
        });

        $scope.$broadcast("calculateDisplayState");

        // console.timeEnd("sortAndFilter");
        return filteredResults;
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
        $scope.filteredResults = sortAndFilter(allSearchResults);

        $scope.numberOfAvailableResults = data.numberOfAvailableResults;
        $scope.rejectedReasonsMap = data.rejectedReasonsMap;
        $scope.anyResultsRejected = !_.isEmpty(data.rejectedReasonsMap);
        $scope.anyIndexersSearchedSuccessfully = _.any(data.indexerSearchMetaDatas, function (x) {
            return x.wasSuccessful;
        });
        $scope.numberOfAcceptedResults = data.numberOfAcceptedResults;
        $scope.numberOfRejectedResults = data.numberOfRejectedResults;
        $scope.numberOfProcessedResults = data.numberOfProcessedResults;
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
            growl.info("Errors occurred during searching, Check indexer statuses");
        }
        //Only show those categories in filter that are actually present in the results
        $scope.categoriesForFiltering = [];
        var allUsedCategories = _.uniq(_.pluck(allSearchResults, "category"));
        _.forEach(CategoriesService.getWithoutAll(), function (category) {
            if (allUsedCategories.indexOf(category.name) > -1) {
                $scope.categoriesForFiltering.push({label: category.name, id: category.name});
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
            var limit = loadAll ? $scope.numberOfAvailableResults - $scope.numberOfProcessedResults : null;
            SearchService.loadMore($scope.numberOfLoadedResults, limit, loadAll).then(function (data) {
                setDataFromSearchResult(data, allSearchResults);
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
            return tooltip;
        }
    };

    $scope.$on("checkboxClicked", function (event, originalEvent, rowIndex, newCheckedValue, clickTargetElement) {
        if (originalEvent.shiftKey && $scope.lastClickedRowIndex !== null) {
            $scope.$broadcast("shiftClick", Number($scope.lastClickedRowIndex), Number(rowIndex), Number($scope.lastClickedValue), $scope.lastClickedElement, clickTargetElement);
        }
        $scope.lastClickedRowIndex = rowIndex;
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
        $scope.$broadcast("selectionDown", result, value);
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
        };
    };

    $scope.$on("onFinishRender", function () {
        // console.log("Last rendered");
        $scope.doShowResults = true;
        $timeout(function () {
            if ($scope.foo.scrollToResults) {
                var searchResultsElement = angular.element(document.getElementById('display-options'));
                $document.scrollToElement(searchResultsElement, 0, 500);
            }
            stopBlocking();
            SearchService.getModalInstance().close();
        }, 1);
    });

    $timeout(function () {
        DebugService.print();
    }, 3000);

    $timeout(function () {
        function getWatchers(root) {
            root = angular.element(root || document.documentElement);
            var watcherCount = 0;
            var ids = [];

            function getElemWatchers(element, ids) {
                var isolateWatchers = getWatchersFromScope(element.data().$isolateScope, ids);
                var scopeWatchers = getWatchersFromScope(element.data().$scope, ids);
                var watchers = scopeWatchers.concat(isolateWatchers);
                angular.forEach(element.children(), function (childElement) {
                    watchers = watchers.concat(getElemWatchers(angular.element(childElement), ids));
                });
                return watchers;
            }

            function getWatchersFromScope(scope, ids) {
                if (scope) {
                    if (_.indexOf(ids, scope.$id) > -1) {
                        return [];
                    }
                    ids.push(scope.$id);
                    if (scope.$$watchers) {
                        if (scope.$$watchers.length > 1) {
                            var a;
                            a = 1;
                        }
                        return scope.$$watchers;
                    }
                    {
                        return [];
                    }

                } else {
                    return [];
                }
            }

            return getElemWatchers(root, ids);
        }

    }, 100);

}
