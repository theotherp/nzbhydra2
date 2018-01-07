angular
    .module('nzbhydraApp')
    .factory('MigrationService', MigrationService);

function MigrationService($uibModal) {

    return {
        migrate: migrate
    };

    function migrate() {
        var modalInstance = $uibModal.open({
            templateUrl: 'static/html/migration-modal.html',
            controller: 'MigrationModalInstanceCtrl',
            size: "md",
            backdrop: 'static',
            keyboard: false
        });

        modalInstance.result.then(function () {
            ConfigService.reloadConfig();
        }, function () {
        });
    }
}

angular
    .module('nzbhydraApp')
    .controller('MigrationModalInstanceCtrl', MigrationModalInstanceCtrl);

function MigrationModalInstanceCtrl($scope, $uibModalInstance, $interval, $http, blockUI, ModalService) {

    $scope.baseUrl = "http://127.0.0.1:5075";

    $scope.foo = {isMigrating: false, baseUrl: $scope.baseUrl};
    $scope.doMigrateDatabase = true;

    $scope.yes = function () {
        var params;
        var url;
        if ($scope.foo.baseUrl && $scope.foo.isFileBasedOpen) {
            $scope.foo.baseUrl = null;
        }
        //blockUI.start("Starting migration. This may take a while...");
        if ($scope.foo.isUrlBasedOpen) {
            url = "internalapi/migration/url";
            params = {baseurl: $scope.foo.baseUrl, doMigrateDatabase: $scope.doMigrateDatabase};
        } else {
            url = "internalapi/migration/files";
            params = {settingsCfgFile: $scope.foo.settingsCfgFile, dbFile: $scope.foo.nzbhydraDbFile, doMigrateDatabase: $scope.doMigrateDatabase};
        }

        $scope.foo.isMigrating = true;

        var updateMigrationMessagesInterval = $interval(function () {
            $http.get("internalapi/migration/messages").then(function (data) {
                    $scope.foo.messages = data.data;
                },
                function () {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $scope.foo.isMigrating = false;
                }
            );
        }, 500);

        $http.get(url, {params: params}).then(function (response) {
                var message;
                blockUI.stop();
                var data = response.data;
                if (!data.requirementsMet) {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $scope.foo.isMigrating = false;
                    ModalService.open("Requirements not met", "An error occurred while preparing the migration:<br>" + data.error, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else if (!data.configMigrated) {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $uibModalInstance.dismiss();
                    $scope.foo.isMigrating = false;
                    ModalService.open("Config migration failed", "An error occurred while migrating the config. Migration failed:<br>" + data.error, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else if (!data.databaseMigrated) {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $uibModalInstance.dismiss();
                    $scope.foo.isMigrating = false;
                    message = "An error occurred while migrating the database.<br>" + data.error + "<br>. The config was migrated successfully though.";
                    if (data.messages.length > 0) {
                        message += '<br><br><span class="warning">The following warnings resulted from the config migration:<ul style="list-style: none">';
                        _.forEach(data.messages, function (msg) {
                            message += "<li>" + msg + "</li>";
                        });
                        message += "</ul></span>";
                    }
                    ModalService.open("Database migration failed", message, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $uibModalInstance.dismiss();
                    $scope.foo.isMigrating = false;
                    message = "The migration was completed successfully.";
                    if (data.warningMessages.length > 0) {
                        message += '<br><br><span class="warning">The following warnings resulted from the config migration:<ul style="list-style: none">';
                        _.forEach(data.warningMessages, function (msg) {
                            message += "<li>" + msg + "</li>";
                        });
                        message += "</ul></span>";
                    }
                    message += "<br><br>NZBHydra needs to restart for the changes to be effective.";
                    ModalService.open("Migration successful", message, {
                        yes: {
                            onYes: function () {
                                RestartService.startCountdown();
                            },
                            text: "Restart"
                        },
                        cancel: {
                            onCancel: function () {

                            },
                            text: "Not now"
                        }
                    });
                }
            }, function(data) {
            //TOD handle error
                console.log(data);
            }
        );

        $scope.$on('$destroy', function () {
            if (angular.isDefined(updateMigrationMessagesInterval)) {
                $interval.cancel(updateMigrationMessagesInterval);
            }
        });

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };

}
