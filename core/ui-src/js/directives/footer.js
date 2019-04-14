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
    .directive('footer', footer);

function footer() {
    return {
        templateUrl: 'static/html/directives/footer.html',
        controller: controller
    };

    function controller($scope, $interval, $http, ConfigService, bootstrapped) {

        $scope.updateFooterBottom = 0;

        var safeConfig = bootstrapped.safeConfig;
        $scope.showDownloaderStatus = safeConfig.downloading.showDownloaderStatus;
        $scope.showUpdateFooter = false;

        $scope.$on("showDownloaderStatus", function (doShow) {
            $scope.showDownloaderStatus = doShow;
            updateFooterBottom();
            updatePaddingBottom();
        });
        $scope.$on("showUpdateFooter", function (doShow) {
            $scope.showUpdateFooter = doShow;
            updateFooterBottom();
            updatePaddingBottom();
        });

        function updateFooterBottom() {
            $scope.updateFooterBottom = $scope.showDownloaderStatus ? 35 : 0;
        }

        function updatePaddingBottom() {
            var paddingBottom = 0;
            if ($scope.showDownloaderStatus) {
                paddingBottom += 30;
            }
            if ($scope.showUpdateFooter) {
                paddingBottom += 40;
            }
            $scope.paddingBottom = paddingBottom;
            document.getElementById("wrap").classList.remove("padding-bottom-0");
            document.getElementById("wrap").classList.remove("padding-bottom-30");
            document.getElementById("wrap").classList.remove("padding-bottom-40");
            document.getElementById("wrap").classList.remove("padding-bottom-70");
            var paddingBottomClass = "padding-bottom-" + paddingBottom;
            document.getElementById("wrap").classList.add(paddingBottomClass);
        }

        updatePaddingBottom();

        updateFooterBottom();


    }
}

