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
    .factory('ConfigFields', ConfigFields);

function ConfigFields($injector) {
    return {
        getFields: getFields
    };

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
                                placeholder: 'IPv4 address to bind to',
                                help: 'I strongly recommend <a href="https://github.com/theotherp/nzbhydra2/wiki/Exposing-Hydra-to-the-internet-and-using-reverse-proxies" target="_blank">using a reverse proxy</a> instead of exposing this directly. Requires restart.'
                            },
                            validators: {
                                ipAddress: ipValidator()
                            }
                        },
                        {
                            key: 'port',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Port',
                                required: true,
                                placeholder: '5076',
                                help: 'Requires restart.'
                            },
                            validators: {
                                port: regexValidator(/^\d{1,5}$/, "is no valid port", true)
                            }
                        },
                        {
                            key: 'urlBase',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'URL base',
                                placeholder: '/nzbhydra',
                                help: 'Adapt when using a reverse proxy. See <a href="https://github.com/theotherp/nzbhydra2/wiki/Exposing-Hydra-to-the-internet-and-using-reverse-proxies" target="_blank">wiki</a>. Always use when calling Hydra, even locally.'
                            },
                            validators: {
                                urlBase: regexValidator(/^((\/.*[^\/])|\/)$/, 'URL base has to start and may not end with /', false, true)
                            }

                        },
                        {
                            key: 'ssl',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Use SSL',
                                help: 'Requires restart.'
                            }
                        },
                        {
                            key: 'sslKeyStore',
                            hideExpression: '!model.ssl',
                            type: 'fileInput',
                            templateOptions: {
                                label: 'SSL keystore file',
                                required: true,
                                type: "file",
                                help: 'Requires restart. See <a href="https://github.com/theotherp/nzbhydra2/wiki/SSL" target="_blank">wiki</a>'
                            }
                        },
                        {
                            key: 'sslKeyStorePassword',
                            hideExpression: '!model.ssl',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'password',
                                label: 'SSL keystore password',
                                required: true,
                                help: 'Requires restart.'
                            }
                        },


                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Proxy'
                    }
                    ,
                    fieldGroup: [
                        {
                            key: 'proxyType',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'Use proxy',
                                options: [
                                    {name: 'None', value: 'NONE'},
                                    {name: 'SOCKS', value: 'SOCKS'},
                                    {name: 'HTTP(S)', value: 'HTTP'}
                                ]
                            }
                        },
                        {
                            key: 'proxyHost',
                            type: 'horizontalInput',
                            hideExpression: 'model.proxyType==="NONE"',
                            templateOptions: {
                                type: 'text',
                                label: 'SOCKS proxy host',
                                placeholder: 'Set to use a SOCKS proxy',
                                help: "IPv4 only"
                            }
                        },
                        {
                            key: 'proxyPort',
                            type: 'horizontalInput',
                            hideExpression: 'model.proxyType==="NONE"',
                            templateOptions: {
                                type: 'number',
                                label: 'Proxy port',
                                placeholder: '1080'
                            }
                        },
                        {
                            key: 'proxyUsername',
                            type: 'horizontalInput',
                            hideExpression: 'model.proxyType==="NONE"',
                            templateOptions: {
                                type: 'text',
                                label: 'Proxy username'
                            }
                        },
                        {
                            key: 'proxyPassword',
                            type: 'passwordSwitch',
                            hideExpression: 'model.proxyType==="NONE"',
                            templateOptions: {
                                type: 'text',
                                label: 'Proxy password'
                            }
                        },
                        {
                            key: 'proxyIgnoreLocal',
                            type: 'horizontalSwitch',
                            hideExpression: 'model.proxyType==="NONE"',
                            templateOptions: {
                                type: 'switch',
                                label: 'Bypass local network addresses'
                            }
                        },
                        {
                            key: 'proxyIgnoreDomains',
                            type: 'horizontalChips',
                            hideExpression: 'model.proxyType==="NONE"',
                            templateOptions: {
                                type: 'text',
                                help: 'Separate by comma. You can use wildcards (*). Case insensitive. Apply values with enter key.',
                                label: 'Bypass domains'
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
                                help: 'Reload page after restart.',
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
                                help: 'Alphanumeric only.',
                                required: true
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
                                help: 'Redirect external links to hide your instance. Insert $s for target URL. Use empty value to disable.'
                            }
                        },
                        {
                            key: 'verifySsl',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                label: 'Verify SSL certificates',
                                help: 'If enabled only valid/known SSL certificates will be accepted when accessing indexers. Change requires restart. See <a href="https://github.com/theotherp/nzbhydra2/wiki/SSL-verification-errors" target="_blank">wiki</a>.'
                            }
                        },
                        {
                            key: 'verifySslDisabledFor',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Disable SSL for...',
                                help: 'Add hosts for which to disable SSL verification. Apply words with return key.'
                            }
                        },
                        {
                            key: 'sniDisabledFor',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Disable SNI',
                                help: 'Add a host if you get an "unrecognized_name" error. Apply words with return key. See <a href="https://github.com/theotherp/nzbhydra2/wiki/SSL-verification-errors" target="_blank">wiki</a>.'
                            }
                        },
                        {
                            key: 'useCsrf',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                label: 'Use CSRF protection',
                                help: 'Use <a href="https://en.wikipedia.org/wiki/Cross-site_request_forgery" target="_blank">CSRF protection</a>.'
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
                                ],
                                help: 'Takes effect on next restart.'
                            }
                        },
                        {
                            key: 'logMaxHistory',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Max log history',
                                help: 'How many daily log files will be kept.'
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
                                ],
                                help: 'Takes effect on next restart.'
                            }
                        },
                        {
                            key: 'logIpAddresses',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Log IP addresses'
                            }
                        }, {
                            key: 'mapIpToHost',
                            type: 'horizontalSwitch',
                            hideExpression: '!model.logIpAddresses',
                            templateOptions: {
                                type: 'switch',
                                label: 'Map hosts',
                                help: 'Try to map logged IP addresses to host names.'
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
                            key: 'markersToLog',
                            type: 'horizontalMultiselect',
                            templateOptions: {
                                label: 'Log markers',
                                help: 'Select certain sections for more output on debug level.',
                                hideExpression: 'model.consolelevel !== "DEBUG" && model.logfilelevel !== "DEBUG"', //Doesn't work...
                                options: [
                                    {label: 'Config file handling', id: 'CONFIG_READ_WRITE'},
                                    {label: 'Download status updating', id: 'DOWNLOAD_STATUS_UPDATE'},
                                    {label: 'Duplicate detection', id: 'DUPLICATES'},
                                    {label: 'History cleanup', id: 'HISTORY_CLEANUP'},
                                    {label: 'HTTP', id: 'HTTP'},
                                    {label: 'HTTPS', id: 'HTTPS'},
                                    {label: 'HTTP Server', id: 'SERVER'},
                                    {label: 'Indexer scheduler', id: 'SCHEDULER'},
                                    {label: 'Performance', id: 'PERFORMANCE'},
                                    {label: 'Rejected results', id: 'RESULT_ACCEPTOR'},
                                    {label: 'Removed trailing words', id: 'TRAILING'},
                                    {label: 'URL calculation', id: 'URL_CALCULATION'},
                                    {label: 'User agent mapping', id: 'USER_AGENT'}
                                ],
                                buttonText: "None"
                            }
                        },
                        {
                            key: 'historyUserInfoType',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'History user info',
                                options: [
                                    {name: 'IP and username', value: 'BOTH'},
                                    {name: 'IP address', value: 'IP'},
                                    {name: 'Username', value: 'USERNAME'},
                                    {name: 'None', value: 'NONE'}
                                ],
                                help: 'Only affects if value is displayed in the search/download history.',
                                hideExpression: '!model.keepHistory'
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'Backup'},
                    fieldGroup: [
                        {
                            key: 'backupFolder',
                            type: 'horizontalInput',
                            templateOptions: {
                                label: 'Backup folder',
                                help: 'Either relative to the NZBHydra main folder or an absolute folder'
                            }
                        },
                        {
                            key: 'backupEveryXDays',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Backup every...',
                                addonRight: {
                                    text: 'days'
                                }
                            }
                        },
                        {
                            key: 'backupBeforeUpdate',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Backup before update'
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'Updates'},
                    fieldGroup: [
                        {
                            key: 'updateAutomatically',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Install updates automatically'
                            }
                        }, {
                            key: 'updateToPrereleases',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Install prereleases'
                            }
                        },
                        {
                            key: 'deleteBackupsAfterWeeks',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Delete backups after...',
                                addonRight: {
                                    text: 'weeks'
                                }
                            }
                        },
                        {
                            key: 'showUpdateBannerOnDocker',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Show update banner when running docker'
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'History'},
                    fieldGroup: [
                        {
                            key: 'keepHistory',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Keep history',
                                help: 'If disabled no search or download history will be kept. These sections will be hidden in the GUI. You won\'t be able to see stats. The database will still contain a short-lived history of transactions that are kept for 24 hours.'
                            }
                        },
                        {
                            key: 'keepHistoryForWeeks',
                            type: 'horizontalInput',
                            hideExpression: '!model.keepHistory',
                            templateOptions: {
                                type: 'number',
                                label: 'Keep history for...',
                                addonRight: {
                                    text: 'weeks'
                                },
                                min: 1,
                                help: 'Only keep history (searches, downloads) for a certain time. Will decrease database size and may improve performance a bit. Rather reduce how long stats are kept.'
                            }
                        },
                        {
                            key: 'keepStatsForWeeks',
                            type: 'horizontalInput',
                            hideExpression: '!model.keepHistory',
                            templateOptions: {
                                type: 'number',
                                label: 'Keep stats for...',
                                addonRight: {
                                    text: 'weeks'
                                },
                                min: 1,
                                help: 'Only keep stats for a certain time. Will decrease database size.'
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
                        },
                        {
                            key: 'showNews',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Show news',
                                help: "Hydra will occasionally show news when opened. You can always find them in the system section"
                            }
                        },
                        {
                            key: 'xmx',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'JVM memory',
                                addonRight: {
                                    text: 'MB'
                                },
                                min: 128,
                                help: '256 should suffice except when working with big databases / many indexers. See <a href="https://github.com/theotherp/nzbhydra2/wiki/Memory-requirements" target="_blank">wiki</a>'
                            }
                        },
                        {
                            key: 'databaseCompactTime',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Database compact time',
                                addonRight: {
                                    text: 'ms'
                                },
                                min: 200,
                                help: 'The time the database is given to compact (reduce size) when shutting down. Reduce this if shutting down NZBHydra takes too long (database size may increase). Takes effect on next restart.'
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
                                help: 'Any web call to an indexer taking longer than this is aborted.',
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
                                label: 'Ignore temporary errors',
                                help: "If enabled indexers will not be temporarily disabled after an error. Unrecoverable errors (e.g. wrong API key) will still disable the indexer."
                            }
                        },
                        {
                            key: 'generateQueries',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Generate queries',
                                options: [
                                    {name: 'Internal searches', value: 'INTERNAL'},
                                    {name: 'API searches', value: 'API'},
                                    {name: 'All searches', value: 'BOTH'},
                                    {name: 'Never', value: 'NONE'}
                                ],
                                help: "Generate queries for indexers which do not support ID based searches."
                            }
                        },
                        {
                            key: 'idFallbackToQueryGeneration',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Fallback to generated queries',
                                options: [
                                    {name: 'Internal searches', value: 'INTERNAL'},
                                    {name: 'API searches', value: 'API'},
                                    {name: 'All searches', value: 'BOTH'},
                                    {name: 'Never', value: 'NONE'}
                                ],
                                help: "When no results were found for a query ID search again using a generated query (on indexer level)."
                            }
                        },
                        {
                            key: 'alwaysConvertIds',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Always convert media IDs for...',
                                options: [
                                    {name: 'Internal searches', value: 'INTERNAL'},
                                    {name: 'API searches', value: 'API'},
                                    {name: 'All searches', value: 'BOTH'},
                                    {name: 'Never', value: 'NONE'}
                                ],
                                help: "When enabled media ID conversions will always be done even when an indexer supports the already known ID(s)."
                            }
                        },
                        {
                            key: 'transformNewznabCategories',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Transform newznab categories',
                                help: 'Map newznab categories from API searches to configured categories and use all configured newznab categories in searches.'
                            }
                        },
                        {
                            key: 'sendTorznabCategories',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Send categories to trackers',
                                help: 'If disabled no categories will be included in queries to torznab indexers (trackers).'
                            }
                        },
                        {
                            key: 'language',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'text',
                                label: 'Language',
                                required: true,
                                help: 'Used for movie query generation and autocomplete only.',
                                options: [{"name": "Abkhaz", value: "ab"}, {
                                    "name": "Afar",
                                    value: "aa"
                                }, {"name": "Afrikaans", value: "af"}, {"name": "Akan", value: "ak"}, {
                                    "name": "Albanian",
                                    value: "sq"
                                }, {"name": "Amharic", value: "am"}, {
                                    "name": "Arabic",
                                    value: "ar"
                                }, {"name": "Aragonese", value: "an"}, {"name": "Armenian", value: "hy"}, {
                                    "name": "Assamese",
                                    value: "as"
                                }, {"name": "Avaric", value: "av"}, {"name": "Avestan", value: "ae"}, {
                                    "name": "Aymara",
                                    value: "ay"
                                }, {"name": "Azerbaijani", value: "az"}, {
                                    "name": "Bambara",
                                    value: "bm"
                                }, {"name": "Bashkir", value: "ba"}, {
                                    "name": "Basque",
                                    value: "eu"
                                }, {"name": "Belarusian", value: "be"}, {"name": "Bengali", value: "bn"}, {
                                    "name": "Bihari",
                                    value: "bh"
                                }, {"name": "Bislama", value: "bi"}, {
                                    "name": "Bosnian",
                                    value: "bs"
                                }, {"name": "Breton", value: "br"}, {"name": "Bulgarian", value: "bg"}, {
                                    "name": "Burmese",
                                    value: "my"
                                }, {"name": "Catalan", value: "ca"}, {
                                    "name": "Chamorro",
                                    value: "ch"
                                }, {"name": "Chechen", value: "ce"}, {"name": "Chichewa", value: "ny"}, {
                                    "name": "Chinese",
                                    value: "zh"
                                }, {"name": "Chuvash", value: "cv"}, {
                                    "name": "Cornish",
                                    value: "kw"
                                }, {"name": "Corsican", value: "co"}, {"name": "Cree", value: "cr"}, {
                                    "name": "Croatian",
                                    value: "hr"
                                }, {"name": "Czech", value: "cs"}, {"name": "Danish", value: "da"}, {
                                    "name": "Divehi",
                                    value: "dv"
                                }, {"name": "Dutch", value: "nl"}, {
                                    "name": "Dzongkha",
                                    value: "dz"
                                }, {"name": "English", value: "en"}, {
                                    "name": "Esperanto",
                                    value: "eo"
                                }, {"name": "Estonian", value: "et"}, {"name": "Ewe", value: "ee"}, {
                                    "name": "Faroese",
                                    value: "fo"
                                }, {"name": "Fijian", value: "fj"}, {"name": "Finnish", value: "fi"}, {
                                    "name": "French",
                                    value: "fr"
                                }, {"name": "Fula", value: "ff"}, {
                                    "name": "Galician",
                                    value: "gl"
                                }, {"name": "Georgian", value: "ka"}, {"name": "German", value: "de"}, {
                                    "name": "Greek",
                                    value: "el"
                                }, {"name": "Guaraní", value: "gn"}, {
                                    "name": "Gujarati",
                                    value: "gu"
                                }, {"name": "Haitian", value: "ht"}, {"name": "Hausa", value: "ha"}, {
                                    "name": "Hebrew",
                                    value: "he"
                                }, {"name": "Herero", value: "hz"}, {
                                    "name": "Hindi",
                                    value: "hi"
                                }, {"name": "Hiri Motu", value: "ho"}, {
                                    "name": "Hungarian",
                                    value: "hu"
                                }, {"name": "Interlingua", value: "ia"}, {
                                    "name": "Indonesian",
                                    value: "id"
                                }, {"name": "Interlingue", value: "ie"}, {
                                    "name": "Irish",
                                    value: "ga"
                                }, {"name": "Igbo", value: "ig"}, {"name": "Inupiaq", value: "ik"}, {
                                    "name": "Ido",
                                    value: "io"
                                }, {"name": "Icelandic", value: "is"}, {
                                    "name": "Italian",
                                    value: "it"
                                }, {"name": "Inuktitut", value: "iu"}, {"name": "Japanese", value: "ja"}, {
                                    "name": "Javanese",
                                    value: "jv"
                                }, {"name": "Kalaallisut", value: "kl"}, {
                                    "name": "Kannada",
                                    value: "kn"
                                }, {"name": "Kanuri", value: "kr"}, {"name": "Kashmiri", value: "ks"}, {
                                    "name": "Kazakh",
                                    value: "kk"
                                }, {"name": "Khmer", value: "km"}, {
                                    "name": "Kikuyu",
                                    value: "ki"
                                }, {"name": "Kinyarwanda", value: "rw"}, {"name": "Kyrgyz", value: "ky"}, {
                                    "name": "Komi",
                                    value: "kv"
                                }, {"name": "Kongo", value: "kg"}, {"name": "Korean", value: "ko"}, {
                                    "name": "Kurdish",
                                    value: "ku"
                                }, {"name": "Kwanyama", value: "kj"}, {
                                    "name": "Latin",
                                    value: "la"
                                }, {"name": "Luxembourgish", value: "lb"}, {
                                    "name": "Ganda",
                                    value: "lg"
                                }, {"name": "Limburgish", value: "li"}, {"name": "Lingala", value: "ln"}, {
                                    "name": "Lao",
                                    value: "lo"
                                }, {"name": "Lithuanian", value: "lt"}, {
                                    "name": "Luba-Katanga",
                                    value: "lu"
                                }, {"name": "Latvian", value: "lv"}, {"name": "Manx", value: "gv"}, {
                                    "name": "Macedonian",
                                    value: "mk"
                                }, {"name": "Malagasy", value: "mg"}, {
                                    "name": "Malay",
                                    value: "ms"
                                }, {"name": "Malayalam", value: "ml"}, {"name": "Maltese", value: "mt"}, {
                                    "name": "Māori",
                                    value: "mi"
                                }, {"name": "Marathi", value: "mr"}, {
                                    "name": "Marshallese",
                                    value: "mh"
                                }, {"name": "Mongolian", value: "mn"}, {"name": "Nauru", value: "na"}, {
                                    "name": "Navajo",
                                    value: "nv"
                                }, {"name": "Northern Ndebele", value: "nd"}, {
                                    "name": "Nepali",
                                    value: "ne"
                                }, {"name": "Ndonga", value: "ng"}, {
                                    "name": "Norwegian Bokmål",
                                    value: "nb"
                                }, {"name": "Norwegian Nynorsk", value: "nn"}, {
                                    "name": "Norwegian",
                                    value: "no"
                                }, {"name": "Nuosu", value: "ii"}, {
                                    "name": "Southern Ndebele",
                                    value: "nr"
                                }, {"name": "Occitan", value: "oc"}, {
                                    "name": "Ojibwe",
                                    value: "oj"
                                }, {"name": "Old Church Slavonic", value: "cu"}, {"name": "Oromo", value: "om"}, {
                                    "name": "Oriya",
                                    value: "or"
                                }, {"name": "Ossetian", value: "os"}, {"name": "Panjabi", value: "pa"}, {
                                    "name": "Pāli",
                                    value: "pi"
                                }, {"name": "Persian", value: "fa"}, {
                                    "name": "Polish",
                                    value: "pl"
                                }, {"name": "Pashto", value: "ps"}, {
                                    "name": "Portuguese",
                                    value: "pt"
                                }, {"name": "Quechua", value: "qu"}, {"name": "Romansh", value: "rm"}, {
                                    "name": "Kirundi",
                                    value: "rn"
                                }, {"name": "Romanian", value: "ro"}, {
                                    "name": "Russian",
                                    value: "ru"
                                }, {"name": "Sanskrit", value: "sa"}, {"name": "Sardinian", value: "sc"}, {
                                    "name": "Sindhi",
                                    value: "sd"
                                }, {"name": "Northern Sami", value: "se"}, {
                                    "name": "Samoan",
                                    value: "sm"
                                }, {"name": "Sango", value: "sg"}, {"name": "Serbian", value: "sr"}, {
                                    "name": "Gaelic",
                                    value: "gd"
                                }, {"name": "Shona", value: "sn"}, {"name": "Sinhala", value: "si"}, {
                                    "name": "Slovak",
                                    value: "sk"
                                }, {"name": "Slovene", value: "sl"}, {
                                    "name": "Somali",
                                    value: "so"
                                }, {"name": "Southern Sotho", value: "st"}, {
                                    "name": "Spanish",
                                    value: "es"
                                }, {"name": "Sundanese", value: "su"}, {"name": "Swahili", value: "sw"}, {
                                    "name": "Swati",
                                    value: "ss"
                                }, {"name": "Swedish", value: "sv"}, {"name": "Tamil", value: "ta"}, {
                                    "name": "Telugu",
                                    value: "te"
                                }, {"name": "Tajik", value: "tg"}, {
                                    "name": "Thai",
                                    value: "th"
                                }, {"name": "Tigrinya", value: "ti"}, {
                                    "name": "Tibetan Standard",
                                    value: "bo"
                                }, {"name": "Turkmen", value: "tk"}, {"name": "Tagalog", value: "tl"}, {
                                    "name": "Tswana",
                                    value: "tn"
                                }, {"name": "Tonga", value: "to"}, {"name": "Turkish", value: "tr"}, {
                                    "name": "Tsonga",
                                    value: "ts"
                                }, {"name": "Tatar", value: "tt"}, {
                                    "name": "Twi",
                                    value: "tw"
                                }, {"name": "Tahitian", value: "ty"}, {
                                    "name": "Uyghur",
                                    value: "ug"
                                }, {"name": "Ukrainian", value: "uk"}, {"name": "Urdu", value: "ur"}, {
                                    "name": "Uzbek",
                                    value: "uz"
                                }, {"name": "Venda", value: "ve"}, {
                                    "name": "Vietnamese",
                                    value: "vi"
                                }, {"name": "Volapük", value: "vo"}, {"name": "Walloon", value: "wa"}, {
                                    "name": "Welsh",
                                    value: "cy"
                                }, {"name": "Wolof", value: "wo"}, {
                                    "name": "Western Frisian",
                                    value: "fy"
                                }, {"name": "Xhosa", value: "xh"}, {"name": "Yiddish", value: "yi"}, {
                                    "name": "Yoruba",
                                    value: "yo"
                                }, {"name": "Zhuang", value: "za"}, {"name": "Zulu", value: "zu"}]
                            }
                        },
                        {
                            key: 'userAgent',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'User agent',
                                help: 'Used when accessing indexers.',
                                required: true
                            }
                        },
                        {
                            key: 'userAgents',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Map user agents',
                                help: 'Used to map the user agent from accessing services to the service names. Apply words with return key.'
                            }
                        },
                        {
                            key: 'ignoreLoadLimitingForInternalSearches',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Ignore load limiting internally',
                                help: 'When enabled load limiting defined for indexers will be ignored for internal searches.'
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Result filters'
                    },
                    fieldGroup: [
                        {
                            key: 'applyRestrictions',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Apply word filters',
                                options: [
                                    {name: 'All searches', value: 'BOTH'},
                                    {name: 'Internal searches', value: 'INTERNAL'},
                                    {name: 'API searches', value: 'API'},
                                    {name: 'Never', value: 'NONE'}
                                ],
                                help: "For which type of search word/regex filters will be applied"
                            }
                        },
                        {
                            key: 'forbiddenWords',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden words',
                                help: "Results with any of these words in the title will be ignored. Title is converted to lowercase before. Apply words with return key."
                            },
                            hideExpression: function () {
                                return rootModel.searching.applyRestrictions === "NONE";
                            }
                        },
                        {
                            key: 'forbiddenRegex',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden regex',
                                help: 'Must not be present in a title (case is ignored)'
                            },
                            hideExpression: function () {
                                return rootModel.searching.applyRestrictions === "NONE";
                            }
                        },
                        {
                            key: 'requiredWords',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Required words',
                                help: "Only results with titles that contain *all* words will be used. Title is converted to lowercase before. Apply words with return key."
                            },
                            hideExpression: function () {
                                return rootModel.searching.applyRestrictions === "NONE";
                            }
                        },
                        {
                            key: 'requiredRegex',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Required regex',
                                help: 'Must be present in a title (case is ignored)'
                            },
                            hideExpression: function () {
                                return rootModel.searching.applyRestrictions === "NONE";
                            }
                        },

                        {
                            key: 'forbiddenGroups',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden groups',
                                help: 'Posts from any groups containing any of these words will be ignored. Apply words with return key.'
                            },
                            hideExpression: function () {
                                return rootModel.searching.applyRestrictions === "NONE";
                            }
                        },
                        {
                            key: 'forbiddenPosters',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden posters',
                                help: 'Posts from any posters containing any of these words will be ignored. Apply words with return key.'
                            }
                        },
                        {
                            key: 'maxAge',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Maximum results age',
                                help: 'Results older than this are ignored. Can be overwritten per search. Apply words with return key.',
                                addonRight: {
                                    text: 'days'
                                }
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
                            key: 'wrapApiErrors',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'text',
                                label: 'Wrap API errors in empty results page',
                                help: 'When enabled accessing tools will think the search was completed successfully but without results.'
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
                            key: 'removeTrailing',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Remove trailing...',
                                help: 'Removed from title if it ends with either of these. Case insensitive and disregards leading/trailing spaces. Allows wildcards ("*"). Apply words with return key.'
                            }
                        },
                        {
                            key: 'useOriginalCategories',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Use original categories',
                                help: 'Enable to use the category descriptions provided by the indexer.'
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
                            key: 'loadLimitInternal',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Display...',
                                addonRight: {
                                    text: 'results per page'
                                },
                                max: 500,
                                required: true,
                                help: 'Determines the number of results shown on one page. This might also cause more API hits because indexers are queried until the number of results is matched or all indexers are exhausted. Limit is 500.'
                            }
                        },
                        {
                            key: 'loadAllCachedOnInternal',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Display all retrieved results',
                                help: 'Load all results already retrieved from indexers. Might make sorting / filtering a bit slower. Will still be paged according to the limit set above.'
                            }
                        },
                        {
                            key: 'globalCacheTimeMinutes',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Results cache time',
                                help: 'When set search results will be cached for this time. Any search with the same parameters will return the cached results. API cache time parameters will be preferred. See <a href="https://github.com/theotherp/nzbhydra2/wiki/External-API,-RSS-and-cached-queries" target="_blank">wiki</a>.',
                                addonRight: {
                                    text: 'minutes'
                                }
                            }
                        }

                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Other'
                    },
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
                                help: 'Meta data from searches is stored in the database. When they\'re deleted existing links to Hydra become invalid.'
                            }
                        },
                        {
                            key: 'showQuickFilterButtons',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Show quick filter',
                                help: 'Show quick filter buttons for movie and TV results.'
                            }
                        },
                        {
                            key: 'coverSize',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Cover width',
                                addonRight: {
                                    text: 'px'
                                },
                                required: true,
                                help: 'Determines width of covers in search results (when enabled in display options)'
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
                    key: 'defaultCategory',
                    type: 'horizontalSelect',
                    templateOptions: {
                        label: 'Default category',
                        options: [],
                        help: "Set a default category. Reload page to set a category you just added."
                    },
                    controller: function ($scope) {
                        var options = [];
                        options.push({name: 'All', value: 'All'});
                        _.each($scope.model.categories, function (cat) {
                            options.push({name: cat.name, value: cat.name});
                        });
                        $scope.to.options = options;
                    }
                },
                {
                    type: 'help',
                    templateOptions: {
                        type: 'help',
                        lines: [
                            "The category configuration is not validated in any way. You can seriously fuck up Hydra's results and overall behavior so take care.",
                            "Restrictions will taken from a result's category, not the search request category which may not always be the same."
                        ],
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
                                    help: 'Renaming categories might cause problems with repeating searches from the history.',
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
                                        {name: 'Audio', value: 'MUSIC'},
                                        {name: 'EBook', value: 'BOOK'},
                                        {name: 'Movie', value: 'MOVIE'},
                                        {name: 'TV', value: 'TVSEARCH'}
                                    ],
                                    help: "Determines how indexers will be searched and if autocompletion is available in the GUI"
                                }
                            },
                            {
                                key: 'subtype',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Sub type',
                                    options: [
                                        {name: 'Anime', value: 'ANIME'},
                                        {name: 'Audiobook', value: 'AUDIOBOOK'},
                                        {name: 'Comic', value: 'COMIC'},
                                        {name: 'Ebook', value: 'EBOOK'},
                                        {name: 'None', value: 'NONE'}
                                    ],
                                    help: "Special search type. Used for indexer specific mappings between categories and newznab IDs"
                                }
                            },
                            {
                                key: 'applyRestrictionsType',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Apply restrictions',
                                    options: [
                                        {name: 'All searches', value: 'BOTH'},
                                        {name: 'Internal searches', value: 'INTERNAL'},
                                        {name: 'API searches', value: 'API'},
                                        {name: 'Never', value: 'NONE'}
                                    ],
                                    help: "For which type of search word restrictions will be applied"
                                }
                            },
                            {
                                key: 'requiredWords',
                                type: 'horizontalChips',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Required words',
                                    help: "Must *all* be present in a title which is converted to lowercase before. Apply words with return key."
                                }
                            },
                            {
                                key: 'requiredRegex',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Required regex',
                                    help: 'Must be present in a title (case is ignored)'
                                }
                            },
                            {
                                key: 'forbiddenWords',
                                type: 'horizontalChips',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Forbidden words',
                                    help: "None may be present in a title which is converted to lowercase before. Apply words with return key."
                                }
                            },
                            {
                                key: 'forbiddenRegex',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Forbidden regex',
                                    help: 'Must not be present in a title (case is ignored)'
                                }
                            },
                            {
                                wrapper: 'settingWrapper',
                                templateOptions: {
                                    label: 'Size preset',
                                    help: "Will set these values on the search page"
                                },
                                fieldGroup: [
                                    {
                                        key: 'minSizePreset',
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
                                        key: 'maxSizePreset',
                                        type: 'duoSetting', templateOptions: {addonRight: {text: 'MB'}}
                                    }
                                ]
                            },
                            {
                                key: 'applySizeLimitsToApi',
                                type: 'horizontalSwitch',
                                templateOptions: {
                                    type: 'switch',
                                    label: 'Limit API results size',
                                    help: "Enable to apply the size preset to API results from this category"
                                }
                            },
                            {
                                key: 'newznabCategories',
                                type: 'horizontalChips',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Newznab categories',
                                    help: 'Map newznab categories to Hydra categories. Used for parsing and when searching internally. Apply categories with return key. You can combine categories which must be all present by using "&".'
                                }
                            },
                            {
                                key: 'ignoreResultsFrom',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Ignore results',
                                    options: [
                                        {name: 'For all searches', value: 'BOTH'},
                                        {name: 'For internal searches', value: 'INTERNAL'},
                                        {name: 'For API searches', value: 'API'},
                                        {name: 'Never', value: 'NONE'}
                                    ],
                                    help: "Ignore results from this category"
                                }
                            }

                        ],
                        defaultModel: {
                            name: null,
                            applySizeLimitsToApi: false,
                            applyRestrictionsType: "NONE",
                            forbiddenRegex: null,
                            forbiddenWords: [],
                            ignoreResultsFrom: "NONE",
                            mayBeSelected: true,
                            maxSizePreset: null,
                            minSizePreset: null,
                            newznabCategories: [],
                            preselect: true,
                            requiredRegex: null,
                            requiredWords: [],
                            searchType: "SEARCH",
                            subtype: "NONE"
                        }
                    }
                }
            ],
            downloading: [
                {
                    wrapper: 'fieldset',
                    templateOptions: {label: 'General'},
                    fieldGroup: [
                        {
                            key: 'saveTorrentsTo',
                            type: 'fileInput',
                            templateOptions: {
                                label: 'Torrent black hole',
                                help: 'When the "Torrent" button is clicked torrents will be saved to this folder on the server. Ignored if not set.',
                                type: "folder"
                            }
                        },
                        {
                            key: 'sendMagnetLinks',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Send magnet links',
                                help: "Enable to send magnet links to the associated program on the server machine. Won't work with docker"
                            }
                        },
                        {
                            key: 'updateStatuses',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Update statuses',
                                help: "Query your downloader for status updates of downloads"
                            }
                        },
                        {
                            key: 'showDownloaderStatus',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Show downloader footer',
                                help: "Show footer with downloader status"
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    key: 'downloaders',
                    templateOptions: {label: 'Downloaders'},
                    fieldGroup: [
                        {
                            type: "downloaderConfig",
                            data: {}
                        }
                    ]
                }
            ],

            indexers: [
                {
                    type: "indexers",
                    data: {}
                },
                {
                    type: 'recheckAllCaps'
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
                    }
                },
                {
                    key: 'authHeader',
                    type: 'horizontalInput',
                    templateOptions: {
                        type: 'string',
                        label: 'Auth header',
                        help: 'Name of header that provides the username in requests from secure sources.'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType === "NONE";
                    }
                },
                {
                    key: 'authHeaderIpRanges',
                    type: 'horizontalChips',
                    templateOptions: {
                        type: 'text',
                        label: 'Secure IP ranges',
                        help: 'IP ranges from which the auth header will be accepted. Apply with return key. Use values like "192.168.0.1-192.168.0.100" or single IP addresses like "127.0.0.1"'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType === "NONE" || rootModel.auth.authHeader === null || rootModel.auth.authHeader === undefined || rootModel.auth.authHeader === "";
                    }
                },
                {
                    key: 'restrictSearch',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Restrict searching',
                        help: 'Restrict access to searching.'
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
                        help: 'Restrict access to stats.'
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
                        help: 'Restrict access to admin functions.'
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
                        help: 'Restrict NZB details, comments and download links.'
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
                        help: 'Restrict visibility of indexer selection box in search. Affects only GUI.'
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
                        help: 'Remember users with cookie for 14 days.'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType === "NONE";
                    }
                },
                {
                    key: 'rememberMeValidityDays',
                    type: 'horizontalInput',
                    templateOptions: {
                        type: 'number',
                        label: 'Cookie expiry',
                        help: 'How long users are remembered.',
                        addonRight: {
                            text: 'days'
                        }
                    }
                },
                {
                    key: 'allowApiStats',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Allow stats access',
                        help: 'Allow access to stats via external API.'
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
                                type: 'passwordSwitch',
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
                            token: null,
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

function handleConnectionCheckFail(ModalService, data, model, whatFailed, deferred) {
    var message;
    var yesText;
    if (data.checked) {
        message = "The connection to the " + whatFailed + " failed: " + data.message + "<br>Do you want to add it anyway?";
        yesText = "I know what I'm doing";
    } else {
        message = "The connection to the " + whatFailed + " could not be tested, sorry. Please check the log.";
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