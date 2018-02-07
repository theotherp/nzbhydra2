hashCode = function (s) {
    return s.split("").reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a
    }, 0);
};

angular
    .module('nzbhydraApp').run(function (formlyConfig, formlyValidationMessages) {
    formlyValidationMessages.addStringMessage('required', 'This field is required');
    formlyConfig.extras.errorExistsAndShouldBeVisibleExpression = 'fc.$touched || form.$submitted';

});

angular
    .module('nzbhydraApp')
    .config(function config(formlyConfigProvider) {
        formlyConfigProvider.extras.removeChromeAutoComplete = true;
        formlyConfigProvider.extras.explicitAsync = true;
        formlyConfigProvider.disableWarnings = window.onProd;


        formlyConfigProvider.setWrapper({
            name: 'settingWrapper',
            templateUrl: 'setting-wrapper.html'
        });


        formlyConfigProvider.setWrapper({
            name: 'fieldset',
            template: [
                '<fieldset>',
                '<legend><span class="config-fieldset-legend">{{options.templateOptions.label}}</span></legend>',
                '<formly-transclude></formly-transclude>',
                '</fieldset>'
            ].join(' ')
        });

        formlyConfigProvider.setType({
            name: 'help',
            template: [
                //'<div class="panel panel-default" style="margin-top: ' + options.templateOptions.marginTop + 'margin-bottom:' + options.templateOptions.marginBottom + ';">',
                '<div class="panel panel-default" style="margin-top: {{options.templateOptions.marginTop}}; margin-bottom: {{options.templateOptions.marginBottom}} ;">',
                '<div class="panel-body {{options.templateOptions.class}}">',
                '<div ng-repeat="line in options.templateOptions.lines"><h5>{{ line }}</h5></div>',
                '</div>',
                '</div>'
            ].join(' ')
        });


        formlyConfigProvider.setWrapper({
            name: 'logicalGroup',
            template: [
                '<formly-transclude></formly-transclude>'
            ].join(' ')
        });

        formlyConfigProvider.setType({
            name: 'horizontalInput',
            extends: 'input',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });

        formlyConfigProvider.setType({
            name: 'timeOfDay',
            extends: 'horizontalInput',
            controller: ['$scope', function ($scope) {
                $scope.model[$scope.options.key] = moment.utc($scope.model[$scope.options.key]).toDate();
            }]
        });

        formlyConfigProvider.setType({
            name: 'passwordSwitch',
            extends: 'horizontalInput',
            template: [
                '<div class="input-group">',
                '<input ng-attr-type="{{ hidePassword ? \'password\' : \'text\' }}" class="form-control" ng-model="model[options.key]"/>',
                '<span class="input-group-btn input-group-btn2">',
                '<button class="btn btn-default" type="button" ng-click="hidePassword=!hidePassword"><span class="glyphicon glyphicon-eye-open" ng-class="{\'glyphicon-eye-open\': hidePassword, \'glyphicon-eye-close\': !hidePassword}"></span></button>',
                '</div>'
            ].join(' '),
            controller: function ($scope) {
                $scope.hidePassword = true;
            }
        });

        formlyConfigProvider.setType({
            name: 'horizontalChips',
            extends: 'horizontalInput',
            template: '<chips ng-model="model[options.key]" class="chips form-control">' +
            '            <chip-tmpl class="chip-tmp">' +
            '                <div class="default-chip">' +
            '                    {{chip}}' +
            '                    <span class="glyphicon glyphicon-remove remove-chip" remove-chip></span>' +
            '                </div>' +
            '            </chip-tmpl>' +
            '            <input chip-control class="chip-control"></input>' +
            '        </chips>'
        });

        formlyConfigProvider.setType({
            name: 'percentInput',
            template: [
                '<input type="number" class="form-control" placeholder="Percent" ng-model="model[options.key]" ng-pattern="/^[0-9]+(\.[0-9]{1,2})?$/" step="0.01" required />'
            ].join(' ')
        });

        formlyConfigProvider.setType({
            name: 'apiKeyInput',
            template: [
                '<div class="input-group">',
                '<input type="text" class="form-control" ng-model="model[options.key]"/>',
                '<span class="input-group-btn input-group-btn2">',
                '<button class="btn btn-default" type="button" ng-click="generate()"><span class="glyphicon glyphicon-refresh"></span></button>',
                '</div>'
            ].join(' '),
            controller: function ($scope) {
                $scope.generate = function () {
                    var result = "";
                    var length = 24;
                    var chars = "0123456789abcdefghijklmnopqrstuvwxyz";
                    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
                    $scope.model[$scope.options.key] = result;
                }
            }
        });

        formlyConfigProvider.setType({
            name: 'fileInput',
            extends: 'horizontalInput',
            template: [
                '<div class="input-group">',
                '<input type="text" class="form-control" ng-model="model[options.key]"/>',
                '<span class="input-group-btn input-group-btn2">',
                '<button class="btn btn-default" type="button" ng-click="open()">...</button>',
                '</div>'
            ].join(' '),
            controller: function ($scope, FileSelectionService) {
                $scope.open = function () {
                    FileSelectionService.open($scope.model[$scope.options.key], $scope.to.type).then(function (selection) {
                        $scope.model[$scope.options.key] = selection;
                    });
                }
            }
        });

        formlyConfigProvider.setType({
            name: 'testConnection',
            templateUrl: 'button-test-connection.html'
        });

        formlyConfigProvider.setType({
            name: 'horizontalTestConnection',
            extends: 'testConnection',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });

        function updateIndexerModel(model, indexerConfig) {
            model.supportedSearchIds = indexerConfig.supportedSearchIds;
            model.supportedSearchTypes = indexerConfig.supportedSearchTypes;
            model.categoryMapping = indexerConfig.categoryMapping;
            model.configComplete = indexerConfig.configComplete;
            model.allCapsChecked = indexerConfig.allCapsChecked;
            model.enabled = indexerConfig.enabled;
        }

        formlyConfigProvider.setType({
            //BUtton
            name: 'checkCaps',
            templateUrl: 'button-check-caps.html',
            controller: function ($scope, ConfigBoxService, ModalService, growl) {
                $scope.message = "";
                $scope.uniqueId = hashCode($scope.model.name) + hashCode($scope.model.host);

                var testButton = "#button-check-caps-" + $scope.uniqueId;
                var testMessage = "#message-check-caps-" + $scope.uniqueId;

                function showSuccess() {
                    angular.element(testButton).removeClass("btn-default");
                    angular.element(testButton).removeClass("btn-danger");
                    angular.element(testButton).removeClass("btn-warning");
                    angular.element(testButton).addClass("btn-success");
                }

                function showError() {
                    angular.element(testButton).removeClass("btn-default");
                    angular.element(testButton).removeClass("btn-warning");
                    angular.element(testButton).removeClass("btn-success");
                    angular.element(testButton).addClass("btn-danger");
                }

                function showWarning() {
                    angular.element(testButton).removeClass("btn-default");
                    angular.element(testButton).removeClass("btn-danger");
                    angular.element(testButton).removeClass("btn-success");
                    angular.element(testButton).addClass("btn-warning");
                }


                //When button is clicked
                $scope.checkCaps = function () {
                    angular.element(testButton).addClass("glyphicon-refresh-animate");
                    ConfigBoxService.checkCaps({
                        indexerConfig: $scope.model,
                        checkType: "SINGLE"
                    }).then(function (data) {
                        data = data[0]; //We get a list of results (with one result because the check type is single)
                        //Formly doesn't allow replacing the model so we need to set all the relevant values ourselves
                        updateIndexerModel($scope.model, data.indexerConfig);
                        if (data.indexerConfig.supportedSearchIds.length > 0) {
                            var message = "Supports " + data.indexerConfig.supportedSearchIds;
                            angular.element(testMessage).text(message);
                        }
                        if (data.indexerConfig.allCapsChecked && data.indexerConfig.configComplete) {
                            showSuccess();
                            growl.info("Successfully tested capabilites of indexer");
                            $scope.form.capsChecked = true;
                        } else if (!data.indexerConfig.allCapsChecked && data.indexerConfig.configComplete) {
                            showWarning();
                            ModalService.open("Incomplete caps check", "The capabilities of the indexer could not be checked completely. You may use it but it's recommended to repeat the check at another time.<br>Until then some search types or IDs may not be usable.", {}, "md", "left");
                            $scope.form.capsChecked = true;
                        } else if (!data.configComplete) {
                            showError();
                            ModalService.open("Error testing capabilities", "An error occurred while contacting the indexer. It will not be usable until the caps check has been executed. You can trigger it manually from the indexer config box", {}, "md", "left");
                        }
                    }, function (message) {
                        angular.element(testMessage).text(message);
                        showError();
                        ModalService.open("Error testing capabilities", "An error occurred while contacting the indexer. It will not be usable until the caps check has been executed. You can trigger it manually from the indexer config box", {}, "md", "left");
                    }).finally(function () {
                        angular.element(testButton).removeClass("glyphicon-refresh-animate");
                    });
                }
            }
        });

        formlyConfigProvider.setType({
            name: 'horizontalCheckCaps',
            extends: 'checkCaps',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });


        formlyConfigProvider.setType({
            name: 'horizontalApiKeyInput',
            extends: 'apiKeyInput',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });

        formlyConfigProvider.setType({
            name: 'horizontalPercentInput',
            extends: 'percentInput',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });


        formlyConfigProvider.setType({
            name: 'switch',
            template: '<div style="text-align:left"><input bs-switch type="checkbox" ng-model="model[options.key]"/></div>'
        });


        formlyConfigProvider.setType({
            name: 'duoSetting',
            extends: 'input',
            defaultOptions: {
                className: 'col-md-9',
                templateOptions: {
                    type: 'number',
                    noRow: true,
                    label: ''
                }
            }
        });

        formlyConfigProvider.setType({
            name: 'horizontalSwitch',
            extends: 'switch',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });

        formlyConfigProvider.setType({
            name: 'horizontalSelect',
            extends: 'select',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });


        formlyConfigProvider.setType({
            name: 'horizontalMultiselect',
            defaultOptions: {
                templateOptions: {
                    optionsAttr: 'bs-options',
                    ngOptions: 'option[to.valueProp] as option in to.options | filter: $select.search'
                }
            },
            template: '<span multiselect-dropdown options="to.options" selected-model="model[options.key]" settings="settings" events="events"></span>',
            controller: function ($scope) {
                var settings = $scope.to.settings || [];
                settings.classes = settings.classes || [];
                angular.extend(settings.classes, ["form-control"]);
                $scope.settings = settings;
                $scope.events = {
                    onToggleItem: function (item, newValue) {
                        $scope.form.$setDirty(true);
                    }
                }
            },
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });

        formlyConfigProvider.setType({
            name: 'label',
            template: '<label class="control-label">{{to.label}}</label>'
        });

        formlyConfigProvider.setType({
            name: 'duolabel',
            extends: 'label',
            defaultOptions: {
                className: 'col-md-2',
                templateOptions: {
                    label: '-'
                }
            }
        });

        formlyConfigProvider.setType({
            name: 'repeatSection',
            templateUrl: 'repeatSection.html',
            controller: function ($scope) {
                $scope.formOptions = {formState: $scope.formState};
                $scope.addNew = addNew;
                $scope.remove = remove;
                $scope.copyFields = copyFields;

                function copyFields(fields) {
                    fields = angular.copy(fields);
                    $scope.repeatfields = fields;
                    return fields;
                }

                $scope.clear = function (field) {
                    return _.mapObject(field, function (key, val) {
                        if (typeof val === 'object') {
                            return $scope.clear(val);
                        }
                        return undefined;

                    });
                };

                function addNew() {
                    $scope.form.$setDirty(true);
                    $scope.model[$scope.options.key] = $scope.model[$scope.options.key] || [];
                    var repeatsection = $scope.model[$scope.options.key];
                    var newsection = angular.copy($scope.options.templateOptions.defaultModel);
                    repeatsection.push(newsection);
                }

                function remove($index) {
                    $scope.model[$scope.options.key].splice($index, 1);
                    $scope.form.$setDirty(true);
                }
            }
        });

        formlyConfigProvider.setType({
            name: 'arrayConfig',
            templateUrl: 'arrayConfig.html',
            controller: function ($scope, $uibModal, growl, CategoriesService) {
                $scope.formOptions = {formState: $scope.formState};
                $scope._showBox = _showBox;
                $scope.showBox = showBox;
                $scope.isInitial = false;
                $scope.presets = $scope.options.data.presets($scope.model);

                function _showBox(model, parentModel, isInitial, callback) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'configBox.html',
                        controller: 'ConfigBoxInstanceController',
                        size: 'lg',
                        resolve: {
                            model: function () {
                                return model;
                            },
                            fields: function () {
                                return $scope.options.data.fieldsFunction(model, parentModel, isInitial, angular.injector(), CategoriesService);
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
                    if ($scope.options.data.checkAddingAllowed(entriesCollection, preset)) {
                        var model = angular.copy($scope.options.data.defaultModel);
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
                    } else {
                        growl.error("That predefined indexer is already configured."); //For now this is the only case where adding is forbidden so we use this hardcoded message "for now"... (;-))
                    }
                };
            }
        });

        formlyConfigProvider.setType({
            name: 'recheckAllCaps',
            templateUrl: 'recheckAllCaps.html',
            controller: function ($scope, $uibModal, growl, ConfigBoxService) {
                $scope.recheck = function (checkType) {
                    ConfigBoxService.checkCaps({checkType: checkType}).then(function (listOfResults) {
                        //A bit ugly, but we have to update the current model with the new data from the list
                        for (var i = 0; i < $scope.model.length; i++) {
                            for (var j = 0; j < listOfResults.length; j++) {
                                if ($scope.model[i].name === listOfResults[j].indexerConfig.name) {
                                    updateIndexerModel($scope.model[i], listOfResults[j].indexerConfig);
                                    $scope.form.$setDirty(true);
                                }
                            }
                        }
                    });
                }
            }

        });


    });


angular.module('nzbhydraApp').controller('ConfigBoxInstanceController', function ($scope, $q, $uibModalInstance, $http, model, fields, isInitial, parentModel, data, growl) {

    $scope.model = model;
    $scope.fields = fields;
    $scope.isInitial = isInitial;
    $scope.allowDelete = data.allowDeleteFunction(model);
    $scope.deleteTooltip = data.deleteTooltip;
    $scope.spinnerActive = false;
    $scope.needsConnectionTest = false;

    $scope.obSubmit = function () {
        if ($scope.form.$valid) {
            var a = data.checkBeforeClose($scope, model).then(function (data) {
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
            data.resetFunction($scope);
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
    .factory('ConfigBoxService', ConfigBoxService);

function ConfigBoxService($http, $q, $uibModal) {

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

angular
    .module('nzbhydraApp')
    .controller('CheckCapsModalInstanceCtrl', CheckCapsModalInstanceCtrl);

function CheckCapsModalInstanceCtrl($scope, $interval, $http, $timeout, growl, capsCheckRequest) {

    var updateMessagesInterval = undefined;

    $scope.messages = undefined;
    $http.post("internalapi/indexer/checkCaps", capsCheckRequest).then(function (response) {
        $scope.$close([response.data, capsCheckRequest.indexerConfig]);
        if (response.data.length === 0) {
            growl.info("No indexers were checked");
        }
    }, function () {
        $scope.$dismiss("Unknown error")
    });

    $timeout(
        updateMessagesInterval = $interval(function () {
            $http.get("internalapi/indexer/checkCapsMessages").then(function (response) {
                var map = response.data;
                var messages = [];
                for (var name in map) {
                    if (map.hasOwnProperty(name)) {
                        for (var i = 0; i < map[name].length; i++) {
                            var message = "";
                            if (capsCheckRequest.checkType !== "SINGLE") {
                                message += name + ": ";
                            }
                            message += map[name][i];
                            messages.push(message);
                        }
                    }
                }
                $scope.messages = messages;
            });

        }, 500),
        500);


    $scope.$on('$destroy', function () {
        if (angular.isDefined(updateMessagesInterval)) {
            $interval.cancel(updateMessagesInterval);
        }
    });


}




