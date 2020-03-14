angular
    .module('nzbhydraApp')
    .factory('UpdateService', UpdateService);

function UpdateService($http, growl, blockUI, RestartService, RequestsErrorHandler, $uibModal, $timeout) {

    var currentVersion;
    var latestVersion;
    var updateAvailable;
    var latestVersionIgnored;
    var versionHistory;
    var runInDocker;


    return {
        update: update,
        showChanges: showChanges,
        getInfos: getInfos,
        getVersionHistory: getVersionHistory,
        ignore: ignore,
        showChangesFromAutomaticUpdate: showChangesFromAutomaticUpdate
    };

    function getInfos() {
        return RequestsErrorHandler.specificallyHandled(function () {
            return $http.get("internalapi/updates/infos").then(
                function (response) {
                    currentVersion = response.data.currentVersion;
                    latestVersion = response.data.latestVersion;
                    updateAvailable = response.data.updateAvailable;
                    latestVersionIgnored = response.data.latestVersionIgnored;
                    runInDocker = response.data.runInDocker;
                    automaticUpdateToNotice = response.data.automaticUpdateToNotice;
                    return response;
                }, function () {

                }
            );
        });
    }

    function ignore(version) {
        return $http.put("internalapi/updates/ignore?version=" + version).then(function (response) {
            return response;
        });
    }

    function getVersionHistory() {
        return $http.get("internalapi/updates/versionHistory").then(function (response) {
            versionHistory = response.data;
            return response;
        });
    }

    function showChanges() {
        return $http.get("internalapi/updates/changesSince").then(function (response) {
            var params = {
                size: "lg",
                templateUrl: "static/html/changelog-modal.html",
                resolve: {
                    versionHistory: function () {
                        return response.data;
                    }
                },
                controller: function ($scope, $sce, $uibModalInstance, versionHistory) {
                    $scope.versionHistory = versionHistory;

                    $scope.ok = function () {
                        $uibModalInstance.dismiss();
                    };
                }
            };

            var modalInstance = $uibModal.open(params);
            modalInstance.result.then();
        });
    }

    function showChangesFromAutomaticUpdate() {
        return $http.get("internalapi/updates/automaticUpdateVersionHistory").then(function (response) {
            var params = {
                size: "lg",
                templateUrl: "static/html/changelog-modal.html",
                resolve: {
                    versionHistory: function () {
                        return response.data;
                    }
                },
                controller: function ($scope, $sce, $uibModalInstance, versionHistory) {
                    $scope.versionHistory = versionHistory;

                    $scope.ok = function () {
                        $uibModalInstance.dismiss();
                    };
                }
            };

            var modalInstance = $uibModal.open(params);
            modalInstance.result.then();
            return $http.get("internalapi/updates/ackAutomaticUpdateVersionHistory").then(function (response) {

            });
        });
    }


    function update() {
        var modalInstance = $uibModal.open({
            templateUrl: 'static/html/update-modal.html',
            controller: 'UpdateModalInstanceCtrl',
            size: "md",
            backdrop: 'static',
            keyboard: false
        });
        $http.put("internalapi/updates/installUpdate").then(function () {
                //Handle like restart, ping application and wait
                //Perhaps save the version to which we want to update, ask later and see if they're equal. If not updating apparently failed...
                $timeout(function () {
                    //Give user some time to read the last message
                    RestartService.startCountdown("");
                    modalInstance.close();
                }, 2000);
            },
            function () {
                growl.info("An error occurred while updating. Please check the logs.");
                modalInstance.close();
            });
    }
}

angular
    .module('nzbhydraApp')
    .controller('UpdateModalInstanceCtrl', UpdateModalInstanceCtrl);

function UpdateModalInstanceCtrl($scope, $http, $interval, RequestsErrorHandler) {
    $scope.messages = [];

    var interval = $interval(function () {
            RequestsErrorHandler.specificallyHandled(function () {
                $http.get("internalapi/updates/messages").then(
                    function (data) {
                        $scope.messages = data.data;
                    }
                );
            });
        },
        200);

    $scope.$on('$destroy', function () {
        if (interval !== null) {
            $interval.cancel(interval);
        }
    });

}