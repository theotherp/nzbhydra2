angular
    .module('nzbhydraApp')
    .factory('RestartService', RestartService);

function RestartService(growl, NzbHydraControlService, $uibModal) {

    return {
        restart: restart,
        startCountdown: startCountdown
    };


    function restart(message) {
        NzbHydraControlService.restart().then(function (data) {
            startCountdown(message, data.data.message);
        }, function () {
            growl.info("Unable to send restart command.");
        })
    }


    function startCountdown(message, baseUrl) {
        $uibModal.open({
            templateUrl: 'static/html/restart-modal.html',
            controller: RestartModalInstanceCtrl,
            size: "md",
            backdrop: 'static',
            keyboard: false,
            resolve: {
                message: function () {
                    return message;
                },
                baseUrl: function () {
                    return baseUrl;
                }
            }
        });

    }


}

angular
    .module('nzbhydraApp')
    .controller('RestartModalInstanceCtrl', RestartModalInstanceCtrl);

function RestartModalInstanceCtrl($scope, $timeout, $http, $window, message, baseUrl) {

    message = (angular.isDefined(message) ? message : "");
    $scope.message = message + "Will reload page when NZBHydra is back";
    $scope.baseUrl = baseUrl;
    $scope.pingUrl = angular.isDefined(baseUrl) ? (baseUrl + "/internalapi/control/ping") : "internalapi/control/ping";

    $scope.internalCaR = function (message, timer) {
        if (timer === 45) {
            $scope.message = message + "Restarting takes longer than expected. You might want to check the log to see what's going on.";
        } else {
            $scope.message = message + "Will reload page when NZBHydra is back.";
            $timeout(function () {
                $http.get($scope.pingUrl, {ignoreLoadingBar: true}).then(function () {
                    $timeout(function () {
                        $scope.message = "Reloading page...";
                        $window.location.href = $scope.baseUrl;
                    }, 500);
                }, function () {
                    $scope.internalCaR(message, timer + 1);
                });
            }, 1000);
            $scope.message = message + "Will reload page when NZBHydra is back.";
        }
    };

    //Wait three seconds because otherwise the currently running instance will be found
    $timeout(function () {
        $scope.internalCaR(message, 0);
    }, 3000)

}
