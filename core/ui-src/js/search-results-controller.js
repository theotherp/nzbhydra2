angular
    .module('nzbhydraApp')
    .controller('SearchResultsController', SearchResultsController);

//SearchResultsController.$inject = ['blockUi'];
function SearchResultsController($stateParams, $scope, $q, $timeout, blockUI, growl, localStorageService, SearchService, ConfigService) {


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

    $scope.lastClicked = null;
    $scope.lastClickedValue = null;

    var allSearchResults;
    var sortModel;
    $scope.filterModel = {};
    if (localStorageService.get("sorting") !== null) {
        var sorting = localStorageService.get("sorting");
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
        duplicatesDisplayed: localStorageService.get("duplicatesDisplayed") !== null ? localStorageService.get("duplicatesDisplayed") : false
    };


    $scope.indexersForFiltering = [];
    _.forEach($scope.indexersearches, function (indexer) {
        $scope.indexersForFiltering.push({label: indexer.indexerName, id: indexer.indexerName})
    });
    $scope.categoriesForFiltering = [];
    _.forEach(ConfigService.getSafe().categoriesConfig.categories, function (category) {
        $scope.categoriesForFiltering.push({label: category.name, id: category.name})
    });
    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerResultsInfo[ps.indexerName.toLowerCase()] = {loadedResults: ps.loaded_results};
    });

    setDataFromSearchResult(SearchService.getLastResults(), []);

    $scope.$emit("searchResultsShown");
    stopBlocking();

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

    //Block the UI and return after timeout. This way we make sure that the blocking is done before angular starts updating the model/view. There's probably a better way to achieve that?
    function startBlocking(message) {
        var deferred = $q.defer();
        blockUI.start(message);
        $timeout(function () {
            deferred.resolve();
        }, 10);
        return deferred.promise;
    }


    function blockAndUpdate() {
        startBlocking("Sorting / filtering...").then(function () {
            $scope.filteredResults = sortAndFilter(allSearchResults);
            blockUI.reset();
            localStorageService.set("sorting", sortModel);
        });
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

    function sortAndFilter(results) {
        var query;
        var words;
        if ("title" in $scope.filterModel) {
            query = $scope.filterModel.title.filterValue;
            words = query.toLowerCase().split(" ");
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

            if ("age" in $scope.filterModel) {
                var filterValue = $scope.filterModel.age.filterValue;
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
                if (angular.isDefined(filterValue.min) && item.grabs < filterValue.min) {
                    return false;
                }
                if (angular.isDefined(filterValue.max) && item.grabs > filterValue.max) {
                    return false;
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
            return true;
        }


        function getCleanedTitle(element) {
            return element.title.toLowerCase().replace(/[\s\-\._]/ig, "");
        }

        var sortPredicate = sortModel.column;
        var sortReversed = sortModel.reversed;

        function createSortedHashgroups(titleGroup) {
            function createHashGroup(hashGroup) {
                //Sorting hash group's contents should not matter for size and age and title but might for category (we might remove this, it's probably mostly unnecessary)
                var sortedHashGroup = _.sortBy(hashGroup, function (item) {
                    var sortPredicateValue;
                    if (sortPredicate === "grabs") {
                        sortPredicateValue = angular.isDefined(item.grabs) ? item.grabs : 0;
                    } else {
                        sortPredicateValue = item[sortPredicate];
                    }
                    return sortReversed ? -sortPredicateValue : sortPredicateValue;
                });
                //Now sort the hash group by indexer score (inverted) so that the result with the highest indexer score is shown on top (or as the only one of a hash group if it's collapsed)
                sortedHashGroup = _.sortBy(sortedHashGroup, function (item) {
                    return item.indexerscore * -1;
                });
                return sortedHashGroup;
            }

            function getHashGroupFirstElementSortPredicate(hashGroup) {
                if (sortPredicate === "grabs") {
                    sortPredicateValue = angular.isDefined(hashGroup[0].grabs) ? hashGroup[0].grabs : 0;
                } else {
                    var sortPredicateValue = hashGroup[0][sortPredicate];
                }
                return sortReversed ? -sortPredicateValue : sortPredicateValue;
            }

            return _.chain(titleGroup).groupBy("hash").map(createHashGroup).sortBy(getHashGroupFirstElementSortPredicate).value();
        }

        function getTitleGroupFirstElementsSortPredicate(titleGroup) {
            var sortPredicateValue;
            if (sortPredicate === "title") {
                sortPredicateValue = titleGroup[0][0].title.toLowerCase();
            } else if (sortPredicate === "grabs") {
                sortPredicateValue = angular.isDefined(titleGroup[0][0].grabs) ? titleGroup[0][0].grabs : 0;
            } else {
                sortPredicateValue = titleGroup[0][0][sortPredicate];
            }

            return sortPredicateValue;
        }

        var filtered = _.chain(results)
            .filter(filter)
            //Make groups of results with the same title
            .groupBy(getCleanedTitle)
            //For every title group make subgroups of duplicates and sort the group    
            .map(createSortedHashgroups)
            //And then sort the title group using its first hashgroup's first item (the group itself is already sorted and so are the hash groups)    
            .sortBy(getTitleGroupFirstElementsSortPredicate)
            .value();
        if (sortModel.sortMode === 2) {
            filtered = filtered.reverse();
        }

        $scope.lastClicked = null;
        return filtered;
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
        $scope.filteredResults = sortAndFilter(allSearchResults);
        $scope.numberOfAvailableResults = data.numberOfAvailableResults;
        $scope.rejectedReasonsMap = data.rejectedReasonsMap;
        $scope.numberOfAcceptedResults = data.numberOfAcceptedResults;
        $scope.numberOfRejectedResults = data.numberOfRejectedResults;
        $scope.numberOfProcessedResults = data.numberOfProcessedResults;
        $scope.numberOfLoadedResults = allSearchResults.length;
        $scope.indexersearches = data.indexerSearchMetaDatas;

        if (!$scope.foo.indexerStatusesExpanded && _.any(data.indexerSearchMetaDatas, function (x) {
                return !x.wasSuccessful;
            })) {
            growl.info("Errors occurred during searching, Check indexer statuses")
        }
    }

    $scope.loadMore = loadMore;
    function loadMore(loadAll) {
        startBlocking(loadAll ? "Loading all results..." : "Loading more results...").then(function () {
            var limit = loadAll ? $scope.numberOfAvailableResults - $scope.numberOfProcessedResults : null;
            SearchService.loadMore($scope.numberOfLoadedResults, limit).then(function (data) {
                setDataFromSearchResult(data, allSearchResults);
                stopBlocking();
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

    $scope.toggleIndexerStatuses = function () {
        $scope.foo.indexerStatusesExpanded = !$scope.foo.indexerStatusesExpanded;
        localStorageService.set("indexerStatusesExpanded", $scope.foo.indexerStatusesExpanded);
    };

    $scope.toggleDuplicatesDisplayed = function () {
        //$scope.foo.duplicatesDisplayed = !$scope.foo.duplicatesDisplayed;
        localStorageService.set("duplicatesDisplayed", $scope.foo.duplicatesDisplayed);
        $scope.$broadcast("duplicatesDisplayed", $scope.foo.duplicatesDisplayed);
    };

    $scope.getRejectedReasonsTooltip = function () {
        if ($scope.rejectedReasonsMap.length === 0) {
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

    $scope.$on("checkboxClicked", function (event, originalEvent, rowIndex, newCheckedValue) {
        if (originalEvent.shiftKey && $scope.lastClicked !== null) {
            $scope.$broadcast("shiftClick", Number($scope.lastClicked), Number(rowIndex), Number($scope.lastClickedValue));
        }
        $scope.lastClicked = rowIndex;
        $scope.lastClickedValue = newCheckedValue;
    });

    $scope.filterRejectedZero = function () {
        return function (entry) {
            return entry[1] > 0;
        }
    }
}

