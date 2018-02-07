angular
    .module('nzbhydraApp')
    .factory('BackupService', BackupService);

function BackupService($http) {

    return {
        getBackupsList: getBackupsList,
        restoreFromFile: restoreFromFile
    };


    function getBackupsList() {
        return $http.get('internalapi/backup/list').then(function (response) {
            return response.data;
        });
    }

    function restoreFromFile(filename) {
        return $http.get('internalapi/backup/restore', {params: {filename: filename}}).then(function (response) {
            return response;
        });
    }

}