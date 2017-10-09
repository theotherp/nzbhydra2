// For caching HTML templates, see http://paulsalaets.com/pre-caching-angular-templates-with-gulp
angular.module('templates', []);

var nzbhydraapp = angular.module('nzbhydraApp', ['angular-loading-bar', 'cgBusy', 'ui.bootstrap', 'ipCookie', 'angular-growl', 'angular.filter', 'filters', 'ui.router', 'blockUI', 'mgcrea.ngStrap', 'angularUtils.directives.dirPagination', 'nvd3', 'formly', 'formlyBootstrap', 'frapontillo.bootstrap-switch', 'ui.select', 'ngSanitize', 'checklist-model', 'ngAria', 'ngMessages', 'ui.router.title', 'LocalStorageModule', 'angular.filter', 'ngFileUpload', 'ngCookies', 'angular.chips', 'templates']);

nzbhydraapp.config(['$compileProvider', function ($compileProvider) {
    $compileProvider.debugInfoEnabled(false);
}]);

nzbhydraapp.config(['$animateProvider', function ($animateProvider) {
    //$animateProvider.classNameFilter(/ng-animate-enabled/);
}]);

angular.module('nzbhydraApp').config(function ($stateProvider, $urlRouterProvider, $locationProvider, blockUIConfig, $urlMatcherFactoryProvider, localStorageServiceProvider, bootstrapped) {

    blockUIConfig.autoBlock = false;
    blockUIConfig.resetOnException = false;
    blockUIConfig.autoInjectBodyBlock = false;
    $urlMatcherFactoryProvider.strictMode(false);

    $urlRouterProvider.otherwise("/");

    $stateProvider
        .state('root', {
            url: '',
            abstract: true,
            resolve: {
                //loginRequired: loginRequired
            },
            views: {
                'header': {
                    templateUrl: 'static/html/states/header.html',
                    controller: 'HeaderController'
                }
            }
        })
        .state("root.config", {
            url: "/config",
            views: {},
            abstract: true
        })
        .state("root.config.main", {
            url: "/main",
            views: {
                'container@': {
                    templateUrl: "static/html/states/config.html",
                    controller: "ConfigController",
                    controllerAs: 'ctrl',
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        config: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.get();
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 0;
                        }],
                        $title: function ($stateParams) {
                            return "Config (Main)"
                        }
                    }
                }
            }
        })
        .state("root.config.auth", {
            url: "/auth",
            views: {
                'container@': {
                    templateUrl: "static/html/states/config.html",
                    controller: "ConfigController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        config: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.get();
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 1;
                        }],
                        $title: function ($stateParams) {
                            return "Config (Auth)"
                        }
                    }
                }
            }
        })
        .state("root.config.searching", {
            url: "/searching",
            views: {
                'container@': {
                    templateUrl: "static/html/states/config.html",
                    controller: "ConfigController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        config: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.get();
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 2;
                        }],
                        $title: function ($stateParams) {
                            return "Config (Searching)"
                        }
                    }
                }
            }
        })
        .state("root.config.categories", {
            url: "/categories",
            views: {
                'container@': {
                    templateUrl: "static/html/states/config.html",
                    controller: "ConfigController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        config: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.get();
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 3;
                        }],
                        $title: function ($stateParams) {
                            return "Config (Categories)"
                        }
                    }
                }
            }
        })
        .state("root.config.downloading", {
            url: "/downloading",
            views: {
                'container@': {
                    templateUrl: "static/html/states/config.html",
                    controller: "ConfigController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        config: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.get();
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 4;
                        }],
                        $title: function ($stateParams) {
                            return "Config (Downloading)"
                        }
                    }
                }
            }
        })
        .state("root.config.indexers", {
            url: "/indexers",
            views: {
                'container@': {
                    templateUrl: "static/html/states/config.html",
                    controller: "ConfigController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        config: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.get();
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 5;
                        }],
                        $title: function ($stateParams) {
                            return "Config (Indexers)"
                        }
                    }
                }
            }
        })
        .state("root.stats", {
            url: "/stats",
            abstract: true,
            views: {
                'container@': {
                    templateUrl: "static/html/states/stats.html",
                    controller: function ($scope, $state) {
                        $scope.$state = $state;
                    },
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "stats")
                        }],
                        $title: function ($stateParams) {
                            return "Stats"
                        }
                    }

                }
            }
        })
        .state("root.stats.main", {
            url: "/stats",
            views: {
                'stats@root.stats': {
                    templateUrl: "static/html/states/main-stats.html",
                    controller: "StatsController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "stats")
                        }],
                        $title: function ($stateParams) {
                            return "Stats"
                        }
                    }
                }
            }
        })
        .state("root.stats.indexers", {
            url: "/indexers",
            views: {
                'stats@root.stats': {
                    templateUrl: "static/html/states/indexer-statuses.html",
                    controller: IndexerStatusesController,
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "stats")
                        }],
                        statuses: function ($http) {
                            return $http.get("internalapi/indexerstatuses").success(function (response) {
                                return response;
                            });
                        },
                        $title: function ($stateParams) {
                            return "Stats (Indexers)"
                        }
                    }
                }
            }
        })
        .state("root.stats.searches", {
            url: "/searches",
            views: {
                'stats@root.stats': {
                    templateUrl: "static/html/states/search-history.html",
                    controller: SearchHistoryController,
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "stats")
                        }],
                        history: ['loginRequired', 'SearchHistoryService', function (loginRequired, SearchHistoryService) {
                            return SearchHistoryService.getSearchHistory();
                        }],
                        $title: function ($stateParams) {
                            return "Stats (Searches)"
                        }
                    }
                }
            }
        })
        .state("root.stats.downloads", {
            url: "/downloads",
            views: {
                'stats@root.stats': {
                    templateUrl: 'static/html/states/download-history.html',
                    controller: DownloadHistoryController,
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "stats")
                        }],
                        downloads: function (StatsService) {
                            return StatsService.getDownloadHistory();
                        },
                        $title: function ($stateParams) {
                            return "Stats (Downloads)"
                        }
                    }
                }
            }
        })
        .state("root.system", {
            url: "/system",
            views: {},
            abstract: true
        })
        .state("root.system.control", {
            url: "/control",
            views: {
                'container@': {
                    templateUrl: "static/html/states/system.html",
                    controller: "SystemController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        // askAdmin: ['loginRequired', '$http', function (loginRequired, $http) {
                        //     return $http.get("internalapi/askadmin");
                        // }],
                        activeTab: [function () {
                            return 0;
                        }],
                        $title: function ($stateParams) {
                            return "System"
                        }
                    }
                }
            }
        })
        .state("root.system.updates", {
            url: "/updates",
            views: {
                'container@': {
                    templateUrl: "static/html/states/system.html",
                    controller: "SystemController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 1;
                        }],
                        $title: function ($stateParams) {
                            return "System (Updates)"
                        }
                    }
                }
            }
        })
        .state("root.system.log", {
            url: "/log",
            views: {
                'container@': {
                    templateUrl: "static/html/states/system.html",
                    controller: "SystemController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 2;
                        }],
                        $title: function ($stateParams) {
                            return "System (Log)"
                        }
                    }
                }
            }
        })
        .state("root.system.backup", {
            url: "/backup",
            views: {
                'container@': {
                    templateUrl: "static/html/states/system.html",
                    controller: "SystemController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 3;
                        }],
                        $title: function ($stateParams) {
                            return "System (Backup)"
                        }
                    }
                }
            }
        })
        .state("root.system.bugreport", {
            url: "/bugreport",
            views: {
                'container@': {
                    templateUrl: "static/html/states/system.html",
                    controller: "SystemController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 4;
                        }],
                        $title: function ($stateParams) {
                            return "System (Bug report)"
                        }
                    }
                }
            }
        })
        .state("root.system.news", {
            url: "/news",
            views: {
                'container@': {
                    templateUrl: "static/html/states/system.html",
                    controller: "SystemController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 5;
                        }],
                        $title: function ($stateParams) {
                            return "System (News)"
                        }
                    }
                }
            }
        })
        .state("root.system.about", {
            url: "/about",
            views: {
                'container@': {
                    templateUrl: "static/html/states/system.html",
                    controller: "SystemController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "admin")
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        activeTab: [function () {
                            return 6;
                        }],
                        $title: function ($stateParams) {
                            return "System (About)"
                        }
                    }
                }
            }
        })

        .state("root.search", {
            url: "/?category&query&imdbid&tvdbid&title&season&episode&minsize&maxsize&minage&maxage&offsets&tvrageid&mode&tmdbid&indexers&tvmazeid",
            views: {
                'container@': {
                    templateUrl: "static/html/states/search.html",
                    controller: "SearchController",
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "search")
                        }],
                        safeConfig: ['loginRequired', 'ConfigService', function (loginRequired, ConfigService) {
                            return ConfigService.getSafe();
                        }],
                        $title: function ($stateParams) {
                            return "Search";
                        }
                    }
                }
            }
        })
        .state("root.search.results", {
            views: {
                'results@root.search': {
                    templateUrl: "static/html/states/search-results.html",
                    controller: "SearchResultsController",
                    controllerAs: "srController",
                    options: {
                        inherit: true
                    },
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "search")
                        }],
                        $title: function ($stateParams) {
                            var title = "Search results";
                            var details;
                            if ($stateParams.title) {
                                details = $stateParams.title;
                            } else if ($stateParams.query) {
                                details = $stateParams.query;
                            }
                            if (details) {
                                title += " (" + details + ")";
                            }
                            return title;
                        }
                    }
                }
            }
        })
        .state("root.login", {
            url: "/login",
            views: {
                'container@': {
                    templateUrl: "static/html/states/login.html",
                    controller: "LoginController",
                    resolve: {
                        loginRequired: function () {
                            return null;
                        },
                        $title: function ($stateParams) {
                            return "Login"
                        }
                    }
                }
            }
        })
    ;


    $locationProvider.html5Mode(true);


    function loginRequired($q, $timeout, $state, HydraAuthService, type) {
        var deferred = $q.defer();
        var userInfos = HydraAuthService.getUserInfos();
        var allowed = false;
        if (type === "search") {
            allowed = !userInfos.searchRestricted || userInfos.maySeeSearch;
        } else if (type === "stats") {
            allowed = !userInfos.statsRestricted || userInfos.maySeeStats;
        } else if (type === "admin") {
            allowed = !userInfos.adminRestricted || userInfos.maySeeAdmin;
        } else {
            allowed = true;
        }
        if (allowed || userInfos.authType !== "FORM") {
            deferred.resolve();
        } else {
            $timeout(function () {
                // This code runs after the authentication promise has been rejected.
                // Go to the log-in page
                $state.go("root.login");
            })
        }
        return deferred.promise;
    }


    //Because I don't know for what state the login is required / asked I have a function for each

    function loginRequiredSearch($q, $timeout, $state, HydraAuthService) {
        var deferred = $q.defer();
        var userInfos = HydraAuthService.getUserInfos();
        if (!userInfos.searchRestricted || userInfos.maySeeSearch || userInfos.authType !== "FORM") {
            deferred.resolve();
        } else {
            $timeout(function () {
                // This code runs after the authentication promise has been rejected.
                // Go to the log-in page
                $state.go("root.login");
            })
        }
        return deferred.promise;
    }

    function loginRequiredStats($q, $timeout, $state, HydraAuthService) {
        var deferred = $q.defer();

        var userInfos = HydraAuthService.getUserInfos();
        if (!userInfos.statsRestricted || userInfos.maySeeStats || userInfos.authType !== "FORM") {
            deferred.resolve();
        } else {
            $timeout(function () {
                // This code runs after the authentication promise has been rejected.
                // Go to the log-in page
                $state.go("root.login");
            })
        }
        return deferred.promise;
    }

    function loginRequiredAdmin($q, $timeout, $state, HydraAuthService) {
        var deferred = $q.defer();

        var userInfos = HydraAuthService.getUserInfos();
        if (!userInfos.statsRestricted || userInfos.maySeeAdmin || userInfos.authType != "form") {
            deferred.resolve();
        } else {
            $timeout(function () {
                // This code runs after the authentication promise has been rejected.
                // Go to the log-in page
                $state.go("root.login");
            })
        }
        return deferred.promise;
    }

    localStorageServiceProvider
        .setPrefix('nzbhydra');
    localStorageServiceProvider
        .setNotify(true, false);
});


nzbhydraapp.config(function (paginationTemplateProvider) {
    paginationTemplateProvider.setPath('static/html/dirPagination.tpl.html');
});

nzbhydraapp.config(['cfpLoadingBarProvider', function (cfpLoadingBarProvider) {
    cfpLoadingBarProvider.latencyThreshold = 100;
}]);

nzbhydraapp.config(['growlProvider', function (growlProvider) {
    growlProvider.globalTimeToLive(5000);
    growlProvider.globalPosition('bottom-right');
}]);

nzbhydraapp.directive('ngEnter', function () {
    return function (scope, element, attr) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$evalAsync(attr.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});

nzbhydraapp.filter('nzblink', function () {
    return function (resultItem) {
        var uri = new URI("internalapi/getnzb/user/" + resultItem.searchResultId);
        return uri.toString();
    }
});

nzbhydraapp.factory('focus', function ($rootScope, $timeout) {
    return function (name) {
        $timeout(function () {
            $rootScope.$broadcast('focusOn', name);
        });
    }
});

nzbhydraapp.run(function ($rootScope) {
    $rootScope.$on('$stateChangeSuccess',
        function (event, toState, toParams, fromState, fromParams) {
            try {
                $rootScope.title = toState.views[Object.keys(toState.views)[0]].resolve.$title[1](toParams);
            } catch (e) {

            }

        });
});

nzbhydraapp.filter('dereferer', function (ConfigService) {
    return function (url) {
        if (ConfigService.getSafe().dereferer) {
            return ConfigService.getSafe().dereferer.replace("$s", escape(url));
        }
        return url;
    }
});

nzbhydraapp.config(function ($provide) {
    $provide.decorator("$exceptionHandler", ['$delegate', '$injector', function ($delegate, $injector) {
        return function (exception, cause) {
            $delegate(exception, cause);
            try {

                if (angular.isDefined(exception.stack)) {
                    var stack = exception.stack.split('\n').map(function (line) {
                        return line.trim();
                    });
                    stack = stack.join("\n");
                    //$injector.get("$http").put("internalapi/logerror", {error: stack, cause: angular.isDefined(cause) ? cause.toString() : "No known cause"});
                }
            } catch (e) {
                console.error("Unable to log JS exception to server", e);
            }
        };
    }]);
});

_.mixin({
    isNullOrEmpty: function (string) {
        return (_.isUndefined(string) || _.isNull(string) || (_.isString(string) && string.length === 0))
    }
});

nzbhydraapp.factory('sessionInjector', function ($injector) {
    var sessionInjector = {
        response: function (response) {
            if (response.headers("Hydra-MaySeeAdmin") != null) {
                $injector.get("HydraAuthService").setLoggedInByBasic(response.headers("Hydra-MaySeeStats") == "True", response.headers("Hydra-MaySeeAdmin") == "True", response.headers("Hydra-Username"))
            }

            return response;
        }
    };
    return sessionInjector;
});

nzbhydraapp.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('sessionInjector');
}]);

nzbhydraapp.directive('autoFocus', function ($timeout) {
    return {
        restrict: 'AC',
        link: function (_scope, _element) {
            $timeout(function () {
                _element[0].focus();
            }, 0);
        }
    };
});


nzbhydraapp.factory('responseObserver', function responseObserver($q, $window, growl) {
    return {
        'responseError': function (errorResponse) {
            switch (errorResponse.status) {
                case 403:
                    growl.info("You are not allowed to visit that section.");
                    break;
            }
            if (angular.isDefined(errorResponse.config)) {
                errorResponse.config.alreadyHandled = true;
            }
            return $q.reject(errorResponse);
        }
    };
});

nzbhydraapp.config(function ($httpProvider) {
    $httpProvider.interceptors.push('responseObserver');
});


nzbhydraapp.factory('focus', function ($timeout, $window) {
    return function (id) {
        // timeout makes sure that it is invoked after any other event has been triggered.
        // e.g. click events that need to run before the focus or
        // inputs elements that are in a disabled state but are enabled when those events
        // are triggered.
        $timeout(function () {
            var element = $window.document.getElementById(id);
            if (element)
                element.focus();
        });
    };
});

nzbhydraapp.directive('eventFocus', function (focus) {
    return function (scope, elem, attr) {
        elem.on(attr.eventFocus, function () {
            focus(attr.eventFocusId);
        });

        // Removes bound events in the element itself
        // when the scope is destroyed
        scope.$on('$destroy', function () {
            elem.off(attr.eventFocus);
        });
    };
});