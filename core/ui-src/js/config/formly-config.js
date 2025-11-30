/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

hashCode = function (s) {
    return s.split("").reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a
    }, 0);
};

angular
    .module('nzbhydraApp').run(function (formlyConfig, formlyValidationMessages) {
    formlyValidationMessages.addStringMessage('required', 'This field is required');
    formlyValidationMessages.addStringMessage('newznabCategories', 'Invalid');
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
            templateUrl: 'fieldset-wrapper.html',
            controller: ['$scope', function ($scope) {
                $scope.tooltipIsOpen = false;
            }]
        });

        formlyConfigProvider.setType({
            name: 'help',
            template: [
                '<div  ng-show="model.showAdvanced || !to.advanced">',
                '<div class="panel panel-default" style="margin-top: {{options.templateOptions.marginTop}}; margin-bottom: {{options.templateOptions.marginBottom}} ;">',
                '<div class="panel-body {{options.templateOptions.class}}">',
                '<div ng-repeat="line in options.templateOptions.lines"><h5>{{ line | derefererExtracting | unsafe }} </h5></div>',
                '</div>',
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
            name: 'horizontalTextArea',
            extends: 'textarea',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });

        formlyConfigProvider.setType({
            name: 'timeOfDay',
            extends: 'horizontalInput',
            controller: ['$scope', function ($scope) {
                var key = $scope.options.key;
                var value = $scope.model[key];
                // Convert HH:mm string to Date for the time picker on load
                if (value && typeof value === 'string') {
                    // Parse HH:mm format
                    var parts = value.split(':');
                    if (parts.length >= 2) {
                        var date = new Date(Date.UTC(1970, 0, 1, parseInt(parts[0], 10), parseInt(parts[1], 10), 0));
                        $scope.model[key] = date;
                    }
                }
            }]
        });

        formlyConfigProvider.setType({
            name: 'passwordSwitch',
            wrapper: ['settingWrapper', 'bootstrapHasError'],
            template: [
                '<div class="input-group">',
                '<input ng-attr-type="{{ hidePassword ? \'password\' : \'text\' }}" class="form-control" ng-model="internalValue"',
                'ng-attr-placeholder="{{ isUnchangedPassword ? \'Password unchanged\' : \'\' }}"',
                'ng-change="onPasswordChange()" ng-focus="onPasswordFocus()" ng-blur="onPasswordBlur()"',
                'ng-required="false"/>',  // Disable HTML5 required validation
                '<span class="input-group-btn input-group-btn2">',
                '<button class="btn btn-default" type="button" ng-click="hidePassword=!hidePassword"><span class="glyphicon glyphicon-eye-open" ng-class="{\'glyphicon-eye-open\': hidePassword, \'glyphicon-eye-close\': !hidePassword}"></span></button>',
                '</div>'
            ].join(' '),
            defaultOptions: {
                validators: {
                    passwordRequired: {
                        expression: function ($viewValue, $modelValue, scope) {
                            var UNCHANGED_PASSWORD_MARKER = '***UNCHANGED***';

                            // If the field is not required, always pass
                            if (!scope.to.required) {
                                return true;
                            }

                            // If the model value is the unchanged marker, it's valid (existing password)
                            if ($modelValue === UNCHANGED_PASSWORD_MARKER) {
                                return true;
                            }

                            // IMPORTANT: If we have a username but no password value yet,
                            // this is likely an existing user whose password hasn't been initialized yet
                            // We should allow this temporarily as the controller will fix it
                            if (scope.model.username && (!$modelValue || $modelValue === '')) {
                                return true;
                            }

                            // For new users (no username), require a password
                            if (!scope.model.username) {
                                return !!$modelValue && $modelValue.length > 0;
                            }

                            // Otherwise, check if a value is present
                            return !!$modelValue && $modelValue.length > 0;
                        },
                        message: '"This field is required"'
                    }
                }
            },
            controller: function ($scope) {
                $scope.hidePassword = true;
                var UNCHANGED_PASSWORD_MARKER = '***UNCHANGED***';
                var passwordWasChanged = false;
                var originalValue = $scope.model[$scope.options.key];
                var actualModelValue = originalValue; // Store the actual value

                // Override the model property to control access
                Object.defineProperty($scope.model, $scope.options.key, {
                    get: function () {
                        // Always return the actual stored value for validation
                        return actualModelValue;
                    },
                    set: function (newValue) {
                        // Only allow setting if it's intentional
                        if (passwordWasChanged || newValue === UNCHANGED_PASSWORD_MARKER) {
                            actualModelValue = newValue;
                        } else if (actualModelValue === UNCHANGED_PASSWORD_MARKER && (newValue === '' || newValue === null || newValue === undefined)) {
                            // Prevent clearing of unchanged marker
                        } else {
                            actualModelValue = newValue;
                        }
                    },
                    configurable: true,
                    enumerable: true
                });

                // Use a completely separate internal value for display to avoid touching the model
                $scope.internalValue = '';
                $scope.isUnchangedPassword = false;

                if (originalValue === UNCHANGED_PASSWORD_MARKER) {
                    $scope.isUnchangedPassword = true;
                    $scope.internalValue = ''; // Show empty field with placeholder
                } else if (originalValue) {
                    $scope.internalValue = originalValue;
                } else {
                    // No value at all - could be a new user
                    $scope.internalValue = '';
                }

                $scope.onPasswordChange = function () {
                    // If user types something, update the actual model
                    if ($scope.internalValue && $scope.internalValue !== '') {
                        $scope.model[$scope.options.key] = $scope.internalValue;
                        $scope.isUnchangedPassword = false;
                        passwordWasChanged = true;
                    } else if (passwordWasChanged && $scope.internalValue === '') {
                        // User cleared a password they were typing
                        if (originalValue === UNCHANGED_PASSWORD_MARKER) {
                            // Restore the unchanged marker
                            $scope.model[$scope.options.key] = UNCHANGED_PASSWORD_MARKER;
                            $scope.isUnchangedPassword = true;
                            passwordWasChanged = false;
                        } else {
                            // This was a new password field, clear it
                            $scope.model[$scope.options.key] = '';
                        }
                    }
                };

                $scope.onPasswordFocus = function () {
                    // Nothing special needed on focus
                };

                $scope.onPasswordBlur = function () {
                    // If user leaves the field empty after it was originally the unchanged marker,
                    // ensure the marker is still there (meaning no change)
                    if (originalValue === UNCHANGED_PASSWORD_MARKER &&
                        ($scope.internalValue === '' || $scope.internalValue === null) &&
                        !passwordWasChanged) {
                        // The model should still have the marker, but make sure
                        $scope.model[$scope.options.key] = UNCHANGED_PASSWORD_MARKER;
                        $scope.isUnchangedPassword = true;
                    }
                };

                // Watch for external changes to the model (e.g., when loading config)
                $scope.$watch('model[options.key]', function (newVal, oldVal) {
                    if (newVal === UNCHANGED_PASSWORD_MARKER && oldVal !== UNCHANGED_PASSWORD_MARKER) {
                        $scope.isUnchangedPassword = true;
                        $scope.internalValue = '';
                        originalValue = UNCHANGED_PASSWORD_MARKER;
                        passwordWasChanged = false;
                    }
                });
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
                    var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
                    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
                    $scope.model[$scope.options.key] = result;
                    $scope.form.$setDirty(true);
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
            name: 'colorInput',
            extends: 'horizontalInput',
            templateUrl: 'static/html/config/color-control.html',
            controller: function ($scope) {
                //Model format: rgb(116,18,18)
                //Input format: rgba(100,42,41,0.5)
                if (!_.isNullOrEmpty($scope.model.color)) {
                    $scope.color = $scope.model.color;
                }
                $scope.convertColorToCss = function () {
                    if (_.isNullOrEmpty($scope.model.color)) {
                        return "";
                    }
                    return $scope.model.color.replace("rgb", "rgba").replace(")", ",0.5)");
                }
                $scope.convertColorFromInput = function () {
                    if (_.isNullOrEmpty($scope.color)) {
                        return;
                    }
                    $scope.model.color = $scope.color.replace("rgba", "rgb").replace(",0.5)", ")");
                }
                $scope.clear = function () {
                    $scope.model.color = null;
                    $scope.color = null;
                }
                $scope.$watch("model.color", function () {
                    if (!_.isNullOrEmpty($scope.model.color)) {
                        $scope.color = $scope.model.color;
                    }
                })
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

        formlyConfigProvider.setType({
            name: 'customMappingTest',
            extends: 'horizontalInput',
            template: [
                '<div class="input-group">',
                '<button class="btn btn-default" type="button" ng-click="open()">Help and test</button>',
                '</div>'
            ].join(' '),
            controller: function ($scope, $uibModal, $http) {
                $scope.open = function () {
                    var model = $scope.model;
                    var modelCopy = structuredClone(model);
                    $uibModal.open({
                        templateUrl: 'static/html/custom-mapping-help.html',
                        controller: function ($scope, $uibModalInstance, $http) {
                            $scope.model = modelCopy;
                            $scope.cancel = function () {
                                $uibModalInstance.close();
                            }
                            $scope.submit = function () {
                                Object.assign(model, $scope.model)
                                $uibModalInstance.close();

                            }

                            $scope.test = function () {
                                if (!$scope.exampleInput) {
                                    $scope.exampleResult = "Empty example data";
                                    return;

                                }
                                console.log("custom mapping test");
                                $http.post('internalapi/customMapping/test', {mapping: $scope.model, exampleInput: $scope.exampleInput, matchAll: $scope.matchAll}).then(function (response) {
                                    console.log(response.data);
                                    console.log(response.data.output);
                                    if (response.data.error) {
                                        $scope.exampleResult = response.data.error;
                                    } else if (response.data.match) {
                                        $scope.exampleResult = response.data.output;
                                    } else {
                                        $scope.exampleResult = "Input does not match example";
                                    }
                                }, function (response) {
                                    $scope.exampleResult = response.message;
                                })
                            }
                        },
                        size: "md"
                    })
                }
            }
        });

        function updateIndexerModel(model, indexerConfig) {
            model.supportedSearchIds = indexerConfig.supportedSearchIds;
            model.supportedSearchTypes = indexerConfig.supportedSearchTypes;
            model.categoryMapping = indexerConfig.categoryMapping;
            model.configComplete = indexerConfig.configComplete;
            model.allCapsChecked = indexerConfig.allCapsChecked;
            model.hitLimit = indexerConfig.hitLimit;
            model.downloadLimit = indexerConfig.downloadLimit;
            model.state = indexerConfig.state;
            model.backend = indexerConfig.backend;
        }

        formlyConfigProvider.setType({
            //BUtton
            name: 'checkCaps',
            templateUrl: 'button-check-caps.html',
            controller: function ($scope, IndexerConfigBoxService, ModalService, growl) {
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
                    IndexerConfigBoxService.checkCaps({
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
            name: 'indexerStateSwitch',
            template: '<indexer-state-switch indexer="model" handle-width="165px"/>'
        });


        formlyConfigProvider.setType({
            name: 'horizontalIndexerStateSwitch',
            extends: 'indexerStateSwitch',
            wrapper: ['settingWrapper', 'bootstrapHasError']
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
            wrapper: ['settingWrapper', 'bootstrapHasError'],
            controller: function ($scope) {
                if ($scope.options.templateOptions.optionsFunction !== undefined) {
                    $scope.to.options.push.apply($scope.to.options, $scope.options.templateOptions.optionsFunction($scope.model));
                }
                if ($scope.options.templateOptions.optionsFunctionAfter !== undefined) {
                    $scope.options.templateOptions.optionsFunctionAfter($scope.model);
                }
            }
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
                if ($scope.options.templateOptions.optionsFunction !== null && $scope.options.templateOptions.optionsFunction !== undefined) {
                    $scope.to.options.push.apply($scope.to.options, $scope.options.templateOptions.optionsFunction($scope.model));
                }
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

                function addNew(preset) {
                    console.log(preset);
                    $scope.form.$setDirty(true);
                    $scope.model[$scope.options.key] = $scope.model[$scope.options.key] || [];
                    var repeatsection = $scope.model[$scope.options.key];
                    var newsection = angular.copy($scope.options.templateOptions.defaultModel);
                    Object.assign(newsection, preset);
                    repeatsection.push(newsection);
                }

                function remove($index) {
                    $scope.model[$scope.options.key].splice($index, 1);
                    $scope.form.$setDirty(true);
                }
            }
        });

        formlyConfigProvider.setType({
            name: 'recheckAllCaps',
            templateUrl: 'static/html/config/recheck-all-caps.html',
            controller: function ($scope, $uibModal, growl, IndexerConfigBoxService) {
                $scope.recheck = function (checkType) {
                    IndexerConfigBoxService.checkCaps({checkType: checkType}).then(function (listOfResults) {
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


        formlyConfigProvider.setType({
            name: 'notificationSection',
            templateUrl: 'notificationRepeatSection.html',
            controller: function ($scope, NotificationService) {
                $scope.formOptions = {formState: $scope.formState};
                $scope.addNew = addNew;
                $scope.remove = remove;
                $scope.copyFields = copyFields;
                $scope.eventTypes = [];

                var allData = NotificationService.getAllData();
                _.each(_.keys(allData), function (key) {
                    $scope.eventTypes.push({"key": key, "label": allData[key].readable})
                })

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

                function addNew(eventType) {
                    $scope.form.$setDirty(true);
                    $scope.model[$scope.options.key] = $scope.model[$scope.options.key] || [];
                    var repeatsection = $scope.model[$scope.options.key];
                    var newsection = angular.copy($scope.options.templateOptions.defaultModel);

                    var eventTypeData = NotificationService.getAllData()[eventType];
                    console.log(eventTypeData);
                    newsection.eventType = eventType;
                    newsection.titleTemplate = eventTypeData.titleTemplate;
                    newsection.bodyTemplate = eventTypeData.bodyTemplate;
                    newsection.messageType = eventTypeData.messageType;

                    repeatsection.push(newsection);
                }

                function remove($index) {
                    $scope.model[$scope.options.key].splice($index, 1);
                    $scope.form.$setDirty(true);
                }
            }
        });

        formlyConfigProvider.setType({
            //Button
            name: 'testNotification',
            templateUrl: 'button-test-notification.html',
            controller: function ($scope, NotificationService) {


                //When button is clicked
                $scope.testNotification = function () {
                    NotificationService.testNotification($scope.model.eventType)
                }
            }
        });

        formlyConfigProvider.setType({
            name: 'horizontalTestNotification',
            extends: 'testNotification',
            wrapper: ['settingWrapper', 'bootstrapHasError']
        });


    });

