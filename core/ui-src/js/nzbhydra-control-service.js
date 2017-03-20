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
        return $http.get("internalapi/restart");
    }

    function shutdown() {
        return $http.get("internalapi/shutdown");
    }

    function deleteLogAndDb() {
        return $http.get("internalapi/deleteloganddb");
    }
}
