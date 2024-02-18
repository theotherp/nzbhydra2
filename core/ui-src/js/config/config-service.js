angular
    .module('nzbhydraApp')
    .factory('ConfigService', ConfigService);

function ConfigService($http, $q, $cacheFactory, $uibModal, bootstrapped, RequestsErrorHandler) {

    var cache = $cacheFactory("nzbhydra");
    var safeConfig = bootstrapped.safeConfig;

    return {
        set: set,
        get: get,
        getSafe: getSafe,
        invalidateSafe: invalidateSafe,
        maySeeAdminArea: maySeeAdminArea,
        reloadConfig: reloadConfig,
        apiHelp: apiHelp,
        configureIn: configureIn
    };

    function set(newConfig, ignoreWarnings) {
        var deferred = $q.defer();
        $http.put('internalapi/config', newConfig)
            .then(function (response) {
                if (response.data.ok && (ignoreWarnings || response.data.warningMessages.length === 0)) {
                    cache.put("config", newConfig);
                    setTimeout(function () {
                        invalidateSafe();
                    }, 500)
                }
                deferred.resolve(response);

            }, function (errorresponse) {
                console.log("Error saving settings:");
                console.log(errorresponse);
                deferred.reject(errorresponse);
            });
        return deferred.promise;
    }

    function reloadConfig() {
        return $http.get('internalapi/config/reload').then(function (response) {
            return response.data;
        });
    }

    function apiHelp() {
        return $http.get('internalapi/config/apiHelp').then(function (response) {
            return response.data;
        });
    }

    function get() {
        var config = cache.get("config");
        if (angular.isUndefined(config)) {
            config = $http.get('internalapi/config').then(function (response) {
                return response.data;
            });
            cache.put("config", config);
        }

        return config;
    }

    function getSafe() {
        return safeConfig;
    }

    function invalidateSafe() {
        RequestsErrorHandler.specificallyHandled(function () {
            $http.get('internalapi/config/safe').then(function (response) {
                safeConfig = response.data;
            });
        });

    }

    function maySeeAdminArea() {
        function loadAll() {
            var maySeeAdminArea = cache.get("maySeeAdminArea");
            if (!angular.isUndefined(maySeeAdminArea)) {
                var deferred = $q.defer();
                deferred.resolve(maySeeAdminArea);
                return deferred.promise;
            }

            return $http.get('internalapi/mayseeadminarea')
                .then(function (configResponse) {
                    var config = configResponse.data;
                    cache.put("maySeeAdminArea", config);
                    return configResponse.data;
                });
        }

        return loadAll().then(function (maySeeAdminArea) {
            return maySeeAdminArea;
        });
    }

    function configureIn(externalTool) {
        $uibModal.open({
            templateUrl: 'static/html/configure-in-modal.html',
            controller: ConfigureInModalInstanceCtrl,
            size: "md",
            resolve: {
                externalTool: function () {
                    return externalTool;
                },
                dialogInfo: function () {
                    return $http.get("internalapi/externalTools/getDialogInfo").then(function (response) {
                        return response.data;
                    })
                }
            }
        })
    }

    function ConfigureInModalInstanceCtrl($scope, $uibModalInstance, $http, growl, $interval, RequestsErrorHandler, localStorageService, externalTool, dialogInfo) {
        var lastConfig = localStorageService.get(externalTool);

        $scope.externalTool = externalTool;
        $scope.externalToolDisplayName = externalTool;
        $scope.externalToolsMessages = [];
        $scope.closeButtonType = "warning";
        $scope.completed = false;
        $scope.working = false;
        $scope.showMessages = false;

        $scope.nzbhydraHost = dialogInfo.nzbhydraHost;
        $scope.usenetIndexersConfigured = dialogInfo.usenetIndexersConfigured;
        $scope.prioritiesConfigured = dialogInfo.prioritiesConfigured;
        $scope.configureForUsenet = dialogInfo.usenetIndexersConfigured;
        $scope.torrentIndexersConfigured = dialogInfo.torrentIndexersConfigured;
        $scope.configureForTorrents = dialogInfo.torrentIndexersConfigured;
        $scope.addDisabledIndexers = false;

        if (!$scope.configureForUsenet && !$scope.configureForTorrents) {
            growl.error("No usenet or torrent indexers configured");
        }


        $scope.nzbhydraName = "NZBHydra2";
        $scope.xdarrHost = "http://localhost:"
        $scope.addType = "SINGLE";
        $scope.enableRss = true;
        $scope.enableAutomaticSearch = true;
        $scope.enableInteractiveSearch = true;
        $scope.categories = null;
        $scope.animeCategories = null;
        $scope.priority = 0;
        $scope.useHydraPriorities = true;

        if (externalTool === "Sonarr" || externalTool === "Sonarrv3") {
            $scope.xdarrHost += "8989";
            $scope.categories = "5030,5040";
            if (externalTool === "Sonarrv3") {
                $scope.externalToolDisplayName = "Sonarr v3+";
            }
        } else if (externalTool === "Radarr" || externalTool === "Radarrv3") {
            $scope.xdarrHost += "7878";
            $scope.categories = "2000";
            if (externalTool === "Radarrv3") {
                $scope.externalToolDisplayName = "Radarr v3+";
            }
        } else if (externalTool === "Lidarr") {
            $scope.xdarrHost += "8686";
            $scope.categories = "3000";
        } else if (externalTool === "Readarr") {
            $scope.xdarrHost += "8787";
            $scope.categories = "7020,8010";
        }
        $scope.removeYearFromSearchString = false;

        if (lastConfig !== null && lastConfig !== undefined) {
            Object.assign($scope, lastConfig);
        }

        $scope.close = function () {
            $uibModalInstance.dismiss();
        };

        $scope.submit = function (deleteOnly) {
            if ($scope.completed && !deleteOnly) {
                $uibModalInstance.dismiss();
            }
            if (!$scope.usenetIndexersConfigured && !$scope.torrentIndexersConfigured && !deleteOnly) {
                growl.error("No usenet or torrent indexers configured");
                return;
            }
            $scope.externalToolsMessages = [];
            $scope.spinnerActive = true;
            $scope.working = true;
            $scope.showMessages = true;
            var data = {

                nzbhydraName: $scope.nzbhydraName,
                externalTool: $scope.externalTool,
                nzbhydraHost: $scope.nzbhydraHost,
                addType: deleteOnly ? "DELETE_ONLY" : $scope.addType,
                xdarrHost: $scope.xdarrHost,
                xdarrApiKey: $scope.xdarrApiKey,
                enableRss: $scope.enableRss,
                enableAutomaticSearch: $scope.enableAutomaticSearch,
                enableInteractiveSearch: $scope.enableInteractiveSearch,
                categories: $scope.categories,
                animeCategories: $scope.animeCategories,
                removeYearFromSearchString: $scope.removeYearFromSearchString,
                earlyDownloadLimit: $scope.earlyDownloadLimit,
                multiLanguages: $scope.multiLanguages,
                configureForUsenet: $scope.configureForUsenet,
                configureForTorrents: $scope.configureForTorrents,
                additionalParameters: $scope.additionalParameters,
                minimumSeeders: $scope.minimumSeeders,
                seedRatio: $scope.seedRatio,
                seedTime: $scope.seedTime,
                seasonPackSeedTime: $scope.seasonPackSeedTime,
                discographySeedTime: $scope.discographySeedTime,
                addDisabledIndexers: $scope.addDisabledIndexers,
                priority: $scope.priority,
                useHydraPriorities: $scope.useHydraPriorities
            }

            localStorageService.set(externalTool, data);

            function updateMessages() {
                $http.get("internalapi/externalTools/messages").then(function (response) {
                    $scope.externalToolsMessages = response.data;
                });
            }

            var updateInterval = $interval(function () {
                updateMessages();
            }, 500);

            RequestsErrorHandler.specificallyHandled(function () {
                $scope.completed = false;
                $http.post("internalapi/externalTools/configure", data).then(function (response) {
                    updateMessages();
                    $interval.cancel(updateInterval);
                    $scope.spinnerActive = false;
                    console.log(response);
                    if (response.data) {
                        $scope.completed = true;
                        $scope.closeButtonType = "success";
                    } else {
                        $scope.working = false;
                        $scope.completed = false;
                    }
                }, function (error) {
                    updateMessages();
                    console.error(error.data);
                    $interval.cancel(updateInterval);
                    $scope.completed = false;
                    $scope.spinnerActive = false;
                    $scope.working = false;
                });
            });
        };

    }
}
