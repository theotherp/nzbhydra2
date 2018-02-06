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

  function controller($scope, UpdateService, RequestsErrorHandler, HydraAuthService, $http, $uibModal, ConfigService) {

    $scope.updateAvailable = false;
    $scope.checked = false;
    var welcomeIsBeingShown = false;

    $scope.mayUpdate = HydraAuthService.getUserInfos().maySeeAdmin;

    $scope.$on("user:loggedIn", function() {
      if (HydraAuthService.getUserInfos().maySeeAdmin && !$scope.checked) {
        retrieveUpdateInfos();
      }
    });


    if ($scope.mayUpdate) {
      retrieveUpdateInfos();
    }

    function retrieveUpdateInfos() {
      $scope.checked = true;
      UpdateService.getInfos().then(function(data) {
        $scope.currentVersion = data.data.currentVersion;
        $scope.latestVersion = data.data.latestVersion;
        $scope.updateAvailable = data.data.updateAvailable;
        $scope.changelog = data.data.changelog;
        $scope.runInDocker = data.data.runInDocker;
      });
    }


    $scope.update = function() {
      UpdateService.update();
    };

    $scope.ignore = function() {
      UpdateService.ignore($scope.latestVersion);
      $scope.updateAvailable = false;
    };

    $scope.showChangelog = function() {
      UpdateService.showChanges();
    };

    function checkAndShowNews() {
      RequestsErrorHandler.specificallyHandled(function() {
        if (ConfigService.getSafe().showNews) {
          $http.get("internalapi/news/forcurrentversion").then(function(data) {
            if (data && data.length > 0) {
              $uibModal.open({
                templateUrl: 'static/html/news-modal.html',
                controller: NewsModalInstanceCtrl,
                size: "lg",
                resolve: {
                  news: function() {
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
      RequestsErrorHandler.specificallyHandled(function() {
        $http.get("internalapi/welcomeshown").success(function(wasWelcomeShown) {
          if (!wasWelcomeShown) {
            $http.put("internalapi/welcomeshown");
            var promise = $uibModal.open({
              templateUrl: 'static/html/welcome-modal.html',
              controller: WelcomeModalInstanceCtrl,
              size: "md"
            });
            promise.opened.then(function() {
              welcomeIsBeingShown = true;
            });
            promise.closed.then(function() {
              welcomeIsBeingShown = false;
            });
          } else {
            _.defer(checkAndShowNews);
          }
        }, function() {
          console.log("Error while checking for welcome");
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
  $scope.close = function() {
    $uibModalInstance.dismiss();
  };
}

angular
  .module('nzbhydraApp')
  .controller('WelcomeModalInstanceCtrl', WelcomeModalInstanceCtrl);

function WelcomeModalInstanceCtrl($scope, $uibModalInstance, $state, MigrationService) {
  $scope.close = function() {
    $uibModalInstance.dismiss();
  };

  $scope.startMigration = function() {
    $uibModalInstance.dismiss();
    MigrationService.migrate();
  };

  $scope.goToConfig = function() {
    $uibModalInstance.dismiss();
    $state.go("root.config.main");
  };
}
