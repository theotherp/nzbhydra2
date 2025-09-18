/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
angular
    .module('nzbhydraApp')
    .config(function config(formlyConfigProvider) {

        formlyConfigProvider.setType({
            name: 'externalToolConfig',
            templateUrl: 'static/html/config/external-tool-config.html',
            controller: function ($scope, $uibModal, growl, localStorageService, $http) {
                $scope.formOptions = {formState: $scope.formState};
                $scope._showBox = _showBox;
                $scope.showBox = showBox;
                $scope.isInitial = false;
                $scope.presets = [
                    {
                        name: "Sonarr",
                        type: "SONARR",
                        host: "http://localhost:8989",
                        categories: "5030,5040",
                        syncType: "PER_INDEXER"
                    },
                    {
                        name: "Radarr",
                        type: "RADARR",
                        host: "http://localhost:7878",
                        categories: "2000",
                        syncType: "PER_INDEXER"
                    },
                    {
                        name: "Lidarr",
                        type: "LIDARR",
                        host: "http://localhost:8686",
                        categories: "3000",
                        syncType: "PER_INDEXER"
                    },
                    {
                        name: "Readarr",
                        type: "READARR",
                        host: "http://localhost:8787",
                        categories: "7020,8010",
                        syncType: "PER_INDEXER"
                    }
                ];

                function _showBox(model, parentModel, isInitial, form, callback) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'static/html/config/external-tool-config-box.html',
                        controller: 'ExternalToolConfigBoxInstanceController',
                        size: 'lg',
                        resolve: {
                            model: function () {
                                model.showAdvanced = localStorageService.get("showAdvanced");
                                return model;
                            },
                            fields: function () {
                                return getExternalToolBoxFields(model, parentModel, isInitial);
                            },
                            isInitial: function () {
                                return isInitial
                            },
                            parentModel: function () {
                                return parentModel;
                            },
                            data: function () {
                                return $scope.options.data;
                            }
                        }
                    });


                    modalInstance.result.then(function (returnedModel) {
                        form.$setDirty(true);
                        if (angular.isDefined(callback)) {
                            callback(true, returnedModel);
                        }
                    }, function () {
                        if (angular.isDefined(callback)) {
                            callback(false);
                        }
                    });
                }

                function showBox(model, parentModel) {
                    $scope._showBox(model, parentModel, false, $scope.form)
                }

                $scope.syncAll = function () {
                    growl.info("Starting sync to all external tools...");
                    $http.post('internalapi/externalTools/syncAll').then(
                        function (response) {
                            var result = response.data;
                            if (result.failureCount === 0) {
                                growl.success("Successfully synced to " + result.successCount + " external tool(s)");
                            } else if (result.successCount === 0) {
                                growl.error("Failed to sync to all " + result.failureCount + " external tool(s)");
                            } else {
                                growl.warning("Synced to " + result.successCount + " tool(s), " + result.failureCount + " failed");
                            }
                        },
                        function (error) {
                            growl.error("Error syncing to external tools: " + error.data);
                        }
                    );
                };

                $scope.addEntry = function (entriesCollection, preset) {
                    var model = angular.copy({
                        enabled: true,
                        syncType: "PER_INDEXER",
                        configureForUsenet: true,
                        configureForTorrents: false,
                        enableRss: true,
                        enableAutomaticSearch: true,
                        enableInteractiveSearch: true,
                        useHydraPriorities: true,
                        priority: 25,
                        nzbhydraName: "NZBHydra2",
                        nzbhydraHost: "http://host.docker.internal:5076"
                    });
                    if (angular.isDefined(preset)) {
                        _.extend(model, preset);
                    }

                    $scope.isInitial = true;

                    $scope._showBox(model, entriesCollection, true, $scope.form, function (isSubmitted, returnedModel) {
                        if (isSubmitted) {
                            entriesCollection.push(angular.isDefined(returnedModel) ? returnedModel : model);
                        }
                    });
                };

                function getExternalToolBoxFields(model, parentModel, isInitial) {
                    var fieldset = [];

                    fieldset.push({
                        key: 'enabled',
                        type: 'horizontalSwitch',
                        templateOptions: {
                            type: 'switch',
                            label: 'Enabled'
                        }
                    });

                    fieldset.push({
                        key: 'name',
                        type: 'horizontalInput',
                        templateOptions: {
                            type: 'text',
                            label: 'Name',
                            required: true,
                            help: 'Unique name for this external tool instance'
                        },
                        validators: {
                            uniqueName: {
                                expression: function (viewValue) {
                                    if (isInitial || viewValue !== model.name) {
                                        return _.pluck(parentModel, "name").indexOf(viewValue) === -1;
                                    }
                                    return true;
                                },
                                message: '"External tool \\"" + $viewValue + "\\" already exists"'
                            }
                        }
                    });

                    fieldset.push({
                        key: 'type',
                        type: 'horizontalSelect',
                        templateOptions: {
                            type: 'select',
                            label: 'Type',
                            required: true,
                            options: [
                                {name: 'Sonarr', value: 'SONARR'},
                                {name: 'Radarr', value: 'RADARR'},
                                {name: 'Lidarr', value: 'LIDARR'},
                                {name: 'Readarr', value: 'READARR'}
                            ]
                        },
                        watcher: {
                            listener: function (field, newValue, oldValue, scope) {
                                if (newValue !== oldValue) {
                                    // Update default categories based on type
                                    switch (newValue) {
                                        case 'SONARR':
                                            model.categories = "5030,5040";
                                            break;
                                        case 'RADARR':
                                            model.categories = "2000";
                                            break;
                                        case 'LIDARR':
                                            model.categories = "3000";
                                            break;
                                        case 'READARR':
                                            model.categories = "7020,8010";
                                            break;
                                    }
                                }
                            }
                        }
                    });

                    fieldset.push({
                        key: 'host',
                        type: 'horizontalInput',
                        templateOptions: {
                            type: 'text',
                            label: 'Host URL',
                            help: 'URL with scheme and port (e.g., http://localhost:8989)',
                            required: true
                        },
                        watcher: {
                            listener: function (field, newValue, oldValue, scope) {
                                if (newValue !== oldValue) {
                                    scope.$parent.needsConnectionTest = true;
                                }
                            }
                        }
                    });

                    fieldset.push({
                        key: 'apiKey',
                        type: 'horizontalInput',
                        templateOptions: {
                            type: 'text',
                            label: 'API Key',
                            help: 'API key for the external tool'
                        },
                        watcher: {
                            listener: function (field, newValue, oldValue, scope) {
                                if (newValue !== oldValue) {
                                    scope.$parent.needsConnectionTest = true;
                                }
                            }
                        }
                    });

                    fieldset.push({
                        key: 'syncType',
                        type: 'horizontalSelect',
                        templateOptions: {
                            type: 'select',
                            label: 'Sync Type',
                            options: [
                                {name: 'Single entry for all indexers', value: 'SINGLE'},
                                {name: 'Separate entry per indexer', value: 'PER_INDEXER'}
                            ],
                            help: 'Whether to create one entry for all indexers or separate entries'
                        }
                    });

                    fieldset.push({
                        key: 'nzbhydraName',
                        type: 'horizontalInput',
                        templateOptions: {
                            type: 'text',
                            label: 'NZBHydra Name',
                            help: 'Name prefix used in the external tool',
                            required: true
                        }
                    });

                    fieldset.push({
                        key: 'nzbhydraHost',
                        type: 'horizontalInput',
                        templateOptions: {
                            type: 'text',
                            label: 'NZBHydra Host',
                            help: 'NZBHydra URL that the external tool can reach (use host.docker.internal for Docker containers)',
                            required: true
                        }
                    });

                    fieldset.push({
                        key: 'configureForUsenet',
                        type: 'horizontalSwitch',
                        templateOptions: {
                            type: 'switch',
                            label: 'Configure for Usenet',
                            help: 'Sync Usenet indexers'
                        }
                    });

                    fieldset.push({
                        key: 'configureForTorrents',
                        type: 'horizontalSwitch',
                        templateOptions: {
                            type: 'switch',
                            label: 'Configure for Torrents',
                            help: 'Sync torrent indexers'
                        }
                    });

                    fieldset.push({
                        key: 'addDisabledIndexers',
                        type: 'horizontalSwitch',
                        templateOptions: {
                            type: 'switch',
                            label: 'Add disabled indexers',
                            help: 'Also sync indexers that are disabled in NZBHydra',
                            advanced: true
                        }
                    });

                    fieldset.push({
                        key: 'useHydraPriorities',
                        type: 'horizontalSwitch',
                        templateOptions: {
                            type: 'switch',
                            label: 'Use Hydra priorities',
                            help: 'Map NZBHydra indexer priorities to the external tool'
                        }
                    });

                    fieldset.push({
                        key: 'priority',
                        type: 'horizontalInput',
                        hideExpression: 'model.useHydraPriorities && model.syncType === "PER_INDEXER"',
                        templateOptions: {
                            type: 'number',
                            label: 'Default Priority',
                            help: 'Priority to use when not using Hydra priorities (1-50, lower is better)',
                            placeholder: '25'
                        }
                    });

                    fieldset.push({
                        key: 'enableRss',
                        type: 'horizontalSwitch',
                        templateOptions: {
                            type: 'switch',
                            label: 'Enable RSS',
                            help: 'Enable RSS sync in the external tool'
                        }
                    });

                    fieldset.push({
                        key: 'enableAutomaticSearch',
                        type: 'horizontalSwitch',
                        templateOptions: {
                            type: 'switch',
                            label: 'Enable automatic search',
                            help: 'Enable automatic search in the external tool'
                        }
                    });

                    fieldset.push({
                        key: 'enableInteractiveSearch',
                        type: 'horizontalSwitch',
                        templateOptions: {
                            type: 'switch',
                            label: 'Enable interactive search',
                            help: 'Enable interactive (manual) search in the external tool'
                        }
                    });

                    fieldset.push({
                        key: 'categories',
                        type: 'horizontalInput',
                        templateOptions: {
                            type: 'text',
                            label: 'Categories',
                            help: 'Comma-separated newznab category IDs',
                            advanced: true
                        }
                    });

                    if (model.type === 'SONARR') {
                        fieldset.push({
                            key: 'animeCategories',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Anime categories',
                                help: 'Comma-separated newznab category IDs for anime',
                                advanced: true
                            }
                        });
                    }

                    if (model.type === 'RADARR') {
                        fieldset.push({
                            key: 'removeYearFromSearchString',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Remove year from search',
                                help: 'Remove year from movie search queries',
                                advanced: true
                            }
                        });
                    }

                    if (model.type === 'LIDARR' || model.type === 'READARR') {
                        fieldset.push({
                            key: 'earlyDownloadLimit',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Early download limit',
                                advanced: true
                            }
                        });
                    }

                    fieldset.push({
                        key: 'additionalParameters',
                        type: 'horizontalInput',
                        templateOptions: {
                            type: 'text',
                            label: 'Additional parameters',
                            help: 'Additional URL parameters to send to the indexer',
                            advanced: true
                        }
                    });

                    // Torrent-specific fields
                    if (model.configureForTorrents) {
                        fieldset.push({
                            key: 'minimumSeeders',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Minimum seeders',
                                help: 'Minimum number of seeders',
                                advanced: true
                            }
                        });

                        fieldset.push({
                            key: 'seedRatio',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Seed ratio',
                                advanced: true
                            }
                        });

                        fieldset.push({
                            key: 'seedTime',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Seed time',
                                advanced: true
                            }
                        });

                        if (model.type === 'SONARR') {
                            fieldset.push({
                                key: 'seasonPackSeedTime',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Season pack seed time',
                                    advanced: true
                                }
                            });
                        }

                        if (model.type === 'LIDARR' || model.type === 'READARR') {
                            fieldset.push({
                                key: 'discographySeedTime',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Discography seed time',
                                    advanced: true
                                }
                            });
                        }
                    }

                    return fieldset;
                }
            }
        });
    });


angular.module('nzbhydraApp').controller('ExternalToolConfigBoxInstanceController', function ($scope, $q, $uibModalInstance, $http, model, fields, isInitial, parentModel, data, growl, blockUI) {

    $scope.model = model;
    $scope.fields = fields;
    $scope.isInitial = isInitial;
    $scope.spinnerActive = false;
    $scope.needsConnectionTest = false;

    $scope.obSubmit = function () {
        if ($scope.form.$valid) {
            checkConnection().then(function () {
                // When adding/editing a specific external tool, block and show results
                syncToExternalTool().then(function () {
                    $uibModalInstance.close($scope.model);
                });
            });
        } else {
            growl.error("Config invalid. Please check your settings.");
            angular.forEach($scope.form.$error, function (error) {
                angular.forEach(error, function (field) {
                    field.$setTouched();
                });
            });
        }
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };

    $scope.deleteEntry = function () {
        parentModel.splice(parentModel.indexOf(model), 1);
        $uibModalInstance.close($scope);
    };

    $scope.reset = function () {
        if (angular.isDefined(data.resetFunction)) {
            $scope.options.resetModel();
            $scope.options.resetModel();
        }
    };

    $scope.testConnection = function () {
        $scope.spinnerActive = true;
        blockUI.start("Testing connection...");

        var testRequest = {
            externalTool: model.type === 'SONARR' ? 'Sonarr' :
                model.type === 'RADARR' ? 'Radarr' :
                    model.type === 'LIDARR' ? 'Lidarr' : 'Readarr',
            xdarrHost: model.host,
            xdarrApiKey: model.apiKey,
            addType: 'DELETE_ONLY' // Just test connection
        };

        $http.post("internalapi/externalTools/testConnection", testRequest).then(
            function (response) {
                blockUI.reset();
                $scope.spinnerActive = false;
                if (response.data.successful) {
                    growl.info("Connection test successful");
                } else {
                    growl.error("Connection test failed: " + response.data.message);
                }
            },
            function (error) {
                blockUI.reset();
                $scope.spinnerActive = false;
                growl.error("Connection test failed: " + (error.data ? error.data.message : "Unknown error"));
            }
        );
    };

    function checkConnection() {
        var deferred = $q.defer();

        if (!$scope.isInitial && !$scope.needsConnectionTest) {
            deferred.resolve();
        } else {
            $scope.spinnerActive = true;
            blockUI.start("Testing connection...");

            var testRequest = {
                externalTool: model.type === 'SONARR' ? 'Sonarr' :
                    model.type === 'RADARR' ? 'Radarr' :
                        model.type === 'LIDARR' ? 'Lidarr' : 'Readarr',
                xdarrHost: model.host,
                xdarrApiKey: model.apiKey,
                addType: 'DELETE_ONLY'
            };

            $http.post("internalapi/externalTools/testConnection", testRequest).then(
                function (response) {
                    blockUI.reset();
                    $scope.spinnerActive = false;
                    if (response.data.successful) {
                        growl.info("Connection test successful");
                        deferred.resolve();
                    } else {
                        growl.error("Connection test failed: " + response.data.message);
                        deferred.reject();
                    }
                },
                function (error) {
                    blockUI.reset();
                    $scope.spinnerActive = false;
                    growl.error("Connection test failed: " + (error.data ? error.data.message : "Unknown error"));
                    deferred.reject();
                }
            );
        }

        return deferred.promise;
    }

    function syncToExternalTool() {
        var deferred = $q.defer();

        $scope.spinnerActive = true;
        blockUI.start("Configuring NZBHydra in " + model.type + "...");

        var syncRequest = {
            externalTool: model.type === 'SONARR' ? 'Sonarr' :
                model.type === 'RADARR' ? 'Radarr' :
                    model.type === 'LIDARR' ? 'Lidarr' : 'Readarr',
            xdarrHost: model.host,
            xdarrApiKey: model.apiKey,
            addType: model.syncType === 'SINGLE' ? 'SINGLE' : 'PER_INDEXER',
            nzbhydraName: model.nzbhydraName,
            nzbhydraHost: model.nzbhydraHost,
            configureForUsenet: model.configureForUsenet,
            configureForTorrents: model.configureForTorrents,
            enableRss: model.enableRss,
            enableAutomaticSearch: model.enableAutomaticSearch,
            enableInteractiveSearch: model.enableInteractiveSearch,
            enableCategories: true,
            categories: model.categories || '',
            additionalParameters: model.additionalParameters
        };

        $http.post("internalapi/externalTools/configure", syncRequest).then(
            function (response) {
                blockUI.reset();
                $scope.spinnerActive = false;
                if (response.data === true) {
                    growl.success("Successfully configured NZBHydra in " + model.type);
                    deferred.resolve();
                } else {
                    growl.error("Failed to configure NZBHydra in " + model.type);
                    deferred.reject();
                }
            },
            function (error) {
                blockUI.reset();
                $scope.spinnerActive = false;
                growl.error("Error configuring NZBHydra in " + model.type + ": " + (error.data ? error.data : "Unknown error"));
                deferred.reject();
            }
        );

        return deferred.promise;
    }

    $scope.$on("modal.closing", function (targetScope, reason) {
        if (reason === "backdrop click") {
            $scope.reset($scope);
        }
    });
});