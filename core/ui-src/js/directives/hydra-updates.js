angular
    .module('nzbhydraApp')
    .directive('hydraupdates', hydraupdates);

function hydraupdates() {
    return {
        templateUrl: 'static/html/directives/updates.html',
        controller: controller
    };

    function controller($scope, UpdateService) {

        $scope.loadingPromise = UpdateService.getInfos().then(function (data) {
            $scope.currentVersion = data.data.currentVersion;
            $scope.repVersion = data.data.latestVersion;
            $scope.updateAvailable = data.data.updateAvailable;
            $scope.latestVersionIgnored = data.data.latestVersionIgnored;
            $scope.changelog = data.data.changelog;
        });

        UpdateService.getVersionHistory().then(function (data) {
            $scope.versionHistory = data.data;
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

