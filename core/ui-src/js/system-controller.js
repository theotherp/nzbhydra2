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
        $http({method: 'GET', url: 'internalapi/getdebugginginfos', responseType: 'arraybuffer'}).success(function (data, status, headers, config) {
            var a = document.createElement('a');
            var blob = new Blob([data], {'type': "application/octet-stream"});
            a.href = URL.createObjectURL(blob);
            var filename = "nzbhydra-debuginfo-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip";
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }).error(function (data, status, headers, config) {
            console.log("Error:" + status);
        });
    }

}
