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

function regexValidator(regex, message, prefixViewValue, preventEmpty) {
    return {
        expression: function ($viewValue, $modelValue) {
            var value = $modelValue || $viewValue;
            if (value) {
                if (Array.isArray(value)) {
                    for (var i = 0; i < value.length; i++) {
                        if (!regex.test(value[i])) {
                            return false;
                        }
                    }
                    return true;
                } else {
                    return regex.test(value);
                }
            }
            return !preventEmpty;
        },
        message: (prefixViewValue ? '$viewValue + " ' : '" ') + message + '"'
    };
}

function getIndexerBoxFields(indexerModel, parentModel, isInitial, CategoriesService) {
    var fieldset = [];
    if (indexerModel.searchModuleType === "TORZNAB") {
        fieldset.push({
            type: 'help',
            templateOptions: {
                type: 'help',
                lines: ["Torznab indexers can only be used for internal searches or dedicated searches using /torznab/api"]
            }
        });
    }
    if ((indexerModel.searchModuleType === "NEWZNAB" || indexerModel.searchModuleType === "TORZNAB") && !isInitial && indexerModel.searchModuleType !== 'JACKETT_CONFIG') {
        var message;
        var cssClass;
        if (!indexerModel.configComplete) {
            message = "The config of this indexer is incomplete. Please click the button at the bottom to check its capabilities and complete its configuration.";
            cssClass = "alert alert-danger";
        } else {
            message = "The capabilities of this indexer were not checked completely. Some actually supported search types or IDs may not be usable.";
            cssClass = "alert alert-warning";
        }
        fieldset.push({
            type: 'help',
            hideExpression: 'model.allCapsChecked && model.configComplete',
            templateOptions: {
                type: 'help',
                lines: [message],
                class: cssClass
            }
        });
    }

    var stateHelp = "";
    if (indexerModel.state === "DISABLED_SYSTEM_TEMPORARY" || indexerModel.state === "DISABLED_SYSTEM") {
        if (indexerModel.state === "DISABLED_SYSTEM_TEMPORARY") {
            stateHelp = "The indexer was disabled by the program due to an error. It will be reenabled automatically or you can enable it manually";
        } else {
            stateHelp = "The indexer was disabled by the program due to error from which it cannot recover by itself. Try checking the caps to make sure it works or just enable it and see what happens.";
        }
    }

    if (indexerModel.searchModuleType === 'NEWZNAB' || indexerModel.searchModuleType === 'TORZNAB') {
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
                            if (isInitial || viewValue !== indexerModel.name) {
                                return _.pluck(parentModel, "name").indexOf(viewValue) === -1;
                            }
                            return true;
                        },
                        message: '"Indexer \\"" + $viewValue + "\\" already exists"'
                    },
                    noComma:
                        {
                            expression: function ($viewValue, $modelValue) {
                                var value = $modelValue || $viewValue;
                                if (value) {
                                    return value.indexOf(",") === -1;
                                }
                                return true;
                            },
                            message: '"Name may not contain a comma"'
                        }
                }
            })
    }

    if (indexerModel.searchModuleType !== 'JACKETT_CONFIG') {
        fieldset.push({
            key: 'state',
            type: 'horizontalIndexerStateSwitch',
            templateOptions: {
                type: 'switch',
                label: 'State',
                help: stateHelp
            }
        });
    }

    if (['WTFNZB', 'NEWZNAB', 'TORZNAB', 'JACKETT_CONFIG'].includes(indexerModel.searchModuleType)) {
        var hostField = {
            key: 'host',
            type: 'horizontalInput',
            templateOptions: {
                type: 'text',
                label: 'Host',
                required: true,
                placeholder: 'http://www.someindexer.com'
            },
            watcher: {
                listener: function (field, newValue, oldValue, scope) {
                    if (newValue !== oldValue) {
                        scope.$parent.needsConnectionTest = true;
                    }
                }
            }
        };
        if (indexerModel.searchModuleType === 'TORZNAB') {
            hostField.templateOptions.help = 'If you use Jackett and have an external URL use that one';
        }
        fieldset.push(
            hostField
        );
    }

    if (['WTFNZB', 'NEWZNAB', 'TORZNAB', 'JACKETT_CONFIG', 'NZBINDEX_API'].includes(indexerModel.searchModuleType) && indexerModel.host !== 'https://feed.animetosho.org') {
        fieldset.push(
            {
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
            }
        )
    }

    if (['NEWZNAB', 'TORZNAB'].includes(indexerModel.searchModuleType)) {
        fieldset.push(
            {
                key: 'apiPath',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    label: 'API path',
                    help: 'Path to the API. If empty /api is used',
                    required: false,
                    advanced: true
                },
                watcher: {
                    listener: function (field, newValue, oldValue, scope) {
                        if (newValue !== oldValue) {
                            scope.$parent.needsConnectionTest = true;
                        }
                    }
                }
            }
        )
    }

    if (['NEWZNAB', 'TORZNAB', 'JACKETT_CONFIG'].includes(indexerModel.searchModuleType)) {
        fieldset.push(
            {
                key: 'username',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    required: false,
                    label: 'Username',
                    help: 'Only needed if indexer requires HTTP auth for API access (rare).'
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
    }

    if ('WTFNZB' === indexerModel.searchModuleType) {
        fieldset.push(
            {
                key: 'username',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    required: true,
                    label: 'Username',
                    help: 'See the API help on the website. Copy the user ID from the example API request where it says i=&lt;yourUserId&gt; (e.g. ABg4Cd==)'
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
        fieldset.push(
            {
                key: 'password',
                type: 'passwordSwitch',
                hideExpression: '!model.username',
                templateOptions: {
                    type: 'text',
                    required: false,
                    label: 'Password',
                    help: 'Only needed if indexer requires HTTP auth for API access (rare).'
                }
            }
        )
    }


    if (indexerModel.searchModuleType !== 'JACKETT_CONFIG') {
        fieldset.push(
            {
                key: 'score',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'Priority',
                    required: true,
                    help: 'When duplicate search results are found the result from the indexer with the highest number will be selected.',
                    tooltip: 'The priority determines which indexer is used if duplicate results are found (i.e. results that link to the same upload, not just results with the same name).<br>The result from the indexer with the highest number is shown first in the GUI and returned for API searches.'

                }
            });
    }

    fieldset.push(
        {
            key: 'timeout',
            type: 'horizontalInput',
            templateOptions: {
                type: 'number',
                label: 'Timeout',
                min: 1,
                help: 'Supercedes the general timeout in "Searching".',
                advanced: true
            }
        },
        {
            key: 'schedule',
            type: 'horizontalChips',
            templateOptions: {
                type: 'text',
                label: 'Schedule',
                help: 'Determines when an indexer should be selected. See <a href="https://github.com/theotherp/nzbhydra2/wiki/Indexer-schedules" target="_blank">wiki</a>. You can enter multiple time spans. Apply values with return key.',
                advanced: true
            }
        }
    );

    if (['NEWZNAB', 'TORZNAB'].includes(indexerModel.searchModuleType)) {
        fieldset.push(
            {
                key: 'hitLimit',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'API hit limit',
                    help: 'Maximum number of API hits since "API hit reset time".',
                    tooltip: 'When the maximum number of API hits is reached the indexer isn\'t used anymore. Only API hits done by NZBHydra are taken into account.'
                },
                validators: {
                    greaterThanZero: {
                        expression: function ($viewValue, $modelValue) {
                            var value = $modelValue || $viewValue;
                            return _.isNullOrEmpty(value) || value > 0;
                        },
                        message: '"Value must be greater than 0"'
                    }
                }
            },
            {
                key: 'downloadLimit',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'Download limit',
                    help: 'When # of downloads since "Hit reset time" is reached indexer will not be searched.'
                },
                validators: {
                    greaterThanZero: {
                        expression: function ($viewValue, $modelValue) {
                            var value = $modelValue || $viewValue;
                            return _.isNullOrEmpty(value) || value > 0;
                        },
                        message: '"Value must be greater than 0"'
                    }
                }
            }
        );
        fieldset.push(
            {
                key: 'hitLimitResetTime',
                type: 'horizontalInput',
                hideExpression: '!model.hitLimit && !model.downloadLimit',
                templateOptions: {
                    type: 'number',
                    label: 'Hit reset time',
                    help: 'UTC hour of day at which the API hit counter is reset (0-23). Leave empty for a rolling reset counter.',
                    tooltip: 'Either define the time of day when the counter is reset by the indexer or leave it empty to use a rolling reset counter, meaning the number of hits for the last 24h at the time of the search is limited.'
                },
                validators: {
                    timeOfDay: {
                        expression: function ($viewValue, $modelValue) {
                            var value = $modelValue || $viewValue;
                            return value >= 0 && value <= 23;
                        },
                        message: '$viewValue + " is not a valid hour of day (0-23)"'
                    }
                }
            },
            {
                key: 'loadLimitOnRandom',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'Load limiting',
                    help: 'If set indexer will only be picked for one out of x API searches (on average).',
                    tooltip: 'For indexers with a low API hit limit you can enable load limiting. Define any number n so that the indexer will only be used for searches in 1/n cases (on average). For example if you define a load limit of 5 the indexer will only be picked every fifth search.',
                    advanced: true
                },
                validators: {
                    greaterThanZero: {
                        expression: function ($viewValue, $modelValue) {
                            var value = $modelValue || $viewValue;
                            return _.isNullOrEmpty(value) || value > 1;
                        },
                        message: '"Value must be greater than 1"'
                    }
                }
            }
        );
    }
    if (indexerModel.searchModuleType === 'TORZNAB') {
        fieldset.push({
            key: 'minSeeders',
            type: 'horizontalInput',
            templateOptions: {
                type: 'number',
                label: 'Minimum # seeders',
                help: 'Torznab results with fewer seeders will be ignored. Supercedes any setting made in the searching config.'
            }
        })
    }

    if (['NEWZNAB', 'TORZNAB', 'WTFNZB'].includes(indexerModel.searchModuleType)) {
        fieldset.push(
            {
                key: 'userAgent',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    required: false,
                    label: 'User agent',
                    help: 'Rarely needed. Will supercede the one in the main searching settings.',
                    advanced: true
                }
            }
        )
    }

    if (['NEWZNAB', 'TORZNAB'].includes(indexerModel.searchModuleType)) {
        fieldset.push(
            {
                key: 'customParameters',
                type: 'horizontalChips',
                templateOptions: {
                    type: 'text',
                    required: false,
                    label: 'Custom parameters',
                    help: 'Define custom parameters to be sent to the indexer when searching. Use the format "name=value"Apply values with return key.',
                    advanced: 'true'
                }
            }
        )
    }

    fieldset.push(
        {
            key: 'preselect',
            type: 'horizontalSwitch',
            hideExpression: 'model.enabledForSearchSource==="EXTERNAL"',
            templateOptions: {
                type: 'switch',
                label: 'Preselect',
                help: 'Preselect this indexer on the search page.'
            }
        }
    );
    fieldset.push(
        {
            key: 'enabledForSearchSource',
            type: 'horizontalSelect',
            templateOptions: {
                label: 'Enable for...',
                options: [
                    {name: 'Internal searches only', value: 'INTERNAL'},
                    {name: 'API searches only', value: 'API'},
                    {name: 'All but API update queries ', value: 'ALL_BUT_RSS'},
                    {name: 'Only API update queries ', value: 'ONLY_RSS'},
                    {name: 'Internal and any API searches', value: 'BOTH'}
                ],
                help: 'Select for which searches this indexer will be used. "Update queries" are searches without query or ID (e.g. done by Sonarr periodically).',
                advanced: true
            }
        }
    );

    fieldset.push(
        {
            key: 'color',
            type: 'colorInput',
            templateOptions: {
                label: 'Color',
                help: 'If set it will be used in the search results to mark the indexer\'s results.',
                tooltip: 'To mark expanded results they\'re shown in a darker shade so it\'s recommended to use indexer colors which not only differ in lightness',
                advanced: true
            }
        }
    );

    fieldset.push(
        {
            key: 'vipExpirationDate',
            type: 'horizontalInput',
            templateOptions: {
                required: false,
                label: 'VIP expiry',
                help: 'Enter when your VIP access expires and NZBHydra will track it and warn you when close to expiry. Enter as YYYY-MM-DD or "Lifetime".'
            },
            validators: {
                port: regexValidator(/^(\d{4}-\d{2}-\d{2})|Lifetime$/, "is no valid date (must be 'YYYY-MM-DD' or 'Lifetime')", true, false)
            }
        }
    );

    if (indexerModel.searchModuleType !== "ANIZB" && indexerModel.searchModuleType !== 'JACKETT_CONFIG') {
        var cats = CategoriesService.getWithoutAll();
        var options = _.map(cats, function (x) {
            return {id: x.name, label: x.name}
        });
        fieldset.push(
            {
                key: 'enabledCategories',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Categories',
                    help: 'Only use indexer when searching for these and also reject results from others. Selecting none equals selecting all.',
                    options: options,
                    settings: {
                        showSelectedValues: false,
                        noSelectedText: "None/All"
                    },
                    advanced: true
                }
            }
        );
    }


    if ((['NEWZNAB', 'TORZNAB'].includes(indexerModel.searchModuleType)) && !isInitial && indexerModel.searchModuleType !== 'JACKETT_CONFIG') {
        fieldset.push(
            {
                key: 'supportedSearchIds',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Search IDs',
                    options: [
                        {label: 'IMDB (TV)', id: 'TVIMDB'},
                        {label: 'TVDB', id: 'TVDB'},
                        {label: 'TVRage', id: 'TVRAGE'},
                        {label: 'Trakt', id: 'TRAKT'},
                        {label: 'TVMaze', id: 'TVMAZE'},
                        {label: 'IMDB', id: 'IMDB'},
                        {label: 'TMDB', id: 'TMDB'}
                    ],
                    noSelectedText: "None",
                    advanced: true
                }
            }
        );
        fieldset.push(
            {
                key: 'supportedSearchTypes',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Search types',
                    options: [
                        {label: 'Audio', id: 'AUDIO'},
                        {label: 'Ebooks', id: 'BOOK'},
                        {label: 'Movies', id: 'MOVIE'},
                        {label: 'Search', id: 'SEARCH'},
                        {label: 'TV', id: 'TVSEARCH'}
                    ],
                    buttonText: "None",
                    advanced: true
                }
            }
        );
        fieldset.push(
            {
                type: 'horizontalCheckCaps',
                hideExpression: '!model.host || !model.name',
                templateOptions: {
                    label: 'Check capabilities',
                    help: 'Find out what search types and IDs the indexer supports.',
                    tooltip: 'The first time an indexer is added the connection is tested. When successful the supported search IDs and types are checked. These determine if indexers allow searching for movies, shows or ebooks using meta data like the IMDB id or the author and title. Newznab indexers cannot be used until this check was completed. Click this button to execute the caps check again.'
                }
            }
        )
    }

    if (indexerModel.searchModuleType === 'NZBINDEX') {
        fieldset.push(
            {
                key: 'generalMinSize',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'Min size',
                    help: 'NZBIndex returns a lot of crap with small file sizes. Set this value and all smaller results will be filtered out no matter the category'
                }
            }
        );
    }

    if (indexerModel.searchModuleType === 'BINSEARCH') {
        fieldset.push({
            key: 'binsearchOtherGroups',
            type: 'horizontalSwitch',
            templateOptions: {
                type: 'switch',
                label: 'Search in other groups',
                help: 'If disabled binsearch will only search in the most popular usenet groups'
            }
        })
    }

    return fieldset;
}

function _showBox(indexerModel, parentModel, isInitial, $uibModal, CategoriesService, mode, form, callback) {
    var modalInstance = $uibModal.open({
        templateUrl: 'static/html/config/indexer-config-box.html',
        controller: 'IndexerConfigBoxInstanceController',
        size: 'lg',
        resolve: {
            model: function () {
                indexerModel.showAdvanced = parentModel.showAdvanced;
                return indexerModel;
            },
            fields: function () {
                return getIndexerBoxFields(indexerModel, parentModel, isInitial, CategoriesService, mode);
            },
            form: function () {
                return form;
            },
            isInitial: function () {
                return isInitial
            },
            parentModel: function () {
                return parentModel;
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

angular
    .module('nzbhydraApp')
    .config(function config(formlyConfigProvider) {

        formlyConfigProvider.setType({
            name: 'indexers',
            templateUrl: 'static/html/config/indexer-config.html',
            controller: function ($scope, $uibModal, growl, CategoriesService) {
                $scope.showBox = showBox;
                $scope.formOptions = {formState: $scope.formState};
                $scope.showPresetSelection = showPresetSelection;

                function showPresetSelection() {
                    $uibModal.open({
                        templateUrl: 'static/html/config/indexer-config-selection.html',
                        controller: 'IndexerConfigSelectionBoxInstanceController',
                        size: 'lg',
                        resolve: {
                            model: function () {
                                return $scope.model;
                            },
                            form: function () {
                                return $scope.form;
                            }
                        }
                    });
                }

                //Called when clicking the box of an existing indexer
                function showBox(indexerModel, model) {
                    _showBox(indexerModel, model, false, $uibModal, CategoriesService, "indexer", $scope.form)
                }

            }
        });
    });


angular.module('nzbhydraApp').controller('IndexerConfigSelectionBoxInstanceController', function ($scope, $q, $uibModalInstance, $uibModal, $http, model, form, growl, CategoriesService, $timeout, ModalService, RequestsErrorHandler) {

    $scope.showBox = showBox;
    $scope.isInitial = false;

    $scope.select = function (modelPreset) {

        addEntry(modelPreset);
        $timeout(function () {
                $uibModalInstance.close();
            },
            200);
    };

    $scope.readJackettConfig = function () {
        var indexerModel = createIndexerModel();
        indexerModel.searchModuleType = "JACKETT_CONFIG";
        indexerModel.isInitial = false;
        indexerModel.host = "http://127.0.0.1:9117";
        indexerModel.name = "Jackett config";
        _showBox(indexerModel, model, true, $uibModal, CategoriesService, "jackettConfig", form, function (isSubmitted, returnedModel) {
            if (isSubmitted) {
                //User pushed button, now we read the config
                RequestsErrorHandler.specificallyHandled(function () {
                    $http.post("internalapi/indexer/readJackettConfig", {existingIndexers: model, jackettConfig: returnedModel}, {
                        headers: {
                            "Accept": "application/json;charset=utf-8",
                            "Accept-Charset": "charset=utf-8"
                        }
                    }).then(function (response) {
                        //Replace model with new result
                        model.splice(0, model.length);
                        _.each(response.data.newIndexersConfig, function (x) {
                            model.push(x);
                        });
                        growl.info("Added " + response.data.addedTrackers + " new trackers from Jackett");
                        growl.info("Updated " + response.data.updatedTrackers + " trackers from Jackett");

                    }, function (response) {
                        ModalService.open("Error reading jackett config", response.data, {}, "md", "left");
                    });
                });
            }
        });

        $timeout(function () {
                $uibModalInstance.close();
            },
            200);
    };

    function showBox(indexerModel, model) {
        _showBox(indexerModel, model, false, $uibModal, CategoriesService, "indexer", form)
    }

    function createIndexerModel() {
        return angular.copy({
            allCapsChecked: false,
            apiKey: null,
            backend: 'NEWZNAB',
            color: null,
            configComplete: false,
            categoryMapping: null,
            downloadLimit: null,
            enabledCategories: [],
            enabledForSearchSource: "BOTH",
            generalMinSize: null,
            hitLimit: null,
            hitLimitResetTime: 0,
            host: null,
            loadLimitOnRandom: null,
            name: null,
            password: null,
            preselect: true,
            score: 0,
            searchModuleType: 'NEWZNAB',
            showOnSearch: true,
            state: "ENABLED",
            supportedSearchIds: undefined,
            supportedSearchTypes: undefined,
            timeout: null,
            username: null,
            userAgent: null
        });
    }

    function addEntry(preset) {
        if (checkAddingAllowed(model, preset)) {
            var indexerModel = createIndexerModel();
            if (angular.isDefined(preset)) {
                _.extend(indexerModel, preset);
            }

            $scope.isInitial = true;

            _showBox(indexerModel, model, true, $uibModal, CategoriesService, "indexer", form, function (isSubmitted, returnedModel) {
                if (isSubmitted) {
                    //Here is where the entry is actually added to the model
                    model.push(angular.isDefined(returnedModel) ? returnedModel : indexerModel);
                }
            });
        } else {
            growl.error("That predefined indexer is already configured."); //For now this is the only case where adding is forbidden so we use this hardcoded message "for now"... (;-))
        }
    }

    function checkAddingAllowed(existingIndexers, preset) {
        if (!preset || !(preset.searchModuleType === "ANIZB" || preset.searchModuleType === "BINSEARCH" || preset.searchModuleType === "NZBINDEX" || preset.searchModuleType === "NZBCLUB")) {
            return true;
        }
        return !_.any(existingIndexers, function (existingEntry) {
            return existingEntry.name === preset.name;
        });
    }

    $scope.newznabPresets = [
        {
            name: "abNZB",
            host: "https://abnzb.com/"
        },
        {
            name: "altHUB",
            host: "https://api.althub.co.za"
        },
        {
            name: "Animetosho (Newznab)",
            host: "https://feed.animetosho.org",
            categories: ["Anime"],
            supportedSearchIds: [],
            supportedSearchTypes: ["SEARCH"],
            allCapsChecked: true,
            configComplete: true,
            categoryMapping: {
                anime: 5070,
                audiobook: null,
                comic: null,
                ebook: null,
                magazine: null,
                categories: [
                    {
                        id: 5070,
                        name: "Anime",
                        subCategories: []
                    }
                ]
            }
        },
        {
            name: "DogNZB",
            host: "https://api.dognzb.cr"
        },
        {
            name: "Drunken Slug",
            host: "https://api.drunkenslug.com"
        },
        {
            name: "FastNZB",
            host: "https://fastnzb.com"
        },
        {
            name: "LuluNZB",
            host: "https://lulunzb.com"
        },
        {
            name: "miatrix",
            host: "https://www.miatrix.com"
        },
        {
            name: "NZB Finder",
            host: "https://nzbfinder.ws"
        },
        {
            name: "NZBCat",
            host: "https://nzb.cat"
        },
        {
            name: "nzb.su",
            host: "https://api.nzb.su"
        },
        {
            name: "NZBGeek",
            host: "https://api.nzbgeek.info"
        },
        {
            name: "NzbNdx",
            host: "https://www.nzbndx.com"
        },
        {
            name: "NzBNooB",
            host: "https://www.nzbnoob.com"
        },
        {
            name: "NzbNation",
            host: "http://www.nzbnation.com/"
        },
        {
            name: "nzbplanet",
            host: "https://nzbplanet.net"
        },
        {
            name: "omgwtfnzbs",
            host: "https://api.omgwtfnzbs.org"
        },
        {
            name: "spotweb.com",
            host: "https://spotweb.me"
        },
        {
            name: "Tabula-Rasa",
            host: "https://www.tabula-rasa.pw/api/v1/"
        },
        {
            allCapsChecked: true,
            enabledForSearchSource: "INTERNAL",
            categories: [],
            configComplete: true,
            downloadLimit: null,
            hitLimit: null,
            hitLimitResetTime: null,
            host: "https://binsearch.info",
            loadLimitOnRandom: null,
            name: "Binsearch",
            password: null,
            preselect: true,
            score: 0,
            showOnSearch: true,
            state: "ENABLED",
            supportedSearchIds: [],
            supportedSearchTypes: [],
            timeout: null,
            searchModuleType: "BINSEARCH",
            username: null
        },
        {
            allCapsChecked: true,
            enabledForSearchSource: "INTERNAL",
            categories: [],
            configComplete: true,
            downloadLimit: null,
            generalMinSize: 1,
            hitLimit: null,
            hitLimitResetTime: null,
            host: "https://nzbindex.com",
            loadLimitOnRandom: null,
            name: "NZBIndex",
            password: null,
            preselect: true,
            score: 0,
            showOnSearch: true,
            state: "ENABLED",
            supportedSearchIds: [],
            supportedSearchTypes: [],
            timeout: null,
            searchModuleType: "NZBINDEX",
            username: null
        },
        {
            allCapsChecked: true,
            enabledForSearchSource: "INTERNAL",
            categories: [],
            configComplete: true,
            downloadLimit: null,
            generalMinSize: 1,
            hitLimit: null,
            hitLimitResetTime: null,
            host: "https://api.nzbindex.com",
            loadLimitOnRandom: null,
            name: "NZBIndex API",
            password: null,
            preselect: true,
            score: 0,
            showOnSearch: true,
            state: "ENABLED",
            supportedSearchIds: [],
            supportedSearchTypes: [],
            timeout: null,
            searchModuleType: "NZBINDEX_API",
            username: null
        },
        {
            allCapsChecked: true,
            enabledForSearchSource: "INTERNAL",
            categories: [],
            configComplete: true,
            downloadLimit: null,
            generalMinSize: 1,
            hitLimit: null,
            hitLimitResetTime: null,
            host: "https://beta.nzbindex.com/search",
            loadLimitOnRandom: null,
            name: "NZBIndex Beta",
            password: null,
            preselect: true,
            score: 0,
            showOnSearch: true,
            state: "ENABLED",
            supportedSearchIds: [],
            supportedSearchTypes: [],
            timeout: null,
            searchModuleType: "NZBINDEX_BETA",
            username: null
        },
        {
            allCapsChecked: true,
            enabledForSearchSource: "INTERNAL",
            categories: [],
            configComplete: true,
            downloadLimit: null,
            hitLimit: null,
            hitLimitResetTime: null,
            host: "https://www.nzbking.com/search",
            loadLimitOnRandom: null,
            name: "NZBKing.com",
            password: null,
            preselect: true,
            score: 0,
            showOnSearch: true,
            state: "ENABLED",
            supportedSearchIds: [],
            supportedSearchTypes: [],
            timeout: null,
            searchModuleType: "NZBKING",
            username: null
        },
        {
            allCapsChecked: true,
            enabledForSearchSource: "INTERNAL",
            categories: [],
            configComplete: true,
            downloadLimit: null,
            generalMinSize: 1,
            hitLimit: null,
            hitLimitResetTime: null,
            host: null,
            loadLimitOnRandom: null,
            name: "WtfNzb",
            password: null,
            preselect: true,
            score: 0,
            showOnSearch: true,
            state: "ENABLED",
            supportedSearchIds: [],
            supportedSearchTypes: [],
            timeout: null,
            searchModuleType: "WTFNZB",
            username: null,
            userAgent: null
        }
    ];

    $scope.newznabPresets = _.sortBy($scope.newznabPresets, function (entry) {
        return entry.name.toLowerCase()
    });

    $scope.torznabPresets = [
        {
            allCapsChecked: false,
            configComplete: false,
            name: "Jackett/Cardigann",
            host: "http://127.0.0.1:9117/api/v2.0/indexers/YOURTRACKER/results/torznab/",
            supportedSearchIds: undefined,
            supportedSearchTypes: undefined,
            searchModuleType: "TORZNAB",
            state: "ENABLED",
            enabledForSearchSource: "BOTH"
        },
        {
            categories: ["Anime"],
            allCapsChecked: true,
            configComplete: true,
            name: "Animetosho (Torznab)",
            host: "https://feed.animetosho.org",
            supportedSearchIds: [],
            supportedSearchTypes: ["SEARCH"],
            searchModuleType: "TORZNAB",
            state: "ENABLED",
            enabledForSearchSource: "BOTH"
        }
    ];

    $scope.emptyTorznabPreset = {
        allCapsChecked: false,
        configComplete: false,
        supportedSearchIds: undefined,
        supportedSearchTypes: undefined,
        searchModuleType: "TORZNAB",
        state: "ENABLED",
        enabledForSearchSource: "BOTH"
    };
    $scope.torznabPresets = _.sortBy($scope.torznabPresets, function (entry) {
        return entry.name.toLowerCase()
    });
});


angular.module('nzbhydraApp').controller('IndexerConfigBoxInstanceController', function ($scope, $q, $uibModalInstance, $http, model, form, fields, isInitial, parentModel, growl, IndexerCheckBeforeCloseService) {

    $scope.model = model;
    $scope.fields = fields;
    $scope.isInitial = isInitial;
    $scope.spinnerActive = false;
    $scope.needsConnectionTest = false;

    $scope.obSubmit = function () {
        if (model.searchModuleType === 'JACKETT_CONFIG') {
            $uibModalInstance.close(model);
        } else if (form.$valid) {
            var a = IndexerCheckBeforeCloseService.checkBeforeClose($scope, model).then(function (data) {
                if (angular.isDefined(data)) {
                    $scope.model = data;
                }
                $uibModalInstance.close(data);
            });
        } else {
            growl.error("Config invalid. Please check your settings.");
            angular.forEach(form.$error, function (error) {
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
        //Reset the model twice (for some reason when we do it once the search types / ids fields are empty, resetting again fixes that... (wtf))
        $scope.options.resetModel();
        $scope.options.resetModel();
    };

    $scope.$on("modal.closing", function (targetScope, reason) {
        if (reason === "backdrop click") {
            $scope.reset($scope);
        }
    });
});


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

angular
    .module('nzbhydraApp')
    .factory('IndexerConfigBoxService', IndexerConfigBoxService);

function IndexerConfigBoxService($http, $q, $uibModal) {

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
    .factory('IndexerCheckBeforeCloseService', IndexerCheckBeforeCloseService);

function IndexerCheckBeforeCloseService($q, ModalService, IndexerConfigBoxService, growl, blockUI) {

    return {
        checkBeforeClose: checkBeforeClose
    };

    function checkBeforeClose(scope, model) {
        var deferred = $q.defer();
        if (model.searchModuleType === 'JACKETT_CONFIG') {
            deferred.resolve(model);
        } else if (!scope.isInitial && (!scope.needsConnectionTest || scope.form.capsChecked)) {
            checkCapsWhenClosing(scope, model).then(function () {
                deferred.resolve(model);
            }, function () {
                deferred.reject();
            });
        } else {
            scope.spinnerActive = true;
            blockUI.start("Testing connection...");
            var url = "internalapi/indexer/checkConnection";
            IndexerConfigBoxService.checkConnection(url, model).then(function () {
                    growl.info("Connection to the indexer tested successfully");
                    checkCapsWhenClosing(scope, model).then(function (data) {
                        scope.spinnerActive = false;
                        blockUI.reset();
                        deferred.resolve(data);
                    }, function () {
                        scope.spinnerActive = false;
                        blockUI.reset();
                        deferred.reject();
                    });
                },
                function (data) {
                    scope.spinnerActive = false;
                    blockUI.reset();
                    handleConnectionCheckFail(ModalService, data, model, "indexer", deferred);
                });
        }
        return deferred.promise;
    }

    //Called when the indexer dialog is closed
    function checkCapsWhenClosing(scope, model) {
        var deferred = $q.defer();
        if (angular.isUndefined(model.supportedSearchIds) || angular.isUndefined(model.supportedSearchTypes)) {

            blockUI.start("New indexer found. Testing its capabilities. This may take a bit...");
            IndexerConfigBoxService.checkCaps({indexerConfig: model, checkType: "SINGLE"}).then(
                function (data) {
                    data = data[0]; //We get a list of results (with one result because the check type is single)
                    blockUI.reset();
                    scope.spinnerActive = false;
                    if (data.allCapsChecked && data.configComplete) {
                        growl.info("Successfully tested capabilites of indexer");
                    } else if (!data.allCapsChecked && data.configComplete) {
                        ModalService.open("Incomplete caps check", "The capabilities of the indexer could not be checked completely. You may use it but it's recommended to repeat the check at another time.<br>Until then some search types or IDs may not be usable.", {}, "md", "left");
                    } else if (!data.configComplete) {
                        ModalService.open("Error testing capabilities", "An error occurred while contacting the indexer. It will not be usable until the caps check has been executed. You can trigger it manually from the indexer config box", {}, "md", "left");
                    }

                    deferred.resolve(data.indexerConfig);
                },
                function () {
                    blockUI.reset();
                    scope.spinnerActive = false;
                    model.supportedSearchIds = undefined;
                    model.supportedSearchTypes = undefined;
                    ModalService.open("Error testing capabilities", "An error occurred while contacting the indexer. It will not be usable until the caps check has been executed. You can trigger it manually using the button below.", {}, "md", "left");
                    deferred.resolve();
                }).finally(
                function () {
                    scope.spinnerActive = false;
                })
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    }
}
