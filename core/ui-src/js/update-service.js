angular
    .module('nzbhydraApp')
    .factory('UpdateService', UpdateService);

function UpdateService($http, growl, blockUI, RestartService) {

    var currentVersion;
    var latestVersion;
    var updateAvailable;
    var changelog;
    var versionHistory;

    return {
        update: update,
        showChanges: showChanges,
        getVersions: getVersions,
        getChangelog: getChangelog,
        getVersionHistory: getVersionHistory
    };

    function getVersions() {
        return $http.get("internalapi/updates/versions").then(
            function (data) {
                currentVersion = data.data.currentVersion;
                latestVersion = data.data.latestVersion;
                updateAvailable = data.data.updateAvailable;
                return data;
            }
        );
    }

    function getChangelog() {
        return $http.get("internalapi/changesSince").then(function (data) {
            changelog = data.data;
            return data;
        });
    }

    function getVersionHistory() {
        return $http.get("internalapi/updates/versionHistory").then(function (data) {
            versionHistory = data.data;
            return data;
        });
    }

    function showChanges() {
        return $http.get("internalapi/updates/changesSince").then(function (response) {
            var myInjector = angular.injector(["ng", "ui.bootstrap"]);
            var $uibModal = myInjector.get("$uibModal");
            var params = {
                size: "lg",
                templateUrl: "static/html/changelog.html",
                resolve: {
                    changelog: function () {
                        return response.data.message;
                    }
                },
                controller: function ($scope, $sce, $uibModalInstance, changelog) {
                    //I fucking hate that untrusted HTML shit
                    changelog = $sce.trustAsHtml(changelog);
                    $scope.changelog = changelog;

                    $scope.ok = function () {
                        $uibModalInstance.dismiss();
                    };
                }
            };

            var modalInstance = $uibModal.open(params);

            modalInstance.result.then();
        });
    }


    function update() {
        blockUI.start("Downloading update. Please stand by...");
        $http.get("internalapi/updates/installUpdate").then(function (data) {
                //Handle like restart, ping application and wait
                //Perhaps save the version to which we want to update, ask later and see if they're equal. If not updating apparently failed...
                RestartService.restart("Downloaded update. Shutting down Hydra for wrapper to execute update.");
            },
            function () {
                blockUI.reset();
                growl.info("An error occurred while updating. Please check the logs.");
            });
    }
}