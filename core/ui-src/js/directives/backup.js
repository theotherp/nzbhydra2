angular
    .module('nzbhydraApp')
    .directive('hydrabackup', hydrabackup);

function hydrabackup() {
    return {
        templateUrl: 'static/html/directives/backup.html',
        controller: controller
    };

    function controller($scope, BackupService, Upload, FileDownloadService, $http, RequestsErrorHandler, growl, RestartService) {
        $scope.refreshBackupList = function () {
            BackupService.getBackupsList().then(function (backups) {
                $scope.backups = backups;
            });
        };

        $scope.refreshBackupList();

        $scope.uploadActive = false;


        $scope.createBackupFile = function () {
            $http.get("internalapi/backup/backuponly", {params: {dontdownload: true}}).then(function () {
                $scope.refreshBackupList();
            });
        };
        $scope.createAndDownloadBackupFile = function () {
            FileDownloadService.downloadFile("internalapi/backup/backup", "nzbhydra-backup-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip", "GET").then(function () {
                $scope.refreshBackupList();
            });
        };

        $scope.uploadBackupFile = function (file, errFiles) {
            RequestsErrorHandler.specificallyHandled(function () {

                $scope.file = file;
                $scope.errFile = errFiles && errFiles[0];
                if (file) {
                    $scope.uploadActive = true;
                    file.upload = Upload.upload({
                        url: 'internalapi/backup/restorefile',
                        file: file
                    });

                    file.upload.then(function (response) {
                        if (response.data.successful) {
                            $scope.uploadActive = false;
                            RestartService.startCountdown("Upload successful. Restarting for wrapper to restore data.");
                        } else {
                            file.progress = 0;
                            growl.error(response.data.message)
                        }

                    }, function (response) {
                        growl.error(response.data.message)
                    }, function (evt) {
                        file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                        file.loaded = Math.floor(evt.loaded / 1024);
                        file.total = Math.floor(evt.total / 1024);
                    });
                }
            });
        };

        $scope.restoreFromFile = function (filename) {
            BackupService.restoreFromFile(filename).then(function () {
                    RestartService.startCountdown("Extraction of backup successful. Restarting for wrapper to restore data.");
                },
                function (response) {
                    growl.error(response.data);
                })
        }

    }
}

