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
            size: "md"
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

function MigrationModalInstanceCtrl($scope, $uibModalInstance, $http, blockUI, ModalService) {

    $scope.baseUrl = "http://127.0.0.1:5075";

    $scope.yes = function () {
        blockUI.start("Starting migration. This may take a while...");
        $http.get("internalapi/migration", {params: {baseurl: $scope.baseUrl}}).then(function (response) {
            var message;
                blockUI.stop();
                var data = response.data;
                if (!data.requirementsMet) {
                    ModalService.open("Requirements not met", "An error occurred while preparing the migration:<br>" + data.error, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else if (!data.configMigrated) {
                    $uibModalInstance.dismiss();
                    ModalService.open("Config migration failed", "An error occurred while migrating the config. Migration failed:<br>" + data.error, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else if (!data.databaseMigrated) {
                    $uibModalInstance.dismiss();
                    message = "An error occurred while migrating the database.<br>" + data.error + "<br>. The config was migrated successfully though.";
                    if (data.messages.length > 0) {
                        message += "<br><br>The following warnings resulted from the config migration:";
                        _.forEach(data.messages, function (msg) {
                            message += "<br>" + msg;
                        });
                    }
                    ModalService.open("Database migration failed", message, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else {
                    $uibModalInstance.dismiss();
                    message = "The migration was completed successfully.";
                    if (data.warningMessages.length > 0) {
                        message += "<br><br>The following warnings resulted from the config migration:";
                        _.forEach(data.warningMessages, function (msg) {
                            message += "<br>" + msg;
                        });
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
            }
        );

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };


}