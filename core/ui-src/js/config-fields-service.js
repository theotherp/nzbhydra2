angular
    .module('nzbhydraApp')
    .factory('ConfigFields', ConfigFields);

function ConfigFields($injector) {

    var restartWatcher;

    return {
        getFields: getFields,
        setRestartWatcher: setRestartWatcher
    };

    function setRestartWatcher(restartWatcherFunction) {
        restartWatcher = restartWatcherFunction;
    }


    function restartListener(field, newValue, oldValue) {
        if (newValue != oldValue) {
            restartWatcher();
        }
    }


    function ipValidator() {
        return {
            expression: function ($viewValue, $modelValue) {
                var value = $modelValue || $viewValue;
                if (value) {
                    return /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/.test(value)
                        || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value);
                }
                return true;
            },
            message: '$viewValue + " is not a valid IP Address"'
        };
    }

    function regexValidator(regex, message, prefixViewValue) {
        return {
            expression: function ($viewValue, $modelValue) {
                var value = $modelValue || $viewValue;
                if (value) {
                    return regex.test(value);
                }
                return true;
            },
            message: (prefixViewValue ? '$viewValue + " ' : '" ') + message + '"'
        };
    }


    function getCategoryFields() {
        var fields = [];
        var ConfigService = $injector.get("ConfigService");
        var categories = ConfigService.getSafe().categories;
        fields.push({
            key: 'enableCategorySizes',
            type: 'horizontalSwitch',
            templateOptions: {
                type: 'switch',
                label: 'Category sizes',
                help: "Preset min and max sizes depending on the selected category"
            }
        });
        _.each(categories, function (category) {
                if (category.name != "all" && category.name != "na") {
                    var categoryFields = [
                        {
                            key: "categories." + category.name + '.requiredWords',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Required words',
                                placeholder: 'separate, with, commas, like, this'
                            }
                        },
                        {
                            key: "categories." + category.name + '.requiredRegex',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Required regex',
                                help: 'Must be present in a title (case insensitive)'
                            }
                        },
                        {
                            key: "categories." + category.name + '.forbiddenWords',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden words',
                                placeholder: 'separate, with, commas, like, this'
                            }
                        },
                        {
                            key: "categories." + category.name + '.forbiddenRegex',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden regex',
                                help: 'Must not be present in a title (case insensitive)'
                            }
                        },
                        {
                            key: "categories." + category.name + '.applyRestrictions',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Apply restrictions',
                                options: [
                                    {name: 'Internal searches', value: 'internal'},
                                    {name: 'API searches', value: 'external'},
                                    {name: 'All searches', value: 'both'}
                                ],
                                help: "For which type of search word restrictions will be applied"
                            }
                        }
                    ];
                    categoryFields.push({
                        wrapper: 'settingWrapper',
                        templateOptions: {
                            label: 'Size preset'
                        },
                        fieldGroup: [
                            {
                                key: "categories." + category.name + '.min',
                                type: 'duoSetting',
                                templateOptions: {
                                    addonRight: {
                                        text: 'MB'
                                    }
                                }
                            },
                            {
                                type: 'duolabel'
                            },
                            {
                                key: "categories." + category.name + '.max',
                                type: 'duoSetting', templateOptions: {addonRight: {text: 'MB'}}
                            }
                        ]
                    });
                    categoryFields.push({
                        key: "categories." + category.name + '.newznabCategories',
                        type: 'horizontalInput',
                        templateOptions: {
                            type: 'text',
                            label: 'Newznab categories',
                            help: 'Map newznab categories to hydra categories',
                            required: true
                        },
                        parsers: [function (value) {
                            if (!value) {
                                return value;
                            }
                            var arr = [];
                            arr.push.apply(arr, value.split(",").map(Number));
                            return arr;

                        }]
                    });
                    categoryFields.push({
                        key: "categories." + category.name + '.ignoreResults',
                        type: 'horizontalSelect',
                        templateOptions: {
                            label: 'Ignore results',
                            options: [
                                {name: 'For internal searches', value: 'internal'},
                                {name: 'For API searches', value: 'external'},
                                {name: 'Always', value: 'always'},
                                {name: 'Never', value: 'never'}
                            ],
                            help: "Ignore results from this category"
                        }
                    });

                    fields.push({
                        wrapper: 'fieldset',
                        templateOptions: {
                            label: category.pretty
                        },
                        fieldGroup: categoryFields

                    })
                }
            }
        );
        return fields;
    }

    function getFields(rootModel) {
        return {
            main: [
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'Hosting'},
                    fieldGroup: [
                        {
                            key: 'host',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Host',
                                required: true,
                                placeholder: 'IPv4/6 address to bind to',
                                help: 'I strongly recommend using a reverse proxy instead of exposing this directly. Requires restart.'
                            },
                            validators: {
                                ipAddress: ipValidator()
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'port',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Port',
                                required: true,
                                placeholder: '5050',
                                help: 'Requires restart'
                            },
                            validators: {
                                port: regexValidator(/^\d{1,5}$/, "is no valid port", true)
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'urlBase',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'URL base',
                                placeholder: '/nzbhydra',
                                help: 'Set when using an external proxy. Call using a trailing slash, e.g. http://www.domain.com/nzbhydra/'
                            },
                            validators: {
                                urlBase: regexValidator(/^(\/\w+)*$/, "Base URL needs to start with a slash and must not end with one")
                            }
                        },
                        {
                            key: 'externalUrl',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'External URL',
                                placeholder: 'https://www.somedomain.com/nzbhydra/',
                                help: 'Set to the full external URL so machines outside can use the generated NZB links.'
                            }
                        },
                        {
                            key: 'useLocalUrlForApiAccess',
                            type: 'horizontalSwitch',
                            hideExpression: '!model.externalUrl',
                            templateOptions: {
                                type: 'switch',
                                label: 'Use local address in API results',
                                help: 'Disable to make API results use the external URL in NZB links.'
                            }
                        },
                        {
                            key: 'ssl',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Use SSL',
                                help: 'I recommend using a reverse proxy instead of this. Requires restart.'
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'socksProxy',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'SOCKS proxy',
                                placeholder: 'socks5://user:pass@127.0.0.1:1080',
                                help: "IPv4 only"
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'httpProxy',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'HTTP proxy',
                                placeholder: 'http://user:pass@10.0.0.1:1080',
                                help: "IPv4 only"
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'httpsProxy',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'HTTPS proxy',
                                placeholder: 'https://user:pass@10.0.0.1:1090',
                                help: "IPv4 only"
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'sslcert',
                            hideExpression: '!model.ssl',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'SSL certificate file',
                                required: true,
                                help: 'Requires restart.'
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'sslkey',
                            hideExpression: '!model.ssl',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'SSL key file',
                                required: true,
                                help: 'Requires restart.'
                            },
                            watcher: {
                                listener: restartListener
                            }
                        }

                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'UI'},
                    fieldGroup: [

                        {
                            key: 'theme',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'Theme',
                                help: 'Reload page after saving',
                                options: [
                                    {name: 'Grey', value: 'grey'},
                                    {name: 'Bright', value: 'bright'},
                                    {name: 'Dark', value: 'dark'}
                                ]
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'Security'},
                    fieldGroup: [

                        {
                            key: 'apikey',
                            type: 'horizontalApiKeyInput',
                            templateOptions: {
                                label: 'API key',
                                help: 'Remove to disable. Alphanumeric only'
                            },
                            validators: {
                                apikey: regexValidator(/^[a-zA-Z0-9]*$/, "API key must only contain numbers and digits", false)
                            }
                        },
                        {
                            key: 'dereferer',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Dereferer',
                                help: 'Redirect external links to hide your instance. Insert $s for target URL. Delete to disable.'
                            }
                        }
                    ]
                },

                {
                    wrapper: 'fieldset',
                    key: 'logging',
                    templateOptions: {label: 'Logging'},
                    fieldGroup: [
                        {
                            key: 'logfilelevel',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'Logfile level',
                                options: [
                                    {name: 'Critical', value: 'CRITICAL'},
                                    {name: 'Error', value: 'ERROR'},
                                    {name: 'Warning', value: 'WARNING'},
                                    {name: 'Info', value: 'INFO'},
                                    {name: 'Debug', value: 'DEBUG'}
                                ]
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'logfilename',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Log file',
                                required: true
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'rolloverAtStart',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                label: 'Startup rollover',
                                help: 'Starts a new log file on start/restart'
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'logMaxSize',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Max log file size',
                                help: 'When log file size is reached a new one is started. Set to 0 to disable.',
                                addonRight: {
                                    text: 'kB'
                                }
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'logRotateAfterDays',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Rotate after',
                                help: 'A new log file is started after this many days. Supercedes max size. Keep empty to disable.',
                                addonRight: {
                                    text: 'days'
                                }
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'keepLogFiles',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Keep log files',
                                help: 'Number of log files to keep before oldest is deleted.'
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },

                        {
                            key: 'consolelevel',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'Console log level',
                                options: [
                                    {name: 'Critical', value: 'CRITICAL'},
                                    {name: 'Error', value: 'ERROR'},
                                    {name: 'Warning', value: 'WARNING'},
                                    {name: 'Info', value: 'INFO'},
                                    {name: 'Debug', value: 'DEBUG'}
                                ]
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'logIpAddresses',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Log IP addresses'
                            }
                        }


                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'Updating'},
                    fieldGroup: [

                        {
                            key: 'gitPath',
                            type: 'horizontalInput',
                            templateOptions: {
                                label: 'Git executable',
                                help: 'Set if git is not in your path'
                            }
                        },
                        {
                            key: 'branch',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Repository branch',
                                required: true,
                                help: 'Stay on master. Seriously...'
                            }
                        }
                    ]
                },

                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'Other'},
                    fieldGroup: [
                        {
                            key: 'keepSearchResultsForDays',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Store results for ...',
                                addonRight: {
                                    text: 'days'
                                },
                                required: true,
                                help: 'Meta data from searches is stored in the database. When they\'re deleted links to hydra become invalid.'
                            }
                        },
                        {
                            key: 'debug',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Enable debugging',
                                help: "Only do this if you know what and why you're doing it"
                            }
                        },
                        {
                            key: 'runThreaded',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Run threaded server',
                                help: 'Requires restart'
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'startupBrowser',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Open browser on startup'
                            }
                        },
                        {
                            key: 'shutdownForRestart',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Shutdown to restart',
                                help: 'When run with a service manager which automatically restarts Hydra enable this to prevent duplicate instances'
                            }
                        }
                    ]
                }
            ],

            searching: [
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Indexer access'
                    },
                    fieldGroup: [
                        {
                            key: 'timeout',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Timeout when accessing indexers',
                                addonRight: {
                                    text: 'seconds'
                                }
                            }
                        },
                        {
                            key: 'ignoreTemporarilyDisabled',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Ignore temporarily disabled',
                                help: "If enabled access to indexers will never be paused after an error occurred"
                            }
                        },
                        {
                            key: 'ignorePassworded',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Ignore passworded releases',
                                help: "Not all indexers provide this information"
                            }
                        },
                        {
                            key: 'forbiddenWords',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden words',
                                placeholder: 'separate, with, commas, like, this',
                                help: "Results with any of these words in the title will be ignored"
                            }
                        },
                        {
                            key: 'forbiddenRegex',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden regex',
                                help: 'Must not be present in a title (case insensitive)'
                            }
                        },
                        {
                            key: 'requiredWords',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Required words',
                                placeholder: 'separate, with, commas, like, this',
                                help: "Only results with at least one of these words in the title will be used"
                            }
                        },
                        {
                            key: 'requiredRegex',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Required regex',
                                help: 'Must be present in a title (case insensitive)'
                            }
                        },
                        {
                            key: 'applyRestrictions',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Apply word restrictions',
                                options: [
                                    {name: 'Internal searches', value: 'internal'},
                                    {name: 'API searches', value: 'external'},
                                    {name: 'All searches', value: 'both'}
                                ],
                                help: "For which type of search word restrictions will be applied"
                            }
                        },
                        {
                            key: 'forbiddenGroups',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden groups',
                                placeholder: 'separate, with, commas, like, this',
                                help: 'Posts from any groups containing any of these words will be ignored'
                            }
                        },
                        {
                            key: 'forbiddenPosters',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden posters',
                                placeholder: 'separate, with, commas, like, this',
                                help: 'Posts from any posters containing any of these words will be ignored'
                            }
                        },
                        {
                            key: 'maxAge',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Maximum results age',
                                help: 'Results older than this are ignored. Can be overwritten per search',
                                addonRight: {
                                    text: 'days'
                                }
                            }
                        },
                        {
                            key: 'generate_queries',
                            type: 'horizontalMultiselect',
                            templateOptions: {
                                label: 'Generate queries',
                                options: [
                                    {label: 'Internal searches', id: 'internal'},
                                    {label: 'API searches', id: 'external'}
                                ],
                                help: "Generate queries for indexers which do not support ID based searches"
                            }
                        },
                        {
                            key: 'idFallbackToTitle',
                            type: 'horizontalMultiselect',
                            templateOptions: {
                                label: 'Fallback to title queries',
                                options: [
                                    {label: 'Internal searches', id: 'internal'},
                                    {label: 'API searches', id: 'external'}
                                ],
                                help: "When no results were found for a query ID search again using the title"
                            }
                        },
                        {
                            key: 'idFallbackToTitlePerIndexer',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Fallback per indexer',
                                help: "If enabled, fallback will occur on a per-indexer basis"
                            }
                        },
                        {
                            key: 'userAgent',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'User agent',
                                required: true
                            }
                        }

                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Result processing'
                    },
                    fieldGroup: [
                        {
                            key: 'htmlParser',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'HTML parser',
                                options: [
                                    {name: 'Default BS (slower)', value: 'html.parser'},
                                    {name: 'LXML (faster, needs to be installed separately)', value: 'lxml'}
                                ]
                            }
                        },
                        {
                            key: 'duplicateSizeThresholdInPercent',
                            type: 'horizontalPercentInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Duplicate size threshold',
                                required: true,
                                addonRight: {
                                    text: '%'
                                }

                            }
                        },
                        {
                            key: 'duplicateAgeThreshold',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Duplicate age threshold',
                                required: true,
                                addonRight: {
                                    text: 'hours'
                                }
                            }
                        },
                        {
                            key: 'alwaysShowDuplicates',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Always show duplicates',
                                help: 'Activate to show duplicates in search results by default'
                            }
                        },
                        {
                            key: 'removeLanguage',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Remove language from newznab titles',
                                help: 'Some indexers add the language to the result title, preventing proper duplicate detection'
                            }
                        },
                        {
                            key: 'removeObfuscated',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Remove "obfuscated" from nzbgeek titles'
                            }
                        },
                        {
                            key: 'nzbAccessType',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'NZB access type',
                                options: [
                                    {name: 'Proxy NZBs from indexer', value: 'serve'},
                                    {name: 'Redirect to the indexer', value: 'redirect'}
                                ],
                                help: "How access to NZBs is provided when NZBs are downloaded (by the user or external tools). Redirecting is recommended."
                            }
                        }
                    ]
                }
            ],

            categories: getCategoryFields(),

            downloaders: [
                {
                    type: "arrayConfig",
                    data: {
                        defaultModel: {
                            enabled: true
                        },
                        entryTemplateUrl: 'downloaderEntry.html',
                        presets: function () {
                            return getDownloaderPresets();
                        },
                        checkAddingAllowed: function () {
                            return true;
                        },
                        presetsOnly: true,
                        addNewText: 'Add new downloader',
                        fieldsFunction: getDownloaderBoxFields,
                        allowDeleteFunction: function () {
                            return true;
                        },
                        checkBeforeClose: function (scope, model) {
                            var DownloaderCheckBeforeCloseService = $injector.get("DownloaderCheckBeforeCloseService");
                            return DownloaderCheckBeforeCloseService.check(scope, model);
                        },
                        resetFunction: function (scope) {
                            scope.options.resetModel();
                            scope.options.resetModel();
                        }

                    }
                }
            ],


            indexers: [
                {
                    type: "arrayConfig",
                    data: {
                        defaultModel: {
                            animeCategory: null,
                            comicCategory: null,
                            audiobookCategory: null,
                            magazineCategory: null,
                            ebookCategory: null,
                            enabled: true,
                            categories: [],
                            downloadLimit: null,
                            loadLimitOnRandom: null,
                            host: null,
                            apikey: null,
                            hitLimit: null,
                            hitLimitResetTime: 0,
                            timeout: null,
                            name: null,
                            showOnSearch: true,
                            score: 0,
                            username: null,
                            password: null,
                            preselect: true,
                            type: 'newznab',
                            accessType: "both",
                            search_ids: undefined, //["imdbid", "rid", "tvdbid"],
                            searchTypes: undefined, //["tvsearch", "movie"]
                            backend: 'newznab',
                            userAgent: null
                        },
                        addNewText: 'Add new indexer',
                        entryTemplateUrl: 'indexerEntry.html',
                        presets: function (model) {
                            return getIndexerPresets(model);
                        },

                        checkAddingAllowed: function (existingIndexers, preset) {
                            if (!preset || !(preset.type == "anizb" || preset.type == "binsearch" || preset.type == "nzbindex" || preset.type == "nzbclub")) {
                                return true;
                            }
                            return !_.any(existingIndexers, function (existingEntry) {
                                return existingEntry.name == preset.name;
                            });

                        },
                        fieldsFunction: getIndexerBoxFields,
                        allowDeleteFunction: function (model) {
                            return true;
                        },
                        checkBeforeClose: function (scope, model) {
                            var IndexerCheckBeforeCloseService = $injector.get("IndexerCheckBeforeCloseService");
                            return IndexerCheckBeforeCloseService.check(scope, model);
                        },
                        resetFunction: function (scope) {
                            //Then reset the model twice (for some reason when we do it once the search types / ids fields are empty, resetting again fixes that... (wtf))
                            scope.options.resetModel();
                            scope.options.resetModel();
                        }

                    }
                }
            ],

            auth: [
                {
                    key: 'authType',
                    type: 'horizontalSelect',
                    templateOptions: {
                        label: 'Auth type',
                        options: [
                            {name: 'None', value: 'none'},
                            {name: 'HTTP Basic auth', value: 'basic'},
                            {name: 'Login form', value: 'form'}
                        ]

                    }
                },
                {
                    key: 'restrictSearch',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Restrict searching',
                        help: 'Restrict access to searching'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType == "none";
                    }
                },
                {
                    key: 'restrictStats',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Restrict stats',
                        help: 'Restrict access to stats'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType == "none";
                    }
                },
                {
                    key: 'restrictAdmin',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Restrict admin',
                        help: 'Restrict access to admin functions'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType == "none";
                    }
                },
                {
                    key: 'restrictDetailsDl',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Restrict NZB details & DL',
                        help: 'Restrict NZB details, comments and download links'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType == "none";
                    }
                },
                {
                    key: 'restrictIndexerSelection',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Restrict indexer selection box',
                        help: 'Restrict visibility of indexer selection box in search. Affects only GUI'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType == "none";
                    }
                },
                {
                    key: 'rememberUsers',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Remember users',
                        help: 'Remember users with cookie for 14 days'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType == "none";
                    }
                },
                {
                    type: 'repeatSection',
                    key: 'users',
                    model: rootModel.auth,
                    templateOptions: {
                        btnText: 'Add new user',
                        altLegendText: 'Authless',
                        fields: [
                            {
                                key: 'username',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Username',
                                    required: true
                                }

                            },
                            {
                                key: 'password',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'password',
                                    label: 'Password',
                                    required: true
                                }
                            },
                            {
                                key: 'maySeeAdmin',
                                type: 'horizontalSwitch',
                                templateOptions: {
                                    type: 'switch',
                                    label: 'May see admin area'
                                }
                            },
                            {
                                key: 'maySeeStats',
                                type: 'horizontalSwitch',
                                templateOptions: {
                                    type: 'switch',
                                    label: 'May see stats'
                                },
                                hideExpression: 'model.maySeeAdmin'
                            },
                            {
                                key: 'maySeeDetailsDl',
                                type: 'horizontalSwitch',
                                templateOptions: {
                                    type: 'switch',
                                    label: 'May see NZB details & DL links'
                                },
                                hideExpression: 'model.maySeeAdmin'
                            },
                            {
                                key: 'showIndexerSelection',
                                type: 'horizontalSwitch',
                                templateOptions: {
                                    type: 'switch',
                                    label: 'May see indexer selection box'
                                },
                                hideExpression: 'model.maySeeAdmin'
                            }

                        ],
                        defaultModel: {
                            username: null,
                            password: null,
                            maySeeStats: true,
                            maySeeAdmin: true,
                            maySeeDetailsDl: true,
                            showIndexerSelection: true
                        }
                    }
                }
            ]
        }
    }
}


function getIndexerPresets(configuredIndexers) {
    var presets = [
        [
            {
                name: "6box",
                host: "https://6box.me"
            },
            {
                name: "6box spotweb",
                host: "https://6box.me/spotweb"
            },
            {
                name: "altHUB",
                host: "https://api.althub.co.za"
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
                name: "LuluNZB",
                host: "https://lulunzb.com"
            },
            {
                name: "miatrix",
                host: "https://www.miatrix.com"
            },
            {
                name: "newz69.keagaming",
                host: "https://newz69.keagaming.com"
            },
            {
                name: "NewzTown",
                host: "https://newztown.co.za"
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
                name: "nzb.ag",
                host: "https://nzb.ag"
            },
            {
                name: "nzb.is",
                host: "https://nzb.is"
            },
            {
                name: "nzb.su",
                host: "https://api.nzb.su"
            },
            {
                name: "nzb7",
                host: "https://www.nzb7.com"
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
                name: "nzbplanet",
                host: "https://nzbplanet.net"
            },
            {
                name: "NZBs.org",
                host: "https://nzbs.org"
            },
            {
                name: "NZBs.io",
                host: "https://www.nzbs.io"
            },
            {
                name: "Nzeeb",
                host: "https://www.nzeeb.com"
            },
            {
                name: "oznzb",
                host: "https://api.oznzb.com"
            },
            {
                name: "omgwtfnzbs",
                host: "https://api.omgwtfnzbs.me"
            },
            {
                name: "PFMonkey",
                host: "https://www.pfmonkey.com"
            },
            {
                name: "SimplyNZBs",
                host: "https://simplynzbs.com"
            },
            {
                name: "Tabula-Rasa",
                host: "https://www.tabula-rasa.pw"
            },
            {
                name: "Usenet-Crawler",
                host: "https://www.usenet-crawler.com"
            }
        ],
        [
            {
                name: "Jackett/Cardigann",
                host: "http://127.0.0.1:9117/torznab/YOURTRACKER",
                search_ids: [],
                searchTypes: [],
                type: "jackett",
                accessType: "internal"
            }
        ],
        [
            {
                accessType: "both",
                categories: ["anime"],
                downloadLimit: null,
                enabled: false,
                hitLimit: null,
                hitLimitResetTime: null,
                host: "https://anizb.org",
                loadLimitOnRandom: null,
                name: "anizb",
                password: null,
                preselect: true,
                score: 0,
                search_ids: [],
                searchTypes: [],
                showOnSearch: true,
                timeout: null,
                type: "anizb",
                username: null
            },
            {
                accessType: "internal",
                categories: [],
                downloadLimit: null,
                enabled: true,
                hitLimit: null,
                hitLimitResetTime: null,
                host: "https://binsearch.info",
                loadLimitOnRandom: null,
                name: "Binsearch",
                password: null,
                preselect: true,
                score: 0,
                search_ids: [],
                searchTypes: [],
                showOnSearch: true,
                timeout: null,
                type: "binsearch",
                username: null
            },
            {
                accessType: "internal",
                categories: [],
                downloadLimit: null,
                enabled: true,
                hitLimit: null,
                hitLimitResetTime: null,
                host: "https://www.nzbclub.com",
                loadLimitOnRandom: null,
                name: "NZBClub",
                password: null,
                preselect: true,
                score: 0,
                search_ids: [],
                searchTypes: [],
                showOnSearch: true,
                timeout: null,
                type: "nzbclub",
                username: null

            },
            {
                accessType: "internal",
                categories: [],
                downloadLimit: null,
                enabled: true,
                generalMinSize: 1,
                hitLimit: null,
                hitLimitResetTime: null,
                host: "https://nzbindex.com",
                loadLimitOnRandom: null,
                name: "NZBIndex",
                password: null,
                preselect: true,
                score: 0,
                search_ids: [],
                searchTypes: [],
                showOnSearch: true,
                timeout: null,
                type: "nzbindex",
                username: null

            }
        ]
    ];


    return presets;
}

function getIndexerBoxFields(model, parentModel, isInitial, injector) {
    var fieldset = [];

    fieldset.push({
        key: 'enabled',
        type: 'horizontalSwitch',
        templateOptions: {
            type: 'switch',
            label: 'Enabled'
        }
    });

    if (model.type == 'newznab' || model.type == 'jackett') {
        fieldset.push(
            {
                key: 'name',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    label: 'Name',
                    required: true,
                    help: 'Used for identification. Changing the name will lose all history and stats!'
                },
                validators: {
                    uniqueName: {
                        expression: function (viewValue) {
                            if (isInitial || viewValue != model.name) {
                                return _.pluck(parentModel, "name").indexOf(viewValue) == -1;
                            }
                            return true;
                        },
                        message: '"Indexer \\"" + $viewValue + "\\" already exists"'
                    }
                }
            })
    }
    if (model.type == 'newznab' || model.type == 'jackett') {
        fieldset.push(
            {
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
                        if (newValue != oldValue) {
                            scope.$parent.needsConnectionTest = true;
                        }
                    }
                }
            }
        )
    }

    if (model.type == 'newznab' || model.type == 'jackett') {
        fieldset.push(
            {
                key: 'apikey',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    label: 'API Key'
                },
                watcher: {
                    listener: function (field, newValue, oldValue, scope) {
                        if (newValue != oldValue) {
                            scope.$parent.needsConnectionTest = true;
                        }
                    }
                }
            }
        )
    }

    fieldset.push(
        {
            key: 'score',
            type: 'horizontalInput',
            templateOptions: {
                type: 'number',
                label: 'Priority',
                required: true,
                help: 'When duplicate search results are found the result from the indexer with the highest number will be selected'
            }
        });

    fieldset.push(
        {
            key: 'timeout',
            type: 'horizontalInput',
            templateOptions: {
                type: 'number',
                label: 'Timeout',
                help: 'Supercedes the general timeout in "Searching"'
            }
        });

    if (model.type == 'newznab' || model.type == 'jackett') {
        fieldset.push(
            {
                key: 'hitLimit',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'API hit limit',
                    help: 'Maximum number of API hits since "API hit reset time"'
                }
            },
            {
                key: 'downloadLimit',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'Download limit',
                    help: 'When # of downloads since "Hit reset time" is reached indexer will not be searched.'
                }
            }
        );
        fieldset.push(
            {
                key: 'loadLimitOnRandom',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'Load limiting',
                    help: 'If set indexer will only be picked for one out of x API searches (on average)'
                },
                validators: {
                    greaterThanZero: {
                        expression: function ($viewValue, $modelValue) {
                            var value = $modelValue || $viewValue;
                            return angular.isUndefined(value) || value === null || value === "" || value > 1;
                        },
                        message: '"Value must be greater than 1"'
                    }

                }
            },
            {
                key: 'hitLimitResetTime',
                type: 'horizontalInput',
                hideExpression: '!model.hitLimit && !model.downloadLimit',
                templateOptions: {
                    type: 'number',
                    label: 'Hit reset time',
                    help: 'UTC hour of day at which the API hit counter is reset (0==24). Leave empty for a rolling reset counter'
                },
                validators: {
                    timeOfDay: {
                        expression: function ($viewValue, $modelValue) {
                            var value = $modelValue || $viewValue;
                            return value >= 0 && value <= 24;
                        },
                        message: '$viewValue + " is not a valid hour of day (0-24)"'
                    }

                }
            });
    }
    if (model.type == 'newznab') {
        fieldset.push(
            {
                key: 'username',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    required: false,
                    label: 'Username',
                    help: 'Only needed if indexer requires HTTP auth for API access (rare)'
                },
                watcher: {
                    listener: function (field, newValue, oldValue, scope) {
                        if (newValue != oldValue) {
                            scope.$parent.needsConnectionTest = true;
                        }
                    }
                }
            }
        );
    }
    if (model.type == 'newznab') {
        fieldset.push(
            {
                key: 'password',
                type: 'horizontalInput',
                hideExpression: '!model.username',
                templateOptions: {
                    type: 'text',
                    required: false,
                    label: 'Password',
                    help: 'Only needed if indexer requires HTTP auth for API access (rare)'
                }
            }
        )
    }

    if (model.type == 'newznab') {
        fieldset.push(
            {
                key: 'userAgent',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    required: false,
                    label: 'User agent',
                    help: 'Rarely needed. Will supercede the one in the main searching settings'
                }
            }
        )
    }


    fieldset.push(
        {
            key: 'preselect',
            type: 'horizontalSwitch',
            hideExpression: 'model.accessType == "external"',
            templateOptions: {
                type: 'switch',
                label: 'Preselect',
                help: 'Preselect this indexer on the search page'
            }
        }
    );
    if (model.type != "jackett") {
        fieldset.push(
            {
                key: 'accessType',
                type: 'horizontalSelect',
                templateOptions: {
                    label: 'Enable for...',
                    options: [
                        {name: 'Internal searches only', value: 'internal'},
                        {name: 'API searches only', value: 'external'},
                        {name: 'Internal and API searches', value: 'both'}
                    ]
                }
            }
        );
    }
    if (model.type != "anizb") {
        fieldset.push(
            {
                key: 'categories',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Enable for...',
                    help: 'You can decide that this indexer should only be used for certain categories',
                    options: [
                        {
                            id: "movies",
                            label: "Movies"
                        },
                        {
                            id: "movieshd",
                            label: "Movies HD"
                        },
                        {
                            id: "moviessd",
                            label: "Movies SD"
                        },
                        {
                            id: "tv",
                            label: "TV"
                        },
                        {
                            id: "tvhd",
                            label: "TV HD"
                        },
                        {
                            id: "tvsd",
                            label: "TV SD"
                        },
                        {
                            id: "anime",
                            label: "Anime"
                        },
                        {
                            id: "audio",
                            label: "Audio"
                        },
                        {
                            id: "flac",
                            label: "Audio FLAC"
                        },
                        {
                            id: "mp3",
                            label: "Audio MP3"
                        },
                        {
                            id: "audiobook",
                            label: "Audiobook"
                        },
                        {
                            id: "console",
                            label: "Console"
                        },
                        {
                            id: "pc",
                            label: "PC"
                        },
                        {
                            id: "xxx",
                            label: "XXX"
                        },
                        {
                            id: "ebook",
                            label: "Ebook"
                        },
                        {
                            id: "comic",
                            label: "Comic"
                        }],
                    getPlaceholder: function () {
                        return "All categories";
                    }
                }
            }
        )
    }

    if (model.type == 'newznab') {
        fieldset.push(
            {
                key: 'search_ids',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Search IDs',
                    options: [
                        {label: 'TVDB', id: 'tvdbid'},
                        {label: 'TVRage', id: 'rid'},
                        {label: 'IMDB', id: 'imdbid'},
                        {label: 'Trakt', id: 'traktid'},
                        {label: 'TVMaze', id: 'tvmazeid'},
                        {label: 'TMDB', id: 'tmdbid'}
                    ],
                    getPlaceholder: function (model) {
                        if (angular.isUndefined(model)) {
                            return "Unknown";
                        }
                        return "None";
                    }
                }
            }
        );
    }
    if (model.type == 'newznab' || model.type == 'jackett') {
        fieldset.push(
            {
                key: 'searchTypes',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Search types',
                    options: [
                        {label: 'Movies', id: 'movie'},
                        {label: 'TV', id: 'tvsearch'},
                        {label: 'Ebooks', id: 'book'},
                        {label: 'Audio', id: 'audio'}
                    ],
                    getPlaceholder: function (model) {
                        if (angular.isUndefined(model)) {
                            return "Unknown";
                        }
                        return "None";
                    }
                }
            }
        )
    }

    if (model.type == 'newznab' || model.type == 'jackett') {
        fieldset.push(
            {
                type: 'horizontalCheckCaps',
                hideExpression: '!model.host || !model.apikey || !model.name',
                templateOptions: {
                    label: 'Check capabilities',
                    help: 'Find out what search types the indexer supports. Done automatically for new indexers.'
                }
            }
        )
    }

    if (model.type == 'nzbindex') {
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

    return fieldset;
}


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
                        if (isInitial || viewValue != model.name) {
                            return _.pluck(parentModel, "name").indexOf(viewValue) == -1;
                        }
                        return true;
                    },
                    message: '"Downloader \\"" + $viewValue + "\\" already exists"'
                }
            }

        }]);

    if (model.type == "nzbget") {
        fieldset = _.union(fieldset, [{
            key: 'host',
            type: 'horizontalInput',
            templateOptions: {
                type: 'text',
                label: 'Host',
                required: true
            },
            watcher: {
                listener: function (field, newValue, oldValue, scope) {
                    if (newValue != oldValue) {
                        scope.$parent.needsConnectionTest = true;
                    }
                }
            }

        },
            {
                key: 'port',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'Port',
                    placeholder: '5050',
                    required: true
                },
                watcher: {
                    listener: function (field, newValue, oldValue, scope) {
                        if (newValue != oldValue) {
                            scope.$parent.needsConnectionTest = true;
                        }
                    }
                }
            }, {
                key: 'ssl',
                type: 'horizontalSwitch',
                templateOptions: {
                    type: 'switch',
                    label: 'Use SSL'
                }
            }]);
    } else if (model.type == "sabnzbd") {
        fieldset.push({
            key: 'url',
            type: 'horizontalInput',
            templateOptions: {
                type: 'text',
                label: 'URL',
                required: true
            },
            watcher: {
                listener: function (field, newValue, oldValue, scope) {
                    if (newValue != oldValue) {
                        scope.$parent.needsConnectionTest = true;
                    }
                }
            }
        });
    }
    fieldset = _.union(fieldset, [
        {
            key: 'username',
            type: 'horizontalInput',
            templateOptions: {
                type: 'text',
                label: 'Username',
                help: model.type == "nzbget" ? 'Only alphanumeric usernames are guaranteed to work' : ""
            },
            watcher: {
                listener: function (field, newValue, oldValue, scope) {
                    if (newValue != oldValue) {
                        scope.$parent.needsConnectionTest = true;
                    }
                }
            }
        },
        {
            key: 'password',
            type: 'horizontalInput',
            templateOptions: {
                type: 'password',
                label: 'Password',
                help: model.type == "nzbget" ? 'See username' : ""
            },
            watcher: {
                listener: function (field, newValue, oldValue, scope) {
                    if (newValue != oldValue) {
                        scope.$parent.needsConnectionTest = true;
                    }
                }
            }
        }
    ]);


    if (model.type == "sabnzbd") {
        fieldset.push({
            key: 'apikey',
            type: 'horizontalInput',
            templateOptions: {
                type: 'text',
                label: 'API Key'
            },
            watcher: {
                listener: function (field, newValue, oldValue, scope) {
                    if (newValue != oldValue) {
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
                help: 'When adding NZBs this category will be used instead of asking for the category. Write "No category" to let the downloader decide.',
                placeholder: 'Ask when downloading'
            }
        },
        {
            key: 'nzbaccesstype',
            type: 'horizontalSelect',
            templateOptions: {
                type: 'select',
                label: 'NZB access type',
                options: [
                    {name: 'Proxy NZBs from indexer', value: 'serve'},
                    {name: 'Redirect to the indexer', value: 'redirect'}
                ],
                help: "How external access to NZBs is provided. Redirecting is recommended."
            }
        },
        {
            key: 'nzbAddingType',
            type: 'horizontalSelect',
            templateOptions: {
                type: 'select',
                label: 'NZB adding type',
                options: [
                    {name: 'Send link', value: 'link'},
                    {name: 'Upload NZB', value: 'nzb'}
                ],
                help: "How NZBs are added to the downloader, either by sending a link to the NZB or by uploading the NZB data"
            }
        },
        {
            key: 'iconCssClass',
            type: 'horizontalInput',
            templateOptions: {
                type: 'text',
                label: 'Icon CSS class',
                help: 'Copy an icon name from http://fontawesome.io/examples/ (e.g. "film")',
                placeholder: 'Default'
            }
        }
    ]);

    return fieldset;
}

function getDownloaderPresets() {
    return [[
        {
            host: "127.0.0.1",
            name: "NZBGet",
            password: "tegbzn6789x",
            port: 6789,
            ssl: false,
            type: "nzbget",
            username: "nzbgetx",
            nzbAddingType: "link",
            nzbaccesstype: "redirect",
            iconCssClass: "",
            downloadType: "nzb"
        },
        {
            url: "http://localhost:8086",
            type: "sabnzbd",
            name: "SABnzbd",
            nzbAddingType: "link",
            nzbaccesstype: "redirect",
            iconCssClass: "",
            downloadType: "nzb",
            username: null,
            password: null
        }
    ]];
}


function handleConnectionCheckFail(ModalService, data, model, whatFailed, deferred) {
    var message;
    var yesText;
    if (data.checked) {
        message = "The connection to the " + whatFailed + " failed: " + data.message + "<br>Do you want to add it anyway?";
        yesText = "I know what I'm doing";
    } else {
        message = "The connection to the " + whatFailed + " could not be tested, sorry";
        yesText = "I'll risk it";
    }
    ModalService.open("Connection check failed", message, {
        yes: {
            onYes: function () {
                deferred.resolve();
            },
            text: yesText
        },
        no: {
            onNo: function () {
                model.enabled = false;
                deferred.resolve();
            },
            text: "Add it, but disabled"
        },
        cancel: {
            onCancel: function () {
                deferred.reject();
            },
            text: "Aahh, let me try again"
        }
    });

}


angular
    .module('nzbhydraApp')
    .factory('IndexerCheckBeforeCloseService', IndexerCheckBeforeCloseService);

function IndexerCheckBeforeCloseService($q, ModalService, ConfigBoxService, blockUI, growl) {

    return {
        check: checkBeforeClose
    };

    function checkBeforeClose(scope, model) {
        var deferred = $q.defer();
        if (!scope.needsConnectionTest) {
            checkCaps(scope, model).then(function () {
                deferred.resolve();
            }, function () {
                deferred.reject();
            });
        } else {
            blockUI.start("Testing connection...");
            scope.spinnerActive = true;
            var url = "internalapi/test_newznab";
            var settings = {host: model.host, apikey: model.apikey};
            if (angular.isDefined(model.username)) {
                settings["username"] = model.username;
                settings["password"] = model.password;
            }
            ConfigBoxService.checkConnection(url, JSON.stringify(settings)).then(function () {
                    checkCaps(scope, model).then(function () {
                        blockUI.reset();
                        scope.spinnerActive = false;
                        growl.info("Connection to the indexer tested successfully");
                        deferred.resolve();
                    }, function () {
                        blockUI.reset();
                        scope.spinnerActive = false;
                        deferred.reject();
                    });
                },
                function (data) {
                    blockUI.reset();
                    handleConnectionCheckFail(ModalService, data, model, "indexer", deferred);
                }).finally(function () {
                scope.spinnerActive = false;
                blockUI.reset();
            });
        }
        return deferred.promise;

    }

    function checkCaps(scope, model) {
        var deferred = $q.defer();
        var url = "internalapi/test_caps";
        var settings = {indexer: model.name, apikey: model.apikey, host: model.host};
        if (angular.isDefined(model.username)) {
            settings["username"] = model.username;
            settings["password"] = model.password;
        }
        if (angular.isUndefined(model.search_ids) || angular.isUndefined(model.searchTypes)) {

            blockUI.start("New indexer found. Testing its capabilities. This may take a bit...");
            ConfigBoxService.checkCaps(url, JSON.stringify(settings), model).then(
                function (data, model) {
                    blockUI.reset();
                    scope.spinnerActive = false;
                    growl.info("Successfully tested capabilites of indexer");
                    deferred.resolve();
                },
                function () {
                    blockUI.reset();
                    scope.spinnerActive = false;
                    model.search_ids = [];
                    model.searchTypes = [];
                    ModalService.open("Error testing capabilities", "The capabilities of the indexer could not be checked. The indexer won't be used for ID based searches (IMDB, TVDB, etc.). You may repeat the check manually at any time.");
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


angular
    .module('nzbhydraApp')
    .factory('DownloaderCheckBeforeCloseService', DownloaderCheckBeforeCloseService);

function DownloaderCheckBeforeCloseService($q, ConfigBoxService, growl, ModalService, blockUI) {

    return {
        check: checkBeforeClose
    };

    function checkBeforeClose(scope, model) {
        var deferred = $q.defer();
        if (!scope.isInitial && !scope.needsConnectionTest) {
            deferred.resolve();
        } else {
            scope.spinnerActive = true;
            blockUI.start("Testing connection...");
            var url = "internalapi/test_downloader";
            ConfigBoxService.checkConnection(url, JSON.stringify(model)).then(function () {
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
