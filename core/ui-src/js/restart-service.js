angular
    .module('nzbhydraApp')
    .factory('RestartService', RestartService);

function RestartService(blockUI, $timeout, $window, growl, $http, NzbHydraControlService) {

    return {
        restart: restart,
        countdown: countdown
    };


    function internalCaR(message, timer) {
        if (timer === 45) {
            blockUI.start(message + "Restarting takes longer than expected. You might want to check the log to see what's going on.");
        } else {
            blockUI.start(message + " Will reload page when NZB Hydra is back.");
            $timeout(function () {
                $http.get("internalapi/control/ping", {ignoreLoadingBar: true}).then(function () {
                    $timeout(function () {
                        blockUI.start("Reloading page...");
                        $window.location.reload();
                    }, 500);
                }, function () {
                    internalCaR(message, timer + 1);
                });
            }, 1000);
            blockUI.start(message + " Will reload page when NZB Hydra is back.");
        }
    }

    function countdown() {
        internalCaR("", 15);
    }

    function restart(message) {
        message = angular.isDefined(message) ? message + " " : "";
        NzbHydraControlService.restart().then(function () {
                blockUI.start(message + " Will reload page when NZB Hydra is back.");
                $timeout(function () {
                    internalCaR(message, 0);
                }, 3000)
            },
            function (x) {
                console.log(x);
                growl.info("Unable to send restart command.");
            }
        )
    }
}
