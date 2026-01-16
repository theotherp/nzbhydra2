
angular
    .module('nzbhydraApp')
    .config(function config(formlyConfigProvider) {

        formlyConfigProvider.setType({
            name: 'downloaderConfig',
            templateUrl: 'static/html/config/downloader-config.html',
            controller: function ($scope, $uibModal, growl, CategoriesService, localStorageService) {
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
                        addPaused: false,
                        url: "http://nzbget:tegbzn6789@localhost:6789"
                    },
                    {
                        url: "http://localhost:8080",
                        downloaderType: "SABNZBD",
                        name: "SABnzbd",
                        nzbAddingType: "UPLOAD",
                        nzbAccessType: "REDIRECT",
                        iconCssClass: "",
                        addPaused: false,
                        downloadType: "NZB"
                    },
                    {
                        downloaderType: "TORBOX",
                        name: "Torbox",
                        nzbAddingType: "UPLOAD",
                        nzbAccessType: "PROXY",
                        iconCssClass: "",
                        downloadType: "NZB",
                        defaultCategory: "Use no category"
                    }
                ];

                function _showBox(model, parentModel, isInitial, callback) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'static/html/config/downloader-config-box.html',
                        controller: 'DownloaderConfigBoxInstanceController',
                        size: 'lg',
                        resolve: {
                            model: function () {
                                //Isn't properly stored in parentmodel for some reason, this works just as well
                                model.showAdvanced = localStorageService.get("showAdvanced");
                                console.log(model.showAdvanced);
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


                    fieldset.push(
                        {
                            key: 'enabled',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Enabled'
                            }
                        });
                    if (model.downloaderType !== "TORBOX") {

                        fieldset.push(
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

                        });
                    }
                    fieldset.push({
                            key: 'url',
                            type: 'horizontalInput',
                        hideFor: ["TORBOX"],
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
                    );


                    if (model.downloaderType === "SABNZBD" || model.downloaderType === "TORBOX") {
                        fieldset.push({
                            key: 'apiKey',
                            type: 'horizontalInput',
                            showFor: ["SABNZBD", "TORBOX"],
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

                    fieldset.push(
                        {
                            key: 'defaultCategory',
                            type: 'horizontalInput',
                            hideFor: ["TORBOX"],
                            templateOptions: {
                                type: 'text',
                                label: 'Default category',
                                help: 'When adding NZBs this category will be used instead of asking for the category. Write "Use original category", "Use no category" or "Use mapped category" to not be asked.',
                                placeholder: 'Ask when downloading'
                            }
                        });
                    fieldset.push({
                        key: 'nzbAddingType',
                        type: 'horizontalSelect',
                        hideFor: ["TORBOX"],
                        templateOptions: {
                            type: 'select',
                            label: 'NZB adding type',
                            options: [
                                {name: 'Send link', value: 'SEND_LINK'},
                                {name: 'Upload NZB', value: 'UPLOAD'}
                            ],
                            help: "How NZBs are added to the downloader, either by sending a link to the NZB or by uploading the NZB data.",
                            tooltip: 'You can select if you want to upload the NZB to the downloader or send a Hydra link. The downloader will do the download itself. This is a matter of taste, but adding a link and redirecting the downloader is the fastest way.' +
                                '<br>Usually the links are determined using the URL via which you call it in your browser. If your downloader cannot access NZBHydra using that URL you can set a specific URL to be used in the main downloading config.',
                            advanced: true
                        }
                    });
                    fieldset.push({
                        key: 'addPaused',
                        type: 'horizontalSwitch',
                        hideFor: ["TORBOX"],
                        templateOptions: {
                            type: 'switch',
                            label: 'Add paused',
                            help: 'Add NZBs paused',
                            advanced: true
                        }
                    });
                    fieldset.push(
                        {
                            key: 'iconCssClass',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Icon CSS class',
                                help: 'Copy an icon name from https://fontawesome.com/v4.7.0/icons/ (e.g. "film")',
                                placeholder: 'Default',
                                tooltip: 'If you have multiple downloaders of the same type you can select an icon from the Font Awesome library. This icon will be shown in the search results and the NZB download history instead of the default downloader icon.',
                                advanced: true
                            }
                        });
                    fieldset = fieldset.filter(function (field) {
                        if (field.showFor) {
                            return field.showFor.includes(model.downloaderType);
                        }
                        if (field.hideFor) {
                            return !field.hideFor.includes(model.downloaderType);
                        }
                        return true;
                    });
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