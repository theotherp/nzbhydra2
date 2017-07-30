angular
    .module('nzbhydraApp')
    .controller('UpdateFooterController', UpdateFooterController);

function UpdateFooterController($scope, UpdateService, HydraAuthService, $http, $uibModal, ConfigService) {

    $scope.updateAvailable = false;
    $scope.checked = false;

    $scope.mayUpdate = HydraAuthService.getUserInfos().maySeeAdmin;

    $scope.$on("user:loggedIn", function () {
        if (HydraAuthService.getUserInfos().maySeeAdmin && !$scope.checked) {
            retrieveUpdateInfos();
        }
    });


    if ($scope.mayUpdate) {
        retrieveUpdateInfos();
    }

    function retrieveUpdateInfos() {
        $scope.checked = true;
        UpdateService.getVersions().then(function (data) {
            $scope.currentVersion = data.data.currentVersion;
            $scope.latestVersion = data.data.latestVersion;
            $scope.updateAvailable = data.data.updateAvailable;
            $scope.changelog = data.data.changelog;
        });
    }


    $scope.update = function () {
        UpdateService.update();
    };

    $scope.ignore = function () {
        UpdateService.ignore($scope.latestVersion);
    };

    $scope.showChangelog = function () {
        UpdateService.showChanges();
    };

    if (ConfigService.getSafe().showNews) {
        $http.get("internalapi/news/forcurrentversion").success(function (data) {
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

    $http.get("internalapi/welcomeshown").success(function (wasWelcomeShown) {
        if (!wasWelcomeShown) {
            $http.put("internalapi/welcomeshown");
            $uibModal.open({
                templateUrl: 'static/html/welcome-modal.html',
                controller: WelcomeModalInstanceCtrl,
                size: "md"
            });
        }
    });


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