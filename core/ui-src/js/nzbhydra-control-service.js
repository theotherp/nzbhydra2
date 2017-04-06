angular
    .module('nzbhydraApp')
    .factory('NzbHydraControlService', NzbHydraControlService);

function NzbHydraControlService($http) {

    return {
        restart: restart,
        shutdown: shutdown,
        deleteLogAndDb: deleteLogAndDb
    };

    function restart() {
        return $http.get("internalapi/control/restart");
    }

    function shutdown() {
        return $http.get("internalapi/control/shutdown");
    }

    function deleteLogAndDb() {
        //TODO
        return $http.get("internalapi/control/deleteloganddb");
    }
}
