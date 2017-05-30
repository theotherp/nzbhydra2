angular
    .module('nzbhydraApp')
    .controller('SystemController', SystemController);

function SystemController($scope, $state, activeTab, $http, growl, RestartService, ModalService, UpdateService, ConfigService, NzbHydraControlService) {

    $scope.activeTab = activeTab;

    $scope.shutdown = function () {
        NzbHydraControlService.shutdown().then(function () {
                growl.info("Shutdown initiated. Cya!");
            },
            function () {
                growl.info("Unable to send shutdown command.");
            })
    };

    $scope.restart = function () {
        RestartService.restart();
    };

    $scope.reloadConfig = function () {
        ConfigService.reloadConfig().then(function () {
            growl.info("Successfully reloaded config. Some setting may need a restart to take effect.")
        }, function (data) {
            growl.error(data.message);
        })
    };

    $scope.deleteLogAndDatabase = function () {
        ModalService.open("Delete log and db", "Are you absolutely sure you want to delete your database and log files? Hydra will restart to do that.", {
            yes: {
                onYes: function () {
                    NzbHydraControlService.deleteLogAndDb();
                    RestartService.countdown();
                },
                text: "Yes, delete log and database"
            },
            no: {
                onCancel: function () {

                },
                text: "Nah"
            }
        });
    };

    $scope.forceUpdate = function () {
        UpdateService.update()
    };

    $scope.migrate = function () {
        var baseUrl = prompt("Please enter the base URL of NZBHydra 1. If an admin account is configured provide username and password like this: http://user:pass@127.0.0.1:5075.", "http://127.0.0.1:5075");
        if (baseUrl === null) {
            return;
        }
        growl.info("Starting migration. This may take a while for big databases...");
        $http.get("internalapi/migration", {params: {baseurl: baseUrl}}).then(function (response) {
            var data = response.data;
            if (!data.requirementsMet) {
                ModalService.open("Requirements not met", "An error occurred while preparing the migration:<br>" + data.error, {
                    yes: {
                        text: "OK"
                    }
                });
            } else if (!data.configMigrated) {
                ModalService.open("Config migration failed", "An error occurred while migrating the config. Migration failed:<br>" + data.error, {
                    yes: {
                        text: "OK"
                    }
                });
            } else if (!data.databaseMigrated) {
                var message = "An error occurred while migrating the database.<br>" + data.error + "<br>. The config was migrated successfully though.";
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
                var message = "The migration was completed successfully.";
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
                            RestartService.countdown();
                        },
                        text: "Restart"
                    },
                    no: {
                        onNo: function () {

                        },
                        text: "Not now"
                    }
                });
            }
        });
    };


    $scope.allTabs = [
        {
            active: false,
            state: 'root.system.control',
            name: "Control"
        },
        {
            active: false,
            state: 'root.system.updates',
            name: "Updates"
        },
        {
            active: false,
            state: 'root.system.log',
            name: "Log"
        },
        {
            active: false,
            state: 'root.system.backup',
            name: "Backup"
        },
        {
            active: false,
            state: 'root.system.bugreport',
            name: "Bugreport"
        },
        {
            active: false,
            state: 'root.system.about',
            name: "About"
        }
    ];


    $scope.goToSystemState = function (index) {
        $state.go($scope.allTabs[index].state, {activeTab: index}, {inherit: false, notify: true, reload: true});
    };

    $scope.downloadDebuggingInfos = function () {
        $http({method: 'GET', url: 'internalapi/debuginfos/logandconfig', responseType: 'arraybuffer'}).success(function (data, status, headers, config) {
            var a = document.createElement('a');
            var blob = new Blob([data], {'type': "application/octet-stream"});
            a.href = URL.createObjectURL(blob);
            var filename = "nzbhydra-debuginfos-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip";
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

}
