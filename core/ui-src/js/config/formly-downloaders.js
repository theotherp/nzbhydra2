/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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
            name: 'downloaderConfig',
            templateUrl: 'static/html/config/downloader-config.html',
            controller: function ($scope, $uibModal, growl, CategoriesService) {
                $scope.formOptions = {formState: $scope.formState};
                $scope._showBox = _showBox;
                $scope.showBox = showBox;
                $scope.isInitial = false;
                $scope.presets = [
                    {
                        name: "NZBGet",
                        downloaderType: "NZBGET",
                        username: "nzbgetx",
                        nzbAddingType: "UPLOAD",
                        nzbAccessType: "REDIRECT",
                        iconCssClass: "",
                        downloadType: "NZB",
                        url: "http://nzbget:tegbzn6789@localhost:6789"
                    },
                    {
                        url: "http://localhost:8080",
                        downloaderType: "SABNZBD",
                        name: "SABnzbd",
                        nzbAddingType: "UPLOAD",
                        nzbAccessType: "REDIRECT",
                        iconCssClass: "",
                        downloadType: "NZB"
                    }
                ];

                function _showBox(model, parentModel, isInitial, callback) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'static/html/config/downloader-config-box.html',
                        controller: 'DownloaderConfigBoxInstanceController',
                        size: 'lg',
                        resolve: {
                            model: function () {
                                return model;
                            },
                            fields: function () {
                                return getDownloaderBoxFields(model, parentModel, isInitial, angular.injector(), CategoriesService);
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
                        $scope.form.$setDirty(true);
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
                    $scope._showBox(model, parentModel, false)
                }

                $scope.addEntry = function (entriesCollection, preset) {
                    var model = angular.copy({
                        enabled: true
                    });
                    if (angular.isDefined(preset)) {
                        _.extend(model, preset);
                    }

                    $scope.isInitial = true;

                    $scope._showBox(model, entriesCollection, true, function (isSubmitted, returnedModel) {
                        if (isSubmitted) {
                            //Here is where the entry is actually added to the model
                            entriesCollection.push(angular.isDefined(returnedModel) ? returnedModel : model);
                        }
                    });
                };

                function getDownloaderBoxFields(model, parentModel, isInitial) {
                    var fieldset = [];

                    fieldset = _.union(fieldset, [
                        {
                            key: 'enabled',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Enabled'
                            }
                        },
                        {
                            key: 'name',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Name',
                                required: true
                            },
                            validators: {
                                uniqueName: {
                                    expression: function (viewValue) {
                                        if (isInitial || viewValue !== model.name) {
                                            return _.pluck(parentModel, "name").indexOf(viewValue) === -1;
                                        }
                                        return true;
                                    },
                                    message: '"Downloader \\"" + $viewValue + "\\" already exists"'
                                }
                            }

                        },
                        {
                            key: 'url',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'URL',
                                help: 'URL with scheme and full path',
                                required: true
                            },
                            watcher: {
                                listener: function (field, newValue, oldValue, scope) {
                                    if (newValue !== oldValue) {
                                        scope.$parent.needsConnectionTest = true;
                                    }
                                }
                            }
                        }
                    ]);


                    if (model.downloaderType === "SABNZBD") {
                        fieldset.push({
                            key: 'apiKey',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'API Key'
                            },
                            watcher: {
                                listener: function (field, newValue, oldValue, scope) {
                                    if (newValue !== oldValue) {
                                        scope.$parent.needsConnectionTest = true;
                                    }
                                }
                            }
                        })
                    } else if (model.downloaderType === "NZBGET") {
                        fieldset.push({
                            key: 'username',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Username'
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
                            key: 'password',
                            type: 'passwordSwitch',
                            templateOptions: {
                                type: 'text',
                                label: 'Password'
                            },
                            watcher: {
                                listener: function (field, newValue, oldValue, scope) {
                                    if (newValue !== oldValue) {
                                        scope.$parent.needsConnectionTest = true;
                                    }
                                }
                            }
                        })
                    }

                    fieldset = _.union(fieldset, [
                        {
                            key: 'defaultCategory',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Default category',
                                help: 'When adding NZBs this category will be used instead of asking for the category. Write "Use original category", "Use no category" or "Use mapped category" to not be asked.',
                                placeholder: 'Ask when downloading'
                            }
                        },
                        {
                            key: 'nzbAddingType',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'NZB adding type',
                                options: [
                                    {name: 'Send link', value: 'SEND_LINK'},
                                    {name: 'Upload NZB', value: 'UPLOAD'}
                                ],
                                help: "How NZBs are added to the downloader, either by sending a link to the NZB or by uploading the NZB data. Uploading is recommended"
                            }
                        },
                        {
                            key: 'iconCssClass',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Icon CSS class',
                                help: 'Copy an icon name from https://fontawesome.com/v4.7.0/icons/ (e.g. "film")',
                                placeholder: 'Default'
                            }
                        }
                    ]);

                    return fieldset;
                }
            }
        });
    });


angular
    .module('nzbhydraApp')
    .factory('DownloaderConfigBoxService', DownloaderConfigBoxService);

function DownloaderConfigBoxService($http, $q, $uibModal) {

    return {
        checkConnection: checkConnection,
        checkCaps: checkCaps
    };

    function checkConnection(url, settings) {
        var deferred = $q.defer();

        $http.post(url, settings).then(function (result) {
            //Using ng-class and a scope variable doesn't work for some reason, is only updated at second click
            if (result.data.successful) {
                deferred.resolve({checked: true, message: null, model: result.data});
            } else {
                deferred.reject({checked: true, message: result.data.message});
            }
        }, function (result) {
            deferred.reject({checked: false, message: result.data.message});
        });

        return deferred.promise;
    }

    function checkCaps(capsCheckRequest) {
        var deferred = $q.defer();

        var result = $uibModal.open({
            templateUrl: 'static/html/checker-state.html',
            controller: CheckCapsModalInstanceCtrl,
            size: "md",
            backdrop: "static",
            backdropClass: "waiting-cursor",
            resolve: {
                capsCheckRequest: function () {
                    return capsCheckRequest;
                }
            }
        });

        result.result.then(function (data) {
            deferred.resolve(data[0], data[1]);
        }, function (message) {
            deferred.reject(message);
        });

        return deferred.promise;
    }
}

angular.module('nzbhydraApp').controller('DownloaderConfigBoxInstanceController', function ($scope, $q, $uibModalInstance, $http, model, fields, isInitial, parentModel, data, growl, DownloaderCheckBeforeCloseService) {

    $scope.model = model;
    $scope.fields = fields;
    $scope.isInitial = isInitial;
    $scope.spinnerActive = false;
    $scope.needsConnectionTest = false;

    $scope.obSubmit = function () {
        if ($scope.form.$valid) {
            var a = DownloaderCheckBeforeCloseService.checkBeforeClose($scope, model).then(function (data) {
                if (angular.isDefined(data)) {
                    $scope.model = data;
                }
                $uibModalInstance.close(data);
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
            //Reset the model twice (for some reason when we do it once the search types / ids fields are empty, resetting again fixes that... (wtf))
            $scope.options.resetModel();
            $scope.options.resetModel();
        }
    };

    $scope.$on("modal.closing", function (targetScope, reason) {
        if (reason === "backdrop click") {
            $scope.reset($scope);
        }
    });
});


angular
    .module('nzbhydraApp')
    .factory('DownloaderCheckBeforeCloseService', DownloaderCheckBeforeCloseService);

function DownloaderCheckBeforeCloseService($q, DownloaderConfigBoxService, growl, ModalService, blockUI) {

    return {
        checkBeforeClose: checkBeforeClose
    };

    function checkBeforeClose(scope, model) {
        var deferred = $q.defer();
        if (!scope.isInitial && !scope.needsConnectionTest) {
            deferred.resolve();
        } else {
            scope.spinnerActive = true;
            blockUI.start("Testing connection...");
            var url = "internalapi/downloader/checkConnection";
            DownloaderConfigBoxService.checkConnection(url, JSON.stringify(model)).then(function () {
                    blockUI.reset();
                    scope.spinnerActive = false;
                    growl.info("Connection to the downloader tested successfully");
                    deferred.resolve();
                },
                function (data) {
                    blockUI.reset();
                    scope.spinnerActive = false;
                    handleConnectionCheckFail(ModalService, data, model, "downloader", deferred);
                }).finally(function () {
                scope.spinnerActive = false;
                blockUI.reset();
            });
        }
        return deferred.promise;
    }
}