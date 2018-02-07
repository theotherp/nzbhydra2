angular
    .module('nzbhydraApp')
    .controller('SystemController', SystemController);

function SystemController($scope, $state, activeTab, $http, growl, RestartService, MigrationService, ConfigService, NzbHydraControlService) {

    $scope.activeTab = activeTab;
    $scope.foo = {
        csv: "",
        sql: ""
    };

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


    $scope.migrate = function () {
        MigrationService.migrate();
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
            state: 'root.system.tasks',
            name: "Tasks"
        },
        {
            active: false,
            state: 'root.system.backup',
            name: "Backup"
        },
        {
            active: false,
            state: 'root.system.bugreport',
            name: "Bugreport / Debug"
        },
        {
            active: false,
            state: 'root.system.news',
            name: "News"
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
        $http({method: 'GET', url: 'internalapi/debuginfos/logandconfig', responseType: 'arraybuffer'}) .then(function (response, status, headers, config) {
            var a = document.createElement('a');
            var blob = new Blob([response.data], {'type': "application/octet-stream"});
            a.href = URL.createObjectURL(blob);
            a.download = "nzbhydra-debuginfos-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    };

    $scope.executeSqlQuery = function () {
        $http.post('internalapi/debuginfos/executesqlquery', $scope.foo.sql).then(function (response) {
            if (response.data.successful) {
                $scope.foo.csv = response.data.message;
            } else {
                growl.error(response.data.message);
            }
        });
    };

    $scope.executeSqlUpdate = function () {
        $http.post('internalapi/debuginfos/executesqlupdate', $scope.foo.sql).then(function (response) {
            if (response.data.successful) {
                $scope.foo.csv = response.data.message + " rows affected";
            } else {
                growl.error(response.data.message);
            }
        });
    };


}