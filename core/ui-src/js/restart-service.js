angular
    .module('nzbhydraApp')
    .factory('RestartService', RestartService);

function RestartService(blockUI, $timeout, $window, growl, NzbHydraControlService) {

    return {
        restart: restart,
        countdown: countdown
    };


    function internalCaR(message, timer) {

        if (timer >= 1) {
            blockUI.start(message + "Restarting. Will reload page in " + timer + " seconds...");
            $timeout(function () {
                internalCaR(message, timer - 1)
            }, 1000);
        } else {
            $timeout(function () {
                blockUI.start("Reloading page...");
                $window.location.reload();
            }, 1000);
        }
    }

    function countdown() {
        internalCaR("", 15);
    }

    function restart(message) {
        message = angular.isDefined(message) ? message + " " : "";
        NzbHydraControlService.restart().then(internalCaR(message, 15),
            function () {
                growl.info("Unable to send restart command.");
            }
        )
    }
}
