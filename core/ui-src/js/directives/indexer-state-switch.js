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
    .directive('indexerStateSwitch', indexerStateSwitch);

function indexerStateSwitch() {
    return {
        templateUrl: 'static/html/directives/indexer-state-switch.html',
        scope: {
            indexer: "=",
            handleWidth: "@"
        },
        replace: true,
        controller: controller
    };

    function controller($scope) {
        $scope.value = $scope.indexer.state === "ENABLED";
        $scope.handleWidth = $scope.handleWidth || "130px";
        var initialized = false;

        function calculateTextAndColor() {
            if ($scope.indexer.state === "DISABLED_USER") {
                $scope.offText = "Disabled by user";
                $scope.offColor = "default";
            } else if ($scope.indexer.state === "DISABLED_SYSTEM_TEMPORARY") {
                $scope.offText = "Temporary disabled";
                $scope.offColor = "warning";
            } else if ($scope.indexer.state === "DISABLED_SYSTEM") {
                $scope.offText = "Disabled by system";
                $scope.offColor = "danger";
            }
        }

        calculateTextAndColor();

        $scope.onChange = function () {
            if (initialized) {
                //Skip on first call when initial value is set
                $scope.indexer.state = $scope.value ? "ENABLED" : "DISABLED_USER";
                calculateTextAndColor();
            }
            initialized = true;
        }
    }
}