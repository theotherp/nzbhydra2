/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

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

