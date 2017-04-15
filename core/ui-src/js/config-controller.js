angular
    .module('nzbhydraApp')
    .factory('ConfigModel', function () {
        return {};
    });

angular
    .module('nzbhydraApp')
    .factory('ConfigWatcher', function () {
        var $scope;

        return {
            watch: watch
        };

        function watch(scope) {
            $scope = scope;
            $scope.$watchGroup(["config.main.host"], function () {
            }, true);
        }
    });


angular
    .module('nzbhydraApp')
    .controller('ConfigController', ConfigController);

function ConfigController($scope, $http, activeTab, ConfigService, config, DownloaderCategoriesService, ConfigFields, ConfigModel, ModalService, RestartService, $state, growl) {
    $scope.config = config;
    $scope.submit = submit;
    $scope.activeTab = activeTab;

    $scope.restartRequired = false;
    $scope.ignoreSaveNeeded = false;

    ConfigFields.setRestartWatcher(function () {
        $scope.restartRequired = true;
    });


    function submit() {
        if ($scope.form.$valid) {
            ConfigService.set($scope.config).then(function () {
                $scope.form.$setPristine();
                DownloaderCategoriesService.invalidate();
                if ($scope.restartRequired) {
                    ModalService.open("Restart required", "The changes you have made may require a restart to be effective.<br>Do you want to restart now?", {
                        yes: {
                            onYes: function () {
                                RestartService.restart();
                            }
                        },
                        no: {
                            onNo: function () {
                                $scope.restartRequired = false;
                            }
                        }
                    });
                }
            }, function (response) {
                console.log(response);
                growl.error(response.data.errorMessages.join("<br>"));
            });

        } else {
            growl.error("Config invalid. Please check your settings.");

            //Ridiculously hacky way to make the error messages appear
            try {
                if (angular.isDefined(form.$error.required)) {
                    _.each(form.$error.required, function (item) {
                        if (angular.isDefined(item.$error.required)) {
                            _.each(item.$error.required, function (item2) {
                                item2.$setTouched();
                            });
                        }
                    });
                }
                angular.forEach($scope.form.$error.required, function (field) {
                    field.$setTouched();
                });
            } catch (err) {
                //
            }

        }
    }

    ConfigModel = config;

    $scope.fields = ConfigFields.getFields($scope.config);

    $scope.allTabs = [
        {
            active: false,
            state: 'root.config.main',
            name: 'Main',
            model: ConfigModel.main,
            fields: $scope.fields.main,
            options: {}
        },
        {
            active: false,
            state: 'root.config.auth',
            name: 'Authorization',
            model: ConfigModel.auth,
            fields: $scope.fields.auth,
            options: {}
        },
        {
            active: false,
            state: 'root.config.searching',
            name: 'Searching',
            model: ConfigModel.searching,
            fields: $scope.fields.searching,
            options: {}
        },
        {
            active: false,
            state: 'root.config.categories',
            name: 'Categories',
            model: ConfigModel.categoriesConfig,
            fields: $scope.fields.categoriesConfig,
            options: {}
        },
        {
            active: false,
            state: 'root.config.downloader',
            name: 'Downloaders',
            model: ConfigModel.downloaders,
            fields: $scope.fields.downloaders,
            options: {}
        },
        {
            active: false,
            state: 'root.config.indexers',
            name: 'Indexers',
            model: ConfigModel.indexers,
            fields: $scope.fields.indexers,
            options: {}
        }
    ];

    $scope.isSavingNeeded = function () {
        return $scope.form.$dirty && $scope.form.$valid && !$scope.ignoreSaveNeeded;
    };

    $scope.goToConfigState = function (index) {
        $state.go($scope.allTabs[index].state, {activeTab: index}, {inherit: false, notify: true, reload: true});
    };

    $scope.help = function () {
        var tabName = $scope.allTabs[$scope.activeTab].name;
        $http.get("internalapi/help/" + tabName).then(function (result) {
                var html = '<span style="text-align: left;">' + result.data + "</span>";
                ModalService.open(tabName + " - Help", html, {}, "lg");
            },
            function () {
                growl.error("Error while loading help")
            })
    };

    $scope.$on('$stateChangeStart',
        function (event, toState, toParams, fromState, fromParams) {
            if ($scope.isSavingNeeded()) {
                event.preventDefault();
                ModalService.open("Unsaved changed", "Do you want to save before leaving?", {
                    yes: {
                        onYes: function () {
                            $scope.submit();
                            $state.go(toState);
                        },
                        text: "Yes"
                    },
                    no: {
                        onNo: function () {
                            $scope.ignoreSaveNeeded = true;
                            $scope.allTabs[$scope.activeTab].options.resetModel();
                            $state.go(toState);
                        },
                        text: "No"
                    },
                    cancel: {
                        onCancel: function () {
                            event.preventDefault();
                        },
                        text: "Cancel"
                    }
                });
            }
        })
}


