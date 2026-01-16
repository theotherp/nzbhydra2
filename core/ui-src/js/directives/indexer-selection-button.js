

angular
    .module('nzbhydraApp')
    .directive('indexerSelectionButton', indexerSelectionButton);

function indexerSelectionButton() {
    return {
        templateUrl: 'static/html/directives/indexer-selection-button.html',
        scope: {
            selectedIndexers: "=",
            availableIndexers: "=",
            btn: "@"
        },
        controller: controller
    };

    function controller($scope) {

        $scope.anyTorrentIndexersSelectable = _.any($scope.availableIndexers,
            function (indexer) {
                return indexer.searchModuleType === "TORZNAB";
            }
        );

        $scope.invertSelection = function () {
            _.forEach($scope.availableIndexers, function (x) {
                var index = _.indexOf($scope.selectedIndexers, x.name);
                if (index === -1) {
                    $scope.selectedIndexers.push(x.name);
                } else {
                    $scope.selectedIndexers.splice(index, 1);
                }
            });
        };

        $scope.selectAll = function () {
            $scope.deselectAll();
            $scope.selectedIndexers.push.apply($scope.selectedIndexers, _.pluck($scope.availableIndexers, "name"));
        };

        $scope.deselectAll = function () {
            $scope.selectedIndexers.splice(0, $scope.selectedIndexers.length);
        };

        function selectByPredicate(predicate) {
            $scope.deselectAll();
            $scope.selectedIndexers.push.apply($scope.selectedIndexers,
                _.pluck(
                    _.filter($scope.availableIndexers,
                        predicate
                    ), "name")
            );
        }

        $scope.reset = function () {
            selectByPredicate(function (indexer) {
                return indexer.preselect;
            });
        };

        $scope.selectAllUsenet = function () {
            selectByPredicate(function (indexer) {
                return indexer.searchModuleType !== "TORZNAB";
            });
        };

        $scope.selectAllTorrent = function () {
            selectByPredicate(function (indexer) {
                return indexer.searchModuleType === "TORZNAB";
            });
        }
    }
}

