angular
    .module('nzbhydraApp')
    .controller('SearchResultsController', SearchResultsController);

function sumRejected(rejected) {
    return _.reduce(rejected, function (memo, entry) {
        return memo + entry[1];
    }, 0);
}

//SearchResultsController.$inject = ['blockUi'];
function SearchResultsController($stateParams, $scope, $q, $timeout, blockUI, growl, localStorageService, SearchService, ConfigService) {

    if (localStorageService.get("sorting") !== null) {
        var sorting = localStorageService.get("sorting");
        $scope.sortPredicate = sorting.predicate;
        $scope.sortReversed = sorting.reversed;
    } else {
        $scope.sortPredicate = "epoch";
        $scope.sortReversed = true;
    }
    $scope.limitTo = 100;
    $scope.offset = 0;
    //Handle incoming data

    $scope.indexersearches = SearchService.getLastResults().indexerSearchMetaDatas;
    $scope.notPickedIndexersWithReason = [];
    _.forEach(SearchService.getLastResults().notPickedIndexersWithReason, function (k, v) {
        $scope.notPickedIndexersWithReason.push({"indexer": v, "reason": k});
    });
    $scope.indexerDisplayState = []; //Stores if a indexerName's searchResults should be displayed or not
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

    $scope.foo = {
        indexerStatusesExpanded: localStorageService.get("indexerStatusesExpanded") !== null ? localStorageService.get("indexerStatusesExpanded") : false,
        duplicatesDisplayed: localStorageService.get("duplicatesDisplayed") !== null ? localStorageService.get("duplicatesDisplayed") : false
    };

    $scope.countFilteredOut = 0;

    //Initially set visibility of all found indexers to true, they're needed for initial filtering / sorting
    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerDisplayState[ps.indexerName.toLowerCase()] = true;
    });

    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerResultsInfo[ps.indexerName.toLowerCase()] = {loadedResults: ps.loaded_results};
    });

    //Process searchResults
    $scope.results = SearchService.getLastResults().searchResults;
    $scope.numberOfAvailableResults = SearchService.getLastResults().numberOfAvailableResults;
    $scope.numberOfResults = SearchService.getLastResults().numberOfResults;
    $scope.rejected = SearchService.getLastResults().rejectedReasonsMap;
    $scope.numberOfRejectedResults = SearchService.getLastResults().numberOfRejectedResults;
    $scope.filteredResults = sortAndFilter($scope.results);

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
        }, 100);
        return deferred.promise;
    }

    //Set sorting according to the predicate. If it's the same as the old one, reverse, if not sort by the given default (so that age is descending, name ascending, etc.)
    //Sorting (and filtering) are really slow (about 2 seconds for 1000 results from 5 indexers) but I haven't found any way of making it faster, apart from the tracking
    $scope.setSorting = setSorting;
    function setSorting(predicate, reversedDefault) {
        if (predicate == $scope.sortPredicate) {
            $scope.sortReversed = !$scope.sortReversed;
        } else {
            $scope.sortReversed = reversedDefault;
        }
        $scope.sortPredicate = predicate;
        startBlocking("Sorting / filtering...").then(function () {
            $scope.filteredResults = sortAndFilter($scope.results);
            blockUI.reset();
            localStorageService.set("sorting", {predicate: predicate, reversed: $scope.sortReversed});
        });
    }

    $scope.inlineFilter = inlineFilter;
    function inlineFilter(result) {
        var ok = true;
        ok = ok && $scope.titleFilter && result.title.toLowerCase().indexOf($scope.titleFilter) > -1;
        ok = ok && $scope.minSizeFilter && $scope.minSizeFilter * 1024 * 1024 < result.size;
        ok = ok && $scope.maxSizeFilter && $scope.maxSizeFilter * 1024 * 1024 > result.size;
        return ok;
    }


    $scope.$on("searchInputChanged", function (event, query, minage, maxage, minsize, maxsize) {
        $scope.filteredResults = sortAndFilter($scope.results, query, minage, maxage, minsize, maxsize);
    });

    $scope.resort = function () {
    };

    function sortAndFilter(results, query, minage, maxage, minsize, maxsize) {
        $scope.countFilteredOut = 0;

        function filterByAgeAndSize(item) {
            var ok = true;
            ok = ok && (!_.isNumber(minsize) || item.size / 1024 / 1024 >= minsize)
                && (!_.isNumber(maxsize) || item.size / 1024 / 1024 <= maxsize)
                && (!_.isNumber(minage) || item.age_days >= Number(minage))
                && (!_.isNumber(maxage) || item.age_days <= Number(maxage));

            if (ok && query) {
                var words = query.toLowerCase().split(" ");
                ok = _.every(words, function (word) {
                    return item.title.toLowerCase().indexOf(word) > -1;
                });
            }
            if (!ok) {
                $scope.countFilteredOut++;
            }
            return ok;
        }


        function getItemIndexerDisplayState(item) {
            return true;
            return $scope.indexerDisplayState[item.indexer.toLowerCase()];
        }

        function getCleanedTitle(element) {
            return element.title.toLowerCase().replace(/[\s\-\._]/ig, "");
        }

        function createSortedHashgroups(titleGroup) {

            function createHashGroup(hashGroup) {
                //Sorting hash group's contents should not matter for size and age and title but might for category (we might remove this, it's probably mostly unnecessary)
                var sortedHashGroup = _.sortBy(hashGroup, function (item) {
                    var sortPredicateValue;
                    if ($scope.sortPredicate == "grabs") {
                        sortPredicateValue = angular.isDefined(item.grabs) ? item.grabs : 0;
                    } else {
                        sortPredicateValue = item[$scope.sortPredicate];
                    }
                    //var sortPredicateValue = item[$scope.sortPredicate];
                    return $scope.sortReversed ? -sortPredicateValue : sortPredicateValue;
                });
                //Now sort the hash group by indexer score (inverted) so that the result with the highest indexer score is shown on top (or as the only one of a hash group if it's collapsed)
                sortedHashGroup = _.sortBy(sortedHashGroup, function (item) {
                    return item.indexerscore * -1;
                });
                return sortedHashGroup;
            }

            function getHashGroupFirstElementSortPredicate(hashGroup) {
                if ($scope.sortPredicate == "grabs") {
                    sortPredicateValue = angular.isDefined(hashGroup[0].grabs) ? hashGroup[0].grabs : 0;
                } else {
                    var sortPredicateValue = hashGroup[0][$scope.sortPredicate];
                }
                return $scope.sortReversed ? -sortPredicateValue : sortPredicateValue;
            }

            return _.chain(titleGroup).groupBy("hash").map(createHashGroup).sortBy(getHashGroupFirstElementSortPredicate).value();
        }

        function getTitleGroupFirstElementsSortPredicate(titleGroup) {
            var sortPredicateValue;
            if ($scope.sortPredicate == "title") {
                sortPredicateValue = titleGroup[0][0].title.toLowerCase();
            } else if ($scope.sortPredicate == "grabs") {
                sortPredicateValue = angular.isDefined(titleGroup[0][0].grabs) ? titleGroup[0][0].grabs : 0;
            } else {
                sortPredicateValue = titleGroup[0][0][$scope.sortPredicate];
            }

            return sortPredicateValue;
        }

        var filtered = _.chain(results)
        //Filter by age, size and title
            .filter(filterByAgeAndSize)
            //Remove elements of which the indexer is currently hidden
            .filter(getItemIndexerDisplayState)
            //Make groups of results with the same title
            .groupBy(getCleanedTitle)
            //For every title group make subgroups of duplicates and sort the group    
            .map(createSortedHashgroups)
            //And then sort the title group using its first hashgroup's first item (the group itself is already sorted and so are the hash groups)    
            .sortBy(getTitleGroupFirstElementsSortPredicate)
            .value();
        if ($scope.sortReversed) {
            filtered = filtered.reverse();
        }
        if ($scope.countFilteredOut > 0) {
            growl.info("Filtered " + $scope.countFilteredOut + " of the retrieved results");
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

    $scope.loadMore = loadMore;
    function loadMore(loadAll) {
        startBlocking(loadAll ? "Loading all results..." : "Loading more results...").then(function () {
            SearchService.loadMore($scope.resultsCount, loadAll).then(function (data) {
                $scope.results = $scope.results.concat(data.results);
                $scope.filteredResults = sortAndFilter($scope.results);
                $scope.total = data.total;
                $scope.rejected = data.rejected;
                $scope.countRejected = sumRejected($scope.rejected);
                $scope.resultsCount += data.resultsCount;
                stopBlocking();
            });
        });
    }


//Filters the results according to new visibility settings.
    $scope.toggleIndexerDisplay = toggleIndexerDisplay;
    function toggleIndexerDisplay(indexer) {
        $scope.indexerDisplayState[indexer.toLowerCase()] = $scope.indexerDisplayState[indexer.toLowerCase()];
        startBlocking("Filtering. Sorry...").then(function () {
            $scope.filteredResults = sortAndFilter($scope.results);
        }).then(function () {
            stopBlocking();
        });
    }

    $scope.countResults = countResults;
    function countResults() {
        return $scope.results.length;
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

    $scope.$on("checkboxClicked", function (event, originalEvent, rowIndex, newCheckedValue) {
        if (originalEvent.shiftKey && $scope.lastClicked != null) {
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

