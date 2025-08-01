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

    function getFields(rootModel, showAdvanced) {
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
                                help: 'Adapt when using a reverse proxy. See <a href="https://github.com/theotherp/nzbhydra2/wiki/Exposing-Hydra-to-the-internet-and-using-reverse-proxies" target="_blank">wiki</a>. Always use when calling Hydra, even locally.',
                                tooltip: 'If you use Hydra behind a reverse proxy you might want to set the URL base to a value like "/nzbhydra". If you accesses Hydra with tools running outside your network (for example from your phone) set the external URL so that it matches the full Hydra URL. That way the NZB links returned in the search results refer to your global URL and not your local address.',
                                advanced: true
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
                                help: 'Requires restart.',
                                tooltip: 'You can use SSL but I recommend using a reverse proxy with SSL. See the wiki for notes regarding reverse proxies and SSL. It\'s more secure and can be configured better.',
                                advanced: true
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
                                help: 'Requires restart. See <a href="https://github.com/theotherp/nzbhydra2/wiki/SSL" target="_blank">wiki</a>.'
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
                        }


                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Proxy',
                        tooltip: 'You can select to use either a SOCKS or an HTTPS proxy. All outside connections will be done via the configured proxy.',
                        advanced: true
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
                                options: [
                                    {name: 'Auto', value: 'auto'},
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
                                help: 'Redirect external links to hide your instance. Insert $s for escaped target URL and $us for unescaped target URL. Use empty value to disable.',
                                advanced: true
                            }
                        },
                        {
                            key: 'verifySsl',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                label: 'Verify SSL certificates',
                                help: 'If enabled only valid/known SSL certificates will be accepted when accessing indexers. Change requires restart. See <a href="https://github.com/theotherp/nzbhydra2/wiki/SSL-verification-errors" target="_blank">wiki</a>.',
                                advanced: true
                            }
                        },
                        {
                            key: 'verifySslDisabledFor',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Disable SSL for...',
                                help: 'Add hosts for which to disable SSL verification. Apply words with return key.',
                                advanced: true
                            }
                        },
                        {
                            key: 'disableSslLocally',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'text',
                                label: 'Disable SSL locally',
                                help: 'Disable SSL for local hosts.',
                                advanced: true
                            }
                        },
                        {
                            key: 'sniDisabledFor',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Disable SNI',
                                help: 'Add a host if you get an "unrecognized_name" error. Apply words with return key. See <a href="https://github.com/theotherp/nzbhydra2/wiki/SSL-verification-errors" target="_blank">wiki</a>.',
                                advanced: true
                            }
                        },
                        {
                            key: 'useCsrf',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                label: 'Use CSRF protection',
                                help: 'Use <a href="https://en.wikipedia.org/wiki/Cross-site_request_forgery" target="_blank">CSRF protection</a>.',
                                advanced: true
                            }
                        }
                    ]
                },

                {
                    wrapper: 'fieldset',
                    key: 'logging',
                    templateOptions: {
                        label: 'Logging',
                        tooltip: 'The base settings should suffice for most users. If you want you can enable logging of IP adresses for failed logins and NZB downloads.',
                        advanced: true
                    },
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
                            key: 'logGc',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Log GC',
                                help: 'Enable garbage collection logging. Only for debugging of memory issues.'
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
                            key: 'mapIpToHost',
                            type: 'horizontalSwitch',
                            hideExpression: '!model.logIpAddresses',
                            templateOptions: {
                                type: 'switch',
                                label: 'Map hosts',
                                help: 'Try to map logged IP addresses to host names.',
                                tooltip: 'Enabling this may cause NZBHydra to load very, very slowly when accessed remotely.'
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
                            hideExpression: 'model.consolelevel !== "DEBUG" && model.logfilelevel !== "DEBUG"',
                            templateOptions: {
                                label: 'Log markers',
                                help: 'Select certain sections for more output on debug level. Please enable only when asked for.',
                                options: [
                                    {label: 'API limits', id: 'LIMITS'},
                                    {label: 'Category mapping', id: 'CATEGORY_MAPPING'},
                                    {label: 'Config file handling', id: 'CONFIG_READ_WRITE'},
                                    {label: 'Custom mapping', id: 'CUSTOM_MAPPING'},
                                    {label: 'Downloader status updating', id: 'DOWNLOADER_STATUS_UPDATE'},
                                    {label: 'Duplicate detection', id: 'DUPLICATES'},
                                    {label: 'External tool configuration', id: 'EXTERNAL_TOOLS'},
                                    {label: 'History cleanup', id: 'HISTORY_CLEANUP'},
                                    {label: 'HTTP', id: 'HTTP'},
                                    {label: 'HTTPS', id: 'HTTPS'},
                                    {label: 'HTTP Server', id: 'SERVER'},
                                    {label: 'Indexer scheduler', id: 'SCHEDULER'},
                                    {label: 'Notifications', id: 'NOTIFICATIONS'},
                                    {label: 'NZB download status updating', id: 'DOWNLOAD_STATUS_UPDATE'},
                                    {label: 'Performance', id: 'PERFORMANCE'},
                                    {label: 'Rejected results', id: 'RESULT_ACCEPTOR'},
                                    {label: 'Removed trailing words', id: 'TRAILING'},
                                    {label: 'URL calculation', id: 'URL_CALCULATION'},
                                    {label: 'User agent mapping', id: 'USER_AGENT'},
                                    {label: 'VIP expiry', id: 'VIP_EXPIRY'}
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
                    templateOptions: {
                        label: 'Backup',
                        advanced: true
                    },
                    fieldGroup: [
                        {
                            key: 'backupFolder',
                            type: 'horizontalInput',
                            templateOptions: {
                                label: 'Backup folder',
                                help: 'Either relative to the NZBHydra data folder or an absolute folder.'
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
                                label: 'Install prereleases',
                                advanced: true
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
                                },
                                advanced: true
                            }
                        },
                        {
                            key: 'showUpdateBannerOnDocker',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Show update banner when managed externally',
                                advanced: true,
                                help: 'If enabled a banner will be shown when new versions are available even when NZBHydra is run inside docker or is installed using a package manager (where you wouldn\'t let NZBHydra update itself).'
                            }
                        },
                        {
                            key: 'showWhatsNewBanner',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Show info banner after automatic updates',
                                help: 'Please keep it enabled, I put some effort into the changelog ;-)',
                                advanced: true
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'History',
                        advanced: true
                    },
                    fieldGroup: [
                        {
                            key: 'keepHistory',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Keep history',
                                help: 'Controls search and download history.',
                                tooltip: 'If disabled no search or download history will be kept. These sections will be hidden in the GUI. You won\'t be able to see stats. The database will still contain a short-lived history of transactions that are kept for 24 hours.'
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
                    templateOptions: {
                        label: 'Database',
                        tooltip: 'You should not change these values unless you\'re either told to or really know what you\'re doing.',
                        advanced: true
                    },
                    fieldGroup: [
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
                        },
                        {
                            key: 'databaseRetentionTime',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Database retention time',
                                addonRight: {
                                    text: 'ms'
                                },
                                help: 'How long the db should retain old, persisted data. See <a href="https://www.h2database.com/html/commands.html#set_retention_time">here</a>.'
                            }
                        },
                        {
                            key: 'databaseWriteDelay',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Database write delay',
                                addonRight: {
                                    text: 'ms'
                                },
                                help: 'Maximum delay between a commit and flushing the log, in milliseconds. See <a href="https://www.h2database.com/html/commands.html#set_write_delay">here</a>.'
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
                                help: "Hydra will occasionally show news when opened. You can always find them in the system section",
                                advanced: true
                            }
                        },
                        {
                            key: 'proxyImages',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Proxy images',
                                help: 'Download images from indexers and info providers (e.g. TMBD) and serve them via NZBHydra. Will only affect searches via UI, not API searches.'
                            }
                        },
                        {
                            key: 'checkOpenPort',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Check for open port',
                                help: "Check if NZBHydra is reachable from the internet and not protected",
                                advanced: true
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
                                help: '256 should suffice except when working with big databases / many indexers. See <a href="https://github.com/theotherp/nzbhydra2/wiki/Memory-requirements" target="_blank">wiki</a>.',
                                advanced: true
                            }
                        }
                    ]

                }
            ],

            searching: [
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Indexer access',
                        tooltip: 'Settings that control how communication with indexers is done and how to handle errors while doing that.',
                        advanced: true
                    },
                    fieldGroup: [
                        {
                            key: 'timeout',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Timeout when accessing indexers',
                                help: 'Any web call to an indexer taking longer than this is aborted.',
                                min: 1,
                                addonRight: {
                                    text: 'seconds'
                                }
                            }
                        },
                        {
                            key: 'userAgent',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'User agent',
                                help: 'Used when accessing indexers.',
                                required: true,
                                tooltip: 'Some indexers don\'t seem to like Hydra and disable access based on the user agent. You can change it here if you want. Please leave it as it is if you have no problems. This allows indexers to gather better statistics on how their API services are used.',
                            }
                        },
                        {
                            key: 'userAgents',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Map user agents',
                                help: 'Used to map the user agent from accessing services to the service names. Apply words with return key.',
                            }
                        },
                        {
                            key: 'ignoreLoadLimitingForInternalSearches',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Ignore load limiting internally',
                                help: 'When enabled load limiting defined for indexers will be ignored for internal searches.',
                            }
                        },
                        {
                            key: 'ignoreTemporarilyDisabled',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Ignore temporary errors',
                                tooltip: "By default if access to an indexer fails the indexer is disabled for a certain amount of time (for a short while first, then increasingly longer if the problems persist). Disable this and always try these indexers.",
                            }
                        }
                    ]
                }, {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Category handling',
                        tooltip: 'Settings that control the handling of newznab categories (e.g. 2000 for Movies).',
                        advanced: true
                    },
                    fieldGroup: [

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
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Media IDs / Query generation / Query processing',
                        tooltip: 'Raw search engines like Binsearch don\'t support searches based on IDs (e.g. for a movie using an IMDB id). You can enable query generation for these. Hydra will then try to retrieve the movie\'s or show\'s title and generate a query, for example "showname s01e01". In some cases an ID based search will not provide any results. You can enable a fallback so that in such a case the search will be repeated with a query using the title of the show or movie.'
                    },
                    fieldGroup: [
                        {
                            key: 'alwaysConvertIds',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Convert media IDs for...',
                                options: [
                                    {name: 'Internal searches', value: 'INTERNAL'},
                                    {name: 'API searches', value: 'API'},
                                    {name: 'All searches', value: 'BOTH'},
                                    {name: 'Never', value: 'NONE'}
                                ],
                                help: "When enabled media ID conversions will always be done even when an indexer supports the already known ID(s).",
                                advanced: true
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
                            key: 'replaceUmlauts',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Replace umlauts and diacritics',
                                help: 'Replace diacritics (e.g. è) and german umlauts and special characters (ä, ö, ü and ß) in external request queries.'
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Result filters',
                        tooltip: 'This section allows you to define global filters which will be applied to all search results. You can define words and regexes which must or must not be matched for a search result to be matched. You can also exclude certain usenet posters and groups which are known for spamming. You can define forbidden and required words for categories in the next tab (Categories). Usually required or forbidden words are applied on a word base, so they must form a complete word in a title. Only if they contain a dash or a dot they may appear anywhere in the title. Example: "ea" matches "something.from.ea" but not "release.from.other". "web-dl" matches "title.web-dl" and "someweb-dl".'
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
                                help: "Results with any of these words in the title will be ignored. Title is converted to lowercase before. Apply words with return key.",
                                tooltip: 'One forbidden word in a result title dismisses the result.'
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
                                help: 'Must not be present in a title (case is ignored).',
                                advanced: true
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
                                help: "Only results with titles that contain *all* words will be used. Title is converted to lowercase before. Apply words with return key.",
                                tooltip: 'If any of the required words is not found anywhere in a result title it\'s also dismissed.'
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
                                help: 'Must be present in a title (case is ignored).',
                                advanced: true
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
                                help: 'Posts from any groups containing any of these words will be ignored. Apply words with return key.',
                                advanced: true
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
                                help: 'Posts from any posters containing any of these words will be ignored. Apply words with return key.',
                                advanced: true
                            }
                        },
                        {
                            key: 'languagesToKeep',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Languages to keep',
                                help: 'If an indexer returns the language in the results only those results with configured languages will be used. Apply words with return key.'
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
                            key: 'minSeeders',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Minimum # seeders',
                                help: 'Torznab results with fewer seeders will be ignored.'
                            }
                        },
                        {
                            key: 'ignorePassworded',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Ignore passworded releases',
                                help: "Not all indexers provide this information",
                                tooltip: 'Some indexers provide information if a release is passworded. If you select to ignore these releases only those will be ignored of which I know for sure that they\'re actually passworded.'
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
                                help: 'When enabled accessing tools will think the search was completed successfully but without results.',
                                tooltip: 'In (hopefully) rare cases Hydra may crash when processing an API search request. You can enable to return an empty search page in these cases (if Hydra hasn\'t crashed altogether ). This means that the calling tool (e.g. Sonarr) will think that the indexer (Hydra) is fine but just didn\'t return a result. That way Hydra won\'t be disabled as indexer but on the downside you may not be directly notified that an error occurred.',
                                advanced: true
                            }
                        },
                        {
                            key: 'removeTrailing',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Remove trailing...',
                                help: 'Removed from title if it ends with either of these. Case insensitive and disregards leading/trailing spaces. Allows wildcards ("*"). Apply words with return key.',
                                tooltip: 'Hydra contains a predefined list of words which will be removed if a search result title ends with them. This allows better duplicate detection and cleans up the titles. Trailing words will be removed until none of the defined strings are found at the end of the result title.'
                            }
                        },
                        {
                            key: 'useOriginalCategories',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Use original categories',
                                help: 'Enable to use the category descriptions provided by the indexer.',
                                tooltip: 'Hydra attempts to parse the provided newznab category IDs for results and map them to the configured categories. In some cases this may lead to category names which are not quite correct. You can select to use the original category name used by the indexer. This will only affect which category name is shown in the results.',
                                advanced: true
                            }
                        }
                    ]
                },
                {
                    type: 'repeatSection',
                    key: 'customMappings',
                    model: rootModel.searching,
                    templateOptions: {
                        tooltip: 'Here you can define mappings to modify either queries or titles for search requests or to dynamically change the titles of found results. The former allows you, for example,  to change requests made by external tools, the latter to clean up results by indexers in a more advanced way.',
                        btnText: 'Add new custom mapping',
                        altLegendText: 'Mapping',
                        headline: 'Custom mappings of queries, search titles and result titles',
                        advanced: true,
                        fields: [
                            {
                                key: 'affectedValue',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Affected value',
                                    options: [
                                        {name: 'Query', value: 'QUERY'},
                                        {name: 'Search title', value: 'TITLE'},
                                        {name: 'Result title', value: 'RESULT_TITLE'},
                                    ],
                                    required: true,
                                    help: "Determines which value of the search request or result will be processed"
                                }
                            },
                            {
                                key: 'searchType',
                                type: 'horizontalSelect',
                                hideExpression: 'model.affectedValue === "RESULT_TITLE"',
                                templateOptions: {
                                    label: 'Search type',
                                    options: [
                                        {name: 'General', value: 'SEARCH'},
                                        {name: 'Audio', value: 'MUSIC'},
                                        {name: 'EBook', value: 'BOOK'},
                                        {name: 'Movie', value: 'MOVIE'},
                                        {name: 'TV', value: 'TVSEARCH'}
                                    ],
                                    help: "Determines in what context the mapping will be executed"
                                }
                            },
                            {
                                key: 'matchAll',
                                type: 'horizontalSwitch',
                                templateOptions: {
                                    type: 'switch',
                                    label: 'Match whole string',
                                    help: 'If true then the input pattern must match the whole affected value. If false then any match will be replaced, even if it\'s only part of the affected value.'
                                }
                            },
                            {
                                key: 'from',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Input pattern',
                                    help: 'Pattern which must match the query or title of a search request (completely or in part, depending on the previous setting). You may use regexes in groups which can be referenced in the output puttern by using <code>{group:regex}</code>. Case insensitive.',
                                    required: true
                                }
                            },
                            {
                                key: 'to',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Output pattern',
                                    required: true,
                                    help: 'If a query or title matches the input pattern it will be replaced using this. You may reference groups from the input pattern by using {group}. Additionally you may use <code>{season:0}</code> or <code>{season:00}</code> or <code>{episode:0}</code> or <code>{episode:00}</code> (with and without leading zeroes). Use <code>&lt;remove&gt;</code> to remove the match.'
                                }
                            },
                            {
                                type: 'customMappingTest',
                            }
                        ],
                        defaultModel: {
                            searchType: null,
                            affectedValue: null,
                            matchAll: true,
                            from: null,
                            to: null
                        }
                    }
                },


                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Result display'
                    },
                    fieldGroup: [
                        {
                            key: 'loadAllCachedOnInternal',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Display all retrieved results',
                                help: 'Load all results already retrieved from indexers. Might make sorting / filtering a bit slower. Will still be paged according to the limit set above.',
                                advanced: true
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
                                help: 'Determines the number of results shown on one page. This might also cause more API hits because indexers are queried until the number of results is matched or all indexers are exhausted. Limit is 500.',
                                advanced: true
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
                                help: 'Determines width of covers in search results (when enabled in display options).'
                            }
                        }
                    ]
                }, {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Quick filters'
                    },
                    fieldGroup: [
                        {
                            key: 'showQuickFilterButtons',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Show quick filters',
                                help: 'Show quick filter buttons for movie and TV results.'
                            }
                        },
                        {
                            key: 'alwaysShowQuickFilterButtons',
                            type: 'horizontalSwitch',
                            hideExpression: '!model.showQuickFilterButtons',
                            templateOptions: {
                                type: 'switch',
                                label: 'Always show quick filters',
                                help: 'Show all quick filter buttons for all types of searches.',
                                advanced: true
                            }
                        },
                        {
                            key: 'customQuickFilterButtons',
                            type: 'horizontalChips',
                            hideExpression: '!model.showQuickFilterButtons',
                            templateOptions: {
                                type: 'text',
                                label: 'Custom quick filters',
                                help: 'Enter in the format <code>DisplayName=Required1,Required2</code>. Prefix words with ! to exclude them. Surround with <code>/<code> to mark as a regex. Apply values with enter key.',
                                tooltip: 'E.g. use <code>WEB=webdl,web-dl.</code> for a quick filter with the name "WEB" to be displayed that searches for "webdl" and "web-dl" in lowercase search results.',
                                advanced: true
                            }
                        },
                        {
                            key: 'preselectQuickFilterButtons',
                            type: 'horizontalMultiselect',
                            hideExpression: '!model.showQuickFilterButtons',
                            templateOptions: {
                                label: 'Preselect quickfilters',
                                help: 'Choose which quickfilters will be selected by default.',
                                options: [
                                    {id: 'source|camts', label: 'CAM / TS'},
                                    {id: 'source|tv', label: 'TV'},
                                    {id: 'source|web', label: 'WEB'},
                                    {id: 'source|dvd', label: 'DVD'},
                                    {id: 'source|bluray', label: 'Blu-Ray'},
                                    {id: 'quality|q480p', label: '480p'},
                                    {id: 'quality|q720p', label: '720p'},
                                    {id: 'quality|q1080p', label: '1080p'},
                                    {id: 'quality|q2160p', label: '2160p'},
                                    {id: 'other|q3d', label: '3D'},
                                    {id: 'other|qx265', label: 'x265'},
                                    {id: 'other|qhevc', label: 'HEVC'},
                                ],
                                optionsFunction: function (model) {
                                    var customQuickFilters = [];
                                    _.each(model.customQuickFilterButtons, function (entry) {
                                        var split1 = entry.split("=");
                                        var displayName = split1[0];
                                        customQuickFilters.push({id: "custom|" + displayName, label: displayName})
                                    })
                                    return customQuickFilters;
                                },
                                tooltip: 'To select custom quickfilters you just entered please save the config first.',
                                buttonText: "None",
                                advanced: true
                            }
                        }
                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Duplicate detection',
                        tooltip: 'Hydra tries to find duplicate results from different indexers using heuristics. You can control the parameters for that but usually the default values work quite well.',
                        advanced: true
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
                        }

                    ]
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Other',
                        advanced: true
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
                                tooltip: 'Found results are stored in the database for this long until they\'re deleted. After that any links to Hydra results still stored elsewhere become invalid. You can increase the limit if you want, the disc space needed is negligible (about 75 MB for 7 days on my server).'
                            }
                        }, {
                            key: 'historyForSearching',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Recet searches in search bar',
                                required: true,
                                tooltip: 'The number of recent searches shown in the search bar dropdown (the <span class="glyphicon glyphicon-time"></span> icon).'
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
                }
            ],

            categoriesConfig: [
                {
                    key: 'enableCategorySizes',
                    type: 'horizontalSwitch',
                    templateOptions: {
                        type: 'switch',
                        label: 'Category sizes',
                        help: "Preset min and max sizes depending on the selected category",
                        tooltip: 'Preset range of minimum and maximum sizes for its categories. When you select a category in the search area the appropriate fields are filled with these values.'
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
                        marginTop: '50px',
                        advanced: true
                    }
                },
                {
                    type: 'repeatSection',
                    key: 'categories',
                    model: rootModel.categoriesConfig,
                    templateOptions: {
                        btnText: 'Add new category',
                        headline: 'Categories',
                        advanced: true,
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
                                    help: 'Must be present in a title (case is ignored).'
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
                                    help: 'Must not be present in a title (case is ignored).'
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
                                    help: 'Map newznab categories to Hydra categories. Used for parsing and when searching internally. Apply categories with return key.',
                                    tooltip: 'Hydra tries to map API search (newnzab) categories to its internal list of categories, going from specific to general. Example: If an API search is done with a catagory that matches those of "Movies HD" the settings for that category are used. Otherwise it checks if it matches the "Movies" category and, if yes, uses that one. If that one doesn\'t match no category settings are used.<br><br>' +
                                        'Related to that you must also define the newznab categories for every Hydra category, e.g. decide if the category for foreign movies (2010) is used for movie searches. This also controls the category mapping described above. You may combine newznab categories using "&" to require multiple numbers to be present in a result. For example "2010&11000" would require a search result to contain both 2010 and 11000 for that category to match.<br><br>' +
                                        'Note: When an API search defines categories the internal mapping is only used for the forbidden and required words. The search requests to your newznab indexers will still use the categories from the original request, not the ones configured here.'
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
                                    help: "Ignore results from this category",
                                    tooltip: 'If you want you can entirely ignore results from categories. Results from these categories will not show in the searches. If you select "Internal" or "Always" this category will also not be selectable on the search page.'
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
                    templateOptions: {
                        label: 'General',
                        tooltip: 'Hydra allows sending NZB search results directly to downloaders (NZBGet, sabnzbd, torbox). Torrent downloaders are not supported.'
                    },
                    fieldGroup: [
                        {
                            key: 'saveTorrentsTo',
                            type: 'fileInput',
                            templateOptions: {
                                label: 'Torrent black hole',
                                help: 'Allow torrents to be saved in this folder from the search results. Ignored if not set.',
                                type: "folder"
                            }
                        },
                        {
                            key: 'saveNzbsTo',
                            type: 'fileInput',
                            templateOptions: {
                                label: 'NZB black hole',
                                help: 'Allow NZBs to be saved in this folder from the search results. Ignored if not set.',
                                type: "folder"
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
                                help: "How access to NZBs is provided when NZBs are downloaded (by the user or external tools). Proxying is recommended as it allows fallback for failed downloads (see below)..",
                                tooltip: 'NZB downloads from Hydra can either be achieved by redirecting the requester to the original indexer or by downloading the NZB from the indexer and serving this. Redirecting has the advantage that it causes the least load on Hydra but also the disadvantage that the requester might be forwarded to an indexer link that contains the indexer\'s API key. To prevent that select to proxy NZBs. It also allows fallback for failed downloads (next option).',
                                advanced: true

                            }
                        },
                        {
                            key: 'externalUrl',
                            type: 'horizontalInput',
                            hideExpression: function ($viewValue, $modelValue, scope) {
                                return !scope.model.showDownloaderStatus && !_.any(scope.model.downloaders, function (downloader) {
                                    return downloader.nzbAddingType === "SEND_LINK";
                                });
                            },
                            templateOptions: {
                                label: 'External URL',
                                help: 'Used for links when sending links to the downloader and as link target for the downloader icon in the footer (when set).',
                                tooltip: 'When using "Add links" to add NZBs to your downloader the links are usually calculated using the URL with which you accessed NZBHydra. This might be a URL that\'s not accessible by the downloader (e.g. when it\'s inside a docker container). Set the URL for NZBHydra that\'s accessible by the downloader here and it will be used instead. ',
                                advanced: true
                            }
                        },

                        {
                            key: 'fallbackForFailed',
                            type: 'horizontalSelect',
                            hideExpression: 'model.nzbAccessType === "REDIRECT"',
                            templateOptions: {
                                label: 'Fallback for failed downloads',
                                options: [
                                    {name: 'GUI downloads', value: 'INTERNAL'},
                                    {name: 'API downloads', value: 'API'},
                                    {name: 'All downloads', value: 'BOTH'},
                                    {name: 'Never', value: 'NONE'}
                                ],
                                help: "Fallback to similar results when a download fails. Only available when proxying NZBs (see above).",
                                tooltip: "When you or an external program tries to download an NZB from NZBHydra the download may fail because the indexer is offline or its download limit has been reached. You can use this setting for NZBHydra to try and fall back on results from other indexers. It will search for results with the same name that were the result from the same search as where the download originated from. It will *not* execute another search."
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
                                help: "Query your downloader for status updates of downloads",
                                advanced: true
                            }
                        },
                        {
                            key: 'showDownloaderStatus',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Show downloader footer',
                                help: "Show footer with downloader status",
                                advanced: true
                            }
                        },
                        {
                            key: 'primaryDownloader',
                            type: 'horizontalSelect',
                            hideExpression: function ($viewValue, $modelValue, scope) {
                                return !rootModel.downloading.showDownloaderStatus || rootModel.downloading.downloaders.filter((downloader) => downloader.enabled).length <= 1;
                            },
                            templateOptions: {
                                label: 'Primary downloader',
                                options: [],
                                help: "This downloader's state will be shown in the footer.",
                                tooltip: "To select a downloader you just added please save the config first.",
                                optionsFunction: function (model) {
                                    var downloaders = [];
                                    _.each(model.downloaders, function (downloader) {
                                        downloaders.push({name: downloader.name, value: downloader.name})
                                    })
                                    return downloaders;
                                },
                                optionsFunctionAfter: function (model) {
                                    if (!model.primaryDownloader) {
                                        model.primaryDownloader = model.downloaders[0].name;
                                    }
                                }
                            }
                        },
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
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Main',

                    },
                    fieldGroup: [
                        {
                            key: 'authType',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Auth type',
                                options: [
                                    {name: 'None', value: 'NONE'},
                                    {name: 'HTTP Basic auth', value: 'BASIC'},
                                    {name: 'Login form', value: 'FORM'}
                                ],
                                tooltip: '<ul>' +
                                    '<li>With auth type "None" all areas are unrestricted.</li>' +
                                    '<li>With auth type "Form" the basic page is loaded and login is done via a form.</li>' +
                                    '<li>With auth type "Basic" you login via basic HTTP authentication. With all areas restricted this is the most secure as nearly no data is loaded from the server before you auth. Logging out is not supported with basic auth.</li>' +
                                    '</ul>'
                            }
                        },
                        {
                            key: 'authHeader',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'string',
                                label: 'Auth header',
                                help: 'Name of header that provides the username in requests from secure sources.',
                                advanced: true
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
                                help: 'IP ranges from which the auth header will be accepted. Apply with return key. Use IPv4 or IPv6 ranges like "192.168.0.1-192.168.0.100", CIDRs like 192.168.0.0/24 or single IP addresses like "127.0.0.1".',
                                advanced: true
                            },
                            hideExpression: function () {
                                return rootModel.auth.authType === "NONE" || _.isNullOrEmpty(rootModel.auth.authHeader);
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
                                },
                                advanced: true
                            }
                        }

                    ]
                },

                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Restrictions',
                        tooltip: 'Select which areas/features can only be accessed by logged in users (i.e. are restricted). If you don\'t to allow anonymous users to do anything just leave everything selected.<br>You can decide for every user if he is allowed to:<br>' +
                            '<ul>\n' +
                            '<li>view the search page at all</li>\n' +
                            '<li>view the stats</li>\n' +
                            '<li>access the admin area (config and control)</li>\n' +
                            '<li>view links for downloading NZBs and see their details</li>\n' +
                            '<li>may select which indexers are used for search.</li>\n' +
                            '</ul>'
                    },
                    hideExpression: function () {
                        return rootModel.auth.authType === "NONE";
                    },
                    fieldGroup: [
                        {
                            key: 'restrictSearch',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Restrict searching',
                                help: 'Restrict access to searching.'
                            }
                        },
                        {
                            key: 'restrictStats',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Restrict stats',
                                help: 'Restrict access to stats.'
                            }
                        },
                        {
                            key: 'restrictAdmin',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Restrict admin',
                                help: 'Restrict access to admin functions.'
                            }
                        },
                        {
                            key: 'restrictDetailsDl',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Restrict NZB details & DL',
                                help: 'Restrict NZB details, comments and download links.'
                            }
                        },
                        {
                            key: 'restrictIndexerSelection',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Restrict indexer selection box',
                                help: 'Restrict visibility of indexer selection box in search. Affects only GUI.'
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
                        }
                    ]
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
                        headline: 'Users',
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
            ],
            notificationConfig: [
                {
                    type: 'help',
                    templateOptions: {
                        type: 'help',
                        lines: [
                            "NZBHydra supports sending and displaying notifications for certain events. You can enable notifications for each event by adding entries below.",
                            'NZBHydra uses Apprise to communicate with the actual notification providers. You need either a) an instance of Apprise API running or b) an Apprise runnable accessible by NZBHydra. Either are not part of NZBHydra.',
                            "NZBHydra will also show notifications on the GUI if enabled.",
                            "Only URLs in the form of the http://../notify/<key> form will work. Each notification requires a non-null value for URL to be enabled, but always uses the Main URL."
                        ]
                    }
                },
                {
                    wrapper: 'fieldset',
                    templateOptions: {
                        label: 'Main'
                    },
                    fieldGroup: [

                        {
                            key: 'appriseType',
                            type: 'horizontalSelect',
                            templateOptions: {
                                type: 'select',
                                label: 'Apprise type',
                                options: [
                                    {name: 'None', value: 'NONE'},
                                    {name: 'API', value: 'API'},
                                    {name: 'CLI', value: 'CLI'}
                                ]
                            }
                        },
                        {
                            key: 'appriseApiUrl',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'string',
                                label: 'Apprise API URL',
                                help: 'URL of <a href="https://github.com/caronc/apprise-api">Apprise API</a> to send notifications to.'
                            },
                            hideExpression: 'model.appriseType !== "API"'
                        },
                        {
                            key: 'appriseCliPath',
                            type: 'fileInput',
                            templateOptions: {
                                type: 'file',
                                label: 'Apprise runnable',
                                help: 'Full path of of <a href="https://github.com/caronc/apprise">Apprise runnable</a> to execute.'
                            },
                            hideExpression: 'model.appriseType !== "CLI"'
                        },
                        {
                            key: 'displayNotifications',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Display notifications',
                                help: 'If enabled notifications will be shown on the GUI.'
                            }
                        },
                        {
                            key: 'displayNotificationsMax',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'number',
                                label: 'Show max notifications',
                                help: 'Max number of notifications to show on the GUI. If more have piled up a notification will indicate this and link to the notification history.'
                            },
                            hideExpression: '!model.displayNotifications'
                        },
                        {
                            key: 'filterOuts',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Hide if message contains...',
                                help: 'Apply values with return key. Surround with "/" for regex (e.g. /contains[0-9]This/). Case insensitive.',

                            },
                            hideExpression: '!model.displayNotifications'
                        }
                    ]
                },

                {
                    type: 'notificationSection',
                    key: 'entries',
                    model: rootModel.notificationConfig,
                    templateOptions: {
                        btnText: 'Add new notification',
                        altLegendText: 'Notification',
                        headline: 'Notifications',
                        fields: [
                            {
                                key: 'appriseUrls',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'URLs',
                                    help: 'One or more URLs identifying where the notification should be sent to, comma-separated.'
                                }
                            },
                            {
                                key: 'titleTemplate',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Title template'
                                },
                                controller: notificationTemplateHelpController
                            },
                            {
                                key: 'bodyTemplate',
                                type: 'horizontalTextArea',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Body template',
                                    required: true
                                },
                                controller: notificationTemplateHelpController
                            },
                            {
                                key: 'messageType',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Message type',
                                    options: [
                                        {name: 'Info', value: 'INFO'},
                                        {name: 'Success', value: 'SUCCESS'},
                                        {name: 'Warning', value: 'WARNING'},
                                        {name: 'Failure', value: 'FAILURE'}
                                    ],
                                    help: "Select the message type to use."
                                }
                            },
                            {
                                key: 'bodyTemplate',
                                type: 'horizontalTestNotification'
                            }

                        ],
                        defaultModel: {
                            eventType: null,
                            appriseUrls: null,
                            titleTemplate: null,
                            bodyTemplate: null,
                            messageType: 'WARNING'
                        }
                    }
                }
            ]

        }

        function notificationTemplateHelpController($scope, NotificationService) {
            $scope.model.eventTypeReadable = NotificationService.humanize($scope.model.eventType);
            $scope.to.help = NotificationService.getTemplateHelp($scope.model.eventType);
        }
    }
}

function handleConnectionCheckFail(ModalService, data, model, whatFailed, deferred) {
    var message;
    var yesText;
    if (data.checked) {
        message = `<span class="has-error">${data.message}</span><br><br>Do you want to add it anyway?`;
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
