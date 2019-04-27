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
    .directive('hydraUpdatesFooter', hydraUpdatesFooter);

function hydraUpdatesFooter() {
    return {
        templateUrl: 'static/html/directives/updates-footer.html',
        controller: controller
    };

    function controller($scope, UpdateService, RequestsErrorHandler, HydraAuthService, $http, $uibModal, ConfigService, GenericStorageService, ModalService) {

        $scope.updateAvailable = false;
        $scope.checked = false;
        var welcomeIsBeingShown = false;

        $scope.mayUpdate = HydraAuthService.getUserInfos().maySeeAdmin;

        $scope.$on("user:loggedIn", function () {
            if (HydraAuthService.getUserInfos().maySeeAdmin && !$scope.checked) {
                retrieveUpdateInfos();
            }
        });

        function checkForOutOfMemoryException() {
            GenericStorageService.get("outOfMemoryDetected", false).then(function (response) {
                if (response.data !== "" && response.data) {
                    //headline, message, params, size, textAlign
                    ModalService.open("Out of memory error detected", 'The log indicates that the process ran out of memory. Please increase the XMX value in the main config and restart.', {
                        yes: {
                            text: "OK"
                        }
                    }, undefined, "left");
                    GenericStorageService.put("outOfMemoryDetected", false, false);
                }
            });
        }

        function checkForOutdatedWrapper() {
            GenericStorageService.get("outdatedWrapperDetected", false).then(function (response) {
                if (response.data !== "" && response.data) {
                    ModalService.open("Outdated wrapper detected", 'The NZBHydra wrapper (i.e. the executable or python script you use to run NZBHydra) seems to be outdated. Please update it:<br>Shut down NZBHydra, <a href="https://github.com/theotherp/nzbhydra2/releases/latest">download the latest version</a> and extract it into your main NZBHydra folder. Start NZBHydra again.', {
                        yes: {
                            text: "OK"
                        }
                    }, undefined, "left");
                    GenericStorageService.put("outdatedWrapperDetected", false, false);
                }
            });
        }

        if ($scope.mayUpdate) {
            retrieveUpdateInfos();
            checkForOutOfMemoryException();
            checkForOutdatedWrapper();
        }

        function retrieveUpdateInfos() {
            $scope.checked = true;
            UpdateService.getInfos().then(function (response) {
                if (response) {
                    $scope.currentVersion = response.data.currentVersion;
                    $scope.latestVersion = response.data.latestVersion;
                    $scope.updateAvailable = response.data.updateAvailable;
                    $scope.changelog = response.data.changelog;
                    $scope.runInDocker = response.data.runInDocker;
                    $scope.$emit("showUpdateFooter", $scope.updateAvailable);
                } else {
                    $scope.$emit("showUpdateFooter", false);
                }
            });
        }


        $scope.update = function () {
            UpdateService.update();
        };

        $scope.ignore = function () {
            UpdateService.ignore($scope.latestVersion);
            $scope.updateAvailable = false;
            $scope.$emit("showUpdateFooter", $scope.updateAvailable);
        };

        $scope.showChangelog = function () {
            UpdateService.showChanges();
        };

        function checkAndShowNews() {
            RequestsErrorHandler.specificallyHandled(function () {
                if (ConfigService.getSafe().showNews) {
                    $http.get("internalapi/news/forcurrentversion").then(function (response) {
                        var data = response.data;
                        if (data && data.length > 0) {
                            $uibModal.open({
                                templateUrl: 'static/html/news-modal.html',
                                controller: NewsModalInstanceCtrl,
                                size: "lg",
                                resolve: {
                                    news: function () {
                                        return data;
                                    }
                                }
                            });
                            $http.put("internalapi/news/saveshown");
                        }
                    });
                }
            });
        }

        function checkAndShowWelcome() {
            RequestsErrorHandler.specificallyHandled(function () {
                $http.get("internalapi/welcomeshown").then(function (response) {
                    if (!response.data) {
                        $http.put("internalapi/welcomeshown");
                        var promise = $uibModal.open({
                            templateUrl: 'static/html/welcome-modal.html',
                            controller: WelcomeModalInstanceCtrl,
                            size: "md"
                        });
                        promise.opened.then(function () {
                            welcomeIsBeingShown = true;
                        });
                        promise.closed.then(function () {
                            welcomeIsBeingShown = false;
                        });
                    } else {
                        _.defer(checkAndShowNews);
                    }
                }, function () {
                    console.log("Error while checking for welcome")
                });
            });
        }

        checkAndShowWelcome();
    }
}

angular
    .module('nzbhydraApp')
    .controller('NewsModalInstanceCtrl', NewsModalInstanceCtrl);

function NewsModalInstanceCtrl($scope, $uibModalInstance, news) {
    $scope.news = news;
    $scope.close = function () {
        $uibModalInstance.dismiss();
    };
}

angular
    .module('nzbhydraApp')
    .controller('WelcomeModalInstanceCtrl', WelcomeModalInstanceCtrl);

function WelcomeModalInstanceCtrl($scope, $uibModalInstance, $state, MigrationService) {
    $scope.close = function () {
        $uibModalInstance.dismiss();
    };

    $scope.startMigration = function () {
        $uibModalInstance.dismiss();
        MigrationService.migrate();
    };

    $scope.goToConfig = function () {
        $uibModalInstance.dismiss();
        $state.go("root.config.main");
    }
}