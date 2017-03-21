angular
    .module('nzbhydraApp')
    .factory('UpdateService', UpdateService);

function UpdateService($http, growl, blockUI, RestartService) {

    var currentVersion;
    var repVersion;
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
        return $http.get("internalapi/get_versions").then(function (data) {
            currentVersion = data.data.currentVersion;
            repVersion = data.data.repVersion;
            updateAvailable = data.data.updateAvailable;
            return data;
        });
    }

    function getChangelog() {
        return $http.get("internalapi/get_changelog", {currentVersion: currentVersion, repVersion: repVersion}).then(function (data) {
            changelog = data.data.changelog;
            return data;
        });
    }

    function getVersionHistory() {
        return $http.get("internalapi/get_version_history").then(function (data) {
            versionHistory = data.data.versionHistory;
            return data;
        });
    }

    function showChanges(changelog) {

        var myInjector = angular.injector(["ng", "ui.bootstrap"]);
        var $uibModal = myInjector.get("$uibModal");
        var params = {
            size: "lg",
            templateUrl: "static/html/changelog.html",
            resolve: {
                changelog: function () {
                    return changelog;
                }
            },
            controller: function ($scope, $sce, $uibModalInstance, changelog) {
                //I fucking hate that untrusted HTML shit
                changelog = $sce.trustAsHtml(changelog);
                $scope.changelog = changelog;
                console.log(changelog);
                $scope.ok = function () {
                    $uibModalInstance.dismiss();
                };
            }
        };

        var modalInstance = $uibModal.open(params);

        modalInstance.result.then();
    }


    function update() {
        blockUI.start("Updating. Please stand by...");
        $http.get("internalapi/update").then(function (data) {
                if (data.data.success) {
                    RestartService.restart("Update complete.", 15);
                } else {
                    blockUI.reset();
                    growl.info("An error occurred while updating. Please check the logs.");
                }
            },
            function () {
                blockUI.reset();
                growl.info("An error occurred while updating. Please check the logs.");
            });
    }
}

