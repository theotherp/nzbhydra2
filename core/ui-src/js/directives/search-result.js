angular
    .module('nzbhydraApp')
    .directive('searchResult', searchResult);

function searchResult() {
    return {
        templateUrl: 'static/html/directives/search-result.html',
        require: '^result',
        replace: false,
        scope: {
            result: "<",
            searchResultsControllerShared: "<"
        },
        controller: controller
    };


    function handleDisplay($scope, localStorageService, ConfigService) {
        //Display state / expansion
        $scope.foo.duplicatesDisplayed = localStorageService.get("duplicatesDisplayed") !== null ? localStorageService.get("duplicatesDisplayed") : false;
        $scope.foo.showCovers = localStorageService.get("showCovers") !== null ? localStorageService.get("showCovers") : true;
        $scope.duplicatesExpanded = false;
        $scope.titlesExpanded = false;
        $scope.coverSize = ConfigService.getSafe().searching.coverSize;

        function calculateDisplayState() {
            $scope.resultDisplayed = ($scope.result.titleGroupIndex === 0 || $scope.titlesExpanded) && ($scope.duplicatesExpanded || $scope.result.duplicateGroupIndex === 0);
        }

        calculateDisplayState();

        $scope.toggleTitleExpansion = function () {
            $scope.titlesExpanded = !$scope.titlesExpanded;
            $scope.$emit("toggleTitleExpansionUp", $scope.titlesExpanded, $scope.result.titleGroupIndicator);
        };

        $scope.toggleDuplicateExpansion = function () {
            $scope.duplicatesExpanded = !$scope.duplicatesExpanded;
            $scope.$emit("toggleDuplicateExpansionUp", $scope.duplicatesExpanded, $scope.result.hash);
        };

        $scope.$on("toggleTitleExpansionDown", function ($event, value, titleGroupIndicator) {
            if ($scope.result.titleGroupIndicator === titleGroupIndicator) {
                $scope.titlesExpanded = value;
                calculateDisplayState();
            }
        });

        $scope.$on("toggleDuplicateExpansionDown", function ($event, value, hash) {
            if ($scope.result.hash === hash) {
                $scope.duplicatesExpanded = value;
                calculateDisplayState();
            }
        });

        $scope.$on("toggleShowCovers", function ($event, value) {
            $scope.foo.showCovers = value;
        });

        $scope.$on("duplicatesDisplayed", function ($event, value) {
            $scope.foo.duplicatesDisplayed = value;
            if (!value) {
                //Collapse duplicate groups they shouldn't be displayed
                $scope.duplicatesExpanded = false;
            }
            calculateDisplayState();
        });

        $scope.$on("calculateDisplayState", function () {
            calculateDisplayState();
        });
    }

    function handleSelection($scope, $element) {
        $scope.foo.selected = false;

        function sendSelectionEvent(isSelected) {
            $scope.$emit("selectionUp", $scope.result, isSelected);
        }

        $scope.clickCheckbox = function (event, result) {
            var isSelected = event.currentTarget.checked;
            sendSelectionEvent(isSelected);
            $scope.$emit("checkboxClicked", event, $scope.rowIndex, isSelected, event.currentTarget);
        };

        function isBetween(num, betweena, betweenb) {
            return (betweena <= num && num <= betweenb) || (betweena >= num && num >= betweenb);
        }

        $scope.$on("shiftClick", function (event, startIndex, endIndex, newValue, previousClickTargetElement, newClickTargetElement) {
            var fromYlocation = $($(previousClickTargetElement).prop("parentNode")).prop("offsetTop");
            var newYlocation = $($(newClickTargetElement).prop("parentNode")).prop("offsetTop");
            var elementYlocation = $($element).prop("offsetTop");
            if (!$scope.resultDisplayed) {
                return;
            }

            if (isBetween(elementYlocation, fromYlocation, newYlocation)) {
                sendSelectionEvent(newValue);
                $scope.foo.selected = newValue === 1;
            }
        });

        $scope.$on("invertSelection", function () {
            if (!$scope.resultDisplayed) {
                return;
            }
            $scope.foo.selected = !$scope.foo.selected;
            sendSelectionEvent($scope.foo.selected);
        });

        $scope.$on("deselectAll", function () {
            if (!$scope.resultDisplayed) {
                return;
            }
            $scope.foo.selected = false;
            sendSelectionEvent($scope.foo.selected);
        });

        $scope.$on("selectAll", function () {
            if (!$scope.resultDisplayed) {
                return;
            }
            $scope.foo.selected = true;

            sendSelectionEvent($scope.foo.selected);
        });

        $scope.$on("toggleSelection", function ($event, result, value) {
            if (!$scope.resultDisplayed || result !== $scope.result) {
                return;
            }
            $scope.foo.selected = value;
        });
    }

    function handleNfoDisplay($scope, $http, growl, $uibModal, HydraAuthService) {
        $scope.showDetailsDl = HydraAuthService.getUserInfos().maySeeDetailsDl;

        $scope.showNfo = showNfo;

        function showNfo(resultItem) {
            if (resultItem.has_nfo === 0) {
                return;
            }
            var uri = new URI("internalapi/nfo/" + resultItem.searchResultId);
            return $http.get(uri.toString()).then(function (response) {
                if (response.data.successful) {
                    if (response.data.hasNfo) {
                        $scope.openModal("lg", response.data.content)
                    } else {
                        growl.info("No NFO available");
                    }
                } else {
                    growl.error(response.data.content);
                }
            });
        }

        $scope.openModal = openModal;

        function openModal(size, nfo) {
            var modalInstance = $uibModal.open({
                template: '<pre class="nfo"><span ng-bind-html="nfo"></span></pre>',
                controller: NfoModalInstanceCtrl,
                size: size,
                resolve: {
                    nfo: function () {
                        return nfo;
                    }
                }
            });

            modalInstance.result.then();
        }

        $scope.getNfoTooltip = function () {
            if ($scope.result.hasNfo === "YES") {
                return "Show NFO"
            } else if ($scope.result.hasNfo === "MAYBE") {
                return "Try to load NFO (may not be available)";
            } else {
                return "No NFO available";
            }
        };
    }

    function handleNzbDownload($scope, $window) {
        $scope.downloadNzb = downloadNzb;

        function downloadNzb(resultItem) {
            //href = "{{ result.link }}"
            $window.location.href = resultItem.link;
        }
    }


    function controller($scope, $element, $http, growl, $attrs, $uibModal, $window, DebugService, localStorageService, HydraAuthService, ConfigService) {
        $scope.foo = {};
        handleDisplay($scope, localStorageService, ConfigService);
        handleSelection($scope, $element);
        handleNfoDisplay($scope, $http, growl, $uibModal, HydraAuthService);
        handleNzbDownload($scope, $window);

        $scope.kify = function () {
            return function (number) {
                if (number > 1000) {
                    return Math.round(number / 1000) + "k";
                }
                return number;
            };
        };


        $scope.showCover = function (url) {
            console.log("Show " + url);
            $uibModal.open({
                template: '<div class="modal-body" style="text-align: center">\n' +
                    '    <img ng-src="{{url}}" ng-click="$close()"/>\n' +
                    '</div>',
                controller: function ($scope, url) {
                    $scope.url = url;
                },
                resolve: {
                    url: function () {
                        return url;
                    }
                },
                size: "md",
                keyboard: true,
                windowTopClass: 'cover-modal-dialog'
            });
        };

    }
}

angular
    .module('nzbhydraApp')
    .controller('NfoModalInstanceCtrl', NfoModalInstanceCtrl);

function NfoModalInstanceCtrl($scope, $uibModalInstance, nfo) {

    $scope.nfo = nfo;

    $scope.ok = function () {
        $uibModalInstance.close($scope.selected.item);
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };
}

angular
    .module('nzbhydraApp')
    .filter('kify', function () {
        return function (number) {
            if (number > 1000) {
                return Math.round(number / 1000) + "k";
            }
            return number;
        }
    });