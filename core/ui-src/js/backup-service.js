angular
    .module('nzbhydraApp')
    .factory('BackupService', BackupService);

function BackupService($http) {

    return {
        getBackupsList: getBackupsList,
        restoreFromFile: restoreFromFile
    };


    function getBackupsList() {
        return $http.get('internalapi/getbackups').then(function (data) {
            return data.data.backups;
        });
    }

    function restoreFromFile(filename) {
        return $http.get('internalapi/restorefrombackupfile', {params: {filename: filename}}).then(function (response) {
            return response;
        });
    }

}