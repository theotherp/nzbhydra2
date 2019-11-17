angular
    .module('nzbhydraApp')
    .directive('hydraupdates', hydraupdates);

function hydraupdates() {
    return {
        templateUrl: 'static/html/directives/updates.html',
        controller: controller
    };

    function controller($scope, UpdateService) {

        $scope.loadingPromise = UpdateService.getInfos().then(function (response) {
            $scope.currentVersion = response.data.currentVersion;
            $scope.repVersion = response.data.latestVersion;
            $scope.updateAvailable = response.data.updateAvailable;
            $scope.latestVersionIgnored = response.data.latestVersionIgnored;
            $scope.changelog = response.data.changelog;
            $scope.runInDocker = response.data.runInDocker;
            $scope.wrapperOutdated = response.data.wrapperOutdated;
            $scope.showUpdateBannerOnDocker = response.data.showUpdateBannerOnDocker;
            if ($scope.runInDocker && !$scope.showUpdateBannerOnDocker) {
                $scope.updateAvailable = false;
            }
        });

        UpdateService.getVersionHistory().then(function (response) {
            $scope.versionHistory = response.data;
        });

        $scope.update = function () {
            UpdateService.update();
        };

        $scope.showChangelog = function () {
            UpdateService.showChanges($scope.changelog);
        };

        $scope.forceUpdate = function () {
            UpdateService.update()
        };
    }
}

