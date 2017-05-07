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
        if (newValue !== oldValue) {
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
                                help: 'Set when using an external proxy'
                            },
                            validators: {
                                urlBase: regexValidator(/^\/?(\/\w+)*$/, "Base URL needs to start with a slash and must not end with one")
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
                            key: 'apiKey',
                            type: 'horizontalApiKeyInput',
                            templateOptions: {
                                label: 'API key',
                                help: 'Remove to disable. Alphanumeric only'
                            },
                            validators: {
                                apiKey: regexValidator(/^[a-zA-Z0-9]*$/, "API key must only contain numbers and digits", false)
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
                                    {name: 'Error', value: 'ERROR'},
                                    {name: 'Warning', value: 'WARN'},
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
                            key: 'logMaxSize',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Max log file size',
                                addonRight: {
                                    text: 'MB'
                                }
                            },
                            watcher: {
                                listener: restartListener
                            }
                        },
                        {
                            key: 'logMaxDays',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Keep log files',
                                help: 'Number of log files to keep before oldest is deleted'
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
                                    {name: 'Error', value: 'ERROR'},
                                    {name: 'Warning', value: 'WARN'},
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
                        },
                        {
                            key: 'logUsername',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Log user names'
                            }
                        },
                        {
                            key: 'historyUserInfoType',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'History user info',
                                options: [
                                    {name: 'IP address', value: 'IP'},
                                    {name: 'Username', value: 'USERNAME'},
                                    {name: 'None', value: 'NONE'}
                                ],
                                help: 'Will be stored and displayed in the search/download history for internal searches. If selected IP addresses will be saved for all API searches.'
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'Other'},
                    fieldGroup: [
                        {
                            key: 'startupBrowser',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Open browser on startup'
                            }
                        }
                        ,
                        {
                            key: 'backupEverySunday',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'number',
                                label: 'Backup every sunday'
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
                                    {name: 'Internal searches', value: 'INTERNAL'},
                                    {name: 'API searches', value: 'EXTERNAL'},
                                    {name: 'All searches', value: 'BOTH'},
                                    {name: 'Never', value: 'NONE'}
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
                            key: 'generateQueries',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Generate queries',
                                options: [
                                    {name: 'Internal searches', value: 'INTERNAL'},
                                    {name: 'API searches', value: 'EXTERNAL'},
                                    {name: 'All searches', value: 'BOTH'},
                                    {name: 'Never', value: 'NONE'}
                                ],
                                help: "Generate queries for indexers which do not support ID based searches"
                            }
                        },
                        //TODO fallback
                        /*
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
                         */
                        {
                            key: 'wrapApiErrors',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'text',
                                label: 'Wrap API errors in empty results page',
                                help: 'When enabled accessing tools will think the search was completed successfully but without results'
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
                                    {name: 'Proxy NZBs from indexer', value: 'PROXY'},
                                    {name: 'Redirect to the indexer', value: 'REDIRECT'}
                                ],
                                help: "How access to NZBs is provided when NZBs are downloaded (by the user or external tools). Redirecting is recommended."
                            }
                        },
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
                                help: 'Meta data from searches is stored in the database. When they\'re deleted links to Hydra become invalid.'
                            }
                        }
                    ]
                }
            ],

            categoriesConfig: [
                {
                    key: 'enableCategorySizes',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Category sizes',
                        help: "Preset min and max sizes depending on the selected category"
                    }
                },
                {
                    type: 'help',
                    templateOptions: {
                        type: 'help',
                        lines: ["The category configuration is not validated in any way. You can seriously fuck up Hydra's results and overall behavior so take care."],
                        marginTop: '50px'
                    }
                },
                {
                    type: 'repeatSection',
                    key: 'categories',
                    model: rootModel.categoriesConfig,
                    templateOptions: {
                        btnText: 'Add new category',
                        fields: [
                            {
                                key: 'name',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Name',
                                    help: 'Renaming categories might cause problems with repeating searches from the history',
                                    required: true
                                }
                            },
                            {
                                key: 'searchType',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Search type',
                                    options: [
                                        {name: 'General', value: 'SEARCH'},
                                        {name: 'Audio', value: 'AUDIO'},
                                        {name: 'EBook', value: 'BOOK'},
                                        {name: 'Movie', value: 'MOVIE'},
                                        {name: 'TV', value: 'TVSEARCH'}
                                    ],
                                    help: "Determines how indexers will be search and if autocompletion is available in the GUI"
                                }
                            },
                            {
                                key: 'requiredWords',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Required words',
                                    placeholder: 'separate, with, commas, like, this'
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
                                key: 'forbiddenWords',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Forbidden words',
                                    placeholder: 'separate, with, commas, like, this'
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
                                key: 'applyRestrictionsType',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Apply restrictions',
                                    options: [
                                        {name: 'Internal searches', value: 'INTERNAL'},
                                        {name: 'API searches', value: 'EXTERNAL'},
                                        {name: 'All searches', value: 'BOTH'},
                                        {name: 'Never', value: 'NONE'}
                                    ],
                                    help: "For which type of search word restrictions will be applied"
                                }
                            },
                            {
                                wrapper: 'settingWrapper',
                                templateOptions: {
                                    label: 'Size preset',
                                    help: "Will set these values on the search page. Does not affect API searches"
                                },
                                fieldGroup: [
                                    {
                                        key: 'min',
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
                                        key: 'max',
                                        type: 'duoSetting', templateOptions: {addonRight: {text: 'MB'}}
                                    }
                                ]
                            },
                            {
                                key: 'preselect',
                                type: 'horizontalSwitch',
                                templateOptions: {
                                    type: 'switch',
                                    label: 'Preselect',
                                    help: "Determines if indexer is preselect on search page"
                                }
                            },
                            {
                                key: 'newznabCategories',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Newznab categories',
                                    help: 'Map newznab categories to Hydra categories',
                                    placeholder: '1000, 2000'
                                },
                                parsers: [function (value) {
                                    if (!value) {
                                        return [];
                                    }
                                    if (_.isArray(value))
                                        return value;
                                    var arr = [];
                                    arr.push.apply(arr, value.split(",").map(Number));
                                    return arr;

                                }]

                            },
                            {
                                key: 'ignoreResultsFrom',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Ignore results',
                                    options: [
                                        {name: 'For internal searches', value: 'INTERNAL'},
                                        {name: 'For API searches', value: 'EXTERNAL'},
                                        {name: 'For all searches', value: 'BOTH'},
                                        {name: 'Never', value: 'NONE'}
                                    ],
                                    help: "Ignore results from this category"
                                }
                            }

                        ],
                        defaultModel: {
                            name: null,
                            applyRestrictionsType: "NONE",
                            forbiddenRegex: null,
                            forbiddenWords: null,
                            ignoreResultsFrom: "NONE",
                            mayBeSelected: true,
                            maxSizePreset: null,
                            minSizePreset: null,
                            newznabCategories: [],
                            preselect: true,
                            requiredRegex: null,
                            requiredWords: null,
                            searchType: "SEARCH"
                        }
                    }
                }
            ],

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
                            apiKey: null,
                            backend: 'NEWZNAB',
                            categoryMapping: {anime: null, audiobook: null, comic: null, ebook: null}, //TODO
                            downloadLimit: null,
                            enabled: true,
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
                            supportedSearchIds: undefined, //["imdbId", "rid", "tvdbId"],
                            supportedSearchTypes: undefined, //["tvsearch", "movie"]
                            timeout: null,
                            username: null,
                            userAgent: null
                        },
                        addNewText: 'Add new indexer',
                        entryTemplateUrl: 'indexerEntry.html',
                        presets: function (model) {
                            return getIndexerPresets(model);
                        },

                        checkAddingAllowed: function (existingIndexers, preset) {
                            if (!preset || !(preset.searchModuleType === "ANIZB" || preset.searchModuleType === "BINSEARCH" || preset.searchModuleType === "NZBINDEX" || preset.searchModuleType === "NZBCLUB")) {
                                return true;
                            }
                            return !_.any(existingIndexers, function (existingEntry) {
                                return existingEntry.name === preset.name;
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
                            {name: 'None', value: 'NONE'},
                            {name: 'HTTP Basic auth', value: 'BASIC'},
                            {name: 'Login form', value: 'FORM'}
                        ]
                    },
                    watcher: {
                        listener: restartListener
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
                        return rootModel.auth.authType === "NONE";
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
                        return rootModel.auth.authType === "NONE";
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
                        return rootModel.auth.authType === "NONE";
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
                        return rootModel.auth.authType === "NONE";
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
                        return rootModel.auth.authType === "NONE";
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
                        return rootModel.auth.authType === "NONE";
                    }
                },
                {
                    type: 'repeatSection',
                    key: 'users',
                    model: rootModel.auth,
                    hideExpression: function () {
                        return rootModel.auth.authType === "NONE";
                    },
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
                supportedSearchIds: [],
                supportedSearchTypes: [],
                searchModuleType: "TORZNAB",
                enabledForSearchSource: "INTERNAL"
            }
        ],
        [
            {
                enabledForSearchSource: "BOTH",
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
                supportedSearchIds: [],
                supportedSearchTypes: [],
                showOnSearch: true,
                timeout: null,
                searchModuleType: "ANIZB",
                username: null
            },
            {
                enabledForSearchSource: "INTERNAL",
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
                supportedSearchIds: [],
                supportedSearchTypes: [],
                showOnSearch: true,
                timeout: null,
                searchModuleType: "BINSEARCH",
                username: null
            },
            {
                enabledForSearchSource: "INTERNAL",
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
                supportedSearchIds: [],
                supportedSearchTypes: [],
                showOnSearch: true,
                timeout: null,
                searchModuleType: "NZBCLUB",
                username: null

            },
            {
                enabledForSearchSource: "INTERNAL",
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
                supportedSearchIds: [],
                supportedSearchTypes: [],
                showOnSearch: true,
                timeout: null,
                searchModuleType: "NZBINDEX",
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

    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'TORZNAB') {
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
                            if (isInitial || viewValue !== model.name) {
                                return _.pluck(parentModel, "name").indexOf(viewValue) === -1;
                            }
                            return true;
                        },
                        message: '"Indexer \\"" + $viewValue + "\\" already exists"'
                    }
                }
            })
    }
    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'TORZNAB') {
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
                        if (newValue !== oldValue) {
                            scope.$parent.needsConnectionTest = true;
                        }
                    }
                }
            }
        )
    }

    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'TORZNAB') {
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

    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'TORZNAB') {
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
    if (model.searchModuleType === 'NEWZNAB') {
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
                        if (newValue !== oldValue) {
                            scope.$parent.needsConnectionTest = true;
                        }
                    }
                }
            }
        );
    }
    if (model.searchModuleType === 'NEWZNAB') {
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

    if (model.searchModuleType === 'NEWZNAB') {
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
            hideExpression: 'model.enabledForSearchSource==="EXTERNAL"',
            templateOptions: {
                type: 'switch',
                label: 'Preselect',
                help: 'Preselect this indexer on the search page'
            }
        }
    );
    if (model.searchModuleType !== "TORZNAB") {
        fieldset.push(
            {
                key: 'enabledForSearchSource',
                type: 'horizontalSelect',
                templateOptions: {
                    label: 'Enable for...',
                    options: [
                        {name: 'Internal searches only', value: 'INTERNAL'},
                        {name: 'API searches only', value: 'EXTERNAL'},
                        {name: 'Internal and API searches', value: 'BOTH'}
                    ]
                }
            }
        );
    }
    if (model.searchModuleType !== "ANIZB") {
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

    if (model.searchModuleType === 'NEWZNAB') {
        fieldset.push(
            {
                key: 'supportedSearchIds',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Search IDs',
                    options: [
                        {label: 'TVDB', id: 'TVDB'},
                        {label: 'TVRage', id: 'TVRAGE'},
                        {label: 'IMDB', id: 'IMDB'},
                        {label: 'Trakt', id: 'TRAKT'},
                        {label: 'TVMaze', id: 'TVMAZE'},
                        {label: 'TMDB', id: 'TMDB'}
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
    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'TORZNAB') {
        fieldset.push(
            {
                key: 'supportedSearchTypes',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Search types',
                    options: [
                        {label: 'Movies', id: 'MOVIE'},
                        {label: 'TV', id: 'TVSEARCH'},
                        {label: 'Ebooks', id: 'BOOK'},
                        {label: 'Audio', id: 'AUDIO'}
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

    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'TORZNAB') {
        fieldset.push(
            {
                type: 'horizontalCheckCaps',
                hideExpression: '!model.host || !model.apiKey || !model.name',
                templateOptions: {
                    label: 'Check capabilities',
                    help: 'Find out what search types the indexer supports. Done automatically for new indexers.'
                }
            }
        )
    }

    if (model.searchModuleType === 'nzbindex') {
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
                help: 'URL with scheme, full path and username and password if needed',
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
            name: "NZBGet",
            type: "NZBGET",
            username: "nzbgetx",
            nzbAddingType: "link",
            nzbaccesstype: "redirect",
            iconCssClass: "",
            downloadType: "nzb",
            url: "http://nzbget:tegbzn6789@localhost:6789"
        },
        {
            url: "http://localhost:8086",
            type: "SABNZBD",
            name: "SABnzbd",
            nzbAddingType: "link",
            nzbaccesstype: "redirect",
            iconCssClass: "",
            downloadType: "nzb"
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
            var url = "internalapi/indexer/checkConnection"; //TODO
            ConfigBoxService.checkConnection(url, model).then(function () {
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
        var url = "internalapi/indexer/checkCaps";
        if (angular.isUndefined(model.supportedSearchIds) || angular.isUndefined(model.supportedSearchTypes)) {

            blockUI.start("New indexer found. Testing its capabilities. This may take a bit...");
            ConfigBoxService.checkCaps(url, model).then(
                function (data) {
                    blockUI.reset();
                    scope.spinnerActive = false;
                    if (data.allChecked) {
                        growl.info("Successfully tested capabilites of indexer");
                    } else {
                        growl.warn("An error occured during checking the indexer's capabilities. You may want to repeat the check later.");
                    }
                    deferred.resolve();
                },
                function () {
                    blockUI.reset();
                    scope.spinnerActive = false;
                    model.supportedSearchIds = [];
                    model.supportedSearchTypes = [];
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
            var url = "internalapi/downloader/checkConnection";
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
