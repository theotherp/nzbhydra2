// For caching HTML templates, see http://paulsalaets.com/pre-caching-angular-templates-with-gulp
angular.module('templates', []);

var nzbhydraapp = angular.module('nzbhydraApp', ['angular-loading-bar', 'cgBusy', 'ui.bootstrap', 'ipCookie', 'angular-growl', 'angular.filter', 'filters', 'ui.router', 'blockUI', 'mgcrea.ngStrap', 'angularUtils.directives.dirPagination', 'nvd3', 'formly', 'formlyBootstrap', 'frapontillo.bootstrap-switch', 'ui.select', 'ngSanitize', 'checklist-model', 'ngAria', 'ngMessages', 'ui.router.title', 'LocalStorageModule', 'angular.filter', 'ngFileUpload', 'ngCookies', 'angular.chips', 'templates']);

nzbhydraapp.config(['$compileProvider', function ($compileProvider) {
    $compileProvider.debugInfoEnabled(false);
}]);

nzbhydraapp.config(['$animateProvider', function ($animateProvider) {
    //$animateProvider.classNameFilter(/ng-animate-enabled/);
}]);

angular.module('nzbhydraApp').config(["$stateProvider", "$urlRouterProvider", "$locationProvider", "blockUIConfig", "$urlMatcherFactoryProvider", "localStorageServiceProvider", "bootstrapped", function ($stateProvider, $urlRouterProvider, $locationProvider, blockUIConfig, $urlMatcherFactoryProvider, localStorageServiceProvider, bootstrapped) {

    blockUIConfig.autoBlock = false;
    blockUIConfig.resetOnException = false;
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
                },
                'footer': {
                    templateUrl: 'static/html/states/footer.html'
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Config (Main)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Config (Auth)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Config (Searching)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Config (Categories)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Config (Downloading)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Config (Indexers)"
                        }]
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
                    controller: ["$scope", "$state", function ($scope, $state) {
                        $scope.$state = $state;
                    }],
                    resolve: {
                        loginRequired: ['$q', '$timeout', '$state', 'HydraAuthService', function ($q, $timeout, $state, HydraAuthService) {
                            return loginRequired($q, $timeout, $state, HydraAuthService, "stats")
                        }],
                        $title: ["$stateParams", function ($stateParams) {
                            return "Stats"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Stats"
                        }]
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
                        statuses: ["$http", function ($http) {
                            return $http.get("internalapi/indexerstatuses").success(function (response) {
                                return response;
                            });
                        }],
                        $title: ["$stateParams", function ($stateParams) {
                            return "Stats (Indexers)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Stats (Searches)"
                        }]
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
                        downloads: ["StatsService", function (StatsService) {
                            return StatsService.getDownloadHistory();
                        }],
                        $title: ["$stateParams", function ($stateParams) {
                            return "Stats (Downloads)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "System"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "System (Updates)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "System (Log)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "System (Backup)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "System (Bug report)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "System (News)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "System (About)"
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Search";
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
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
                        }]
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
                        $title: ["$stateParams", function ($stateParams) {
                            return "Login"
                        }]
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
}]);


nzbhydraapp.config(["paginationTemplateProvider", function (paginationTemplateProvider) {
    paginationTemplateProvider.setPath('static/html/dirPagination.tpl.html');
}]);

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

nzbhydraapp.factory('focus', ["$rootScope", "$timeout", function ($rootScope, $timeout) {
    return function (name) {
        $timeout(function () {
            $rootScope.$broadcast('focusOn', name);
        });
    }
}]);

nzbhydraapp.run(["$rootScope", function ($rootScope) {
    $rootScope.$on('$stateChangeSuccess',
        function (event, toState, toParams, fromState, fromParams) {
            try {
                $rootScope.title = toState.views[Object.keys(toState.views)[0]].resolve.$title[1](toParams);
            } catch (e) {

            }

        });
}]);

nzbhydraapp.filter('dereferer', ["ConfigService", function (ConfigService) {
    return function (url) {
        if (ConfigService.getSafe().dereferer) {
            return ConfigService.getSafe().dereferer.replace("$s", escape(url));
        }
        return url;
    }
}]);

nzbhydraapp.config(["$provide", function ($provide) {
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
}]);

_.mixin({
    isNullOrEmpty: function (string) {
        return (_.isUndefined(string) || _.isNull(string) || (_.isString(string) && string.length === 0))
    }
});

nzbhydraapp.factory('sessionInjector', ["$injector", function ($injector) {
    var sessionInjector = {
        response: function (response) {
            if (response.headers("Hydra-MaySeeAdmin") != null) {
                $injector.get("HydraAuthService").setLoggedInByBasic(response.headers("Hydra-MaySeeStats") == "True", response.headers("Hydra-MaySeeAdmin") == "True", response.headers("Hydra-Username"))
            }

            return response;
        }
    };
    return sessionInjector;
}]);

nzbhydraapp.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('sessionInjector');
}]);

nzbhydraapp.directive('autoFocus', ["$timeout", function ($timeout) {
    return {
        restrict: 'AC',
        link: function (_scope, _element) {
            $timeout(function () {
                _element[0].focus();
            }, 0);
        }
    };
}]);


nzbhydraapp.factory('responseObserver', ["$q", "$window", "growl", function responseObserver($q, $window, growl) {
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
}]);

nzbhydraapp.config(["$httpProvider", function ($httpProvider) {
    $httpProvider.interceptors.push('responseObserver');
}]);


nzbhydraapp.factory('focus', ["$timeout", "$window", function ($timeout, $window) {
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
}]);

nzbhydraapp.directive('eventFocus', ["focus", function (focus) {
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
}]);
angular
    .module('nzbhydraApp')
    .directive('titleRow', titleRow);

function titleRow() {
    return {
        templateUrl: 'static/html/directives/title-row.html',
        scope: {
            duplicates: "<",
            selected: "<",
            rowIndex: "@"
        },
        controller: ['$scope', '$element', '$attrs', titleRowController]
    };

    function titleRowController($scope) {
        $scope.expanded = false;

        $scope.duplicatesToShow = duplicatesToShow;

        function duplicatesToShow() {
            if ($scope.expanded && $scope.duplicates.length > 1) {

                return $scope.duplicates;
            } else {

                return [$scope.duplicates[0]];
            }
        }

    }
}
angular
    .module('nzbhydraApp')
    .directive('titleGroup', titleGroup);

function titleGroup() {
    return {
        templateUrl: 'static/html/directives/title-group.html',
        scope: {
            titles: "<",
            selected: "=",
            rowIndex: "<",
            doShowDuplicates: "<",
            internalRowIndex: "@"
        },
        controller: ['$scope', '$element', '$attrs', controller],
        multiElement: true
    };

    function controller($scope, $element, $attrs) {
        $scope.expanded = false;
        $scope.titleGroupExpanded = false;

        $scope.$on("toggleTitleExpansion", function (event, args) {
            $scope.titleGroupExpanded = args;
            event.stopPropagation();
        });


        $scope.titlesToShow = titlesToShow;

        function titlesToShow() {
            return $scope.titles.slice(1);
        }

    }
}
angular
    .module('nzbhydraApp')
    .directive('tabOrChart', tabOrChart);

function tabOrChart() {
    return {
        templateUrl: 'static/html/directives/tab-or-chart.html',
        transclude: {
            "chartSlot": "chart",
            "tableSlot": "table"
        },
        restrict: 'E',
        replace: true,
        scope: {
            display: "@"
        }

    };

}

angular
    .module('nzbhydraApp')
    .directive('sendTorrentToBlackhole', sendTorrentToBlackhole);

function sendTorrentToBlackhole() {
    controller.$inject = ["$scope", "$http", "growl", "ConfigService"];
    return {
        templateUrl: 'static/html/directives/send-torrent-to-blackhole.html',
        scope: {
            searchResultId: "<"
        },
        controller: controller
    };

    function controller($scope, $http, growl, ConfigService) {
        $scope.useBlackhole = ConfigService.getSafe().downloading.saveTorrentsTo !== null && ConfigService.getSafe().downloading.saveTorrentsTo !== "";
        $scope.cssClass = "glyphicon-save-file";
        $scope.add = function () {
            $scope.cssClass = "nzb-spinning";
            $http.get("internalapi/saveTorrent/" + $scope.searchResultId).then(function (response) {
                if (response.data.successful) {
                    $scope.cssClass = "glyphicon-ok";
                } else {
                    $scope.cssClass = "glyphicon-remove";
                    growl.error(response.data.message);
                }
            });

        };


    }
}

angular
    .module('nzbhydraApp')
    .directive('searchResult', searchResult);

function searchResult() {
    return {
        templateUrl: 'static/html/directives/search-result.html',
        require: '^titleGroup',
        scope: {
            titleGroup: "<",
            showDuplicates: "<",
            selected: "<",
            rowIndex: "<"
        },
        controller: ['$scope', '$element', '$attrs', controller],
        multiElement: true
    };

    function controller($scope, $element, $attrs) {
        $scope.titleGroupExpanded = false;
        $scope.hashGroupExpanded = {};

        $scope.toggleTitleGroup = function () {
            $scope.titleGroupExpanded = !$scope.titleGroupExpanded;
            if (!$scope.titleGroupExpanded) {
                $scope.hashGroupExpanded[$scope.titleGroup[0][0].hash] = false; //Also collapse the first title's duplicates
            }
        };

        $scope.groupingRowDuplicatesToShow = groupingRowDuplicatesToShow;

        function groupingRowDuplicatesToShow() {
            if ($scope.showDuplicates && $scope.titleGroup[0].length > 1 && $scope.hashGroupExpanded[$scope.titleGroup[0][0].hash]) {
                return $scope.titleGroup[0].slice(1);
            } else {
                return [];
            }
        }

        //<div ng-repeat="hashGroup in titleGroup" ng-if="titleGroup.length > 0 && titleGroupExpanded"  class="search-results-row">
        $scope.otherTitleRowsToShow = otherTitleRowsToShow;

        function otherTitleRowsToShow() {
            if ($scope.titleGroup.length > 1 && $scope.titleGroupExpanded) {
                return $scope.titleGroup.slice(1);
            } else {
                return [];
            }
        }

        $scope.hashGroupDuplicatesToShow = hashGroupDuplicatesToShow;

        function hashGroupDuplicatesToShow(hashGroup) {
            if ($scope.showDuplicates && $scope.hashGroupExpanded[hashGroup[0].hash]) {
                return hashGroup.slice(1);
            } else {
                return [];
            }
        }
    }
}
angular
    .module('nzbhydraApp')
    .directive('otherColumns', otherColumns);

function otherColumns($http, $templateCache, $compile, $window) {
    controller.$inject = ["$scope", "$http", "$uibModal", "growl", "HydraAuthService"];
    return {
        scope: {
            result: "<"
        },
        multiElement: true,

        link: function (scope, element, attrs) {
            $http.get('static/html/directives/search-result-non-title-columns.html', {cache: $templateCache}).success(function (templateContent) {
                element.replaceWith($compile(templateContent)(scope));
            });

        },
        // templateUrl: 'static/html/directives/search-result-non-title-columns.html',
        controller: controller
    };

    function controller($scope, $http, $uibModal, growl, HydraAuthService) {

        $scope.showDetailsDl = HydraAuthService.getUserInfos().maySeeDetailsDl;

        $scope.showNfo = showNfo;

        function showNfo(resultItem) {
            if (resultItem.has_nfo === 0) {
                return;
            }
            var uri = new URI("internalapi/nfo/" + resultItem.searchResultId);
            return $http.get(uri.toString()).then(function (response) {
                if (response.data.successful) {
                    if (response.data.hasNfo) {
                        $scope.openModal("lg", response.data.content)
                    } else {
                        growl.info("No NFO available");
                    }
                } else {
                    grow.error(response.data.content);
                }
            });
        }

        $scope.openModal = openModal;

        function openModal(size, nfo) {
            var modalInstance = $uibModal.open({
                template: '<pre class="nfo"><span ng-bind-html="nfo"></span></pre>',
                controller: NfoModalInstanceCtrl,
                size: size,
                resolve: {
                    nfo: function () {
                        return nfo;
                    }
                }
            });

            modalInstance.result.then();
        }

        $scope.downloadNzb = downloadNzb;

        function downloadNzb(resultItem) {
            //href = "{{ result.link }}"
            $window.location.href = resultItem.link;
        }

        $scope.getNfoTooltip = function () {
            if ($scope.result.hasNfo === "YES") {
                return "Show NFO"
            } else if ($scope.result.hasNfo === "MAYBE") {
                return "Try to load NFO (may not be available)";
            } else {
                return "No NFO available";
            }
        };
    }
}
otherColumns.$inject = ["$http", "$templateCache", "$compile", "$window"];

angular
    .module('nzbhydraApp')
    .controller('NfoModalInstanceCtrl', NfoModalInstanceCtrl);

function NfoModalInstanceCtrl($scope, $uibModalInstance, nfo) {

    $scope.nfo = nfo;

    $scope.ok = function () {
        $uibModalInstance.close($scope.selected.item);
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };
}
NfoModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "nfo"];
//Can be used in an ng-repeat directive to call a function when the last element was rendered
//We use it to mark the end of sorting / filtering so we can stop blocking the UI

angular
    .module('nzbhydraApp')
    .directive('onFinishRender', onFinishRender);

function onFinishRender($timeout) {
    function linkFunction(scope, element, attr) {

        if (scope.$last === true) {
            $timeout(function () {
                scope.$evalAsync(attr.onFinishRender);
            });
        }
    }

    return {
        link: linkFunction
    }
}
onFinishRender.$inject = ["$timeout"];
angular
    .module('nzbhydraApp').directive("keepFocus", ['$timeout', function ($timeout) {
    /*
     Intended use:
     <input keep-focus ng-model='someModel.value'></input>
     */
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function ($scope, $element, attrs, ngModel) {

            ngModel.$parsers.unshift(function (value) {
                $timeout(function () {
                    $element[0].focus();
                });
                return value;
            });

        }
    };
}])
angular
    .module('nzbhydraApp')
    .directive('indexerInput', indexerInput);

function indexerInput() {
    controller.$inject = ["$scope"];
    return {
        templateUrl: 'static/html/directives/indexer-input.html',
        scope: {
            indexer: "=",
            model: "=",
            onClick: "="
        },
        replace: true,
        controller: controller
    };

    function controller($scope) {
        $scope.isFocused = false;

        $scope.onFocus = function () {
            $scope.isFocused = true;
        };

        $scope.onBlur = function () {
            $scope.isFocused = false;
        };

    }
}


angular
    .module('nzbhydraApp')
    .directive('hydraupdates', hydraupdates);

function hydraupdates() {
    controller.$inject = ["$scope", "UpdateService"];
    return {
        templateUrl: 'static/html/directives/updates.html',
        controller: controller
    };

    function controller($scope, UpdateService) {

        $scope.loadingPromise = UpdateService.getInfos().then(function (data) {
            $scope.currentVersion = data.data.currentVersion;
            $scope.repVersion = data.data.latestVersion;
            $scope.updateAvailable = data.data.updateAvailable;
            $scope.latestVersionIgnored = data.data.latestVersionIgnored;
            $scope.changelog = data.data.changelog;
            console.log($scope);
        });

        UpdateService.getVersionHistory().then(function (data) {
            $scope.versionHistory = data.data;
        });

        $scope.update = function () {
            UpdateService.update();
        };

        $scope.showChangelog = function () {
            UpdateService.showChanges($scope.changelog);
        };

        $scope.forceUpdate = function () {
            UpdateService.update()
        };
    }
}


angular
    .module('nzbhydraApp')
    .directive('hydraNews', hydraNews);

function hydraNews() {
    controller.$inject = ["$scope", "$http"];
    return {
        templateUrl: "static/html/directives/news.html",
        controller: controller
    };

    function controller($scope, $http) {

        return $http.get("internalapi/news").success(function (data) {
            $scope.news = data;
        });


    }
}


angular
    .module('nzbhydraApp')
    .directive('hydralog', hydralog);

function hydralog() {
    controller.$inject = ["$scope", "$http", "$interval", "$uibModal", "$sce", "localStorageService", "growl"];
    return {
        templateUrl: "static/html/directives/log.html",
        controller: controller
    };

    function controller($scope, $http, $interval, $uibModal, $sce, localStorageService, growl) {
        $scope.tailInterval = null;
        $scope.doUpdateLog = localStorageService.get("doUpdateLog") !== null ? localStorageService.get("doUpdateLog") : false;
        $scope.doTailLog = localStorageService.get("doTailLog") !== null ? localStorageService.get("doTailLog") : false;

        $scope.active = 0;
        $scope.currentJsonIndex = 0;
        $scope.hasMoreJsonLines = true;

        function getLog(index) {
            if ($scope.active === 0) {
                return $http.get("internalapi/debuginfos/jsonlogs", {params: {offset: index, limit: 500}}).success(function (data) {
                    $scope.jsonLogLines = angular.fromJson(data.lines);
                    $scope.hasMoreJsonLines = data.hasMore;
                });
            } else if ($scope.active === 1) {
                return $http.get("internalapi/debuginfos/logfilecontent").success(function (data) {
                    $scope.log = $sce.trustAsHtml(data);
                }, function(data) {
                    growl.error(data)
                });
            } else if ($scope.active === 2) {
                return $http.get("internalapi/debuginfos/logfilenames").success(function (data) {
                    $scope.logfilenames = data;
                });
            }
        }

        $scope.logPromise = getLog();

        $scope.select = function (index) {
            $scope.active = index;
            $scope.update();
        };

        $scope.scrollToBottom = function () {
            document.getElementById("logfile").scrollTop = 10000000;
            document.getElementById("logfile").scrollTop = 100001000;
        };

        $scope.update = function () {
            getLog($scope.currentJsonIndex);
            if ($scope.active === 1) {
                $scope.scrollToBottom();
            }
        };

        $scope.getOlderFormatted = function () {
            getLog($scope.currentJsonIndex + 500).then(function () {
                $scope.currentJsonIndex += 500;
            });

        };

        $scope.getNewerFormatted = function () {
            var index = Math.max($scope.currentJsonIndex - 500, 0);
            getLog(index);
            $scope.currentJsonIndex = index;
        };

        function startUpdateLogInterval() {
            $scope.tailInterval = $interval(function () {
                if ($scope.active === 1) {
                    $scope.update();
                    if ($scope.doTailLog && $scope.active === 1) {
                        $scope.scrollToBottom();
                    }
                }
            }, 5000);
        }

        $scope.toggleUpdate = function (doUpdateLog) {
            $scope.doUpdateLog = doUpdateLog;
            if ($scope.doUpdateLog) {
                startUpdateLogInterval();
            } else if ($scope.tailInterval !== null) {
                console.log("Cancelling");
                $interval.cancel($scope.tailInterval);
                localStorageService.set("doTailLog", false);
                $scope.doTailLog = false;
            }
            localStorageService.set("doUpdateLog", $scope.doUpdateLog);
        };

        $scope.toggleTailLog = function () {
            localStorageService.set("doTailLog", $scope.doTailLog);
        };

        $scope.openModal = function openModal(entry) {
            var modalInstance = $uibModal.open({
                templateUrl: 'log-entry.html',
                controller: LogModalInstanceCtrl,
                size: "xl",
                resolve: {
                    entry: function () {
                        return entry;
                    }
                }
            });

            modalInstance.result.then();
        };

        if ($scope.doUpdateLog) {
            startUpdateLogInterval();
        }

    }
}

angular
    .module('nzbhydraApp')
    .controller('LogModalInstanceCtrl', LogModalInstanceCtrl);

function LogModalInstanceCtrl($scope, $uibModalInstance, entry) {

    $scope.entry = entry;

    $scope.ok = function () {
        $uibModalInstance.dismiss();
    };
}
LogModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "entry"];

angular
    .module('nzbhydraApp')
    .filter('formatTimestamp', formatTimestamp);

function formatTimestamp() {
    return function (date) {
        return moment(date).local().format("YYYY-MM-DD HH:mm");

    }
}

angular
    .module('nzbhydraApp')
    .filter('formatClassname', formatClassname);

function formatClassname() {
    return function (fqn) {
        return fqn.substr(fqn.lastIndexOf(".") + 1);

    }
}
angular
    .module('nzbhydraApp').directive('focusOn', focusOn);

function focusOn() {
    return directive;

    function directive(scope, elem, attr) {
        scope.$on('focusOn', function (e, name) {
            if (name === attr.focusOn) {
                elem[0].focus();
            }
        });
    }
}

angular
    .module('nzbhydraApp')
    .directive('duplicateGroup', duplicateGroup);

function duplicateGroup() {
    titleRowController.$inject = ["$scope", "localStorageService"];
    return {
        templateUrl: 'static/html/directives/duplicate-group.html',
        scope: {
            duplicates: "<",
            selected: "=",
            isFirstRow: "<",
            rowIndex: "<",
            displayTitleToggle: "<",
            internalRowIndex: "@"
        },
        controller: titleRowController
    };

    function titleRowController($scope, localStorageService) {
        $scope.internalRowIndex = Number($scope.internalRowIndex);
        $scope.rowIndex = Number($scope.rowIndex);
        $scope.titlesExpanded = false;
        $scope.duplicatesExpanded = false;
        $scope.foo = {
            duplicatesDisplayed: localStorageService.get("duplicatesDisplayed") != null ? localStorageService.get("duplicatesDisplayed") : false
        };
        $scope.duplicatesToShow = duplicatesToShow;

        function duplicatesToShow() {
            return $scope.duplicates.slice(1);
        }

        $scope.toggleTitleExpansion = function () {
            $scope.titlesExpanded = !$scope.titlesExpanded;
            $scope.$emit("toggleTitleExpansion", $scope.titlesExpanded);
        };

        $scope.toggleDuplicateExpansion = function () {
            $scope.duplicatesExpanded = !$scope.duplicatesExpanded;
        };

        $scope.$on("invertSelection", function () {
            for (var i = 0; i < $scope.duplicates.length; i++) {
                if ($scope.duplicatesExpanded) {
                    invertSelection($scope.selected, $scope.duplicates[i]);
                } else {
                    if (i > 0) {
                        //Always remove duplicates that aren't displayed
                        invertSelection($scope.selected, $scope.duplicates[i], true);
                    } else {
                        invertSelection($scope.selected, $scope.duplicates[i]);
                    }
                }
            }
        });
        $scope.$on("deselectAll", function () {
            $scope.selected = [];
        });
        $scope.$on("selectAll", function () {
            $scope.selected = $scope.duplicates;
        });

        $scope.$on("duplicatesDisplayed", function (event, args) {
            $scope.foo.duplicatesDisplayed = args;
        });

        $scope.clickCheckbox = function (event) {
            var globalCheckboxIndex = $scope.rowIndex * 1000 + $scope.internalRowIndex * 100 + Number(event.currentTarget.dataset.checkboxIndex);

            $scope.$emit("checkboxClicked", event, globalCheckboxIndex, event.currentTarget.checked);
        };

        function isBetween(num, betweena, betweenb) {
            return (betweena <= num && num <= betweenb) || (betweena >= num && num >= betweenb);
        }

        $scope.$on("shiftClick", function (event, startIndex, endIndex, newValue) {
            var globalDuplicateGroupIndex = $scope.rowIndex * 1000 + $scope.internalRowIndex * 100;
            if (isBetween(globalDuplicateGroupIndex, startIndex, endIndex)) {

                for (var i = 0; i < $scope.duplicates.length; i++) {
                    if (isBetween(globalDuplicateGroupIndex + i, startIndex, endIndex)) {
                        if (i === 0 || $scope.duplicatesExpanded) {
                            console.log("Indirectly clicked row with global index " + (globalDuplicateGroupIndex + i) + " setting new checkbox value to " + newValue);
                            var index = _.indexOf($scope.selected, $scope.duplicates[i]);
                            if (index === -1 && newValue) {
                                $scope.selected.push($scope.duplicates[i]);
                            } else if (index > -1 && !newValue) {
                                $scope.selected.splice(index, 1);

                            }
                        }
                    }
                }
            }
        });

        function invertSelection(a, b, dontPush) {
            var index = _.indexOf(a, b);
            if (index > -1) {
                a.splice(index, 1);
            } else {
                if (!dontPush)
                    a.push(b);
            }
        }
    }


}
angular
    .module('nzbhydraApp')
    .directive('downloadNzbzipButton', downloadNzbzipButton);

function downloadNzbzipButton() {
    controller.$inject = ["$scope", "growl", "FileDownloadService"];
    return {
        templateUrl: 'static/html/directives/download-nzbzip-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<",
            searchTitle: "<"
        },
        controller: controller
    };

    function controller($scope, growl, FileDownloadService) {

        $scope.download = function () {
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length === 0) {
                growl.info("You should select at least one result...");
            } else {
                var values = _.map($scope.searchResults, function (value) {
                    return value.searchResultId;
                });
                var link = "internalapi/nzbzip";

                var searchTitle;
                if (angular.isDefined($scope.searchTitle)) {
                    searchTitle = " for " + $scope.searchTitle.replace("[^a-zA-Z0-9.-]", "_");
                } else {
                    searchTitle = "";
                }
                var filename = "NZBHydra NZBs" + searchTitle + ".zip";
                FileDownloadService.downloadFile(link, filename, "POST", values);
            }
        }
    }
}


angular
    .module('nzbhydraApp')
    .directive('downloadNzbsButton', downloadNzbsButton);

function downloadNzbsButton() {
    controller.$inject = ["$scope", "NzbDownloadService", "growl"];
    return {
        templateUrl: 'static/html/directives/download-nzbs-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService, growl) {

        $scope.downloaders = NzbDownloadService.getEnabledDownloaders();

        $scope.download = function (downloader) {
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length === 0) {
                growl.info("You should select at least one result...");
            } else {

                var values = _.map(_.filter($scope.searchResults, function (value) {
                    if (value.downloadType === "NZB") {
                        return true;
                    } else {
                        console.log("Not sending result with download type " +value.downloadType + " to downloader");
                        return false;
                    }
                }), function (value) {
                    return value.searchResultId;
                });

                NzbDownloadService.download(downloader, values).then(function (response) {
                    if (response.data.successful) {
                        growl.info("Successfully added " + response.data.added + " of " + response.data.of + " NZBs");
                    } else {
                        growl.error("Error while adding NZBs");
                    }
                }, function () {
                    growl.error("Error while adding NZBs");
                });
            }
        }


    }
}


angular
    .module('nzbhydraApp').directive("columnFilterWrapper", columnFilterWrapper);

function columnFilterWrapper() {
    controller.$inject = ["$scope", "$document"];
    return {
        restrict: "E",
        templateUrl: 'static/html/dataTable/columnFilterOuter.html',
        transclude: true,
        controllerAs: 'columnFilterWrapperCtrl',
        scope: true,
        bindToController: true,
        controller: controller,
        link: function (scope, element, attr) {
            scope.element = element;

        }
    };

    function controller($scope, $document) {
        var vm = this;

        vm.open = false;
        vm.isActive = false;

        vm.toggle = function () {
            vm.open = !vm.open;
            if (vm.open) {
                $scope.$broadcast("opened");
            }
        };

        $scope.$on("filter", function (event, column, filterModel, isActive) {
            vm.open = false;
            vm.isActive = isActive;
        });


    }

}


angular
    .module('nzbhydraApp').directive("freetextFilter", freetextFilter);

function freetextFilter() {
    controller.$inject = ["$scope", "focus"];
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterFreetext.html\'"/>',
        require: "^columnFilterWrapper",
        controllerAs: 'innerController',
        scope: {
            column: "@"
        },
        controller: controller
    };

    function controller($scope, focus) {
        $scope.data = {};

        $scope.$on("opened", function () {
            focus("freetext-filter-input");
        });

        $scope.onKeypress = function (keyEvent) {
            if (keyEvent.which === 13) {
                $scope.$emit("filter", $scope.column, {filterValue: $scope.data.filter, filterType: "freetext"}, angular.isDefined($scope.data.filter) && $scope.data.filter.length > 0);
            }
        }
    }
}

angular
    .module('nzbhydraApp').directive("checkboxesFilter", checkboxesFilter);

function checkboxesFilter() {
    controller.$inject = ["$scope"];
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterCheckboxes.html\'"/>',
        controllerAs: 'checkboxesFilterController',
        scope: {
            column: "@",
            entries: "<",
            preselect: "<",
            showInvert: "<",
            isBoolean: "<"
        },
        controller: controller
    };

    function controller($scope) {
        $scope.selected = {
            entries: []
        };

        if ($scope.preselect) {
            $scope.selected.entries = $scope.entries.slice();
        }

        $scope.invert = function () {
            $scope.selected.entries = _.difference($scope.entries, $scope.selected.entries);
        };

        $scope.apply = function () {

            var isActive = $scope.selected.entries.length < $scope.entries.length;
            $scope.$emit("filter", $scope.column, {filterValue: _.pluck($scope.selected.entries, "id"), filterType: "checkboxes", isBoolean: $scope.isBoolean}, isActive)
        }
    }
}

angular
    .module('nzbhydraApp').directive("booleanFilter", booleanFilter);

function booleanFilter() {
    controller.$inject = ["$scope"];
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterBoolean.html\'"/>',
        controllerAs: 'booleanFilterController',
        scope: {
            column: "@",
            options: "<",
            preselect: "@"
        },
        controller: controller
    };


    function controller($scope) {
        $scope.selected = {value: $scope.options[$scope.preselect].value};

        $scope.apply = function () {

            $scope.$emit("filter", $scope.column, {filterValue: $scope.selected.value, filterType: "boolean"}, $scope.selected.value != $scope.options[0].value)
        }
    }
}

angular
    .module('nzbhydraApp').directive("timeFilter", timeFilter);

function timeFilter() {
    controller.$inject = ["$scope"];
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterTime.html\'"/>',
        scope: {
            column: "@",
            selected: "<"
        },
        controller: controller
    };

    function controller($scope) {

        $scope.dateOptions = {
            dateDisabled: false,
            formatYear: 'yy',
            startingDay: 1
        };

        $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
        $scope.format = $scope.formats[0];
        $scope.altInputFormats = ['M!/d!/yyyy'];

        $scope.openAfter = function () {
            $scope.after.opened = true;
        };

        $scope.openBefore = function () {
            $scope.before.opened = true;
        };

        $scope.after = {
            opened: false
        };

        $scope.before = {
            opened: false
        };

        $scope.apply = function () {
            var isActive = $scope.selected.beforeDate || $scope.selected.afterDate;
            $scope.$emit("filter", $scope.column, {filterValue: {after: $scope.selected.afterDate, before: $scope.selected.beforeDate}, filterType: "time"}, isActive)
        }
    }
}

angular
    .module('nzbhydraApp').directive("numberRangeFilter", numberRangeFilter);

function numberRangeFilter() {
    controller.$inject = ["$scope"];
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterNumberRange.html\'"/>',
        scope: {
            column: "@",
            min: "<",
            max: "<",
            addon: "@"
        },
        controller: controller
    };

    function controller($scope) {
        $scope.filterValue = {min: undefined, max: undefined};

        function apply() {
            var isActive = $scope.filterValue.min || $scope.filterValue.max;
            $scope.$emit("filter", $scope.column, {filterValue: $scope.filterValue, filterType: "numberRange"}, isActive)
        }

        $scope.apply = function () {
            apply();
        };

        $scope.onKeypress = function (keyEvent) {
            if (keyEvent.which === 13) {
                apply();
            }
        }
    }
}


angular
    .module('nzbhydraApp').directive("columnSortable", columnSortable);

function columnSortable() {
    controller.$inject = ["$scope"];
    return {
        restrict: "E",
        templateUrl: "static/html/dataTable/columnSortable.html",
        transclude: true,
        scope: {
            sortMode: "<", //0: no sorting, 1: asc, 2: desc
            column: "@",
            reversed: "<",
            startMode: "<"
        },
        controller: controller
    };

    function controller($scope) {


        if (angular.isUndefined($scope.sortMode)) {
            $scope.sortMode = 0;
        }

        if (angular.isUndefined($scope.startMode)) {
            $scope.startMode = 1;
        }

        $scope.sortModel = {
            sortMode: $scope.sortMode,
            column: $scope.column,
            reversed: $scope.reversed,
            startMode: $scope.startMode,
            active: false
        };


        $scope.$on("newSortColumn", function (event, column, sortMode, reversed) {
            $scope.sortModel.active = column === $scope.sortModel.column;
            if (column !== $scope.sortModel.column) {
                $scope.sortModel.sortMode = 0;
            } else {
                $scope.sortModel.sortMode = sortMode;
                // $scope.sortModel.reversed = reversed;
            }
        });

        $scope.sort = function () {
            //0 -> 1 -> 2
            //0 -> 2 -> 1
            if ($scope.sortModel.sortMode === 0 || angular.isUndefined($scope.sortModel.sortMode)) {
                $scope.sortModel.sortMode = $scope.sortModel.startMode;
            } else if ($scope.sortModel.sortMode === 1) {
                if ($scope.sortModel.startMode === 1) {
                    $scope.sortModel.sortMode = 2;
                } else {
                    $scope.sortModel.sortMode = 0;
                }
            } else if ($scope.sortModel.sortMode === 2) {
                if ($scope.sortModel.startMode === 2) {
                    $scope.sortModel.sortMode = 1;
                } else if ($scope.sortModel.active) {
                    //Prevent active filters to going back to 0 and then being set to 2
                    $scope.sortModel.sortMode = 1;
                } else {
                    $scope.sortModel.sortMode = 0;
                }
            }

            $scope.$emit("sort", $scope.sortModel.column, $scope.sortModel.sortMode, $scope.sortModel.reversed)
        };

    }
}
angular
    .module('nzbhydraApp')
    .directive('connectionTest', connectionTest);

function connectionTest() {
    controller.$inject = ["$scope"];
    return {
        templateUrl: 'static/html/directives/connection-test.html',
        require: ['^type', '^data'],
        scope: {
            type: "=",
            id: "=",
            data: "=",
            downloader: "="
        },
        controller: controller
    };

    function controller($scope) {
        $scope.message = "";


        var testButton = "#button-test-connection";
        var testMessage = "#message-test-connection";

        function showSuccess() {
            angular.element(testButton).removeClass("btn-default");
            angular.element(testButton).removeClass("btn-danger");
            angular.element(testButton).addClass("btn-success");
        }

        function showError() {
            angular.element(testButton).removeClass("btn-default");
            angular.element(testButton).removeClass("btn-success");
            angular.element(testButton).addClass("btn-danger");
        }

        $scope.testConnection = function () {
            angular.element(testButton).addClass("glyphicon-refresh-animate");
            var myInjector = angular.injector(["ng"]);
            var $http = myInjector.get("$http");
            var url;
            var params;
            if ($scope.type === "downloader") {
                url = "internalapi/test_downloader";
                params = {name: $scope.downloader, username: $scope.data.username, password: $scope.data.password};
                if ($scope.downloader === "SABNZBD") {
                    params.apiKey = $scope.data.apiKey;
                    params.url = $scope.data.url;
                } else {
                    params.host = $scope.data.host;
                    params.port = $scope.data.port;
                    params.ssl = $scope.data.ssl;
                }
            } else if ($scope.data.type === "newznab") {
                url = "internalapi/test_newznab";
                params = {host: $scope.data.host, apiKey: $scope.data.apiKey};
                if (angular.isDefined($scope.data.username)) {
                    params["username"] = $scope.data.username;
                    params["password"] = $scope.data.password;
                }
            }
            $http.get(url, {params: params}).success(function (result) {
                //Using ng-class and a scope variable doesn't work for some reason, is only updated at second click 
                if (result.successful) {
                    angular.element(testMessage).text("");
                    showSuccess();
                } else {
                    angular.element(testMessage).text(result.message);
                    showError();
                }

            }).error(function () {
                angular.element(testMessage).text(result.message);
                showError();
            }).finally(function () {
                angular.element(testButton).removeClass("glyphicon-refresh-animate");
            })
        }

    }
}


angular
    .module('nzbhydraApp')
    .directive('cfgFormEntry', cfgFormEntry);

function cfgFormEntry() {
    return {
        templateUrl: 'static/html/directives/cfg-form-entry.html',
        require: ["^title", "^cfg"],
        scope: {
            title: "@",
            cfg: "=",
            help: "@",
            type: "@?",
            options: "=?"
        },
        controller: ["$scope", "$element", "$attrs", function ($scope, $element, $attrs) {
            $scope.type = angular.isDefined($scope.type) ? $scope.type : 'text';
            $scope.options = angular.isDefined($scope.type) ? $scope.$eval($attrs.options) : [];
        }]
    };
}
angular
    .module('nzbhydraApp')
    .directive('hydrabackup', hydrabackup);

function hydrabackup() {
    controller.$inject = ["$scope", "BackupService", "Upload", "FileDownloadService", "$http", "RequestsErrorHandler", "growl", "RestartService"];
    return {
        templateUrl: 'static/html/directives/backup.html',
        controller: controller
    };

    function controller($scope, BackupService, Upload, FileDownloadService, $http, RequestsErrorHandler, growl, RestartService) {
        $scope.refreshBackupList = function () {
            BackupService.getBackupsList().then(function (backups) {
                $scope.backups = backups;
            });
        };

        $scope.refreshBackupList();

        $scope.uploadActive = false;


        $scope.createBackupFile = function () {
            $http.get("internalapi/backup/backuponly", {params: {dontdownload: true}}).then(function () {
                $scope.refreshBackupList();
            });
        };
        $scope.createAndDownloadBackupFile = function () {
            FileDownloadService.downloadFile("internalapi/backup/backup", "nzbhydra-backup-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip", "GET").then(function () {
                $scope.refreshBackupList();
            });
        };

        $scope.uploadBackupFile = function (file, errFiles) {
            RequestsErrorHandler.specificallyHandled(function () {

                $scope.file = file;
                $scope.errFile = errFiles && errFiles[0];
                if (file) {
                    $scope.uploadActive = true;
                    file.upload = Upload.upload({
                        url: 'internalapi/backup/restorefile',
                        file: file
                    });

                    file.upload.then(function (response) {
                        $scope.uploadActive = false;
                        file.result = response.data;
                        RestartService.restart("Restore successful.");

                    }, function (response) {
                        $scope.uploadActive = false;
                        growl.error(response.data)
                    }, function (evt) {
                        file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                        file.loaded = Math.floor(evt.loaded / 1024);
                        file.total = Math.floor(evt.total / 1024);
                    });
                }
            });
        };

        $scope.restoreFromFile = function (filename) {
            BackupService.restoreFromFile(filename).then(function () {
                    RestartService.restart("Extraction of backup successful. Restarting for wrapper to restore data.");
                },
                function (response) {
                    growl.error(response.data);
                })
        }

    }
}


angular
    .module('nzbhydraApp')
    .directive('addableNzbs', addableNzbs);

function addableNzbs() {
    controller.$inject = ["$scope", "NzbDownloadService"];
    return {
        templateUrl: 'static/html/directives/addable-nzbs.html',
        require: ['^searchResultId'],
        scope: {
            searchResultId: "<",
            downloadType: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService) {
        $scope.downloaders = _.filter(NzbDownloadService.getEnabledDownloaders(), function (downloader) {
            if ($scope.downloadType !== "NZB") {
                return downloader.downloadType === $scope.downloadType
            }
            return true;
        });
    }
}

angular
    .module('nzbhydraApp')
    .directive('addableNzb', addableNzb);

function addableNzb() {
    controller.$inject = ["$scope", "NzbDownloadService", "growl"];
    return {
        templateUrl: 'static/html/directives/addable-nzb.html',
        scope: {
            searchResultId: "<",
            downloader: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService, growl) {
        if ($scope.downloader.iconCssClass) {
            $scope.cssClass = "fa fa-" + $scope.downloader.iconCssClass.replace("fa-", "").replace("fa ", "");
        } else {
            $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd" : "nzbget";
        }

        $scope.add = function () {
            var originalClass = $scope.cssClass;
            $scope.cssClass = "nzb-spinning";
            NzbDownloadService.download($scope.downloader, [$scope.searchResultId]).then(function (response) {
                if (response !== "dismissed") {
                    if (response.data.successful) {
                        $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-success" : "nzbget-success";
                    } else {
                        $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                        growl.error("Unable to add NZB. Make sure the downloader is running and properly configured.");
                    }
                } else {
                    $scope.cssClass = originalClass;
                }
            }, function () {
                $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                growl.error("An unexpected error occurred while trying to contact NZBHydra or add the NZB.");
            })
        };


    }
}

angular
    .module('nzbhydraApp')
    .factory('UpdateService', UpdateService);

function UpdateService($http, growl, blockUI, RestartService, RequestsErrorHandler) {

    var currentVersion;
    var latestVersion;
    var updateAvailable;
    var latestVersionIgnored;
    var versionHistory;


    return {
        update: update,
        showChanges: showChanges,
        getInfos: getInfos,
        getVersionHistory: getVersionHistory,
        ignore: ignore
    };

    function getInfos() {
        return RequestsErrorHandler.specificallyHandled(function () {
            return $http.get("internalapi/updates/infos").then(
                function (data) {
                    currentVersion = data.data.currentVersion;
                    latestVersion = data.data.latestVersion;
                    updateAvailable = data.data.updateAvailable;
                    latestVersionIgnored = data.data.latestVersionIgnored;
                    return data;
                }
            );
        });
    }

    function ignore(version) {
        return $http.put("internalapi/updates/ignore?version=" + version).then(function (data) {
            return data;
        });
    }

    function getVersionHistory() {
        return $http.get("internalapi/updates/versionHistory").then(function (data) {
            versionHistory = data.data;
            return data;
        });
    }

    function showChanges() {
        return $http.get("internalapi/updates/changesSince").then(function (response) {
            var myInjector = angular.injector(["ng", "ui.bootstrap"]);
            var $uibModal = myInjector.get("$uibModal");
            var params = {
                size: "lg",
                templateUrl: "static/html/changelog-modal.html",
                resolve: {
                    versionHistory: function () {
                        return response.data;
                    }
                },
                controller: function ($scope, $sce, $uibModalInstance, versionHistory) {
                    $scope.versionHistory = versionHistory;

                    $scope.ok = function () {
                        $uibModalInstance.dismiss();
                    };
                }
            };

            var modalInstance = $uibModal.open(params);

            modalInstance.result.then();
        });
    }


    function update() {
        blockUI.start("Downloading update. Please stand by...");
        $http.put("internalapi/updates/installUpdate").then(function () {
                //Handle like restart, ping application and wait
                //Perhaps save the version to which we want to update, ask later and see if they're equal. If not updating apparently failed...
                RestartService.startCountdown("Downloaded update. Shutting down Hydra for wrapper to execute update.");
            },
            function () {
                blockUI.reset();
                growl.info("An error occurred while updating. Please check the logs.");
            });
    }
}
UpdateService.$inject = ["$http", "growl", "blockUI", "RestartService", "RequestsErrorHandler"];
angular
    .module('nzbhydraApp')
    .controller('UpdateFooterController', UpdateFooterController);

function UpdateFooterController($scope, UpdateService, RequestsErrorHandler, HydraAuthService, $http, $uibModal, ConfigService) {

    $scope.updateAvailable = false;
    $scope.checked = false;
    var welcomeIsBeingShown = false;

    $scope.mayUpdate = HydraAuthService.getUserInfos().maySeeAdmin;

    $scope.$on("user:loggedIn", function () {
        if (HydraAuthService.getUserInfos().maySeeAdmin && !$scope.checked) {
            retrieveUpdateInfos();
        }
    });


    if ($scope.mayUpdate) {
        retrieveUpdateInfos();
    }

    function retrieveUpdateInfos() {
        $scope.checked = true;
        UpdateService.getInfos().then(function (data) {
            $scope.currentVersion = data.data.currentVersion;
            $scope.latestVersion = data.data.latestVersion;
            $scope.updateAvailable = data.data.updateAvailable;
            $scope.changelog = data.data.changelog;
        });
    }


    $scope.update = function () {
        UpdateService.update();
    };

    $scope.ignore = function () {
        UpdateService.ignore($scope.latestVersion);
    };

    $scope.showChangelog = function () {
        UpdateService.showChanges();
    };

    function checkAndShowNews() {
        RequestsErrorHandler.specificallyHandled(function () {
            if (ConfigService.getSafe().showNews) {
                $http.get("internalapi/news/forcurrentversion").then(function (data) {
                    if (data && data.length > 0) {
                        $uibModal.open({
                            templateUrl: 'static/html/news-modal.html',
                            controller: NewsModalInstanceCtrl,
                            size: "lg",
                            resolve: {
                                news: function () {
                                    return data;
                                }
                            }
                        });
                        $http.put("internalapi/news/saveshown");
                    }
                });
            }
        });
    }


    function checkAndShowWelcome() {
        $http.get("internalapi/welcomeshown").success(function (wasWelcomeShown) {
            if (!wasWelcomeShown) {
                $http.put("internalapi/welcomeshown");
                var promise = $uibModal.open({
                    templateUrl: 'static/html/welcome-modal.html',
                    controller: WelcomeModalInstanceCtrl,
                    size: "md"
                });
                promise.opened.then(function () {
                    welcomeIsBeingShown = true;
                });
                promise.closed.then(function () {
                    welcomeIsBeingShown = false;
                });
            } else {
                checkAndShowNews();
            }
        });
    }

    checkAndShowWelcome();

}
UpdateFooterController.$inject = ["$scope", "UpdateService", "RequestsErrorHandler", "HydraAuthService", "$http", "$uibModal", "ConfigService"];

angular
    .module('nzbhydraApp')
    .controller('NewsModalInstanceCtrl', NewsModalInstanceCtrl);

function NewsModalInstanceCtrl($scope, $uibModalInstance, news) {
    $scope.news = news;
    $scope.close = function () {
        $uibModalInstance.dismiss();
    };
}
NewsModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "news"];

angular
    .module('nzbhydraApp')
    .controller('WelcomeModalInstanceCtrl', WelcomeModalInstanceCtrl);

function WelcomeModalInstanceCtrl($scope, $uibModalInstance, $state, MigrationService) {
    $scope.close = function () {
        $uibModalInstance.dismiss();
    };

    $scope.startMigration = function () {
        $uibModalInstance.dismiss();
        MigrationService.migrate();
    };

    $scope.goToConfig = function () {
        $uibModalInstance.dismiss();
        $state.go("root.config.main");
    }
}
WelcomeModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "$state", "MigrationService"];
angular
    .module('nzbhydraApp')
    .controller('SystemController', SystemController);

function SystemController($scope, $state, activeTab, $http, growl, RestartService, MigrationService, ConfigService, NzbHydraControlService) {

    $scope.activeTab = activeTab;
    $scope.foo = {
        csv: "",
        sql: ""
    };


    $scope.shutdown = function () {
        NzbHydraControlService.shutdown().then(function () {
                growl.info("Shutdown initiated. Cya!");
            },
            function () {
                growl.info("Unable to send shutdown command.");
            })
    };

    $scope.restart = function () {
        RestartService.restart();
    };

    $scope.reloadConfig = function () {
        ConfigService.reloadConfig().then(function () {
            growl.info("Successfully reloaded config. Some setting may need a restart to take effect.")
        }, function (data) {
            growl.error(data.message);
        })
    };


    $scope.migrate = function () {
        MigrationService.migrate();
    };


    $scope.allTabs = [
        {
            active: false,
            state: 'root.system.control',
            name: "Control"
        },
        {
            active: false,
            state: 'root.system.updates',
            name: "Updates"
        },
        {
            active: false,
            state: 'root.system.log',
            name: "Log"
        },
        {
            active: false,
            state: 'root.system.backup',
            name: "Backup"
        },
        {
            active: false,
            state: 'root.system.bugreport',
            name: "Bugreport / Debug"
        },
        {
            active: false,
            state: 'root.system.news',
            name: "News"
        },
        {
            active: false,
            state: 'root.system.about',
            name: "About"
        }
    ];


    $scope.goToSystemState = function (index) {
        $state.go($scope.allTabs[index].state, {activeTab: index}, {inherit: false, notify: true, reload: true});
    };

    $scope.downloadDebuggingInfos = function () {
        $http({method: 'GET', url: 'internalapi/debuginfos/logandconfig', responseType: 'arraybuffer'}).success(function (data, status, headers, config) {
            var a = document.createElement('a');
            var blob = new Blob([data], {'type': "application/octet-stream"});
            a.href = URL.createObjectURL(blob);
            a.download = "nzbhydra-debuginfos-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    };

    $scope.executeSqlQuery = function () {
        $http.post('internalapi/debuginfos/executesqlquery', $scope.foo.sql).success(function (data) {
            if (data.successful) {
                $scope.foo.csv = data.message;
            } else {
                growl.error(data.message);
            }
        });
    };

    $scope.executeSqlUpdate = function () {
        $http.post('internalapi/debuginfos/executesqlupdate', $scope.foo.sql).success(function (data) {
            if (data.successful) {
                $scope.foo.csv = data.message + " rows affected";
            } else {
                growl.error(data.message);
            }
        });
    };


}
SystemController.$inject = ["$scope", "$state", "activeTab", "$http", "growl", "RestartService", "MigrationService", "ConfigService", "NzbHydraControlService"];
angular
    .module('nzbhydraApp')
    .factory('StatsService', StatsService);

function StatsService($http) {

    return {
        get: getStats,
        getDownloadHistory: getDownloadHistory
    };

    function getStats(after, before, includeDisabled, switchState) {
        var requestBody = {after: after, before: before, includeDisabled: includeDisabled};
        requestBody = _.extend(requestBody, switchState);
        return $http.post("internalapi/stats", requestBody).success(function (response) {
            return response.data;
        });
    }

    function getDownloadHistory(pageNumber, limit, filterModel, sortModel) {
        var params = {page: pageNumber, limit: limit, filterModel: filterModel};
        if (angular.isUndefined(pageNumber)) {
            params.page = 1;
        }
        if (angular.isUndefined(limit)) {
            params.limit = 100;
        }
        if (angular.isUndefined(filterModel)) {
            params.filterModel = {}
        }
        if (!angular.isUndefined(sortModel)) {
            params.sortModel = sortModel;
        } else {
            params.sortModel = {
                column: "time",
                sortMode: 2
            };
        }
        return $http.post("internalapi/history/downloads", params).success(function (response) {
            return {
                nzbDownloads: response.content,
                totalDownloads: response.totalElements
            };

        });
    }

}
StatsService.$inject = ["$http"];
angular
    .module('nzbhydraApp')
    .controller('StatsController', StatsController);

function StatsController($scope, $filter, StatsService, blockUI, localStorageService, $timeout, $window) {

    $scope.dateOptions = {
        dateDisabled: false,
        formatYear: 'yy',
        startingDay: 1
    };
    var initializingAfter = true;
    var initializingBefore = true;
    $scope.afterDate = moment().subtract(30, "days").toDate();
    $scope.beforeDate = moment().add(1, "days").toDate();
    $scope.foo = {
        includeDisabledIndexersInStats: localStorageService.get("includeDisabledIndexersInStats") !== null ? localStorageService.get("includeDisabledIndexersInStats") : false,
        statsSwichState: localStorageService.get("statsSwitchState") !== null ? localStorageService.get("statsSwitchState") :
            {
                indexerApiAccessStats: true,
                avgIndexerSearchResultsShares: true,
                avgResponseTimes: true,
                indexerDownloadShares: true,
                downloadsPerDayOfWeek: true,
                downloadsPerHourOfDay: true,
                searchesPerDayOfWeek: true,
                searchesPerHourOfDay: true,
                downloadsPerAgeStats: true,
                successfulDownloadsPerIndexer: true,
                downloadSharesPerUserOrIp: true,
                searchSharesPerUserOrIp: true,
                userAgentSearchShares: true,
                userAgentDownloadShares: true
            }
    };
    $scope.stats = {};

    updateStats();


    $scope.openAfter = function () {
        $scope.after.opened = true;
    };

    $scope.openBefore = function () {
        $scope.before.opened = true;
    };

    $scope.after = {
        opened: false
    };

    $scope.before = {
        opened: false
    };

    $scope.toggleIncludeDisabledIndexers = function () {
        localStorageService.set("includeDisabledIndexersInStats", $scope.foo.includeDisabledIndexersInStats);
    };

    $scope.onStatsSwitchToggle = function (statId) {
        localStorageService.set("statsSwitchState", $scope.foo.statsSwichState);

        if ($scope.foo.statsSwichState[statId]) { //Stat was enabled, get only data for this stat
            updateStats(statId);
        }

    };

    $scope.refresh = function() {
        updateStats();
    };

    function updateStats(statId) {
        blockUI.start("Updating stats...");
        var after = $scope.afterDate !== null ? $scope.afterDate : null;
        var before = $scope.beforeDate !== null ? $scope.beforeDate : null;
        var statsToRetrieve = {};
        if (angular.isDefined(statId)) {
            statsToRetrieve[statId] = true;
        } else {
            statsToRetrieve = $scope.foo.statsSwichState;
        }
        $scope.statsLoadingPromise = StatsService.get(after, before, $scope.foo.includeDisabledIndexersInStats, statsToRetrieve).then(function (stats) {
            $scope.setStats(stats);
            //Resize event is needed for the -perUsernameOrIp charts to be properly sized because nvd3 thinks the initial size is 0
            $timeout(function () {
                $window.dispatchEvent(new Event("resize"));
            }, 500);
        });

        blockUI.reset();
    }

    $scope.$watch('beforeDate', function () {
        if (initializingBefore) {
            initializingBefore = false;
        } else {
            //updateStats();
        }
    });


    $scope.$watch('afterDate', function () {
        if (initializingAfter) {
            initializingAfter = false;
        } else {
            //updateStats();
        }
    });

    $scope.onKeypress = function (keyEvent) {
        if (keyEvent.which === 13) {
            //updateStats();
        }
    };


    $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
    $scope.format = $scope.formats[0];
    $scope.altInputFormats = ['M!/d!/yyyy'];

    $scope.setStats = function (stats) {
        stats = stats.data;

        //Only update those stats that were calculated (because this might be an update when one stat has just been enabled)
        _.forEach(stats, function (value, key) {
            if (value !== null) {
                $scope.stats[key] = value;
            }
        });


        if ($scope.stats.avgResponseTimes) {
            $scope.avgResponseTimesChart = getChart("multiBarHorizontalChart", $scope.stats.avgResponseTimes, "indexer", "avgResponseTime", "", "Response time");
            $scope.avgResponseTimesChart.options.chart.margin.left = 100;
            $scope.avgResponseTimesChart.options.chart.yAxis.rotateLabels = -30;
            $scope.avgResponseTimesChart.options.chart.height = Math.max($scope.stats.avgResponseTimes.length * 30, 350);
        }

        if ($scope.stats.avgIndexerSearchResultsShares) {
            $scope.resultsSharesChart = getResultsSharesChart();

            var rotation = 30;
            var numberOfDisplayedIndexers = $scope.foo.includeDisabledIndexersInStats ? stats.numberOfConfiguredIndexers : stats.numberOfEnabledIndexers;
            if (numberOfDisplayedIndexers > 30) {
                rotation = 70;
            }
            $scope.resultsSharesChart.options.chart.xAxis.rotateLabels = rotation;
            $scope.resultsSharesChart.options.chart.height = 350;
        }


        if ($scope.stats.downloadsPerHourOfDay) {
            $scope.downloadsPerHourOfDayChart = getChart("discreteBarChart", $scope.stats.downloadsPerHourOfDay, "hour", "count", "Hour of day", 'Downloads');
            $scope.downloadsPerHourOfDayChart.options.chart.xAxis.rotateLabels = 0;
        }

        if ($scope.stats.downloadsPerDayOfWeek) {
            $scope.downloadsPerDayOfWeekChart = getChart("discreteBarChart", $scope.stats.downloadsPerDayOfWeek, "day", "count", "Day of week", 'Downloads');
            $scope.downloadsPerDayOfWeekChart.options.chart.xAxis.rotateLabels = 0;
        }

        if ($scope.stats.searchesPerHourOfDay) {
            $scope.searchesPerHourOfDayChart = getChart("discreteBarChart", $scope.stats.searchesPerHourOfDay, "hour", "count", "Hour of day", 'Searches');
            $scope.searchesPerHourOfDayChart.options.chart.xAxis.rotateLabels = 0;
        }

        if ($scope.stats.searchesPerDayOfWeek) {
            $scope.searchesPerDayOfWeekChart = getChart("discreteBarChart", $scope.stats.searchesPerDayOfWeek, "day", "count", "Day of week", 'Searches');
            $scope.searchesPerDayOfWeekChart.options.chart.xAxis.rotateLabels = 0;
        }

        if ($scope.stats.downloadsPerAgeStats) {
            $scope.downloadsPerAgeChart = getChart("discreteBarChart", $scope.stats.downloadsPerAgeStats.downloadsPerAge, "age", "count", "Downloads per age", 'Downloads');
            $scope.downloadsPerAgeChart.options.chart.xAxis.rotateLabels = 45;
            $scope.downloadsPerAgeChart.options.chart.showValues = false;
        }

        if ($scope.stats.successfulDownloadsPerIndexer) {
            $scope.successfulDownloadsPerIndexerChart = getChart("multiBarHorizontalChart", $scope.stats.successfulDownloadsPerIndexer, "indexerName", "percentage", "Indexer", '% successful');
            $scope.successfulDownloadsPerIndexerChart.options.chart.xAxis.rotateLabels = 90;
            $scope.successfulDownloadsPerIndexerChart.options.chart.yAxis.tickFormat = function (d) {
                return $filter('number')(d, 0);
            };
            $scope.successfulDownloadsPerIndexerChart.options.chart.valueFormat = function (d) {
                return $filter('number')(d, 0);
            };
            $scope.successfulDownloadsPerIndexerChart.options.chart.showValues = true;
        }

        if ($scope.stats.indexerDownloadShares) {
            $scope.indexerDownloadSharesChart = {
                options: {
                    chart: {
                        type: 'pieChart',
                        height: 500,
                        x: function (d) {
                            return d.indexerName;
                        },
                        y: function (d) {
                            return d.share;
                        },
                        showLabels: true,
                        donut: true,
                        donutRatio: 0.35,
                        duration: 500,
                        labelThreshold: 0.03,
                        labelSunbeamLayout: true,
                        tooltip: {
                            valueFormatter: function (d, i) {
                                return $filter('number')(d, 2) + "%";
                            }
                        },
                        legend: {
                            margin: {
                                top: 5,
                                right: 35,
                                bottom: 5,
                                left: 0
                            }
                        }
                    }
                },
                data: $scope.stats.indexerDownloadShares
            };
            $scope.indexerDownloadSharesChart.options.chart.height = Math.min(Math.max(($scope.foo.includeDisabledIndexersInStats ? $scope.stats.numberOfConfiguredIndexers : $scope.stats.numberOfEnabledIndexers) * 40, 350), 900);
        }

        function getSharesPieChart(data, height, xValue, yValue) {
            return {
                options: {
                    chart: {
                        type: 'pieChart',
                        height: height,
                        x: function (d) {
                            return d[xValue];
                        },
                        y: function (d) {
                            return d[yValue];
                        },
                        showLabels: true,
                        donut: true,
                        donutRatio: 0.35,
                        duration: 500,
                        labelThreshold: 0.03,
                        labelsOutside: true,
                        //labelType: "percent",
                        labelSunbeamLayout: true,
                        tooltip: {
                            valueFormatter: function (d, i) {
                                return $filter('number')(d, 2) + "%";
                            }
                        },
                        legend: {
                            margin: {
                                top: 5,
                                right: 35,
                                bottom: 5,
                                left: 0
                            }
                        }
                    }
                },
                data: data
            };
        }

        if ($scope.stats.searchSharesPerUserOrIp !== null) {
            $scope.downloadSharesPerUserOrIpChart = getSharesPieChart($scope.stats.downloadSharesPerUserOrIp, 300, "userOrIp", "percentage");
        }
        if ($scope.stats.searchSharesPerUserOrIpChart !== null) {
            $scope.searchSharesPerUserOrIpChart = getSharesPieChart($scope.stats.searchSharesPerUserOrIp, 300, "userOrIp", "percentage");
        }

        if ($scope.stats.userAgentSearchShares) {
            $scope.userAgentSearchSharesChart = getSharesPieChart($scope.stats.userAgentSearchShares, 300, "userAgent", "percentage");
            $scope.userAgentSearchSharesChart.options.chart.legend.margin.bottom = 25;
        }
        if ($scope.stats.userAgentDownloadShares) {
            $scope.userAgentDownloadSharesChart = getSharesPieChart($scope.stats.userAgentDownloadShares, 300, "userAgent", "percentage");
            $scope.userAgentDownloadSharesChart.options.chart.legend.margin.bottom = 25;
        }

    };

    function getChart(chartType, values, xKey, yKey, xAxisLabel, yAxisLabel) {
        return {
            options: {
                chart: {
                    type: chartType,
                    height: 350,
                    margin: {
                        top: 20,
                        right: 20,
                        bottom: 100,
                        left: 50
                    },
                    x: function (d) {
                        return d[xKey];
                    },
                    y: function (d) {
                        return d[yKey];
                    },
                    showValues: true,
                    valueFormat: function (d) {
                        return d;
                    },
                    color: function () {
                        return "red"
                    },
                    showControls: false,
                    showLegend: false,
                    duration: 100,
                    xAxis: {
                        axisLabel: xAxisLabel,
                        tickFormat: function (d) {
                            return d;
                        },
                        rotateLabels: 30,
                        showMaxMin: false,
                        color: function () {
                            return "white"
                        }
                    },
                    yAxis: {
                        axisLabel: yAxisLabel,
                        axisLabelDistance: -10,
                        tickFormat: function (d) {
                            return d;
                        }
                    },
                    tooltip: {
                        enabled: false
                    },
                    zoom: {
                        enabled: true,
                        scaleExtent: [1, 10],
                        useFixedDomain: false,
                        useNiceScale: false,
                        horizontalOff: false,
                        verticalOff: true,
                        unzoomEventType: 'dblclick.zoom'
                    }
                }
            }, data: [{
                "key": "doesntmatter",
                "bar": true,
                "values": values
            }]
        };
    }

    //Was unable to use the function above for this and gave up
    function getResultsSharesChart() {
        return {
            options: {
                chart: {
                    type: 'multiBarChart',
                    height: 350,
                    margin: {
                        top: 20,
                        right: 20,
                        bottom: 100,
                        left: 45
                    },

                    clipEdge: true,
                    duration: 500,
                    stacked: false,
                    reduceXTicks: false,
                    showValues: true,
                    tooltip: {
                        enabled: true,
                        valueFormatter: function (d) {
                            return $filter('number')(d, 2) + "%";
                        }
                    },
                    showControls: false,
                    xAxis: {
                        axisLabel: '',
                        showMaxMin: false,
                        rotateLabels: 30,
                        axisLabelDistance: 30,
                        tickFormat: function (d) {
                            return d;
                        }
                    },
                    yAxis: {
                        axisLabel: 'Share (%)',
                        axisLabelDistance: -20,
                        tickFormat: function (d) {
                            return $filter('number')(d, 0) + "%";
                        }
                    }
                }
            },

            data: [
                {
                    key: "Results",
                    values: _.map($scope.stats.avgIndexerSearchResultsShares, function (stats) {
                        return {series: 0, y: stats.totalShare, x: stats.indexerName}
                    })
                },
                {
                    key: "Unique results",
                    values: _.map($scope.stats.avgIndexerSearchResultsShares, function (stats) {
                        return {series: 1, y: stats.uniqueShare, x: stats.indexerName}
                    })
                }
            ]
        };
    }
}
StatsController.$inject = ["$scope", "$filter", "StatsService", "blockUI", "localStorageService", "$timeout", "$window"];



//
angular
    .module('nzbhydraApp')
    .factory('SearchService', SearchService);

function SearchService($http) {


    var lastExecutedQuery;
    var lastExecutedSearchRequestParameters;
    var lastResults;

    return {
        search: search,
        getLastResults: getLastResults,
        loadMore: loadMore,
        getSearchState: getSearchState
    };


    function search(searchRequestId, category, query, tmdbid, imdbId, title, tvdbId, rid, season, episode, minsize, maxsize, minage, maxage, indexers, mode) {
        var uri = new URI("internalapi/search");
        var searchRequestParameters = {};
        searchRequestParameters.searchRequestId = searchRequestId;
        searchRequestParameters.query = query;
        searchRequestParameters.title = title;
        searchRequestParameters.minsize = minsize;
        searchRequestParameters.maxsize = maxsize;
        searchRequestParameters.minage = minage;
        searchRequestParameters.maxage = maxage;
        searchRequestParameters.category = category;
        if (!angular.isUndefined(indexers) && indexers !== null) {
            searchRequestParameters.indexers = indexers.split("|");
        }

        if (category.indexOf("Movies") > -1 || (category.indexOf("20") === 0) || mode === "movie") {
            searchRequestParameters.tmdbId = tmdbid;
            searchRequestParameters.imdbId = imdbId;
        } else if (category.indexOf("TV") > -1 || (category.indexOf("50") === 0) || mode === "tvsearch") {
            searchRequestParameters.tvdbId = tvdbId;
            searchRequestParameters.tvrageId = rid;
            searchRequestParameters.season = season;
            searchRequestParameters.episode = episode;
        }

        lastExecutedQuery = uri;
        lastExecutedSearchRequestParameters = searchRequestParameters;
        return $http.post(uri.toString(), searchRequestParameters).then(processData);
    }

    function loadMore(offset, limit) {
        lastExecutedSearchRequestParameters.offset = offset;
        lastExecutedSearchRequestParameters.limit = limit;

        return $http.post(lastExecutedQuery.toString(), lastExecutedSearchRequestParameters).then(processData);
    }

    function getSearchState(searchRequestId) {
        return $http.get("internalapi/search/state", {params: {searchrequestid: searchRequestId}});
    }

    function processData(response) {
        var searchResults = response.data.searchResults;
        var indexerSearchMetaDatas = response.data.indexerSearchMetaDatas;
        var numberOfAvailableResults = response.data.numberOfAvailableResults;
        var numberOfRejectedResults = response.data.numberOfRejectedResults;
        var numberOfAcceptedResults = response.data.numberOfAcceptedResults;
        var numberOfProcessedResults = response.data.numberOfProcessedResults;
        var rejectedReasonsMap = response.data.rejectedReasonsMap;
        var notPickedIndexersWithReason = response.data.notPickedIndexersWithReason;

        lastResults = {
            "searchResults": searchResults,
            "indexerSearchMetaDatas": indexerSearchMetaDatas,
            "numberOfAvailableResults": numberOfAvailableResults,
            "numberOfAcceptedResults": numberOfAcceptedResults,
            "numberOfRejectedResults": numberOfRejectedResults,
            "numberOfProcessedResults": numberOfProcessedResults,
            "rejectedReasonsMap": rejectedReasonsMap,
            "notPickedIndexersWithReason": notPickedIndexersWithReason

        };
        return lastResults;
    }

    function getLastResults() {
        return lastResults;
    }
}
SearchService.$inject = ["$http"];
angular
    .module('nzbhydraApp')
    .controller('SearchResultsController', SearchResultsController);

//SearchResultsController.$inject = ['blockUi'];
function SearchResultsController($stateParams, $scope, $q, $timeout, blockUI, growl, localStorageService, SearchService, ConfigService) {


    $scope.limitTo = 100;
    $scope.offset = 0;
    //Handle incoming data

    $scope.indexersearches = SearchService.getLastResults().indexerSearchMetaDatas;
    $scope.notPickedIndexersWithReason = [];
    _.forEach(SearchService.getLastResults().notPickedIndexersWithReason, function (k, v) {
        $scope.notPickedIndexersWithReason.push({"indexer": v, "reason": k});
    });
    $scope.indexerResultsInfo = {}; //Stores information about the indexerName's searchResults like how many we already retrieved
    $scope.groupExpanded = {};
    $scope.selected = [];
    if ($stateParams.title) {
        $scope.searchTitle = $stateParams.title;
    } else if ($stateParams.query) {
        $scope.searchTitle = $stateParams.query;
    } else {
        $scope.searchTitle = undefined;
    }

    $scope.selectedIds = _.map($scope.selected, function (value) {
        return value.searchResultId;
    });

    //For shift clicking results
    $scope.lastClicked = null;
    $scope.lastClickedValue = null;

    var allSearchResults = [];
    var sortModel = {};
    $scope.filterModel = {};

    $scope.isShowFilterButtons = ConfigService.getSafe().searching.showQuickFilterButtons;
    $scope.isShowFilterButtonsMovie = $scope.isShowFilterButtons && $stateParams.category.toLowerCase().indexOf("movie") > -1;
    $scope.isShowFilterButtonsTv =  $scope.isShowFilterButtons && $stateParams.category.toLowerCase().indexOf("tv") > -1;
    $scope.filterButtonsModel = {
        source: {},
        quality: {
        }
    };
    $scope.filterButtonsModelMap = {
      tv: ['hdtv'],
      camts: ['cam', 'ts'],
      web: ['webrip', 'web-dl', 'webdl'],
      dvdbluray: ['dvd', 'bluray', 'blu-ray']
    };
    if (localStorageService.get("sorting") !== null) {
        var sorting = localStorageService.get("sorting");
        sortModel = localStorageService.get("sorting");
    } else {
        sortModel = {
            column: "epoch",
            sortMode: 2,
            reversed: false
        };
    }
    $timeout(function () {
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode, sortModel.reversed);
    }, 10);

    $scope.foo = {
        indexerStatusesExpanded: localStorageService.get("indexerStatusesExpanded") !== null ? localStorageService.get("indexerStatusesExpanded") : false,
        duplicatesDisplayed: localStorageService.get("duplicatesDisplayed") !== null ? localStorageService.get("duplicatesDisplayed") : false
    };
    $scope.loadMoreEnabled = false;
    $scope.totalAvailableUnknown = false;


    $scope.indexersForFiltering = [];
    _.forEach($scope.indexersearches, function (indexer) {
        $scope.indexersForFiltering.push({label: indexer.indexerName, id: indexer.indexerName})
    });
    $scope.categoriesForFiltering = [];
    _.forEach(ConfigService.getSafe().categoriesConfig.categories, function (category) {
        $scope.categoriesForFiltering.push({label: category.name, id: category.name})
    });
    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerResultsInfo[ps.indexerName.toLowerCase()] = {loadedResults: ps.loaded_results};
    });

    setDataFromSearchResult(SearchService.getLastResults(), []);

    $scope.$emit("searchResultsShown");
    stopBlocking();

    //Returns the content of the property (defined by the current sortPredicate) of the first group element 
    $scope.firstResultPredicate = firstResultPredicate;

    function firstResultPredicate(item) {
        return item[0][$scope.sortPredicate];
    }

    //Returns the unique group identifier which allows angular to keep track of the grouped search results even after filtering, making filtering by indexers a lot faster (albeit still somewhat slow...)
    $scope.groupId = groupId;

    function groupId(item) {
        return item[0][0].searchResultId;
    }

    $scope.onFilterButtonsModelChange = function() {
        blockAndUpdate();
    };

    function blockAndUpdate() {
        startBlocking("Sorting / filtering...").then(function () {
            $scope.filteredResults = sortAndFilter(allSearchResults);
            blockUI.reset();
            localStorageService.set("sorting", sortModel);
        });
    }

    //Block the UI and return after timeout. This way we make sure that the blocking is done before angular starts updating the model/view. There's probably a better way to achieve that?
    function startBlocking(message) {
        var deferred = $q.defer();
        blockUI.start(message);
        $timeout(function () {
            deferred.resolve();
        }, 10);
        return deferred.promise;
    }

    $scope.$on("sort", function (event, column, sortMode, reversed) {
        if (sortMode === 0) {
            sortModel = {
                column: "epoch",
                sortMode: 2,
                reversed: true
            };
        } else {
            sortModel = {
                column: column,
                sortMode: sortMode,
                reversed: reversed
            };
        }
        $timeout(function () {
            $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode, sortModel.reversed);
        }, 10);
        blockAndUpdate();
    });

    $scope.$on("filter", function (event, column, filterModel, isActive) {
        if (filterModel.filterValue && isActive) {
            $scope.filterModel[column] = filterModel;
        } else {
            delete $scope.filterModel[column];
        }
        blockAndUpdate();
    });

    $scope.resort = function () {
    };

    function sortAndFilter(results) {
        var query;
        var words;
        if ("title" in $scope.filterModel) {
            query = $scope.filterModel.title.filterValue;
            words = query.toLowerCase().split(" ");
        }

        function filter(item) {
            if ("size" in $scope.filterModel) {
                var filterValue = $scope.filterModel.size.filterValue;
                if (angular.isDefined(filterValue.min) && item.size / 1024 / 1024 < filterValue.min) {
                    return false;
                }
                if (angular.isDefined(filterValue.max) && item.size / 1024 / 1024 > filterValue.max) {
                    return false;
                }
            }

            if ("age" in $scope.filterModel) {
                var filterValue = $scope.filterModel.age.filterValue;
                var ageDays = moment.utc().diff(moment.unix(item.epoch), "days");
                if (angular.isDefined(filterValue.min) && ageDays < filterValue.min) {
                    return false;
                }
                if (angular.isDefined(filterValue.max) && ageDays > filterValue.max) {
                    return false;
                }
            }

            if ("grabs" in $scope.filterModel) {
                var filterValue = $scope.filterModel.grabs.filterValue;
                if (angular.isDefined(filterValue.min) && item.grabs < filterValue.min) {
                    return false;
                }
                if (angular.isDefined(filterValue.max) && item.grabs > filterValue.max) {
                    return false;
                }
            }

            if ("title" in $scope.filterModel) {
                var ok = _.every(words, function (word) {
                    return item.title.toLowerCase().indexOf(word) > -1;
                });
                if (!ok) return false;
            }
            if ("indexer" in $scope.filterModel) {
                if (_.indexOf($scope.filterModel.indexer.filterValue, item.indexer) === -1) {
                    return false;
                }
            }
            if ("category" in $scope.filterModel) {
                if (_.indexOf($scope.filterModel.category.filterValue, item.category) === -1) {
                    return false;
                }
            }
            if ($scope.filterButtonsModel.source !== null) {
                var mustContain = [];
                _.each($scope.filterButtonsModel.source, function(value, key) { //key is something like 'camts', value is true or false
                   if (value) {
                       Array.prototype.push.apply(mustContain, $scope.filterButtonsModelMap[key]);
                   }
                });
                if (mustContain.length > 0) {
                    var containsAtLeastOne = _.any(mustContain, function(word) {
                        return item.title.toLowerCase().indexOf(word) > -1
                    });
                    if (!containsAtLeastOne) {
                        return false;
                    }
                }
            }
            if ($scope.filterButtonsModel.quality !== null && !_.isEmpty($scope.filterButtonsModel.quality)) {
                var containsAtLeastOne = false;
                var anyRequired = false;
                _.each($scope.filterButtonsModel.quality, function(value, key) { //key is something like 'q720p', value is true or false
                    anyRequired = anyRequired || value;
                    if (value && item.title.toLowerCase().indexOf(key.substring(1)) > -1) {
                        containsAtLeastOne = true;
                    }
                });
                return !anyRequired || containsAtLeastOne;
            }

            return true;
        }


        function getCleanedTitle(element) {
            return element.title.toLowerCase().replace(/[\s\-\._]/ig, "");
        }

        var sortPredicate = sortModel.column;
        var sortReversed = sortModel.reversed;

        function createSortedHashgroups(titleGroup) {
            function createHashGroup(hashGroup) {
                //Sorting hash group's contents should not matter for size and age and title but might for category (we might remove this, it's probably mostly unnecessary)
                var sortedHashGroup = _.sortBy(hashGroup, function (item) {
                    var sortPredicateValue;
                    if (sortPredicate === "grabs") {
                        sortPredicateValue = angular.isDefined(item.grabs) ? item.grabs : 0;
                    } else {
                        sortPredicateValue = item[sortPredicate];
                    }
                    return sortReversed ? -sortPredicateValue : sortPredicateValue;
                });
                //Now sort the hash group by indexer score (inverted) so that the result with the highest indexer score is shown on top (or as the only one of a hash group if it's collapsed)
                sortedHashGroup = _.sortBy(sortedHashGroup, function (item) {
                    return item.indexerscore * -1;
                });
                return sortedHashGroup;
            }

            function getHashGroupFirstElementSortPredicate(hashGroup) {
                if (sortPredicate === "grabs") {
                    sortPredicateValue = angular.isDefined(hashGroup[0].grabs) ? hashGroup[0].grabs : 0;
                } else {
                    var sortPredicateValue = hashGroup[0][sortPredicate];
                }
                return sortReversed ? -sortPredicateValue : sortPredicateValue;
            }

            return _.chain(titleGroup).groupBy("hash").map(createHashGroup).sortBy(getHashGroupFirstElementSortPredicate).value();
        }

        function getTitleGroupFirstElementsSortPredicate(titleGroup) {
            var sortPredicateValue;
            if (sortPredicate === "title") {
                sortPredicateValue = titleGroup[0][0].title.toLowerCase();
            } else if (sortPredicate === "grabs") {
                sortPredicateValue = angular.isDefined(titleGroup[0][0].grabs) ? titleGroup[0][0].grabs : 0;
            } else {
                sortPredicateValue = titleGroup[0][0][sortPredicate];
            }

            return sortPredicateValue;
        }

        var filtered = _.chain(results)
            .filter(filter)
            //Make groups of results with the same title
            .groupBy(getCleanedTitle)
            //For every title group make subgroups of duplicates and sort the group    
            .map(createSortedHashgroups)
            //And then sort the title group using its first hashgroup's first item (the group itself is already sorted and so are the hash groups)    
            .sortBy(getTitleGroupFirstElementsSortPredicate)
            .value();
        if (sortModel.sortMode === 2) {
            filtered = filtered.reverse();
        }

        $scope.lastClicked = null;
        return filtered;
    }

    $scope.toggleTitlegroupExpand = function toggleTitlegroupExpand(titleGroup) {
        $scope.groupExpanded[titleGroup[0][0].title] = !$scope.groupExpanded[titleGroup[0][0].title];
        $scope.groupExpanded[titleGroup[0][0].hash] = !$scope.groupExpanded[titleGroup[0][0].hash];
    };


    $scope.stopBlocking = stopBlocking;

    function stopBlocking() {
        blockUI.reset();
    }

    function setDataFromSearchResult(data, previousSearchResults) {
        allSearchResults = previousSearchResults.concat(data.searchResults);
        $scope.filteredResults = sortAndFilter(allSearchResults);
        $scope.numberOfAvailableResults = data.numberOfAvailableResults;
        $scope.rejectedReasonsMap = data.rejectedReasonsMap;
        $scope.numberOfAcceptedResults = data.numberOfAcceptedResults;
        $scope.numberOfRejectedResults = data.numberOfRejectedResults;
        $scope.numberOfProcessedResults = data.numberOfProcessedResults;
        $scope.numberOfLoadedResults = allSearchResults.length;
        $scope.indexersearches = data.indexerSearchMetaDatas;

        $scope.loadMoreEnabled = ($scope.numberOfLoadedResults + $scope.numberOfRejectedResults < $scope.numberOfAvailableResults) || _.any(data.indexerSearchMetaDatas, function (x) {
            return x.hasMoreResults;
        });
        $scope.totalAvailableUnknown = _.any(data.indexerSearchMetaDatas, function (x) {
            return !x.totalResultsKnown;
        });

        if (!$scope.foo.indexerStatusesExpanded && _.any(data.indexerSearchMetaDatas, function (x) {
                return !x.wasSuccessful;
            })) {
            growl.info("Errors occurred during searching, Check indexer statuses")
        }
    }

    $scope.loadMore = loadMore;

    function loadMore(loadAll) {
        startBlocking(loadAll ? "Loading all results..." : "Loading more results...").then(function () {
            var limit = loadAll ? $scope.numberOfAvailableResults - $scope.numberOfProcessedResults : null;
            SearchService.loadMore($scope.numberOfLoadedResults, limit).then(function (data) {
                setDataFromSearchResult(data, allSearchResults);
                stopBlocking();
            });
        });
    }


    $scope.countResults = countResults;

    function countResults() {
        return allSearchResults.length;
    }

    $scope.invertSelection = function invertSelection() {
        $scope.$broadcast("invertSelection");
    };

    $scope.deselectAll = function deselectAll() {
        $scope.$broadcast("deselectAll");
    };

    $scope.selectAll = function selectAll() {
        $scope.$broadcast("selectAll");
    };

    $scope.toggleIndexerStatuses = function () {
        $scope.foo.indexerStatusesExpanded = !$scope.foo.indexerStatusesExpanded;
        localStorageService.set("indexerStatusesExpanded", $scope.foo.indexerStatusesExpanded);
    };

    $scope.toggleDuplicatesDisplayed = function () {
        //$scope.foo.duplicatesDisplayed = !$scope.foo.duplicatesDisplayed;
        localStorageService.set("duplicatesDisplayed", $scope.foo.duplicatesDisplayed);
        $scope.$broadcast("duplicatesDisplayed", $scope.foo.duplicatesDisplayed);
    };

    $scope.getRejectedReasonsTooltip = function () {
        if ($scope.rejectedReasonsMap.length === 0) {
            return "No rejected results";
        } else {
            var tooltip = "<span >Rejected results:<span><br>";
            tooltip += '<table class="rejected-tooltip-table"><thead><tr><th width="50px">Count</th><th>Reason</th></tr></thead>';
            _.forEach($scope.rejectedReasonsMap, function (count, reason) {
                tooltip += '<tr><td>' + count + '</td><td>' + reason + '</td></tr>';
            });
            tooltip += '</table>';
            return tooltip;
        }
    };

    $scope.$on("checkboxClicked", function (event, originalEvent, rowIndex, newCheckedValue) {
        if (originalEvent.shiftKey && $scope.lastClicked !== null) {
            $scope.$broadcast("shiftClick", Number($scope.lastClicked), Number(rowIndex), Number($scope.lastClickedValue));
        }
        $scope.lastClicked = rowIndex;
        $scope.lastClickedValue = newCheckedValue;
    });

    $scope.filterRejectedZero = function () {
        return function (entry) {
            return entry[1] > 0;
        }
    };

}
SearchResultsController.$inject = ["$stateParams", "$scope", "$q", "$timeout", "blockUI", "growl", "localStorageService", "SearchService", "ConfigService"];


angular
    .module('nzbhydraApp')
    .factory('SearchHistoryService', SearchHistoryService);

function SearchHistoryService($filter, $http) {

    return {
        getSearchHistory: getSearchHistory,
        getSearchHistoryForSearching: getSearchHistoryForSearching,
        formatRequest: formatRequest,
        getStateParamsForRepeatedSearch: getStateParamsForRepeatedSearch
    };

    function getSearchHistoryForSearching() {
        return $http.post("internalapi/history/searches/forsearching").success(function (response) {
            return {
                searchRequests: response
            }
        });
    }

    function getSearchHistory(pageNumber, limit, filterModel, sortModel, distinct, onlyCurrentUser) {
        var params = {
            page: pageNumber,
            limit: limit,
            filterModel: filterModel,
            distinct: distinct,
            onlyCurrentUser: onlyCurrentUser
        };
        if (angular.isUndefined(pageNumber)) {
            params.page = 1;
        }
        if (angular.isUndefined(limit)) {
            params.limit = 100;
        }
        if (angular.isUndefined(filterModel)) {
            params.filterModel = {}
        }
        if (!angular.isUndefined(sortModel)) {
            params.sortModel = sortModel;
        } else {
            params.sortModel = {
                column: "time",
                sortMode: 2
            };
        }
        return $http.post("internalapi/history/searches", params).success(function (response) {
            return {
                searchRequests: response.content,
                totalRequests: response.totalElements
            }
        });
    }

    function formatRequest(request, includeIdLink, includequery, describeEmptySearch, includeTitle) {
        var result = [];
        //ID key: ID value
        //season
        //episode
        //author
        //title
        if (includequery && request.query) {
            result.push("Query: " + request.query);
        }
        if (request.title && includeTitle) {
            result.push('<span class="history-title">Title: </span>' + request.title);
        } else if (request.movietitle && includeTitle) {
            result.push('<span class="history-title">Title: </span>' + request.movietitle);
        } else if (request.tvtitle && includeTitle) {
            result.push('<span class="history-title">Title: </span>' + request.tvtitle);
        } else if (request.identifier_key) {
            var href;
            var key;
            if (request.identifier_key == "imdbId") {
                key = "IMDB ID";
                href = "https://www.imdb.com/title/tt"
            } else if (request.identifier_key == "tvdbId") {
                key = "TVDB ID";
                href = "https://thetvdb.com/?tab=series&id="
            } else if (request.identifier_key == "rid") {
                key = "TVRage ID";
                href = "internalapi/redirect_rid?rid="
            } else if (request.identifier_key == "tmdb") {
                key = "TMDV ID";
                href = "https://www.themoviedb.org/movie/"
            }
            href = href + request.identifier_value;
            href = $filter("dereferer")(href);
            if (includeIdLink) {
                result.push('<span class="history-title">' + key + ': </span><a target="_blank" href="' + href + '">' + request.identifier_value + "</a>");
            } else {
                result.push('<span class="history-title">' + key + ": </span>" + request.identifier_value);
            }
        }
        if (request.season) {
            result.push('<span class="history-title">Season: </span>' + request.season);
        }
        if (request.episode) {
            result.push('<span class="history-title">Episode: </span>' + request.episode);
        }
        if (request.author) {
            result.push('<span class="history-title">Author: </span>' + request.author);
        }
        if (result.length == 0 && describeEmptySearch) {
            result = ['<span class="history-title">Empty search</span>'];
        }

        return result.join(", ");

    }

    function getStateParamsForRepeatedSearch(request) {
        var stateParams = {};
        stateParams.mode = "search"
        if (request.identifier_key == "imdbId") {
            stateParams.mode = "movie"
            stateParams.imdbId = request.identifier_value;
        } else if (request.identifier_key == "tvdbId" || request.identifier_key == "rid") {
            stateParams.mode = "tvsearch";
            if (request.identifier_key == "rid") {
                stateParams.rid = request.identifier_value;
            } else {
                stateParams.tvdbId = request.identifier_value;
            }

            if (request.season != "") {
                stateParams.season = request.season;
            }
            if (request.episode != "") {
                stateParams.episode = request.episode;
            }
        }
        if (request.query != "") {
            stateParams.query = request.query;
        }


        if (request.movietitle != null) {
            stateParams.title = request.movietitle;
        }
        if (request.tvtitle != null) {
            stateParams.title = request.tvtitle;
        }

        if (request.category) {
            stateParams.category = request.category;
        }

        stateParams.category = request.category;

        return stateParams;
    }


}
SearchHistoryService.$inject = ["$filter", "$http"];
angular
    .module('nzbhydraApp')
    .controller('SearchHistoryController', SearchHistoryController);


function SearchHistoryController($scope, $state, SearchHistoryService, ConfigService, history, $sce, $filter, $timeout) {
    $scope.limit = 100;
    $scope.pagination = {
        current: 1
    };
    var sortModel = {
        column: "time",
        sortMode: 2
    };
    $timeout(function () {
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode);
    }, 10);
    $scope.filterModel = {};

    //Filter options
    $scope.categoriesForFiltering = [];
    _.forEach(ConfigService.getSafe().categoriesConfig.categories, function (category) {
        $scope.categoriesForFiltering.push({label: category.name, id: category.name})
    });
    $scope.preselectedTimeInterval = {beforeDate: null, afterDate: null};
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: 'API'}, {label: "Internal", value: 'INTERNAL'}];

    //Preloaded data
    $scope.searchRequests = history.data.content;
    $scope.totalRequests = history.data.totalElements;

    $scope.update = function () {
        SearchHistoryService.getSearchHistory($scope.pagination.current, $scope.limit, $scope.filterModel, sortModel).then(function (history) {
            $scope.searchRequests = history.data.content;
            $scope.totalRequests = history.data.totalElements;
        });
    };

    $scope.$on("sort", function (event, column, sortMode) {
        if (sortMode === 0) {
            sortModel = {
                column: "time",
                sortMode: 2
            };
        } else {
            sortModel = {
                column: column,
                sortMode: sortMode
            };
        }
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode);
        $scope.update();
    });

    $scope.$on("filter", function (event, column, filterModel, isActive) {
        if (filterModel.filterValue) {
            $scope.filterModel[column] = filterModel;
        } else {
            delete $scope.filterModel[column];
        }
        $scope.update();
    });


    var keysToParams = {
        "IMDB": "imdbid",
        "TMDB": "tmdbid",
        "TVRAGE": "tvrageid",
        "TVDB": "tvdbid",
        "TVMAZE": "tvmazeid"
    };

    $scope.openSearch = function (request) {
        var stateParams = {};
        for (var i = 0; i < request.identifiers.length; i++) {
            if (request.identifiers[i].identifierKey in keysToParams) {
                var key = keysToParams[request.identifiers[i].identifierKey];
                stateParams[key] = request.identifiers[i].identifierValue;
            }
        }
        if (request.query) {
            stateParams.query = request.query;
        }
        stateParams.mode = request.searchType.toLowerCase();

        if (request.title) {
            stateParams.title = request.title;
        }

        stateParams.category = request.category;

        $state.go("root.search", stateParams, {inherit: false});
    };

    $scope.formatQuery = function (request) {
        if (request.title) {
            return request.title;
        }

        if (!request.query && request.identifiers.length === 0 && !request.season && !request.episode) {
            return "Update query";
        }
        return request.query;
    };

    $scope.formatAdditional = function (request) {
        var result = [];
        if (request.identifiers.length > 0) {
            var href;
            var key;
            var value;
            var pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TMDB"
            });
            if (angular.isDefined(pair)) {
                key = "TMDB ID";
                href = "https://www.themoviedb.org/movie/" + pair.identifierValue;
                href = $filter("dereferer")(href);
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "IMDB"
            });
            if (angular.isDefined(pair)) {
                key = "IMDB ID";
                href = "https://www.imdb.com/title/tt" + pair.identifierValue;
                href = $filter("dereferer")(href);
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TVDB"
            });
            if (angular.isDefined(pair)) {
                key = "TVDB ID";
                href = "https://thetvdb.com/?tab=series&id=" + pair.identifierValue;
                href = $filter("dereferer")(href);
                value = pair.identifierValue;
            }

            pair = _.find(request.identifiers, function (pair) {
                return pair.identifierKey === "TVRAGE"
            });
            if (angular.isDefined(pair)) {
                key = "TVRage ID";
                href = "internalapi/redirectRid/" + pair.identifierValue;
                value = pair.identifierValue;
            }

            result.push(key + ": " + '<a target="_blank" href="' + href + '">' + value + "</a>");
        }
        if (request.season) {
            result.push("Season: " + request.season);
        }
        if (request.episode) {
            result.push("Episode: " + request.episode);
        }
        if (request.author) {
            result.push("Author: " + request.author);
        }
        if (request.title) {
            result.push("Title: " + request.title);
        }
        return $sce.trustAsHtml(result.join(", "));
    };


}
SearchHistoryController.$inject = ["$scope", "$state", "SearchHistoryService", "ConfigService", "history", "$sce", "$filter", "$timeout"];

angular
    .module('nzbhydraApp')
    .controller('SearchController', SearchController);

function SearchController($scope, $http, $stateParams, $state, $uibModal, $timeout, $sce, growl, SearchService, focus, ConfigService, HydraAuthService, CategoriesService, $element, SearchHistoryService) {

    function getNumberOrUndefined(number) {
        if (_.isUndefined(number) || _.isNaN(number) || number === "") {
            return undefined;
        }
        number = parseInt(number);
        if (_.isNumber(number)) {
            return number;
        } else {
            return undefined;
        }
    }

    var searchRequestId = 0;
    var isSearchCancelled = false;

    //Fill the form with the search values we got from the state params (so that their values are the same as in the current url)
    $scope.mode = $stateParams.mode;
    $scope.query = "";
    $scope.categories = _.filter(CategoriesService.getAllCategories(), function (c) {
        return c.mayBeSelected && !(c.ignoreResultsFrom === "INTERNAL" || c.ignoreResultsFrom === "BOTH");
    });
    if (angular.isDefined($stateParams.category) && $stateParams.category) {
        $scope.category = CategoriesService.getByName($stateParams.category);
    } else {
        $scope.category = CategoriesService.getDefault();
    }
    $scope.category = (_.isUndefined($stateParams.category) || $stateParams.category === "") ? CategoriesService.getDefault() : CategoriesService.getByName($stateParams.category);
    $scope.tmdbId = $stateParams.tmdbid;
    $scope.tvdbId = $stateParams.tvdbid;
    $scope.imdbId = $stateParams.imdbid;
    $scope.tvmazeId = $stateParams.tvmazeid;
    $scope.rid = $stateParams.rid;
    $scope.title = $stateParams.title;
    $scope.season = $stateParams.season;
    $scope.episode = $stateParams.episode;
    $scope.query = $stateParams.query;
    $scope.minsize = getNumberOrUndefined($stateParams.minsize);
    $scope.maxsize = getNumberOrUndefined($stateParams.maxsize);
    $scope.minage = getNumberOrUndefined($stateParams.minage);
    $scope.maxage = getNumberOrUndefined($stateParams.maxage);
    if (!_.isUndefined($scope.title) && _.isUndefined($scope.query)) {
        //$scope.query = $scope.title;
    }
    if (!angular.isUndefined($stateParams.indexers)) {
        $scope.indexers = decodeURIComponent($stateParams.indexers).split("|");
    }

    $scope.showIndexers = {};

    $scope.searchHistory = [];

    var safeConfig = ConfigService.getSafe();
    $scope.showIndexerSelection = HydraAuthService.getUserInfos().showIndexerSelection;


    $scope.typeAheadWait = 300;
    $scope.selectedItem = "";
    $scope.autocompleteLoading = false;
    $scope.isAskById = $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";
    $scope.isById = {value: true}; //If true the user wants to search by id so we enable autosearch. Was unable to achieve this using a simple boolean
    $scope.availableIndexers = [];
    $scope.selectedIndexers = [];
    $scope.autocompleteClass = "autocompletePosterMovies";

    $scope.toggleCategory = function (searchCategory) {
        $scope.category = searchCategory;

        //Show checkbox to ask if the user wants to search by ID (using autocomplete)
        $scope.isAskById = $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";

        focus('searchfield');

        //Hacky way of triggering the autocomplete loading
        var searchModel = $element.find("#searchfield").controller("ngModel");
        if (angular.isDefined(searchModel.$viewValue)) {
            searchModel.$setViewValue(searchModel.$viewValue + " ");
        }

        if (safeConfig.searching.enableCategorySizes) {
            var min = searchCategory.minSizePreset;
            var max = searchCategory.maxSizePreset;
            if (_.isNumber(min)) {
                $scope.minsize = min;
            } else {
                $scope.minsize = "";
            }
            if (_.isNumber(max)) {
                $scope.maxsize = max;
            } else {
                $scope.maxsize = "";
            }
        }

        $scope.availableIndexers = getAvailableIndexers();
    };


    // Any function returning a promise object can be used to load values asynchronously
    $scope.getAutocomplete = function (val) {
        $scope.autocompleteLoading = true;
        //Expected model returned from API:
        //label: What to show in the results
        //title: Will be used for file search
        //value: Will be used as extraInfo (ttid oder tvdb id)
        //poster: url of poster to show

        //Don't use autocomplete if checkbox is disabled
        if (!$scope.isById.value) {
            return {};
        }

        if ($scope.category.searchType === "MOVIE") {
            return $http.get('internalapi/autocomplete/MOVIE/' + val).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else if ($scope.category.searchType === "TVSEARCH") {
            return $http.get('internalapi/autocomplete/TV/' + val).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else {
            return {};
        }
    };

    $scope.startSearch = function () {
        isSearchCancelled = false;
        searchRequestId = Math.round(Math.random() * 999999);
        var modalInstance = $scope.openModal(searchRequestId);

        var indexers = angular.isUndefined($scope.indexers) ? undefined : $scope.indexers.join("|");
        SearchService.search(searchRequestId, $scope.category.name, $scope.query, $scope.tmdbId, $scope.imdbId, $scope.title, $scope.tvdbId, $scope.rid, $scope.season, $scope.episode, $scope.minsize, $scope.maxsize, $scope.minage, $scope.maxage, indexers, $scope.mode).then(function () {
                modalInstance.close();
                if (!isSearchCancelled) {
                    $state.go("root.search.results", {
                        minsize: $scope.minsize,
                        maxsize: $scope.maxsize,
                        minage: $scope.minage,
                        maxage: $scope.maxage
                    }, {
                        inherit: true
                    });
                    $scope.tmdbId = undefined;
                    $scope.imdbId = undefined;
                    $scope.tvdbId = undefined;
                }
            },
            function () {
                modalInstance.close();
            });
    };

    $scope.openModal = function openModal(searchRequestId) {
        return $uibModal.open({
            templateUrl: 'static/html/search-state.html',
            controller: SearchUpdateModalInstanceCtrl,
            size: "md",
            backdrop: "static",
            backdropClass: "waiting-cursor",
            resolve: {
                searchRequestId: function () {
                    return searchRequestId;
                },
                onCancel: function () {
                    function cancel() {
                        isSearchCancelled = true;
                    }

                    return cancel;
                }
            }
        });
    };


    $scope.goToSearchUrl = function () {
        //State params (query parameters) should all be lowercase
        var stateParams = {};
        stateParams.mode = $scope.category.searchType.toLowerCase();
        stateParams.imdbid = $scope.imdbId;
        stateParams.tmdbid = $scope.tmdbId;
        stateParams.tvdbid = $scope.tvdbId;
        stateParams.tvrageid = $scope.tvrageId;
        stateParams.tvmazeid = $scope.tvmazeId;
        stateParams.title = $scope.title;
        stateParams.season = $scope.season;
        stateParams.episode = $scope.episode;
        stateParams.query = $scope.query;
        stateParams.minsize = $scope.minsize;
        stateParams.maxsize = $scope.maxsize;
        stateParams.minage = $scope.minage;
        stateParams.maxage = $scope.maxage;
        stateParams.category = $scope.category.name;
        stateParams.indexers = encodeURIComponent($scope.selectedIndexers.join("|"));
        $state.go("root.search", stateParams, {inherit: false, notify: true, reload: true});
    };

    $scope.repeatSearch = function (request) {
        $state.go("root.search", SearchHistoryService.getStateParamsForRepeatedSearch(request), {inherit: false, notify: true, reload: true});
    };


    $scope.selectAutocompleteItem = function ($item) {
        $scope.selectedItem = $item;
        $scope.title = $item.title;
        if ($item.tmdbId) {
            $scope.tmdbId = $item.tmdbId;
        }
        if ($item.tvdbId) {
            $scope.tvdbId = $item.tvdbId;
        }
        $scope.query = undefined;
        $scope.goToSearchUrl();
    };

    $scope.startQuerySearch = function () {
        if (!$scope.query) {
            growl.error("You didn't enter a query...");
        } else {
            //Reset values because they might've been set from the last search
            $scope.title = undefined;
            $scope.tmdbId = undefined;
            $scope.tvdbId = undefined;
            $scope.season = undefined;
            $scope.episode = undefined;
            $scope.goToSearchUrl();
        }
    };


    $scope.autocompleteActive = function () {
        return $scope.isAskById;
    };

    $scope.seriesSelected = function () {
        return $scope.category.searchType === "TVSEARCH";
    };

    $scope.toggleIndexer = function (indexer) {
        $scope.availableIndexers[indexer.name].activated = !$scope.availableIndexers[indexer.name].activated;
    };


    function isIndexerPreselected(indexer) {
        if (angular.isUndefined($scope.indexers)) {
            return indexer.preselect;
        } else {
            return _.contains($scope.indexers, indexer.name);
        }

    }


    function getAvailableIndexers() {
        var alreadySelected = $scope.selectedIndexers;
        var previouslyAvailable = _.pluck($scope.availableIndexers, "name");
        $scope.selectedIndexers = [];
        var availableIndexersList = _.chain(safeConfig.indexers).filter(function (indexer) {
            return indexer.enabled && indexer.showOnSearch && (angular.isUndefined(indexer.categories) || indexer.categories.length === 0 || $scope.category.name.toLowerCase() === "all" || indexer.categories.indexOf($scope.category.name) > -1);
        }).sortBy(function (indexer) {
            return indexer.name.toLowerCase();
        })
            .map(function (indexer) {
                return {name: indexer.name, activated: isIndexerPreselected(indexer), categories: indexer.categories};
            }).value();
        _.forEach(availableIndexersList, function (x) {
            var deselectedBefore = (_.indexOf(previouslyAvailable, x.name) > -1 && _.indexOf(alreadySelected, x.name) === -1);
            var selectedBefore = (_.indexOf(previouslyAvailable, x.name) > -1 && _.indexOf(alreadySelected, x.name) > -1);
            if ((x.activated && !deselectedBefore) || selectedBefore) {
                $scope.selectedIndexers.push(x.name);
            }
        });
        return availableIndexersList;
    }


    $scope.toggleAllIndexers = function (value) {
        if (value === true) {
            $scope.selectedIndexers.push.apply($scope.selectedIndexers, _.pluck($scope.availableIndexers, "name"));
        } else if (value === false) {
            $scope.selectedIndexers.splice(0, $scope.selectedIndexers.length);
        } else {
            _.forEach($scope.availableIndexers, function (x) {
                var index = _.indexOf($scope.selectedIndexers, x.name);
                if (index === -1) {
                    $scope.selectedIndexers.push(x.name);
                } else {
                    $scope.selectedIndexers.splice(index, 1);
                }
            });
        }
    };

    $scope.formatRequest = function (request) {
        return $sce.trustAsHtml(SearchHistoryService.formatRequest(request, false, true, true, true));
    };

    $scope.availableIndexers = getAvailableIndexers();


    function getAndSetSearchRequests() {
        SearchHistoryService.getSearchHistoryForSearching().success(function (data) {
            $scope.searchHistory = data;
        });
    }

    if ($scope.mode) {
        $scope.startSearch();
    } else {
        //Getting the search history only makes sense when we're not currently searching
        getAndSetSearchRequests();
    }

    $scope.$on("searchResultsShown", function () {
        getAndSetSearchRequests();
    });


}
SearchController.$inject = ["$scope", "$http", "$stateParams", "$state", "$uibModal", "$timeout", "$sce", "growl", "SearchService", "focus", "ConfigService", "HydraAuthService", "CategoriesService", "$element", "SearchHistoryService"];

angular
    .module('nzbhydraApp')
    .controller('SearchUpdateModalInstanceCtrl', SearchUpdateModalInstanceCtrl);

function SearchUpdateModalInstanceCtrl($scope, $interval, SearchService, $uibModalInstance, searchRequestId, onCancel) {

    var updateSearchMessagesInterval = undefined;
    $scope.messages = undefined;
    $scope.indexerSelectionFinished = false;
    $scope.indexersSelected = 0;
    $scope.indexersFinished = 0;

    updateSearchMessagesInterval = $interval(function () {
        SearchService.getSearchState(searchRequestId).then(function (data) {
                $scope.messages = data.data.messages;
                $scope.indexerSelectionFinished = data.data.indexerSelectionFinished;
                $scope.indexersSelected = data.data.indexersSelected;
                $scope.indexersFinished = data.data.indexersFinished;
                $scope.progressMax = data.data.indexersSelected;
                if ($scope.progressMax > data.data.indexersSelected) {
                    $scope.progressMax = ">=" + data.data.indexersSelected;
                }
            },
            function () {
                $interval.cancel(updateSearchMessagesInterval);
            }
        );
    }, 500);

    $scope.cancelSearch = function () {
        if (angular.isDefined(updateSearchMessagesInterval)) {
            $interval.cancel(updateSearchMessagesInterval);
        }
        onCancel();
        $uibModalInstance.dismiss();
    };


    $scope.$on('$destroy', function () {
        if (angular.isDefined(updateSearchMessagesInterval)) {
            $interval.cancel(updateSearchMessagesInterval);
        }
    });


}
SearchUpdateModalInstanceCtrl.$inject = ["$scope", "$interval", "SearchService", "$uibModalInstance", "searchRequestId", "onCancel"];

angular
    .module('nzbhydraApp')
    .factory('RestartService', RestartService);

function RestartService(growl, NzbHydraControlService, $uibModal) {

    return {
        restart: restart,
        startCountdown: startCountdown
    };


    function restart(message) {
        NzbHydraControlService.restart().then(function (data) {
            startCountdown(message, data.data.message);
        }, function () {
            growl.info("Unable to send restart command.");
        })
    }


    function startCountdown(message, baseUrl) {
        $uibModal.open({
            templateUrl: 'static/html/restart-modal.html',
            controller: RestartModalInstanceCtrl,
            size: "md",
            backdrop: 'static',
            keyboard: false,
            resolve: {
                message: function () {
                    return message;
                },
                baseUrl: function () {
                    return baseUrl;
                }
            }
        });

    }


}
RestartService.$inject = ["growl", "NzbHydraControlService", "$uibModal"];

angular
    .module('nzbhydraApp')
    .controller('RestartModalInstanceCtrl', RestartModalInstanceCtrl);

function RestartModalInstanceCtrl($scope, $timeout, $http, $window, message, baseUrl) {

    message = (angular.isDefined(message) ? message : "");
    $scope.message = message + "Will reload page when NZBHydra is back";
    $scope.baseUrl = baseUrl;
    $scope.pingUrl = angular.isDefined(baseUrl) ? (baseUrl + "/internalapi/control/ping") : "internalapi/control/ping";

    $scope.internalCaR = function (message, timer) {
        if (timer === 45) {
            $scope.message = message + "Restarting takes longer than expected. You might want to check the log to see what's going on.";
        } else {
            $scope.message = message + "Will reload page when NZBHydra is back.";
            $timeout(function () {
                $http.get($scope.pingUrl, {ignoreLoadingBar: true}).then(function () {
                    $timeout(function () {
                        $scope.message = "Reloading page...";
                        $window.location.href = $scope.baseUrl;
                    }, 500);
                }, function () {
                    $scope.internalCaR(message, timer + 1);
                });
            }, 1000);
            $scope.message = message + "Will reload page when NZBHydra is back.";
        }
    };

    //Wait three seconds because otherwise the currently running instance will be found
    $timeout(function () {
        $scope.internalCaR(message, 0);
    }, 3000)

}
RestartModalInstanceCtrl.$inject = ["$scope", "$timeout", "$http", "$window", "message", "baseUrl"];

angular
    .module('nzbhydraApp')
    .factory('NzbHydraControlService', NzbHydraControlService);

function NzbHydraControlService($http) {

    return {
        restart: restart,
        shutdown: shutdown
    };

    function restart() {
        return $http.get("internalapi/control/restart");
    }

    function shutdown() {
        return $http.get("internalapi/control/shutdown");
    }

}
NzbHydraControlService.$inject = ["$http"];

angular
    .module('nzbhydraApp')
    .factory('NzbDownloadService', NzbDownloadService);

function NzbDownloadService($http, ConfigService, DownloaderCategoriesService) {

    var service = {
        download: download,
        getEnabledDownloaders: getEnabledDownloaders
    };

    return service;

    function sendNzbAddCommand(downloader, searchresultids, category) {
        var params = {downloaderName: downloader.name, searchResultIds: searchresultids};
        if (category !== "No category") {
            params["category"] = category;
        }
        return $http.put("internalapi/downloader/addNzbs", params);
    }

    function download(downloader, searchresultids) {

        var category = downloader.defaultCategory;

        if ((_.isUndefined(category) || category === "" || category === null) && category !== "No category") {
            return DownloaderCategoriesService.openCategorySelection(downloader).then(function (category) {
                return sendNzbAddCommand(downloader, searchresultids, category);
            }, function (result) {
                return result;
            });
        } else {
            return sendNzbAddCommand(downloader, searchresultids, category)
        }
    }

    function getEnabledDownloaders() {
        return _.filter(ConfigService.getSafe().downloading.downloaders, "enabled");
    }
}
NzbDownloadService.$inject = ["$http", "ConfigService", "DownloaderCategoriesService"];


angular
    .module('nzbhydraApp')
    .factory('ModalService', ModalService);

function ModalService($uibModal) {

    return {
        open: open
    };

    function open(headline, message, params, size, textAlign) {
        //params example:
        /*
         var p =
         {
         yes: {
         text: "Yes",    //default: Ok
         onYes: function() {}
         },
         no: {               //default: Empty
         text: "No",
         onNo: function () {
         }
         },
         cancel: {
         text: "Cancel", //default: Cancel
         onCancel: function () {
         }
         }
         };
         */
        if (angular.isUndefined(textAlign)) {
            textAlign = "center";
        }
        var modalInstance = $uibModal.open({
            templateUrl: 'static/html/modal.html',
            controller: 'ModalInstanceCtrl',
            size: angular.isDefined(size) ? size : "md",
            resolve: {
                headline: function () {
                    return headline;
                },
                message: function () {
                    return message;
                },
                params: function () {
                    return params;
                },
                textAlign: function () {
                    return textAlign;
                }
            }
        });

        modalInstance.result.then(function () {

        }, function () {

        });
    }

}
ModalService.$inject = ["$uibModal"];

angular
    .module('nzbhydraApp')
    .controller('ModalInstanceCtrl', ModalInstanceCtrl);

function ModalInstanceCtrl($scope, $uibModalInstance, headline, message, params, textAlign) {

    $scope.message = message;
    $scope.headline = headline;
    $scope.params = params;
    $scope.showCancel = angular.isDefined(params) && angular.isDefined(params.cancel);
    $scope.showNo = angular.isDefined(params) && angular.isDefined(params.no);
    $scope.textAlign = textAlign;

    if (angular.isUndefined(params) || angular.isUndefined(params.yes)) {
        $scope.params = {
            yes: {
                text: "Ok"
            }
        }
    } else if (angular.isUndefined(params.yes.text)) {
        params.yes.text = "Yes";
    }

    if (angular.isDefined(params) && angular.isDefined(params.no) && angular.isUndefined($scope.params.no.text)) {
        $scope.params.no.text = "No";
    }

    if (angular.isDefined(params) && angular.isDefined(params.cancel) && angular.isUndefined($scope.params.cancel.text)) {
        $scope.params.cancel.text = "Cancel";
    }

    $scope.yes = function () {
        $uibModalInstance.close();
        if (angular.isDefined(params) && angular.isDefined(params.yes) && angular.isDefined($scope.params.yes.onYes)) {
            $scope.params.yes.onYes();
        }
    };

    $scope.no = function () {
        $uibModalInstance.close();
        if (angular.isDefined(params) && angular.isDefined(params.no) && angular.isDefined($scope.params.no.onNo)) {
            $scope.params.no.onNo($uibModalInstance);
        }
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
        if (angular.isDefined(params.cancel) && angular.isDefined($scope.params.cancel.onCancel)) {
            $scope.params.cancel.onCancel();
        }
    };

    $scope.$on("modal.closing", function (targetScope, reason, c) {
        if (reason == "backdrop click") {
            $scope.cancel();
        }
    });
}
ModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "headline", "message", "params", "textAlign"];

angular
    .module('nzbhydraApp')
    .service('GeneralModalService', GeneralModalService);

function GeneralModalService() {


    this.open = function (msg, template, templateUrl, size, data) {

        //Prevent circular dependency
        var myInjector = angular.injector(["ng", "ui.bootstrap"]);
        var $uibModal = myInjector.get("$uibModal");
        var params = {};

        if (angular.isUndefined(size)) {
            params["size"] = size;
        }
        if (angular.isUndefined(template)) {
            if (angular.isUndefined(templateUrl)) {
                params["template"] = '<pre style="margin:0">' + msg + '</pre>';
            } else {
                params["templateUrl"] = templateUrl;
            }
        } else {
            params["template"] = template;
        }
        params["resolve"] =
            {
                data: function () {
                    return data;
                }
            };

        var modalInstance = $uibModal.open(params);

        modalInstance.result.then();

    };


}
angular
    .module('nzbhydraApp')
    .factory('MigrationService', MigrationService);

function MigrationService($uibModal) {

    return {
        migrate: migrate
    };

    function migrate() {
        var modalInstance = $uibModal.open({
            templateUrl: 'static/html/migration-modal.html',
            controller: 'MigrationModalInstanceCtrl',
            size: "md",
            backdrop: 'static',
            keyboard: false
        });

        modalInstance.result.then(function () {
            ConfigService.reloadConfig();
        }, function () {

        });
    }
}
MigrationService.$inject = ["$uibModal"];

angular
    .module('nzbhydraApp')
    .controller('MigrationModalInstanceCtrl', MigrationModalInstanceCtrl);

function MigrationModalInstanceCtrl($scope, $uibModalInstance, $interval, $http, blockUI, ModalService) {

    $scope.baseUrl = "http://127.0.0.1:5075";

    $scope.foo = {isMigrating: false, baseUrl: $scope.baseUrl};

    $scope.yes = function () {
        var params;
        var url;
        if ($scope.foo.baseUrl && $scope.foo.isFileBasedOpen) {
            $scope.foo.baseUrl = null;
        }
        //blockUI.start("Starting migration. This may take a while...");
        if ($scope.foo.isUrlBasedOpen) {
            url = "internalapi/migration/url";
            params = {baseurl: $scope.foo.baseUrl};
        } else {
            url = "internalapi/migration/files";
            params = {settingsCfgFile: $scope.foo.settingsCfgFile, dbFile: $scope.foo.nzbhydraDbFile};
        }

        $scope.foo.isMigrating = true;

        var updateMigrationMessagesInterval = $interval(function () {
            $http.get("internalapi/migration/messages").then(function (data) {
                    $scope.foo.messages = data.data;
                },
                function () {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $scope.foo.isMigrating = false;
                }
            );
        }, 500);

        $http.get(url, {params: params}).then(function (response) {
                var message;
                blockUI.stop();
                var data = response.data;
                if (!data.requirementsMet) {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $scope.foo.isMigrating = false;
                    ModalService.open("Requirements not met", "An error occurred while preparing the migration:<br>" + data.error, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else if (!data.configMigrated) {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $uibModalInstance.dismiss();
                    $scope.foo.isMigrating = false;
                    ModalService.open("Config migration failed", "An error occurred while migrating the config. Migration failed:<br>" + data.error, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else if (!data.databaseMigrated) {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $uibModalInstance.dismiss();
                    $scope.foo.isMigrating = false;
                    message = "An error occurred while migrating the database.<br>" + data.error + "<br>. The config was migrated successfully though.";
                    if (data.messages.length > 0) {
                        message += '<br><br><span class="warning">The following warnings resulted from the config migration:<ul style="list-style: none">';
                        _.forEach(data.messages, function (msg) {
                            message += "<li>" + msg + "</li>";
                        });
                        message += "</ul></span>";
                    }
                    ModalService.open("Database migration failed", message, {
                        yes: {
                            text: "OK"
                        }
                    });
                } else {
                    $interval.cancel(updateMigrationMessagesInterval);
                    $uibModalInstance.dismiss();
                    $scope.foo.isMigrating = false;
                    message = "The migration was completed successfully.";
                    if (data.warningMessages.length > 0) {
                        message += '<br><br><span class="warning">The following warnings resulted from the config migration:<ul style="list-style: none">';
                        _.forEach(data.warningMessages, function (msg) {
                            message += "<li>" + msg + "</li>";
                        });
                        message += "</ul></span>";
                    }
                    message += "<br><br>NZBHydra needs to restart for the changes to be effective.";
                    ModalService.open("Migration successful", message, {
                        yes: {
                            onYes: function () {
                                RestartService.startCountdown();
                            },
                            text: "Restart"
                        },
                        cancel: {
                            onCancel: function () {

                            },
                            text: "Not now"
                        }
                    });
                }
            }
        );

        $scope.$on('$destroy', function () {
            if (angular.isDefined(updateMigrationMessagesInterval)) {
                $interval.cancel(updateMigrationMessagesInterval);
            }
        });

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };

}
MigrationModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "$interval", "$http", "blockUI", "ModalService"];

angular
    .module('nzbhydraApp')
    .controller('LoginController', LoginController);

function LoginController($scope, RequestsErrorHandler, $state, HydraAuthService, growl) {
    $scope.user = {};
    $scope.login = function () {
        RequestsErrorHandler.specificallyHandled(function () {
            HydraAuthService.login($scope.user.username, $scope.user.password).then(function () {
                HydraAuthService.setLoggedInByForm();
                growl.info("Login successful!");
                $state.go("root.search");
            }, function () {
                growl.error("Login failed!")
            });
        });
    }
}
LoginController.$inject = ["$scope", "RequestsErrorHandler", "$state", "HydraAuthService", "growl"];

angular
    .module('nzbhydraApp')
    .controller('IndexerStatusesController', IndexerStatusesController);

function IndexerStatusesController($scope, $http, statuses) {
    $scope.statuses = statuses.data;

    $scope.isInPast = function (epochSeconds) {
        return epochSeconds < moment().unix();
    };

    $scope.enable = function (indexerName) {
        $http.post("internalapi/indexerstatuses/enable/" + encodeURI(indexerName)).then(function (response) {
            $scope.statuses = response.data;
        });
    }
}
IndexerStatusesController.$inject = ["$scope", "$http", "statuses"];

angular
    .module('nzbhydraApp')
    .filter('formatDate', formatDate);

function formatDate(dateFilter) {
    return function (timestamp, hidePast) {
        if (timestamp) {
            if (timestamp * 1000 < (new Date).getTime() && hidePast) {
                return ""; //
            }

            var t = timestamp * 1000;
            t = dateFilter(t, 'yyyy-MM-dd HH:mm');
            return t;
        } else {
            return "";
        }
    }
}
formatDate.$inject = ["dateFilter"];

angular
    .module('nzbhydraApp')
    .filter('reformatDate', reformatDate);

function reformatDate() {
    return function (date) {
        //Date in database is saved as UTC without timezone information
        return moment.unix(date).local().format("YYYY-MM-DD HH:mm");

    }
}
angular
    .module('nzbhydraApp')
    .controller('IndexController', IndexController);

function IndexController($scope, $http, $stateParams, $state) {

    $state.go("root.search");
}
IndexController.$inject = ["$scope", "$http", "$stateParams", "$state"];

angular
    .module('nzbhydraApp')
    .factory('HydraAuthService', HydraAuthService);

function HydraAuthService($q, $rootScope, $http, bootstrapped, $httpParamSerializerJQLike, $state) {

    var loggedIn = bootstrapped.username;


    return {
        isLoggedIn: isLoggedIn,
        login: login,
        askForPassword: askForPassword,
        logout: logout,
        setLoggedInByForm: setLoggedInByForm,
        getUserRights: getUserRights,
        setLoggedInByBasic: setLoggedInByBasic,
        getUserName: getUserName,
        getUserInfos: getUserInfos
    };

    function getUserInfos() {
        return bootstrapped;
    }

    function isLoggedIn() {
        return bootstrapped.username;
    }

    function setLoggedInByForm() {
        $rootScope.$broadcast("user:loggedIn");
    }


    function setLoggedInByBasic(_maySeeStats, _maySeeAdmin, _username) {
    }

    function login(username, password) {
        var deferred = $q.defer();
        //return $http.post("login", data = {username: username, password: password})
        return $http({
            url: "login",
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded' // Note the appropriate header
            },
            data: $httpParamSerializerJQLike({username: username, password: password})
        })
            .then(function () {
                $http.get("internalapi/userinfos").then(function (data) {
                    bootstrapped = data.data;
                    loggedIn = true;
                    $rootScope.$broadcast("user:loggedIn");
                    deferred.resolve();
                });
            });
    }

    function askForPassword(params) {
        return $http.get("internalapi/askpassword", {params: params}).then(function (data) {
            bootstrapped = data.data;
            return bootstrapped;
        });
    }

    function logout() {
        var deferred = $q.defer();
        return $http.post("logout").then(function () {
            $http.get("internalapi/userinfos").then(function (data) {
                bootstrapped = data.data;
                $rootScope.$broadcast("user:loggedOut");
                loggedIn = false;
                if (bootstrapped.maySeeSearch) {
                    $state.go("root.search");
                } else {
                    $state.go("root.login");
                }
                //window.location.reload(false);
                deferred.resolve();
            });
        });
    }

    function getUserRights() {
        var userInfos = getUserInfos();
        return {maySeeStats: userInfos.maySeeStats, maySeeAdmin: userInfos.maySeeAdmin, maySeeSearch: userInfos.maySeeSearch};
    }

    function getUserName() {
        return bootstrapped.username;
    }


}
HydraAuthService.$inject = ["$q", "$rootScope", "$http", "bootstrapped", "$httpParamSerializerJQLike", "$state"];
angular
    .module('nzbhydraApp')
    .controller('HeaderController', HeaderController);

function HeaderController($scope, $state, growl, HydraAuthService, $state) {


    $scope.showLoginout = false;
    $scope.oldUserName = null;

    function update(event) {

        $scope.userInfos = HydraAuthService.getUserInfos();
        if (!$scope.userInfos.authConfigured) {
            $scope.showSearch = true;
            $scope.showAdmin = true;
            $scope.showStats = true;
            $scope.showLoginout = false;
        } else {
            if ($scope.userInfos.username) {
                $scope.showSearch = true;
                $scope.showAdmin = $scope.userInfos.maySeeAdmin || !$scope.userInfos.adminRestricted;
                $scope.showStats = $scope.userInfos.maySeeStats || !$scope.userInfos.statsRestricted;
                $scope.showLoginout = true;
                $scope.username = $scope.userInfos.username;
                $scope.loginlogoutText = "Logout " + $scope.username;
                $scope.oldUserName = $scope.username;
            } else {
                $scope.showAdmin = !$scope.userInfos.adminRestricted;
                $scope.showStats = !$scope.userInfos.statsRestricted;
                $scope.showSearch = !$scope.userInfos.searchRestricted;
                $scope.loginlogoutText = "Login";
                $scope.showLoginout = ($scope.userInfos.adminRestricted || $scope.userInfos.statsRestricted || $scope.userInfos.searchRestricted) && event !== "loggedOut" && !$state.is("root.login");
                $scope.username = "";
            }
        }
    }

    update();


    $scope.$on("user:loggedIn", function (event, data) {
        update("loggedIn");
    });

    $scope.$on("user:loggedOut", function (event, data) {
        update("loggedOut");
    });

    $scope.loginout = function () {
        if (HydraAuthService.isLoggedIn()) {
            HydraAuthService.logout().then(function () {
                if ($scope.userInfos.authType === "BASIC") {
                    growl.info("Logged out. Close your browser to make sure session is closed.");
                }
                else if ($scope.userInfos.authType === "FORM") {
                    growl.info("Logged out");
                }
                update();
                //$state.go("root.search", null, {reload: true});
            });

        } else {
            if ($scope.userInfos.authType === "BASIC") {
                var params = {};
                if ($scope.oldUserName) {
                    params = {
                        old_username: $scope.oldUserName
                    }
                }
                HydraAuthService.askForPassword(params).then(function () {
                    growl.info("Login successful!");
                    $scope.oldUserName = null;
                    update("loggedIn");
                    $state.go("root.search");
                })
            } else if ($scope.userInfos.authType === "FORM") {
                $state.go("root.login");
            } else {
                growl.info("You shouldn't need to login but here you go!");
            }
        }
    }
}
HeaderController.$inject = ["$scope", "$state", "growl", "HydraAuthService", "$state"];

var HEADER_NAME = 'NzbHydra2-Handle-Errors-Generically';
var specificallyHandleInProgress = false;

nzbhydraapp.factory('RequestsErrorHandler', ["$q", "growl", "blockUI", "GeneralModalService", function ($q, growl, blockUI, GeneralModalService) {
    return {
        // --- The user's API for claiming responsiblity for requests ---
        specificallyHandled: function (specificallyHandledBlock) {
            specificallyHandleInProgress = true;
            try {
                return specificallyHandledBlock();
            } finally {
                specificallyHandleInProgress = false;
            }
        },

        // --- Response interceptor for handling errors generically ---
        responseError: function (rejection) {
            blockUI.reset();
            var shouldHandle = (rejection && rejection.config && rejection.status !== 403 && rejection.config.headers && rejection.config.headers[HEADER_NAME] && !rejection.config.url.contains("logerror") && !rejection.config.url.contains("/ping") && !rejection.config.alreadyHandled);
            if (shouldHandle) {
                if (rejection.data) {

                    var message = "An error occurred:<br>" + rejection.data.status + ": " + rejection.data.error;
                    if (rejection.data.path) {
                        message += "<br><br>Path: " + rejection.data.path;
                    }
                    if (message !== "No message available") {
                        message += "<br><br>Message: " + rejection.data.message;
                    } else {
                        message += "<br><br>Exception: " + rejection.data.exception;
                    }
                } else {
                    message = "An unknown error occurred while communicating with NZBHydra:<br><br>" + JSON.stringify(rejection);
                }
                GeneralModalService.open(message);

            } else if (rejection && rejection.config && rejection.config.headers && rejection.config.headers[HEADER_NAME] && rejection.config.url.contains("logerror")) {
                console.log("Not handling connection error while sending exception to server");
            }

            return $q.reject(rejection);
        }
    };
}]);

nzbhydraapp.config(['$provide', '$httpProvider', function ($provide, $httpProvider) {
    $httpProvider.interceptors.push('RequestsErrorHandler');

    // --- Decorate $http to add a special header by default ---

    function addHeaderToConfig(config) {
        config = config || {};
        config.headers = config.headers || {};

        // Add the header unless user asked to handle errors himself
        if (!specificallyHandleInProgress) {
            config.headers[HEADER_NAME] = true;
        }

        return config;
    }

    // The rest here is mostly boilerplate needed to decorate $http safely
    $provide.decorator('$http', ['$delegate', function ($delegate) {
        function decorateRegularCall(method) {
            return function (url, config) {
                return $delegate[method](url, addHeaderToConfig(config));
            };
        }

        function decorateDataCall(method) {
            return function (url, data, config) {
                return $delegate[method](url, data, addHeaderToConfig(config));
            };
        }

        function copyNotOverriddenAttributes(newHttp) {
            for (var attr in $delegate) {
                if (!newHttp.hasOwnProperty(attr)) {
                    if (typeof($delegate[attr]) === 'function') {
                        newHttp[attr] = function () {
                            return $delegate.apply($delegate, arguments);
                        };
                    } else {
                        newHttp[attr] = $delegate[attr];
                    }
                }
            }
        }

        var newHttp = function (config) {
            return $delegate(addHeaderToConfig(config));
        };

        newHttp.get = decorateRegularCall('get');
        newHttp.delete = decorateRegularCall('delete');
        newHttp.head = decorateRegularCall('head');
        newHttp.jsonp = decorateRegularCall('jsonp');
        newHttp.post = decorateDataCall('post');
        newHttp.put = decorateDataCall('put');

        copyNotOverriddenAttributes(newHttp);

        return newHttp;
    }]);
}]);
hashCode = function (s) {
    return s.split("").reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a
    }, 0);
};

angular
    .module('nzbhydraApp').run(["formlyConfig", "formlyValidationMessages", function (formlyConfig, formlyValidationMessages) {
    formlyValidationMessages.addStringMessage('required', 'This field is required');
    formlyConfig.extras.errorExistsAndShouldBeVisibleExpression = 'fc.$touched || form.$submitted';

}]);

angular
    .module('nzbhydraApp')
    .config(["formlyConfigProvider", function config(formlyConfigProvider) {
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
                '<legend>{{options.templateOptions.label}}</legend>',
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
                    FileSelectionService.open($scope.model[$scope.options.key], $scope.to.type).then(function(selection) {
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
                    var url = "internalapi/indexer/checkCaps";
                    ConfigBoxService.checkCaps(url, $scope.model).then(function (data) {
                        //Formly doesn't allow replacing the model so we need to set all the relevant values ourselves
                        $scope.model.supportedSearchIds = data.indexerConfig.supportedSearchIds;
                        $scope.model.supportedSearchTypes = data.indexerConfig.supportedSearchTypes;
                        $scope.model.categoryMapping = data.indexerConfig.categoryMapping;
                        $scope.model.configComplete = data.indexerConfig.configComplete;
                        $scope.model.allCapsChecked = data.indexerConfig.allCapsChecked;
                        $scope.model.enabled = data.indexerConfig.enabled;
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
                    ngOptions: 'option[to.valueProp] as option in to.options | filter: $select.search',
                    valueProp: 'id',
                    labelProp: 'label',
                    getPlaceholder: function () {
                        return "";
                    }
                }
            },
            templateUrl: 'ui-select-multiple.html',
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
            controller: function ($scope, $uibModal, growl) {
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
                                return $scope.options.data.fieldsFunction(model, parentModel, isInitial, angular.injector());
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

    }]);


angular.module('nzbhydraApp').controller('ConfigBoxInstanceController', ["$scope", "$q", "$uibModalInstance", "$http", "model", "fields", "isInitial", "parentModel", "data", "growl", function ($scope, $q, $uibModalInstance, $http, model, fields, isInitial, parentModel, data, growl) {

    $scope.model = model;
    $scope.fields = fields;
    $scope.isInitial = isInitial;
    $scope.allowDelete = data.allowDeleteFunction(model);
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
}]);

angular
    .module('nzbhydraApp')
    .factory('ConfigBoxService', ConfigBoxService);

function ConfigBoxService($http, $q) {

    return {
        checkConnection: checkConnection,
        checkCaps: checkCaps
    };

    function checkConnection(url, settings) {
        var deferred = $q.defer();

        $http.post(url, settings).success(function (result) {
            //Using ng-class and a scope variable doesn't work for some reason, is only updated at second click 
            if (result.successful) {
                deferred.resolve({checked: true, message: null, model: result});
            } else {
                deferred.reject({checked: true, message: result.message});
            }
        }).error(function (result) {
            deferred.reject({checked: false, message: result.message});
        });

        return deferred.promise;
    }

    function checkCaps(url, model) {
        var deferred = $q.defer();

        $http.post(url, model).success(function (data) {
            deferred.resolve(data, model);

        }).error(function () {
            deferred.reject("Unknown error");
        });

        return deferred.promise;
    }

}
ConfigBoxService.$inject = ["$http", "$q"];





var filters = angular.module('filters', []);

filters.filter('bytes', function () {
    return function (bytes) {
        return filesize(bytes);
    }
});

filters
    .filter('unsafe', ['$sce', function($sce){
        return function(text) {
            console.log(text);
            return $sce.trustAsHtml(text);
        };
    }]);
angular
    .module('nzbhydraApp')
    .factory('FileSelectionService', FileSelectionService);

function FileSelectionService($http, $q, $uibModal) {

    var categories = {};
    var selectedCategory = {};

    var service = {
        open: open
    };

    var deferred;

    return service;


    function open(fullPath, type) {
        var instance = $uibModal.open({
            templateUrl: 'static/html/file-selection.html',
            controller: 'FileSelectionModalController',
            size: "md",
            resolve: {
                data: function () {
                    return $http.post("internalapi/config/folderlisting", {fullPath: angular.isDefined(fullPath) ? fullPath : null, goUp: false, type: type});
                },
                type: function () {
                    return type;
                }
            }
        });

        instance.result.then(function (selection) {
                console.log(selection);
                deferred.resolve(selection);
            }, function () {
                deferred.reject("dismissed");
            }
        );
        deferred = $q.defer();
        return deferred.promise;
    }

}
FileSelectionService.$inject = ["$http", "$q", "$uibModal"];

angular
    .module('nzbhydraApp').controller('FileSelectionModalController', ["$scope", "$http", "$uibModalInstance", "FileSelectionService", "data", "type", function ($scope, $http, $uibModalInstance, FileSelectionService, data, type) {

    $scope.type = type;
    $scope.showType = type === "file" ? "File" : "Folder";
    $scope.data = data.data;

    $scope.select = function (fileOrFolder, selectType) {
        if (selectType === "file" && type === "file") {
            $uibModalInstance.close(fileOrFolder.fullPath);
        } else if (selectType === "folder") {
            $http.post("internalapi/config/folderlisting", {fullPath: fileOrFolder.fullPath, type: type, goUp: false}).then(function (data) {
                $scope.data = data.data;
            })
        }
    };

    $scope.goUp = function () {
        $http.post("internalapi/config/folderlisting", {fullPath: $scope.data.fullPath, type: type, goUp: true}).then(function (data) {
            $scope.data = data.data;
        })
    };

    $scope.submit = function () {
        $uibModalInstance.close($scope.data.fullPath);
    }

}]);
angular
    .module('nzbhydraApp')
    .factory('FileDownloadService', FileDownloadService);

function FileDownloadService($http, growl) {

    var service = {
        downloadFile: downloadFile
    };

    return service;

    function downloadFile(link, filename, method, data) {
        return $http({method: method, url: link, data: data, responseType: 'arraybuffer'}).success(function (data, status, headers, config) {
            var a = document.createElement('a');
            var blob = new Blob([data], {'type': "application/octet-stream"});
            a.href = URL.createObjectURL(blob);
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }).error(function (data, status, headers, config) {
            growl.error(status);
        });

    }


}
FileDownloadService.$inject = ["$http", "growl"];


angular
    .module('nzbhydraApp')
    .factory('DownloaderCategoriesService', DownloaderCategoriesService);

function DownloaderCategoriesService($http, $q, $uibModal) {

    var categories = {};
    var selectedCategory = {};

    var service = {
        get: getCategories,
        invalidate: invalidate,
        select: select,
        openCategorySelection: openCategorySelection
    };

    var deferred;

    return service;


    function getCategories(downloader) {
        function loadAll() {
            if (angular.isDefined(categories) && angular.isDefined(categories[downloader])) {
                var deferred = $q.defer();
                deferred.resolve(categories[downloader]);
                return deferred.promise;
            }

            return $http.get(encodeURI('internalapi/downloader/' + downloader.name + "/categories"))
                .then(function (categoriesResponse) {
                    categories[downloader] = categoriesResponse.data;
                    return categoriesResponse.data;

                }, function (error) {
                    throw error;
                });
        }

        return loadAll().then(function (categories) {
            return categories;
        }, function (error) {
            throw error;
        });
    }


    function openCategorySelection(downloader) {
        var instance = $uibModal.open({
            templateUrl: 'static/html/directives/addable-nzb-modal.html',
            controller: 'DownloaderCategorySelectionController',
            size: "sm",
            resolve: {
                categories: function () {
                    return getCategories(downloader)
                }
            }
        });

        instance.result.then(function() {}, function() {
            deferred.reject("dismissed");
            }
        );
        deferred = $q.defer();
        return deferred.promise;
    }

    function select(category) {
        selectedCategory = category;

        deferred.resolve(category);
    }

    function invalidate() {

        categories = undefined;
    }
}
DownloaderCategoriesService.$inject = ["$http", "$q", "$uibModal"];

angular
    .module('nzbhydraApp').controller('DownloaderCategorySelectionController', ["$scope", "$uibModalInstance", "DownloaderCategoriesService", "categories", function ($scope, $uibModalInstance, DownloaderCategoriesService, categories) {

    $scope.categories = categories;
    $scope.select = function (category) {
        DownloaderCategoriesService.select(category);
        $uibModalInstance.close($scope);
    }
}]);
angular
    .module('nzbhydraApp')
    .controller('DownloadHistoryController', DownloadHistoryController);


function DownloadHistoryController($scope, StatsService, downloads, ConfigService, $timeout, $sce) {
    $scope.limit = 100;
    $scope.pagination = {
        current: 1
    };
    var sortModel = {
        column: "time",
        sortMode: 2
    };
    $timeout(function () {
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode);
    }, 10);
    $scope.filterModel = {};

    //Filter options
    $scope.indexersForFiltering = [];
    _.forEach(ConfigService.getSafe().indexers, function (indexer) {
        $scope.indexersForFiltering.push({label: indexer.name, id: indexer.name})
    });
    $scope.preselectedTimeInterval = {beforeDate: null, afterDate: null};
    $scope.successfulForFiltering = [{label: "Succesful", id: 'SUCCESSFUL'}, {label: "Connection error", id: 'CONNECTION_ERROR'}, {label: "API error", id: 'API_ERROR'}, {
        label: "Auth error",
        id: 'AUTH_ERROR'
    }, {label: "Hydra error", id: 'HYDRA_ERROR'}, {label: "Unknown", id: 'UNKNOWN'}];
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: 'API'}, {label: "Internal", value: 'INTERNAL'}];


    //Preloaded data
    $scope.nzbDownloads = downloads.data.content;
    $scope.totalDownloads = downloads.data.totalElements;


    $scope.update = function () {
        StatsService.getDownloadHistory($scope.pagination.current, $scope.limit, $scope.filterModel, sortModel).then(function (downloads) {
            $scope.nzbDownloads = downloads.data.content;
            $scope.totalDownloads = downloads.data.totalElements;
        });
    };


    $scope.$on("sort", function (event, column, sortMode) {
        if (sortMode === 0) {
            column = "time";
            sortMode = 2;
        }
        sortModel = {
            column: column,
            sortMode: sortMode
        };
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode);
        $scope.update();
    });

    $scope.getStatusIcon = function (result) {
        var spans;
        if (result === "NONE" || result === "REQUESTED") {
            spans = '<span class="glyphicon glyphicon-question-sign"></span>'
        }
        if (result === "INTERNAL_ERROR") {
            spans = '<span class="glyphicon glyphicon-remove"></span>'
        }
        if (result === "INTERNAL_ERROR") {
            spans = '<span class="glyphicon glyphicon-remove"></span>'
        }
        if (result === 'NZB_DOWNLOAD_SUCCESSFUL') {
            spans = '<span class="glyphicon glyphicon-ok"></span>';
        }
        if (result === 'NZB_DOWNLOAD_ERROR') {
            spans = '<span class="glyphicon glyphicon-remove"></span>';
        }
        if (result === 'NZB_ADDED') {
            spans = '<span class="glyphicon glyphicon-ok" style="margin-right: 3px"></span><span class="glyphicon glyphicon-question-sign"></span>';
        }
        if (result === 'NZB_NOT_ADDED' || result === 'NZB_ADD_ERROR' || result === 'NZB_ADD_REJECTED') {
            spans = '<span class="glyphicon glyphicon-ok" style="margin-right: 3px"></span><span class="glyphicon glyphicon-remove"></span>';
        }
        if (result === 'CONTENT_DOWNLOAD_SUCCESSFUL') {
            spans = '<span class="glyphicon glyphicon-ok" style="margin-right: 3px"><span class="glyphicon glyphicon-ok"></span><span class="glyphicon glyphicon-ok"></span>';
        }
        if (result === 'CONTENT_DOWNLOAD_ERROR' || result === 'CONTENT_DOWNLOAD_WARNING') {
            spans = '<span class="glyphicon glyphicon-ok" style="margin-right: 3px"><span class="glyphicon glyphicon-ok"></span><span class="glyphicon glyphicon-remove"></span>';
        }
        return $sce.trustAsHtml('<span tooltip-placement="auto top" uib-tooltip="' + result + '">' + spans + '</span>');

    };


    $scope.$on("filter", function (event, column, filterModel, isActive) {
        if (filterModel.filterValue) {
            $scope.filterModel[column] = filterModel;
        } else {
            delete $scope.filterModel[column];
        }
        $scope.update();
    })

}
DownloadHistoryController.$inject = ["$scope", "StatsService", "downloads", "ConfigService", "$timeout", "$sce"];

angular
    .module('nzbhydraApp')
    .filter('reformatDateEpoch', reformatDateEpoch);

function reformatDateEpoch() {
    return function (date) {
        return moment.unix(date).local().format("YYYY-MM-DD HH:mm");

    }
}
angular
    .module('nzbhydraApp')
    .factory('ConfigService', ConfigService);

function ConfigService($http, $q, $cacheFactory, bootstrapped) {

    var cache = $cacheFactory("nzbhydra");
    var safeConfig = bootstrapped.safeConfig;

    return {
        set: set,
        get: get,
        getSafe: getSafe,
        invalidateSafe: invalidateSafe,
        maySeeAdminArea: maySeeAdminArea,
        reloadConfig: reloadConfig
    };

    function set(newConfig, ignoreWarnings) {
        var deferred = $q.defer();
        $http.put('internalapi/config', newConfig)
            .then(function (response) {
                if (response.data.ok && (ignoreWarnings || response.data.warningMessages.length === 0)) {
                    cache.put("config", newConfig);
                    invalidateSafe();
                }
                deferred.resolve(response);

            }, function (errorresponse) {
                console.log("Error saving settings:");
                console.log(errorresponse);
                deferred.reject(errorresponse);
            });
        return deferred.promise;
    }

    function reloadConfig() {
        return $http.get('internalapi/config/reload').then(function (data) {
            return data.data;
        });
    }

    function get() {
        var config = cache.get("config");
        if (angular.isUndefined(config)) {
            config = $http.get('internalapi/config').then(function (data) {
                return data.data;
            });
            cache.put("config", config);
        }

        return config;
    }

    function getSafe() {
        return safeConfig;
    }

    function invalidateSafe() {
        $http.get('internalapi/config/safe').then(function (data) {
            safeConfig = data.data;
        });
    }

    function maySeeAdminArea() {
        function loadAll() {
            var maySeeAdminArea = cache.get("maySeeAdminArea");
            if (!angular.isUndefined(maySeeAdminArea)) {
                var deferred = $q.defer();
                deferred.resolve(maySeeAdminArea);
                return deferred.promise;
            }

            return $http.get('internalapi/mayseeadminarea')
                .then(function (configResponse) {
                    var config = configResponse.data;
                    cache.put("maySeeAdminArea", config);
                    return configResponse.data;
                });
        }

        return loadAll().then(function (maySeeAdminArea) {
            return maySeeAdminArea;
        });
    }
}
ConfigService.$inject = ["$http", "$q", "$cacheFactory", "bootstrapped"];
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
                                placeholder: 'IPv4 address to bind to',
                                help: 'I strongly recommend using a reverse proxy instead of exposing this directly. Requires restart.'
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
                                placeholder: '5056',
                                help: 'Requires restart'
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
                                help: 'Adapt when using a reverse proxy. See <a href="https://github.com/theotherp/nzbhydra2/wiki/Reverse-proxies" target="_blank">wiki</a>'
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
                                        label: 'Bypass local addresses'
                                    }
                                },
                                {
                                    key: 'proxyIgnoreDomains',
                                    type: 'horizontalInput',
                                    hideExpression: 'model.proxyType==="NONE"',
                                    templateOptions: {
                                        type: 'text',
                                        help: 'Separate by comma. You can use wildcards (*). Case insensitive',
                                        label: 'Bypass domains'
                                    }
                                }
                            ]
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
                                help: 'Reload page after restart',
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
                                help: 'Alphanumeric only',
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
                                help: 'Redirect external links to hide your instance. Insert $s for target URL.'
                            }
                        },
                        {
                            key: 'verifySsl',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                label: 'Verify SSL certificates',
                                help: 'If enabled only valid/known SSL certificates will be accepted when accessing indexers. Change requires restart. See <a href="https://github.com/theotherp/nzbhydra2/wiki/SSL-verification-errors" target="_blank">wiki</a>'
                            }
                        },
                        {
                            key: 'sniDisabledFor',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Disable SNI',
                                help: 'Add a host if you get an "unrecognized_name" error. Apply words with return key. See <a href="https://github.com/theotherp/nzbhydra2/wiki/SSL-verification-errors" target="_blank">wiki</a>'
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
                        },
                        {
                            key: 'markersToLog',
                            type: 'horizontalMultiselect',
                            templateOptions: {
                                label: 'Log markers',
                                help: 'Select certain sections for more output on debug level',
                                options: [
                                    {label: 'Removed trailing words', id: 'TRAILING'},
                                    {label: 'Rejected results', id: 'RESULT_ACCEPTOR'},
                                    {label: 'Performance', id: 'PERFORMANCE'}
                                ],
                                hideExpression: 'model.consolelevel !== "DEBUG" && model.logfilelevel !== "DEBUG"', //Doesn't work...
                                placeholder: 'None'
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
                            key: 'backupEverySunday',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Backup every sunday'
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
                                help: '128M should suffice except when working with big databases / many indexers. See <a href="https://github.com/theotherp/nzbhydra2/wiki/Memory-requirements" target="_blank">wiki</a>'
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
                                help: "Generate queries for indexers which do not support ID based searches"
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
                                help: "When no results were found for a query ID search again using a generated query (on indexer level)"
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
                        label: 'Result filters'
                    },
                    fieldGroup: [
                        {
                            key: 'applyRestrictions',
                            type: 'horizontalSelect',
                            templateOptions: {
                                label: 'Apply word filters',
                                options: [
                                    {name: 'Internal searches', value: 'INTERNAL'},
                                    {name: 'API searches', value: 'API'},
                                    {name: 'All searches', value: 'BOTH'},
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
                            }
                        },
                        {
                            key: 'forbiddenRegex',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden regex',
                                help: 'Must not be present in a title (title is converted to lowercase before)'
                            }
                        },
                        {
                            key: 'requiredWords',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Required words',
                                help: "Only results with at least one of these words in the title will be used. Title is converted to lowercase before. Apply words with return key."
                            }
                        },
                        {
                            key: 'requiredRegex',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Required regex',
                                help: 'Must be present in a title (title is converted to lowercase before)'
                            }
                        },

                        {
                            key: 'forbiddenGroups',
                            type: 'horizontalChips',
                            templateOptions: {
                                type: 'text',
                                label: 'Forbidden groups',
                                help: 'Posts from any groups containing any of these words will be ignored. Apply words with return key.'
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
                                help: 'When enabled accessing tools will think the search was completed successfully but without results'
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
                                help: 'Removed from title if it ends with either of these. Case insensitive and disregards leading/trailing spaces. Apply words with return key.'
                            }
                        },
                        {
                            key: 'useOriginalCategories',
                            type: 'horizontalSwitch',
                            templateOptions: {
                                type: 'switch',
                                label: 'Use original categories',
                                help: 'Enable to use the category descriptions provided by the indexer'
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
                                        help: 'Meta data from searches is stored in the database. When they\'re deleted links to Hydra become invalid.'
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
                                    key: 'showQuickFilterButtons',
                                    type: 'horizontalSwitch',
                                    templateOptions: {
                                        type: 'switch',
                                        label: 'Show quick filter',
                                        help: 'Show quick filter buttons for movie and TV results'
                                    }
                                }
                            ]
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
                                key: 'requiredWords',
                                type: 'horizontalChips',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Required words',
                                    help: "Title is converted to lowercase before. Apply words with return key."
                                }
                            },
                            {
                                key: 'requiredRegex',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Required regex',
                                    help: 'Must be present in a title (title is converted to lowercase before)'
                                }
                            },
                            {
                                key: 'forbiddenWords',
                                type: 'horizontalChips',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Forbidden words',
                                    help: "Title is converted to lowercase before. Apply words with return key."
                                }
                            },
                            {
                                key: 'forbiddenRegex',
                                type: 'horizontalInput',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Forbidden regex',
                                    help: 'Must not be present in a title (title is converted to lowercase before)'
                                }
                            },
                            {
                                key: 'applyRestrictionsType',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Apply restrictions',
                                    options: [
                                        {name: 'Internal searches', value: 'INTERNAL'},
                                        {name: 'API searches', value: 'API'},
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
                                    help: "Will set these values on the search page"
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
                                key: 'applySizeLimitsToApi',
                                type: 'horizontalSwitch',
                                templateOptions: {
                                    type: 'switch',
                                    label: 'Limit API results size',
                                    help: "Enable to apply the size preset to API results from this category"
                                }
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
                                type: 'horizontalChips',
                                templateOptions: {
                                    type: 'text',
                                    label: 'Newznab categories',
                                    help: 'Map newznab categories to Hydra categories. Used for parsing and when searching internally. Apply words with return key.'
                                }
                            },
                            {
                                key: 'ignoreResultsFrom',
                                type: 'horizontalSelect',
                                templateOptions: {
                                    label: 'Ignore results',
                                    options: [
                                        {name: 'For internal searches', value: 'INTERNAL'},
                                        {name: 'For API searches', value: 'API'},
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
                            searchType: "SEARCH",
                            subType: "NONE"
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
                        }
                    ]

                },
                {
                    wrapper: 'fieldset',
                    key: 'downloaders',
                    templateOptions: {label: 'Downloaders'},
                    fieldGroup: [
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
                    ]
                }
            ],


            indexers: [
                {
                    type: "arrayConfig",
                    data: {
                        defaultModel: {
                            allCapsChecked: false,
                            apiKey: null,
                            backend: 'NEWZNAB',
                            configComplete: false,
                            categoryMapping: null,
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
                            supportedSearchIds: undefined,
                            supportedSearchTypes: undefined,
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
ConfigFields.$inject = ["$injector"];


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
                allCapsChecked: true,
                configComplete: true,
                name: "Jackett/Cardigann",
                host: "http://127.0.0.1:9117/torznab/YOURTRACKER",
                supportedSearchIds: [],
                supportedSearchTypes: [],
                searchModuleType: "TORZNAB",
                enabledForSearchSource: "BOTH"
            }
        ],
        [
            {
                allCapsChecked: true,
                enabledForSearchSource: "BOTH",
                categories: ["Anime"],
                configComplete: true,
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
                allCapsChecked: true,
                enabledForSearchSource: "INTERNAL",
                categories: [],
                configComplete: true,
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
                allCapsChecked: true,
                enabledForSearchSource: "INTERNAL",
                categories: [],
                configComplete: true,
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
    if (model.searchModuleType === "TORZNAB") {
        fieldset.push({
            type: 'help',
            templateOptions: {
                type: 'help',
                lines: ["Torznab indexers can only be used for internal searches or dedicated searches using /torznab/api"]
            }
        });
    } else if (model.searchModuleType === "NEWZNAB" && !isInitial) {
        var message;
        var cssClass;
        if (!model.configComplete) {
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

    fieldset.push({
        key: 'enabled',
        type: 'horizontalSwitch',
        hideExpression: '!model.configComplete',
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
                type: 'passwordSwitch',
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
    fieldset.push(
        {
            key: 'enabledForSearchSource',
            type: 'horizontalSelect',
            templateOptions: {
                label: 'Enable for...',
                options: [
                    {name: 'Internal searches only', value: 'INTERNAL'},
                    {name: 'API searches only', value: 'API'},
                    {name: 'Internal and API searches', value: 'BOTH'}
                ]
            }
        }
    );

    if (model.searchModuleType !== "ANIZB") {
        fieldset.push(
            {
                key: 'enabledCategories',
                type: 'horizontalMultiselect',
                templateOptions: {
                    label: 'Enable for...',
                    help: 'Only use indexer for these and also reject results from others',
                    options: [
                        {
                            id: "Movies",
                            label: "Movies"
                        },
                        {
                            id: "Movies HD",
                            label: "Movies HD"
                        },
                        {
                            id: "Movies SD",
                            label: "Movies SD"
                        },
                        {
                            id: "TV",
                            label: "TV"
                        },
                        {
                            id: "TV HD",
                            label: "TV HD"
                        },
                        {
                            id: "TV SD",
                            label: "TV SD"
                        },
                        {
                            id: "Anime",
                            label: "Anime"
                        },
                        {
                            id: "Audio",
                            label: "Audio"
                        },
                        {
                            id: "Audio FLAC",
                            label: "Audio FLAC"
                        },
                        {
                            id: "Audio MP3",
                            label: "Audio MP3"
                        },
                        {
                            id: "Audiobook",
                            label: "Audiobook"
                        },
                        {
                            id: "Console",
                            label: "Console"
                        },
                        {
                            id: "PC",
                            label: "PC"
                        },
                        {
                            id: "XXX",
                            label: "XXX"
                        },
                        {
                            id: "Ebook",
                            label: "Ebook"
                        },
                        {
                            id: "Comic",
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
                help: 'When adding NZBs this category will be used instead of asking for the category. Write "No category" to let the downloader decide.',
                placeholder: 'Ask when downloading'
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
                    {name: 'Send link', value: 'SEND_LINK'},
                    {name: 'Upload NZB', value: 'UPLOAD'}
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
            downloaderType: "NZBGET",
            username: "nzbgetx",
            nzbAddingType: "SEND_LINK",
            nzbaccesstype: "REDIRECT",
            iconCssClass: "",
            downloadType: "NZB",
            url: "http://nzbget:tegbzn6789@localhost:6789"
        },
        {
            url: "http://localhost:8086",
            downloaderType: "SABNZBD",
            name: "SABnzbd",
            nzbAddingType: "SEND_LINK",
            nzbaccesstype: "REDIRECT",
            iconCssClass: "",
            downloadType: "NZB"
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


angular
    .module('nzbhydraApp')
    .factory('IndexerCheckBeforeCloseService', IndexerCheckBeforeCloseService);

function IndexerCheckBeforeCloseService($q, ModalService, ConfigBoxService, growl, blockUI) {

    return {
        check: checkBeforeClose
    };

    function checkBeforeClose(scope, model) {
        var deferred = $q.defer();
        if (!scope.isInitial && (!scope.needsConnectionTest || scope.form.capsChecked)) {
            checkCapsWhenClosing(scope, model).then(function () {
                deferred.resolve(model);
            }, function () {
                deferred.reject();
            });
        } else {
            blockUI.start("Testing connection...");
            scope.spinnerActive = true;
            var url = "internalapi/indexer/checkConnection";
            ConfigBoxService.checkConnection(url, model).then(function () {
                    growl.info("Connection to the indexer tested successfully");
                    checkCapsWhenClosing(scope, model).then(function (data) {
                        blockUI.reset();
                        scope.spinnerActive = false;
                        deferred.resolve(data);
                    }, function () {
                        blockUI.reset();
                        scope.spinnerActive = false;
                        deferred.reject();
                    });
                },
                function (data) {
                    blockUI.reset();
                    handleConnectionCheckFail(ModalService, data, model, "indexer", deferred);
                });
        }
        return deferred.promise;

    }

    //Called when the indexer dialog is closed
    function checkCapsWhenClosing(scope, model) {
        var deferred = $q.defer();
        var url = "internalapi/indexer/checkCaps";
        if (angular.isUndefined(model.supportedSearchIds) || angular.isUndefined(model.supportedSearchTypes)) {

            blockUI.start("New indexer found. Testing its capabilities. This may take a bit...");
            ConfigBoxService.checkCaps(url, model).then(
                function (data) {
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
IndexerCheckBeforeCloseService.$inject = ["$q", "ModalService", "ConfigBoxService", "growl", "blockUI"];


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
DownloaderCheckBeforeCloseService.$inject = ["$q", "ConfigBoxService", "growl", "ModalService", "blockUI"];

angular
    .module('nzbhydraApp')
    .factory('ConfigModel', function () {
        return {};
    });

angular
    .module('nzbhydraApp')
    .factory('ConfigWatcher', function () {
        var $scope;

        return {
            watch: watch
        };

        function watch(scope) {
            $scope = scope;
            $scope.$watchGroup(["config.main.host"], function () {
            }, true);
        }
    });


angular
    .module('nzbhydraApp')
    .controller('ConfigController', ConfigController);

function ConfigController($scope, $http, activeTab, ConfigService, config, DownloaderCategoriesService, ConfigFields, ConfigModel, ModalService, RestartService, localStorageService, $state, growl) {
    $scope.config = config;
    $scope.submit = submit;
    $scope.activeTab = activeTab;

    $scope.restartRequired = false;
    $scope.ignoreSaveNeeded = false;


    function updateAndAskForRestartIfNecessary() {
        $scope.form.$setPristine();
        DownloaderCategoriesService.invalidate();
        if ($scope.restartRequired) {
            ModalService.open("Restart required", "The changes you have made may require a restart to be effective.<br>Do you want to restart now?", {
                yes: {
                    onYes: function () {
                        RestartService.restart();
                    }
                },
                no: {
                    onNo: function ($uibModalInstance) {
                        //Needs to be clicked twice for some reason
                        $scope.restartRequired = false;
                        $uibModalInstance.dismiss();
                        $uibModalInstance.dismiss();
                    }
                }
            });
        }
    }

    function handleConfigSetResponse(response, ignoreWarnings, restartNeeded) {
        if (angular.isUndefined(ignoreWarnings)) {
            ignoreWarnings = localStorageService.get("ignoreWarnings") !== null ? localStorageService.get("ignoreWarnings") : false;
        }
        //Communication with server was successful but there might be validation errors and/or warnings
        var warningMessages = response.data.warningMessages;
        var errorMessages = response.data.errorMessages;
        $scope.restartRequired = response.data.restartNeeded || (angular.isDefined(restartNeeded) ? restartNeeded : false);
        var showMessage = errorMessages.length > 0 || (warningMessages.length > 0 && !ignoreWarnings);

        function extendMessageWithList(message, messages) {
            _.forEach(messages, function (x) {
                message += "<li>" + x + "</li>";
            });
            message += "</ul></span>";
            return message;
        }

        if (showMessage) {
            var options;
            var message;
            var title;
            if (errorMessages.length > 0) { //Actual errors which cannot be ignored
                title = "Config validation failed";
                message = '<span class="error">The following errors have been found in your config. They need to be fixed.<ul>';
                message = extendMessageWithList(message, response.data.errorMessages);
                if (warningMessages.length > 0) {
                    message += '<br><span class="warning">The following warnings were found. You can ignore them if you wish.<ul>';
                    message = extendMessageWithList(message, response.data.warningMessages);
                }
                options = {
                    yes: {
                        onYes: function () {
                        },
                        text: "OK"
                    }
                };
            } else if (warningMessages.length > 0) {
                title = "Config validation warnings";
                message = '<br><span class="warning">The following warnings have been found. You can ignore them if you wish. The config was already saved.<ul>';
                message = extendMessageWithList(message, response.data.warningMessages);
                options = {
                    cancel: {
                        onCancel: function () {
                            $scope.form.$setPristine();
                            localStorageService.set("ignoreWarnings", true);
                            ConfigService.set($scope.config, true).then(function (response) {
                                handleConfigSetResponse(response, true, $scope.restartRequired);
                                updateAndAskForRestartIfNecessary();
                            }, function (response) {
                                //Actual error while setting or validating config
                                growl.error(response.data);
                            });
                        },
                        text: "OK, don't show warnings again"
                    },
                    yes: {
                        onYes: function () {
                            handleConfigSetResponse(response, true, $scope.restartRequired);
                            updateAndAskForRestartIfNecessary();
                        },
                        text: "OK"
                    }
                };
            }

            ModalService.open(title, message, options, "md", "left");
        } else {
            updateAndAskForRestartIfNecessary();
        }
    }

    function submit() {
        if ($scope.form.$valid) {
            ConfigService.set($scope.config, true).then(function (response) {
                handleConfigSetResponse(response);
            }, function (response) {
                //Actual error while setting or validating config
                growl.error(response.data);
            });

        } else {
            growl.error("Config invalid. Please check your settings.");

            //Ridiculously hacky way to make the error messages appear
            try {
                if (angular.isDefined(form.$error.required)) {
                    _.each(form.$error.required, function (item) {
                        if (angular.isDefined(item.$error.required)) {
                            _.each(item.$error.required, function (item2) {
                                item2.$setTouched();
                            });
                        }
                    });
                }
                angular.forEach($scope.form.$error.required, function (field) {
                    field.$setTouched();
                });
            } catch (err) {
                //
            }

        }
    }

    ConfigModel = config;

    $scope.fields = ConfigFields.getFields($scope.config);

    $scope.allTabs = [
        {
            active: false,
            state: 'root.config.main',
            name: 'Main',
            model: ConfigModel.main,
            fields: $scope.fields.main,
            options: {}
        },
        {
            active: false,
            state: 'root.config.auth',
            name: 'Authorization',
            model: ConfigModel.auth,
            fields: $scope.fields.auth,
            options: {}
        },
        {
            active: false,
            state: 'root.config.searching',
            name: 'Searching',
            model: ConfigModel.searching,
            fields: $scope.fields.searching,
            options: {}
        },
        {
            active: false,
            state: 'root.config.categories',
            name: 'Categories',
            model: ConfigModel.categoriesConfig,
            fields: $scope.fields.categoriesConfig,
            options: {}
        },
        {
            active: false,
            state: 'root.config.downloading',
            name: 'Downloading',
            model: ConfigModel.downloading,
            fields: $scope.fields.downloading,
            options: {}
        },
        {
            active: false,
            state: 'root.config.indexers',
            name: 'Indexers',
            model: ConfigModel.indexers,
            fields: $scope.fields.indexers,
            options: {}
        }
    ];

    $scope.isSavingNeeded = function () {
        return $scope.form.$dirty && $scope.form.$valid && !$scope.ignoreSaveNeeded;
    };

    $scope.goToConfigState = function (index) {
        $state.go($scope.allTabs[index].state, {activeTab: index}, {inherit: false, notify: true, reload: true});
    };

    $scope.help = function () {
        var tabName = $scope.allTabs[$scope.activeTab].name;
        $http.get("internalapi/help/" + tabName).then(function (result) {
                var html = '<span style="text-align: left;">' + result.data + "</span>";
                ModalService.open(tabName + " - Help", html, {}, "lg");
            },
            function () {
                growl.error("Error while loading help")
            })
    };

    $scope.$on('$stateChangeStart',
        function (event, toState, toParams, fromState, fromParams) {
            if ($scope.isSavingNeeded()) {
                event.preventDefault();
                ModalService.open("Unsaved changed", "Do you want to save before leaving?", {
                    yes: {
                        onYes: function () {
                            $scope.submit();
                            $state.go(toState);
                        },
                        text: "Yes"
                    },
                    no: {
                        onNo: function () {
                            $scope.ignoreSaveNeeded = true;
                            $scope.allTabs[$scope.activeTab].options.resetModel();
                            $state.go(toState);
                        },
                        text: "No"
                    },
                    cancel: {
                        onCancel: function () {
                            event.preventDefault();
                        },
                        text: "Cancel"
                    }
                });
            }
        })
}
ConfigController.$inject = ["$scope", "$http", "activeTab", "ConfigService", "config", "DownloaderCategoriesService", "ConfigFields", "ConfigModel", "ModalService", "RestartService", "localStorageService", "$state", "growl"];



angular
    .module('nzbhydraApp')
    .factory('CategoriesService', CategoriesService);

function CategoriesService(ConfigService) {

    return {
        getByName: getByName,
        getAllCategories: getAllCategories,
        getDefault: getDefault,
        getWithoutAll: getWithoutAll
    };


    function getByName(name) {
        for (var category in ConfigService.getSafe().categoriesConfig.categories) {
            category = ConfigService.getSafe().categoriesConfig.categories[category];
            if (category.name === name) {
                return category;
            }
        }
    }

    function getAllCategories() {
        return ConfigService.getSafe().categoriesConfig.categories;
    }

    function getWithoutAll() {
        return ConfigService.getSafe().categoriesConfig.categories.splice(1);
    }

    function getDefault() {
        return getAllCategories()[0];
    }

}
CategoriesService.$inject = ["ConfigService"];
angular
    .module('nzbhydraApp')
    .factory('BackupService', BackupService);

function BackupService($http) {

    return {
        getBackupsList: getBackupsList,
        restoreFromFile: restoreFromFile
    };


    function getBackupsList() {
        return $http.get('internalapi/backup/list').then(function (data) {
            return data.data;
        });
    }

    function restoreFromFile(filename) {
        return $http.get('internalapi/backup/restore', {params: {filename: filename}}).then(function (response) {
            return response;
        });
    }

}
BackupService.$inject = ["$http"];
angular.module('templates').run(['$templateCache', function($templateCache) {$templateCache.put('about.html','<div style="text-align: left; margin: auto; width: 800px">\r\n    Written by TheOtherP for the community.<br>\r\n    You can reach me via <a href="mailto:theotherp@gmx.de">mail</a> or <a href="{{  \'https://www.reddit.com/user/TheOtherP/\' | dereferer}}">Reddit</a>\r\n    <br><br>\r\n    Sources, bugs, enhancements: <a href="{{ \'https://github.com/theotherp/nzbhydra2/\' | dereferer }}" target="_blank">https://github.com/theotherp/nzbhydra</a>\r\n    <br><br>\r\n    You\'re welcome to send me Bitcoin via 1PnnwWfdyniojCL2kD5ZDBWBuKcFJvrq4t<br>\r\n    Thanks to the handful of people who already donated!\r\n\r\n    <br><br>\r\n    Licensed under the Apache License, Version 2.0 (the "License");\r\n    you may not use this file except in compliance with the License.\r\n    You may obtain a copy of the License at\r\n\r\n    <a href="{{ \'http://www.apache.org/licenses/LICENSE-2.0\' | dereferer }}">http://www.apache.org/licenses/LICENSE-2.0</a>\r\n</div>');
$templateCache.put('bugreport.html','<div style="text-align: left; margin: auto; width: 800px">\r\n\r\n\r\n    <div class="panel panel-default">\r\n        <div class="panel-heading">\r\n            <h3 class="panel-title">Bugreport / Debug infos</h3>\r\n        </div>\r\n        <div class="panel-body">\r\n            So you found a bug? Ideally <a href="https://github.com/theotherp/nzbhydra/issues/new" target="_blank">raise an issue on github</a>. If you don\'t have an account create one ;-) Otherwise\r\n            <a\r\n                    href="mailto:theotherp@gmx.de">send me a mail</a>.<br>\r\n            <b>But</b> please read this first:<br>\r\n            Don\'t just tell me what the problem is. If you just post an exception from the console or say "x does not work" I probably won\'t be willing or able to help. Remember you want something\r\n            from\r\n            me.<br>\r\n            <ul>\r\n                <li>\r\n                    Tell me what you expect to happen and what actually happens\r\n                </li>\r\n                <li>\r\n                    If hydra doesn\'t even start, tell me your OS and how you start it.\r\n                </li>\r\n                <li>\r\n                    If the website looks weird tell me what browser you use. If you use a reverse proxy post your config and your base URL setting.\r\n                </li>\r\n                <li>\r\n                    If the GUI behaves strangely or doesn\'t react as it should check the browser console for errors.\r\n                </li>\r\n            </ul>\r\n            Tell me anything that might help. If you do all that I will do my best to help you and improve NZBHydra.\r\n\r\n            <br><br>\r\n            If possible provide the log and your settings. Here you can get anonymized versions of both to be posted:<br>\r\n\r\n            <button class="btn btn-default" ng-click="downloadDebuggingInfos()">Log and settings</button>\r\n        </div>\r\n    </div>\r\n\r\n    <div class="panel panel-default">\r\n        <div class="panel-heading">\r\n            <h3 class="panel-title">Debug SQL execution</h3>\r\n        </div>\r\n        <div class="panel-body">\r\n            You may want to take a look at the settings to make sure there\'s nothing in there you wouldn\'t want me to see.\r\n            <br><br><br>\r\n            You can use the input box below to execute any SQL query against the database. You will likely never need this but it allows me to ask you to execute a query when I try to solve a bug.\r\n            <br>\r\n            <textarea class="form-control" rows="5" data-ng-model="foo.sql"></textarea>\r\n            <button class="btn btn-default" ng-click="executeSqlQuery()">Query</button>\r\n            <button class="btn btn-default" ng-click="executeSqlUpdate()">Execute</button>\r\n            <textarea class="form-control" rows="10" data-ng-model="foo.csv"></textarea>\r\n        </div>\r\n    </div>\r\n\r\n</div>');
$templateCache.put('changelog-modal.html','<div class="modal-header">\r\n    <h3 class="modal-title">Change log</h3>\r\n</div>\r\n<div class="modal-body" style="text-align: left">\r\n    <div class="list-group">\r\n        <li ng-repeat="entry in versionHistory" class="list-group-item" style="padding-top: 20px; padding-bottom: 20px;">\r\n            <h3 style="margin-top: 0">{{::entry.version}}</h3>\r\n            <div ng-repeat="change in entry.changes" style="margin-bottom: 5px">\r\n                <span ng-switch="change.type" style="margin-right: 5px">\r\n                    <span class="label label-primary" ng-switch-when="note">Note</span>\r\n                    <span class="label label-warning" ng-switch-when="fix">Fix</span>\r\n                    <span class="label label-success" ng-switch-when="feature">Feature</span>\r\n                </span>\r\n                {{change.text}}\r\n            </div>\r\n        </li>\r\n    </div>\r\n</div>\r\n<div class="modal-footer">\r\n    <button class="btn btn-primary" type="button" ng-click="ok()">Great!</button>\r\n</div>\r\n');
$templateCache.put('dirPagination.tpl.html','<ul class="pagination" ng-if="1 < pages.length || !autoHide">\r\n    <li ng-if="boundaryLinks" ng-class="{ disabled : pagination.current == 1 }">\r\n        <a href="" ng-click="setCurrent(1)">&laquo;</a>\r\n    </li>\r\n    <li ng-if="directionLinks" ng-class="{ disabled : pagination.current == 1 }">\r\n        <a href="" ng-click="setCurrent(pagination.current - 1)">&lsaquo;</a>\r\n    </li>\r\n    <li ng-repeat="pageNumber in pages track by tracker(pageNumber, $index)" ng-class="{ active : pagination.current == pageNumber, disabled : pageNumber == \'...\' }">\r\n        <a href="" ng-click="setCurrent(pageNumber)">{{ pageNumber }}</a>\r\n    </li>\r\n\r\n    <li ng-if="directionLinks" ng-class="{ disabled : pagination.current == pagination.last }">\r\n        <a href="" ng-click="setCurrent(pagination.current + 1)">&rsaquo;</a>\r\n    </li>\r\n    <li ng-if="boundaryLinks" ng-class="{ disabled : pagination.current == pagination.last }">\r\n        <a href="" ng-click="setCurrent(pagination.last)">&raquo;</a>\r\n    </li>\r\n</ul>');
$templateCache.put('file-selection.html','<div class="modal-header">\r\n    <h3 class="modal-title">{{::showType}} selection</h3>\r\n</div>\r\n<div class="modal-header">\r\n    {{data.fullPath}}\r\n</div>\r\n<div class="modal-body" style="text-align: left">\r\n    <span ng-show="data.hasParent">\r\n        <a href="#" ng-click="goUp()">...</a>\r\n    </span>\r\n    <div ng-repeat="folder in data.folders">\r\n        <span class="glyphicon glyphicon-folder-open" style="margin-right: 8px"></span>\r\n        <a href="#" ng-click="select(folder, \'folder\')">{{::folder.name}}</a>\r\n    </div>\r\n    <div ng-repeat="file in data.files">\r\n        <span class="glyphicon glyphicon-file" style="margin-right: 8px"></span>\r\n        <a href="#" ng-click="select(file, \'file\')">{{::file.name}}</a>\r\n    </div>\r\n</div>\r\n<div class="modal-footer row" ng-show="type === \'folder\'">\r\n    <span class="col-md-15" style="text-align: left">\r\n    </span>\r\n    <span class="col-md-5">\r\n        <button class="btn btn-default" ng-click="submit()">\r\n            Select\r\n        </button>\r\n    </span>\r\n</div>\r\n');
$templateCache.put('migration-modal.html','<div class="modal-header">\r\n    <h3 class="modal-title">Migration from NZBHydra 1</h3>\r\n</div>\r\n<div class="modal-body" style="text-align: left">\r\n    <span ng-show="!foo.isMigrating">\r\n        <p>You are about to migrate from an installation of NZBHydra 1. This will overwrite your existing settings and database for v2. No automatic backup will be made before.</p>\r\n\r\n        <p>The migration can take a couple of minutes for big databases. All enabled newznab indexers will be queried multiple times for a capabilities check.</p>\r\n        <p>For big databases I recommend temporarily starting NZBHydra with more memory (using the parameter <tt>--xmx 256M</tt>). Otherwise the migration might fail.</p>\r\n\r\n        <p>The migration is easier if the older instance is callable from here and its files are on the same machine as v2 (and not containerized). Please select what applies:</p>\r\n\r\n        <uib-accordion close-others="true">\r\n            <div uib-accordion-group class="panel-default" heading="NZBHydra 1\'s file are accessible and URL callable" is-open="foo.isUrlBasedOpen">\r\n        The old instance of NZBHydra 1 needs to be running and must be at least version 0.2.220. Please enter its base URL below.\r\n        If it\'s auth protected please enter the URL like this: http://user:pass@127.0.0.1:5075.\r\n\r\n                <input type="text" data-ng-model="foo.baseUrl" class="form-control input-lg" placeholder="http://127.0.01:5075" style="margin-top: 10px"/>\r\n            </div>\r\n            <div uib-accordion-group class="panel-default" heading="NZBHydra 1 is running on another machine or in a container" is-open="foo.isFileBasedOpen">\r\n                Please make extra sure that NZBHydra 1 is at least version 0.2.220.<br>\r\n                You need to copy <code>settings.cfg</code> and <code>nzbhydra.db.*</code> files to this machine. Then paste their full paths:<br>\r\n                <div class="input-group">\r\n                    <label>settings.cfg</label><input ng-model="foo.settingsCfgFile" class="form-control" size="100"/><br>\r\n                    <label>nzbyhydra.db</label><input ng-model="foo.nzbhydraDbFile" class="form-control"/>\r\n                </div>\r\n            </div>\r\n        </uib-accordion>\r\n    </span>\r\n    <span ng-show="foo.isMigrating" style="text-align: left">\r\n\r\n        <ul style="padding-left: 0">\r\n            <li ng-repeat="message in foo.messages" style="list-style-type: none">\r\n                {{message}}\r\n            </li>\r\n        </ul>\r\n        <img src="static/img/spinner.gif"/>\r\n    </span>\r\n</div>\r\n<div class="modal-footer">\r\n    <button class="btn btn-success" type="button" ng-click="yes()">Start migration</button>\r\n    <button class="btn btn-warning" type="button" ng-click="cancel()">Cancel</button>\r\n</div>');
$templateCache.put('modal.html','<div class="modal-header">\r\n    <h3 class="modal-title">{{ headline }}</h3>\r\n</div>\r\n<div class="modal-body" style="text-align: {{textAlign}}">\r\n    <span ng-bind-html="message | unsafe"></span>\r\n\r\n</div>\r\n<div class="modal-footer">\r\n    <button class="btn btn-success" type="button" ng-click="yes()">{{ params.yes.text }}</button>\r\n    <button class="btn btn-danger" type="button" ng-if="showNo" ng-click="no()">{{ params.no.text }}</button>\r\n    <button class="btn btn-warning" type="button" ng-if="showCancel" ng-click="cancel()">{{ params.cancel.text }}</button>\r\n</div>\r\n');
$templateCache.put('news-modal.html','<div class="modal-header">\r\n    <h3 class="modal-title">News</h3>\r\n</div>\r\n<div class="modal-body" style="text-align: left">\r\n    <div class="panel panel-default " ng-repeat="entry in news">\r\n        <div class="panel-heading">\r\n            <h3 class="panel-title">{{entry.version}}</h3>\r\n        </div>\r\n        <div class="panel-body" ng-bind-html="entry.news">\r\n        </div>\r\n    </div>\r\n\r\n</div>\r\n<div class="modal-footer">\r\n    <button class="btn btn-success" type="button" ng-click="close()">Close</button>\r\n</div>\r\n');
$templateCache.put('restart-modal.html','<div class="modal-header">\r\n    <h3 class="modal-title">Restarting...</h3>\r\n</div>\r\n<div class="modal-body" style="text-align: left">\r\n    {{message}} <img src="static/img/spinner.gif">\r\n</div>');
$templateCache.put('results-pagination.html','<ul class="pagination" ng-if="1 < pages.length || !autoHide">\r\n    <li ng-if="boundaryLinks" ng-class="{ disabled : pagination.current == 1 }">\r\n        <a href="" ng-click="setCurrent(1)">&laquo;</a>\r\n    </li>\r\n    <li ng-if="directionLinks" ng-class="{ disabled : pagination.current == 1 }">\r\n        <a href="" ng-click="setCurrent(pagination.current - 1)">&lsaquo;</a>\r\n    </li>\r\n    <li ng-repeat="pageNumber in pages track by tracker(pageNumber, $index)" ng-class="{ active : pagination.current == pageNumber, disabled : pageNumber == \'...\' }">\r\n        <a href="" ng-click="setCurrent(pageNumber)">{{ pageNumber }}</a>\r\n    </li>\r\n\r\n    <li ng-if="directionLinks" ng-class="{ disabled : pagination.current == pagination.last }">\r\n        <a href="" ng-click="setCurrent(pagination.current + 1)">&rsaquo;</a>\r\n    </li>\r\n    <li ng-if="boundaryLinks" ng-class="{ disabled : pagination.current == pagination.last }">\r\n        <a href="" ng-click="setCurrent(pagination.last)">&raquo;</a>\r\n    </li>\r\n</ul>');
$templateCache.put('search-searchhistory-dropdown.html','<ul class="dropdown-menu" role="menu" uib-dropdown-menu aria-labelledby="button-template-url">\r\n    <li role="menuitem" ng-repeat="request in searchHistory"><a href="#" ng-click="repeatSearch(request)" ng-bind-html="formatRequest(request)"></a></li>\r\n</ul>');
$templateCache.put('search-state.html','<div class="modal-header">\r\n    <h3 class="modal-title">Searching... Please wait</h3>\r\n</div>\r\n<div class="modal-body" style="text-align: left;">\r\n    <img src="static/img/spinner.gif" ng-if="!messages && !indexerSelectionFinished"/>\r\n\r\n    <div ng-if="messages" style="text-align: left">\r\n\r\n        <ul style="padding-left: 0">\r\n            <li ng-repeat="message in messages" style="list-style-type: none">\r\n                {{message}}\r\n            </li>\r\n\r\n        </ul>\r\n        <img src="static/img/spinner.gif"/>\r\n\r\n    </div>\r\n    <div style="margin-top: 15px; margin-bottom: -20px">\r\n        <div ng-if="indexerSelectionFinished">\r\n            Indexers finished:\r\n            <uib-progressbar max="indexersSelected" class="progress-striped active" value="indexersFinished">{{indexersFinished}} / {{progressMax}}</uib-progressbar>\r\n        </div>\r\n    </div>\r\n</div>\r\n<div class="modal-footer">\r\n    <span style="float: left; margin-top: 5px">\r\n        This modal will close automatically when searching is finished\r\n    </span>\r\n    <button class="btn btn-danger" type="button" ng-click="cancelSearch()"\r\n            uib-tooltip="Will not actually cancel the search but just go back to the search page. Any remaining indexer calls will be continued in the background"\r\n            tooltip-placement="top"\r\n            tooltip-trigger="mouseenter"\r\n    >Cancel\r\n    </button>\r\n</div>\r\n');
$templateCache.put('searchtemplate.html','');
$templateCache.put('welcome-modal.html','<div class="modal-header">\r\n    <h3 class="modal-title">Welcome to NZBHydra 2</h3>\r\n</div>\r\n<div class="modal-body" style="text-align: left">\r\n    This seems to be the first time that you started NZBHydra 2.\r\n    <br><br>\r\n    If you\'re already using NZBHydra 1 (python based) you can <a href="#" ng-click="startMigration()">migrate your data</a>.\r\n    <br><br>\r\n    If you\'re a new user (or don\'t want to migrate your data right now) you can start by <a href="#" ng-click="goToConfig()">configuring NZBHydra 2</a>.\r\n    <br>\r\n    You will not be able to use it until you\'ve added at least one indexer.\r\n    <br><br>\r\n    If you\'re stuck you can refer to <a href="https://github.com/theotherp/nzbhydra2/wiki">the wiki</a> or the online help (available from the config).<br>\r\n    If you haven\'t found an answer there you\'re welcome to <a href="https://github.com/theotherp/nzbhydra2/issues">raise a GitHub issue</a> or create a thread on reddit.\r\n\r\n</div>\r\n<div class="modal-footer">\r\n    <button class="btn btn-success" type="button" ng-click="close()">Close</button>\r\n</div>\r\n');
$templateCache.put('dataTable/columnFilterBoolean.html','<div class="form-group column-filter-boolean" style="padding-left: 5px">\r\n    <div class="radio">\r\n        <label>\r\n            <input type="radio" name="chickenEgg" value="{{ options[0].value }}" ng-model="selected.value" ng-change="apply()">\r\n            {{ options[0].label }}\r\n        </label>\r\n    </div>\r\n    <div class="radio">\r\n        <label>\r\n            <input type="radio" name="chickenEgg" value="{{ options[1].value }}" ng-model="selected.value" ng-change="apply()">\r\n            {{ options[1].label }}\r\n        </label>\r\n    </div>\r\n    <div class="radio">\r\n        <label>\r\n            <input type="radio" name="chickenEgg" value="{{ options[2].value }}" ng-model="selected.value" ng-change="apply()">\r\n            {{ options[2].label }}\r\n        </label>\r\n    </div>\r\n</div>');
$templateCache.put('dataTable/columnFilterCheckboxes.html','<button ng-if="showInvert" type="button" class="btn btn-primary" ng-click="invert()" style="margin-left: 5px; margin-top: 5px; margin-bottom: 5px">\r\n    Invert selection\r\n</button>\r\n<li ng-repeat="entry in entries" style="margin-left: 5px; margin-right: 5px">\r\n        <span style="white-space:nowrap">\r\n            <label class="dropdown-label">\r\n                <input type="checkbox" data-checklist-model="selected.entries" data-checklist-value="entry"> {{ entry.label }}\r\n            </label>\r\n        </span>\r\n\r\n</li>\r\n\r\n<button type="button" class="btn btn-primary" ng-click="apply()" style="margin-left: 5px; margin-bottom: 5px">\r\n    Apply\r\n</button>');
$templateCache.put('dataTable/columnFilterFreetext.html','<input type="text" ng-keypress="onKeypress($event)" ng-model="data.filter" id="freetext-filter-input"/>');
$templateCache.put('dataTable/columnFilterNumberRange.html','<span>\r\n    <span class="input-group" style="margin-left: 5px; margin-right: 5px;">\r\n        <span class="input-group-addon" style="width: 60px">Min</span>\r\n        <input type="text" class="form-control" ng-model="filterValue.min" ng-keypress="onKeypress($event)" style="min-width: 70px"/>\r\n        <span class="input-group-addon" ng-if="addon">{{::addon}}</span>\r\n    </span>\r\n\r\n    <span class="input-group" style="margin-left: 5px; margin-right: 5px;">\r\n        <span class="input-group-addon" style="width: 60px">Max</span>\r\n        <input type="text" class="form-control" ng-model="filterValue.max" ng-keypress="onKeypress($event)" style="min-width: 70px"/>\r\n        <span class="input-group-addon" ng-if="addon">{{::addon}}</span>\r\n    </span>\r\n    <button type="button" class="btn btn-primary" ng-click="apply()" style="margin-left: 5px; margin-bottom: 5px">\r\n        Apply\r\n    </button>\r\n</span>');
$templateCache.put('dataTable/columnFilterOuter.html','<div class="btn-group" ng-class="{\'open\':columnFilterWrapperCtrl.open}">\r\n    <button id="single-button" type="button" class="btn btn-primary dropdown-toggle column-filter" ng-click="columnFilterWrapperCtrl.toggle()">\r\n        <span class="glyphicon glyphicon-filter" ng-class="{\'filter-active\': columnFilterWrapperCtrl.isActive}"></span>\r\n    </button>\r\n    <ul role="menu" class="dropdown-menu" ng-transclude>\r\n\r\n    </ul>\r\n</div>');
$templateCache.put('dataTable/columnFilterTime.html','<span>\r\n    <p class="input-group" style="margin-left: 5px; margin-right: 5px;">\r\n        <span class="input-group-addon" id="basic-addon3" style="min-width: 70px">After</span>\r\n        <input type="text" class="form-control" uib-datepicker-popup ng-model="selected.afterDate" is-open="after.opened" datepicker-options="dateOptions" close-text="Close"\r\n               style="min-width: 110px"/>\r\n        <span class="input-group-btn input-group-btn2">\r\n    <button type="button" class="btn btn-default" ng-click="openAfter()"><i class="glyphicon glyphicon-calendar"></i></button>\r\n        </span>\r\n    </p>\r\n\r\n\r\n    <p class="input-group" style="margin-left: 5px; margin-right: 5px;">\r\n        <span class="input-group-addon" id="basic-addon3" style="min-width: 70px">Before</span>\r\n        <input type="text" class="form-control" uib-datepicker-popup ng-model="selected.beforeDate" is-open="before.opened" datepicker-options="dateOptions" close-text="Close"\r\n               style="min-width: 110px"/>\r\n        <span class="input-group-btn input-group-btn2">\r\n            <button type="button" class="btn btn-default" ng-click="openBefore()"><i class="glyphicon glyphicon-calendar"></i></button>\r\n        </span>\r\n    </p>\r\n\r\n    <button type="button" class="btn btn-primary" ng-click="apply()" style="margin-left: 5px; margin-bottom: 5px">\r\n        Apply\r\n    </button>\r\n</span>');
$templateCache.put('dataTable/columnSortable.html','<span ng-click="sort()" ng-transclude></span>\r\n<span ng-click="sort()" class="glyphicon"\r\n      ng-class="{\'glyphicon-triangle-top\': (sortModel.sortMode==1 && !sortModel.reversed) || (sortModel.sortMode==2 && sortModel.reversed), \'glyphicon-triangle-bottom\': sortModel.sortMode==2 || (sortModel.sortMode==1 && sortModel.reversed)}"\r\n      style="font-size: 80%"></span>');
$templateCache.put('directives/addable-nzb-modal.html','<div class="modal-header">\r\n    <h3 class="modal-title">Please select the category</h3>\r\n</div>\r\n<div class="modal-body" style="text-align: left">\r\n    <ul>\r\n        <li>\r\n            <a href="#" ng-click="$event.preventDefault(); select(\'\')">No category</a>\r\n        </li>\r\n        <li ng-repeat="category in categories">\r\n            <a href="#" ng-click="$event.preventDefault(); select(category)">{{ category }}</a>\r\n        </li>\r\n    </ul>\r\n</div>\r\n');
$templateCache.put('directives/addable-nzb.html','<a href="#" ng-click="add()" uib-tooltip="Send to {{ ::downloader.name }}"\r\n   tooltip-placement="top"\r\n   tooltip-trigger="mouseenter">\r\n    <div class="icon addable-nzb" ng-class="cssClass"\r\n    ></div>\r\n</a>\r\n');
$templateCache.put('directives/addable-nzbs.html','<span ng-repeat="downloader in downloaders">\r\n    <addable-nzb downloader="downloader" search-result-id="searchResultId"></addable-nzb>\r\n</span>');
$templateCache.put('directives/backup.html','<div style="text-align: left; margin: auto; width: 800px">\r\n\r\n    <!-- Split button -->\r\n    <div class="btn-group" uib-dropdown>\r\n        <button id="split-button" type="button" class="btn btn-primary" ng-click="createAndDownloadBackupFile()">Create and download backup</button>\r\n        <button type="button" class="btn btn-primary" uib-dropdown-toggle>\r\n            <span class="caret"></span>\r\n            <span class="sr-only">Split button!</span>\r\n        </button>\r\n        <ul class="dropdown-menu" uib-dropdown-menu role="menu" aria-labelledby="split-button">\r\n            <li role="menuitem"><a href="#" ng-click="createBackupFile()">Just create backup</a></li>\r\n        </ul>\r\n    </div>\r\n    <!--<button class="btn btn-primary" ng-click="createAndDownloadBackupFile()">Create and download backup</button>-->\r\n\r\n    <br>\r\n    <br>\r\n    <button type="file" ngf-select="uploadBackupFile($file, $invalidFiles)" class="btn btn-primary">\r\n        Upload and restore from file\r\n    </button>\r\n    <uib-progressbar ng-class="{\'hidden\': !uploadActive}" max="file.total" value="file.loaded" class="progress-striped active" style="margin-top: 10px"><span style="color:white; white-space:nowrap;">{{ file.loaded }} kB</span>\r\n    </uib-progressbar>\r\n\r\n\r\n    <div style="margin-top: 50px">\r\n        <span style="text-align: center"><h3>Existing backups</h3></span>\r\n        <table class="table">\r\n            <tr class="row">\r\n                <th class="col-md-15" style="text-align: left">Filename</th>\r\n                <th class="col-md-4" style="text-align: left">Created</th>\r\n                <th class="col-md-1" style="text-align: left">Restore</th>\r\n            </tr>\r\n            <tr ng-repeat="backup in backups" class="row">\r\n                <td class="col-md-15" style="text-align: left"><a href="internalapi/getbackupfile?filename={{ backup.filename }}" target="_self">{{ backup.filename }}</a></td>\r\n                <td class="col-md-4" style="text-align: left">{{ backup.creationDate | reformatDate }}</td>\r\n                <td class="col-md-1" style="text-align: center"><span class="glyphicon glyphicon-repeat" ng-click="restoreFromFile(backup.filename)"></span></td>\r\n            </tr>\r\n\r\n        </table>\r\n    </div>\r\n\r\n</div>');
$templateCache.put('directives/cfg-form-entry.html','<div class="form-group row">\r\n    <div class="col-md-6" style="text-align: right">\r\n        <label class="control-label">{{ title }}</label>\r\n    </div>\r\n    <div class="col-md-8">\r\n        <input ng-if="type==\'checkbox\'" ng-model="cfg" type="checkbox" bs-switch/>\r\n        <input ng-if="type==\'text\'" ng-model="cfg" type="text" class="form-control"/>\r\n\r\n        <ui-select ng-if="type==\'select\'" ng-model="cfg" theme="bootstrap" search-enabled="false">\r\n            <ui-select-match class="ui-select-match">\r\n                <span ng-bind="cfg.name"></span>\r\n            </ui-select-match>\r\n            <ui-select-choices repeat="item in options" class="ui-select-choices">\r\n                <span ng-bind="item.name"></span>\r\n            </ui-select-choices>\r\n        </ui-select>\r\n        {{ cfg }}\r\n        {{ cfg.name }}\r\n        <!--<input type="{{ type }}" ng-model="cfg" ng-class="{\'form-control\' : type != \'checkbox\'}"/>-->\r\n        <span class="help-block" ng-if="help">{{ help }}</span>\r\n    </div>\r\n\r\n</div>');
$templateCache.put('directives/connection-test.html','<span style="text-align: left;">\r\n    <button class="btn btn-default" id="button-test-connection" type="button" ng-click="testConnection()">\r\n    <span class="glyphicon glyphicon-refresh"></span>\r\n    </button>\r\n    <span id="message-test-connection"></span>\r\n</span>');
$templateCache.put('directives/download-nzbs-button.html','<div class="btn-group" style="margin-top:20px; margin-bottom:20px;" ng-if="downloaders.length > 0">\r\n    <span ng-if="::downloaders.length == 1">\r\n        <button class="btn btn-default" ng-click="download(downloaders[0])"><span class="glyphicon glyphicon-plus" style="margin-right: 10px"></span> {{ ::downloaders[0].name }}</button>\r\n    </span>\r\n    <span ng-if="::downloaders.length > 1">\r\n        \r\n        <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\r\n            <span><span class="glyphicon glyphicon-plus" style="margin-right: 10px"></span>Add to ...</span>\r\n            <span class="caret"></span>\r\n            <span class="sr-only">Toggle Dropdown</span>\r\n        </button>\r\n        <ul class="dropdown-menu">\r\n            <li ng-repeat="downloader in downloaders">\r\n                <a ng-click="download(downloader)">{{ ::downloader.name }}</a>\r\n            </li>\r\n        </ul>\r\n    </span>\r\n\r\n</div>');
$templateCache.put('directives/download-nzbzip-button.html','<div class="btn-group" style="margin-top:20px; margin-bottom:20px;">\r\n    <button type="button" class="btn btn-default" ng-click="download()">\r\n        NZBs as ZIP\r\n    </button>\r\n</div>');
$templateCache.put('directives/duplicate-group.html','<table class="table" style="margin:0">\r\n    <tr ng-init="result=duplicates[0]" class="search-results-row" ng-class="{\'odd\': rowIndex % 2 == 0, \'even\' : rowIndex % 2 == 1}">\r\n        <td class="col-md-12 search-results-cell result-title" ng-init="result = duplicates[0]" style="margin:0;">\r\n            <input type="checkbox" data-checklist-model="selected" data-checklist-value="result" ng-click="clickCheckbox($event)" data-checkbox-index="0"/>\r\n\r\n            <a href="" ng-click="toggleTitleExpansion()" ng-class="{\'visibility-hidden\': !displayTitleToggle}"\r\n               uib-tooltip="Click to see or hide all results with the same title"\r\n               tooltip-placement="top"\r\n               tooltip-trigger="mouseenter"\r\n            ><span class="glyphicon"\r\n                   ng-class="{\'glyphicon-minus\': titlesExpanded, \'glyphicon-plus\': !titlesExpanded}"></span></a>\r\n\r\n            <a ng-if="foo.duplicatesDisplayed" href="" ng-click="toggleDuplicateExpansion()" ng-class="{\'visibility-hidden\': duplicates.length == 1}"\r\n               uib-tooltip="Click to see or hide all duplicates of this result"\r\n               tooltip-placement="right"\r\n               tooltip-trigger="mouseenter"\r\n            ><span class="glyphicon"\r\n                   ng-class="{\'glyphicon-minus\': duplicatesExpanded, \'glyphicon-plus\': !duplicatesExpanded}"></span></a>\r\n            <span ng-if="isFirstRow">{{ ::result.title }}</span>\r\n        </td>\r\n        <td other-columns result="result"></td>\r\n    </tr>\r\n\r\n    <tr ng-if="duplicatesExpanded" ng-repeat="duplicate in duplicatesToShow() track by duplicate.searchResultId" class="search-results-row duplicate"\r\n        ng-class="{ \'odd\': rowIndex % 2 == 0, \'even\' : rowIndex % 2 == 1}">\r\n        <td class="col-md-12 search-results-cell result-title" style="margin:0;">\r\n            <input type="checkbox" data-checklist-model="selected" data-checklist-value="duplicate" ng-click="clickCheckbox($event)" data-checkbox-index="{{ ::$index+1 }}"/>\r\n\r\n        </td>\r\n        <td other-columns result="duplicate"></td>\r\n    </tr>\r\n\r\n</table>');
$templateCache.put('directives/indexer-input.html','<form class="form-inline" style="margin-bottom: 30px;">\r\n    <button ng-click="onClick(indexer, model)" class="btn btn-secondary indexer-button indexer-input btn-default"\r\n            ng-class="{\'config-incomplete\': !indexer.configComplete, \'not-all-checked\': (indexer.configComplete && !indexer.allCapsChecked)}"\r\n    >{{ indexer.name }}\r\n    </button>\r\n    <input bs-switch type="checkbox" ng-model="indexer.enabled" switch-active="{{indexer.configComplete}}"/>\r\n    <div class="form-group" style="margin-left: 10px">\r\n        <div class="input-group">\r\n            <input type="number" keep-focus ng-model="indexer.score" class="form-control" style="width: 43px; height: 34px;">\r\n            <span class="input-group-addon">Priority</span>\r\n        </div>\r\n    </div>\r\n</form>\r\n');
$templateCache.put('directives/log.html','<uib-tabset active="active">\r\n    <uib-tab index="0" heading="Formatted" ng-click="select(0)">\r\n        <div cg-busy="{promise:logPromise,message:\'Loading log file\'}">\r\n            <div style="margin-bottom: 15px">\r\n                <button class="btn btn-default" ng-click="update()">Update</button>\r\n            </div>\r\n\r\n            <!--<pre ng-bind-html="log" style="text-align: left; height: 65vh; overflow-y: scroll" id="logfile"></pre>-->\r\n            <div style="margin-bottom: 10px">\r\n                <button class="btn btn-default" ng-click="getNewerFormatted()" ng-disabled="currentJsonIndex === 0">Get newer entries</button>\r\n                <button class="btn btn-default" ng-click="getOlderFormatted()" ng-disabled="!hasMoreJsonLines">Get older entries</button>\r\n            </div>\r\n            <table class="table table-hover" style="margin-bottom: 10px">\r\n                <thead class="search-results-header">\r\n                <tr>\r\n                    <th style="width: 11%">Time (newest first)</th>\r\n                    <th style="width: 3%">Level</th>\r\n                    <th style="width: 15%">Logger</th>\r\n                    <th style="width: 71%; overflow: hidden">Message</th>\r\n                </tr>\r\n                </thead>\r\n                <tbody>\r\n                <tr ng-repeat="line in jsonLogLines" ng-click="openModal(line)">\r\n                    <td>{{::line["@timestamp"] | formatTimestamp}}</td>\r\n                    <td>\r\n                        <div ng-switch on="line.level">\r\n                            <div class="fa fa-info-circle" ng-switch-when="INFO"></div>\r\n                            <div class="fa fa-warning warning" ng-switch-when="WARN"></div>\r\n                            <div class="fa fa-times-circle error" ng-switch-when="ERROR"></div>\r\n                        </div>\r\n                    </td>\r\n                    <td>{{line.logger_name | formatClassname}}</td>\r\n                    <td>\r\n                        <div style="width: 945px; overflow: hidden; text-overflow: ellipsis"> <!--Hacky but works :-(-->\r\n                        {{::line.message}}\r\n\r\n                        </div>\r\n                    </td>\r\n                </tr>\r\n                </tbody>\r\n            </table>\r\n            <div style="margin-bottom: 20px">\r\n                <button class="btn btn-default" ng-click="getNewerFormatted()" ng-disabled="currentJsonIndex === 0">Get newer entries</button>\r\n                <button class="btn btn-default" ng-click="getOlderFormatted()" ng-disabled="!hasMoreJsonLines">Get older entries</button>\r\n            </div>\r\n        </div>\r\n    </uib-tab>\r\n\r\n\r\n    <uib-tab index="1" heading="Raw" ng-click="select(1)">\r\n        <div cg-busy="{promise:logPromise,message:\'Loading log file\'}">\r\n            <div style="margin-bottom: 15px">\r\n                <button class="btn btn-default" ng-click="update()">Update</button>\r\n                <button class="btn btn-default" ng-click="scrollToBottom()">Scroll to bottom</button>\r\n                <label>\r\n                    <input type="checkbox" ng-model="doUpdateLog" ng-change="toggleUpdate(doUpdateLog)">\r\n                    Update every five seconds...\r\n                </label>\r\n                <label>\r\n                    <input type="checkbox" ng-model="doTailLog" ng-change="toggleTailLog()">\r\n                    and scroll to end\r\n                </label>\r\n            </div>\r\n\r\n            <pre ng-bind-html="log" style="text-align: left; height: 65vh; overflow-y: scroll" id="logfile"></pre>\r\n        </div>\r\n    </uib-tab>\r\n\r\n    <uib-tab index="2" heading="Files" ng-click="select(2)">\r\n        <div class="row">\r\n            <div class="col-md-6"></div>\r\n            <div class="col-md-8" style="text-align: left">\r\n                <ul>\r\n                    <li ng-repeat="filename in logfilenames">\r\n                        <a href="internalapi/debuginfos/downloadlog?logfilename={{filename}}" target="_blank">{{filename}}</a>\r\n                    </li>\r\n                </ul>\r\n            </div>\r\n        </div>\r\n\r\n    </uib-tab>\r\n\r\n</uib-tabset>\r\n\r\n\r\n<script type="text/ng-template" id="log-entry.html">\r\n    <div class="modal-header">\r\n        <h3 class="modal-title">Log entry details</h3>\r\n    </div>\r\n    <div class="modal-body" style="text-align: left;">\r\n        Message\r\n        <pre ng-bind-html="::entry.message"></pre>\r\n\r\n        <div ng-if="entry.IPADDRESS || entry.USERNAME" style="margin-bottom: 10px; margin-top: 15px">\r\n            <div ng-if="entry.IPADDRESS">Accessing IP address: {{entry.IPADDRESS}}</div>\r\n            <div ng-if="entry.USERNAME">Accessing Username: {{entry.USERNAME}}</div>\r\n        </div>\r\n\r\n        <span ng-if="entry.stack_trace">\r\n            Stacktrace\r\n            <pre ng-bind-html="::entry.stack_trace" style="overflow-y: scroll; width: 100%; max-height: 600px"></pre>\r\n        </span>\r\n    </div>\r\n    <div class="modal-footer">\r\n        <button class="btn btn-primary" type="button" ng-click="ok()">Close</button>\r\n    </div>\r\n</script>');
$templateCache.put('directives/news.html','<div class="row">\r\n    <div class="col-md-5"></div>\r\n    <div class="col-md-10">\r\n        <div class="panel panel-default " ng-repeat="entry in news">\r\n            <div class="panel-heading">\r\n                <h3 class="panel-title">{{entry.version}}</h3>\r\n            </div>\r\n            <div class="panel-body" ng-bind-html="entry.news">\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>');
$templateCache.put('directives/search-result-non-title-columns.html','<td class="col-md-1 search-results-cell result-indexer" style="text-align: right">\r\n    {{ ::result.indexer }}\r\n</td>\r\n<td class="col-md-1 search-results-cell result-category" style="text-align: right">\r\n    {{ ::result.category }}\r\n</td>\r\n<td class="col-md-1 search-results-cell result-size" style="text-align: right">\r\n    {{ ::result.size | byteFmt: 2 }}\r\n</td>\r\n<td class="col-md-1 search-results-cell result-details" style="text-align: right">\r\n    {{ ::(result.grabs ? result.grabs : \'-\') }}\r\n</td>\r\n<td class="col-md-1 search-results-cell result-age" style="text-align: right">\r\n    <span uib-tooltip="{{ ::result.date }}"\r\n          tooltip-placement="top"\r\n          tooltip-trigger="mouseenter">{{ ::result.age }}</span>\r\n</td>\r\n<td class="col-md-3 search-results-cell result-links">\r\n    <a href ng-click="showNfo(result)" ng-class="::{\'no-nfo\': result.hasNfo === \'NO\'}" class="no-underline"\r\n       uib-tooltip="{{ ::getNfoTooltip() }}"\r\n       tooltip-placement="top"\r\n       tooltip-trigger="mouseenter">\r\n        <i class="fa fa-file-text" aria-hidden="true" ng-class="::{\'fuzzy-nfo\': result.hasNfo == \'MAYBE\'}" style="margin-left:3px; margin-right:3px; vertical-align: middle"></i>\r\n    </a>\r\n    <span ng-if="::showDetailsDl">\r\n        <a ng-class="::{\'no-nfo\': !result.comments}" href="{{::result.details_link | dereferer}}" target="_blank" class="no-underline"\r\n           uib-tooltip="Comments"\r\n           tooltip-placement="top"\r\n           tooltip-trigger="mouseenter">\r\n            <i class="fa fa-comment" aria-hidden="true" style="margin-left:0px; margin-right:3px;"></i>\r\n        </a>\r\n        <a target="_blank" href="{{ ::result.details_link | dereferer}}" ng-class="::{\'no-nfo\': !result.details_link}" style="vertical-align: middle" class="no-underline"\r\n           uib-tooltip="Details"\r\n           tooltip-placement="top"\r\n           tooltip-trigger="mouseenter">\r\n            <i class="fa fa-info" aria-hidden="true" style="margin-left:3px; margin-right:3px; vertical-align: middle"></i>\r\n        </a>\r\n        <span ng-switch on="::result.downloadType">\r\n            <span ng-switch-when="TORRENT">\r\n                <send-torrent-to-blackhole search-result-id="result.searchResultId"></send-torrent-to-blackhole>\r\n            </span>\r\n            <span ng-switch-default>\r\n                <a target="_self" href="getnzb/user/{{ ::result.searchResultId }}" style="vertical-align: middle; margin-left: 3px; margin-right: 3px"\r\n                   class="no-underline"\r\n                   uib-tooltip="Download NZB"\r\n                   tooltip-placement="top"\r\n                   tooltip-trigger="mouseenter"><span class="glyphicon glyphicon-save"></span>\r\n                </a>\r\n            </span>\r\n        </span>\r\n    </span>\r\n    <addable-nzbs search-result-id="result.searchResultId" download-type="result.downloadType"></addable-nzbs>\r\n</td>\r\n');
$templateCache.put('directives/send-torrent-to-blackhole.html','<span ng-switch on="::useBlackhole">\r\n            <span ng-switch-when="true">\r\n                <a href="#" ng-click="add()" uib-tooltip="Save torrent to black hole"\r\n                   tooltip-placement="top"\r\n                   tooltip-trigger="mouseenter" class="no-underline">\r\n                    <span class="icon addable-nzb glyphicon" ng-class="cssClass"></span>\r\n                </a>\r\n\r\n            </span>\r\n            <span ng-switch-default>\r\n                <a target="_self" href="gettorrent/user/{{ ::result.searchResultId }}" style="vertical-align: middle; margin-left: 3px; margin-right: 3px"\r\n                   class="no-underline"\r\n                   uib-tooltip="Download torrent"\r\n                   tooltip-placement="top"\r\n                   tooltip-trigger="mouseenter"><span>Torrent</span>\r\n                </a>\r\n            </span>\r\n        </span>\r\n\r\n');
$templateCache.put('directives/tab-or-chart.html','<div>\r\n    <ul class="nav nav-tabs">\r\n        <li ng-class="{\'active\': display == \'chart\'}"><a href="#" ng-click="display = \'chart\'">Chart</a></li>\r\n        <li ng-class="{\'active\': display == \'table\'}"><a href="#" ng-click="display = \'table\'">Table</a></li>\r\n    </ul>\r\n\r\n\r\n    <div ng-show="display == \'chart\'">\r\n        <div ng-transclude="chartSlot"></div>\r\n    </div>\r\n\r\n\r\n    <div ng-show="display == \'table\'">\r\n        <div ng-transclude="tableSlot"></div>\r\n    </div>\r\n</div>');
$templateCache.put('directives/title-group.html','<tr ng-init="duplicateGroup=titles[0]" class="search-results-row" ng-class="{\'odd\': rowIndex % 2 == 0, \'even\' : rowIndex % 2 == 1}"\r\n    style="margin:0; border-width: 0; padding: 0">\r\n    <td style="margin:0; border-width: 0; padding: 0" colspan="7">\r\n        <duplicate-group duplicates="duplicateGroup" row-index="rowIndex" internal-row-index="0" is-first-row="true" display-title-toggle="titles.length > 1" selected="selected"\r\n                         do-show-duplicates="doShowDuplicates">\r\n        </duplicate-group>\r\n    </td>\r\n\r\n</tr>\r\n\r\n<tr ng-if="titleGroupExpanded" ng-repeat="duplicateGroup in titlesToShow() track by duplicateGroup[0].searchResultId" class="search-results-row"\r\n    ng-class="{\'odd\': rowIndex % 2 == 0, \'even\' : rowIndex % 2 == 1}">\r\n    <td style="margin:0; border-width: 0; padding: 0" colspan="7">\r\n        <duplicate-group duplicates="duplicateGroup" row-index="rowIndex" internal-row-index="{{ ::$index+1}}" selected="selected" do-show-duplicates="doShowDuplicates">\r\n\r\n        </duplicate-group>\r\n    </td>\r\n</tr>\r\n');
$templateCache.put('directives/updates.html','<div cg-busy="{promise:loadingPromise,message:\'Loading versions and changelog\'}">\r\n    Current version: {{ currentVersion }}\r\n    <br>\r\n    Latest version: {{ repVersion }}\r\n\r\n    <br>\r\n    <br>\r\n    <span ng-if="updateAvailable">\r\n        <button class="btn btn-default" type="button" ng-click="showChangelog()">See what\'s new!</button>\r\n        <button class="btn btn-default" type="button" ng-click="update()">Update!</button>\r\n        </span>\r\n    <span ng-if="!updateAvailable && !latestVersionIgnored">You\'re up to date!</span>\r\n    <span ng-if="latestVersionIgnored">The latest version was ignored by you.</span>\r\n    <button ng-if="!updateAvailable" class="btn btn-default" type="button" ng-click="forceUpdate()">Force update</button>\r\n\r\n    <div class="panel panel-default" style="margin-top: 50px; text-align: left">\r\n        <div class="panel-heading"><h3>Version history</h3></div>\r\n        <div class="list-group">\r\n            <li ng-repeat="entry in versionHistory" class="list-group-item" style="padding-top: 20px; padding-bottom: 20px;">\r\n                <h3 style="margin-top: 0">{{::entry.version}}</h3>\r\n                <div ng-repeat="change in entry.changes" style="margin-bottom: 5px">\r\n                <span ng-switch="change.type" style="margin-right: 5px">\r\n                    <span class="label label-primary" ng-switch-when="note">Note</span>\r\n                    <span class="label label-warning" ng-switch-when="fix">Fix</span>\r\n                    <span class="label label-success" ng-switch-when="feature">Feature</span>\r\n                </span>\r\n                    {{change.text}}\r\n                </div>\r\n            </li>\r\n        </div>\r\n    </div>\r\n</div>');
$templateCache.put('states/config.html','<div class="row">\r\n    <form name="form" name="ctrl.myform" novalidate>\r\n        <ul class="nav nav-tabs" role="tablist">\r\n            <li ng-repeat="tab in allTabs" ng-class="{\'active\': $index == activeTab}">\r\n                <a href="" ng-click="goToConfigState($index)">{{ tab.name }}</a>\r\n            </li>\r\n            <li style="position: absolute; right:0px; ">\r\n                <button ng-click="help()" class="btn config-button config-help-button btn-default">Help</button>\r\n                <button ng-click="submit()" class="btn config-button" ng-class="{\'btn-info\': isSavingNeeded(), \'pulse2\': isSavingNeeded(), \'btn-success\': !isSavingNeeded()}">Save</button>\r\n            </li>\r\n        </ul>\r\n\r\n        <div class="tab-content">\r\n            <div ng-repeat="tab in allTabs">\r\n                <formly-form model="tab.model" fields="tab.fields" ng-if="$index == activeTab" options="tab.options">\r\n                </formly-form>\r\n            </div>\r\n\r\n        </div>\r\n    </form>\r\n</div>\r\n\r\n\r\n<script type="text/ng-template" id="ui-select-multiple.html">\r\n    <ui-select multiple data-ng-model="model[options.key]" data-required="{{ to.required }}" data-disabled="{{ to.disabled }}" theme="bootstrap">\r\n        <ui-select-match class="ui-select-match" placeholder="{{ to.getPlaceholder(model[options.key]) }}">{{$item[to.labelProp]}}</ui-select-match>\r\n        <ui-select-choices class="ui-select-choices" data-repeat="{{ to.ngOptions }}">\r\n            <div ng-bind-html="option[to.labelProp] | highlight: $select.search"></div>\r\n        </ui-select-choices>\r\n    </ui-select>\r\n</script>\r\n\r\n<script type="text/ng-template" id="button-test-connection.html">\r\n    <span style="text-align: left;"><button class="btn btn-default" id="button-test-connection-{{ uniqueId }}" type="button" ng-click="testConnection()"><span\r\n            class="glyphicon glyphicon-refresh"></span></button> <span id="message-test-connection-{{ uniqueId }}"></span></span>\r\n</script>\r\n\r\n\r\n<script type="text/ng-template" id="button-check-caps.html">\r\n    <span style="text-align: left;"><button class="btn btn-default" id="button-check-caps-{{ uniqueId }}" type="button" ng-click="checkCaps()"><span\r\n            class="glyphicon glyphicon-refresh"></span></button> <span id="message-check-caps-{{ uniqueId }}"></span></span>\r\n</script>\r\n\r\n\r\n<script type="text/ng-template" id="newznab-preset.html">\r\n    <ui-select ng-model="selectedpreset" theme="bootstrap" on-select="selectPreset($item, $model)" search-enabled="false">\r\n        <ui-select-match class="ui-select-match" allow-clear="true">{{ display }}</ui-select-match>\r\n        <ui-select-choices class="ui-select-choices" repeat="preset in presets">\r\n            <div ng-bind-html="preset.name"></div>\r\n        </ui-select-choices>\r\n    </ui-select>\r\n</script>\r\n\r\n<script type="text/ng-template" id="repeatSection.html">\r\n    <!--loop through each element in model array-->\r\n    <div class="{{ hideRepeat }}">\r\n        <div class="repeatsection" ng-repeat="element in model[options.key]" ng-init="fields = copyFields(to.fields)">\r\n            <fieldset>\r\n                <legend>{{ element.name ? element.name : (element.username ? element.usernameOrIp : to.altLegendText)}}</legend>\r\n                <formly-form fields="fields"\r\n                             model="element"\r\n                             form="form">\r\n                </formly-form>\r\n                <div style="margin-bottom:20px;">\r\n                    <button type="button" class="btn btn-sm btn-danger" ng-click="remove($index)">\r\n                        Remove {{ element.name }}\r\n                    </button>\r\n                </div>\r\n\r\n            </fieldset>\r\n        </div>\r\n        <hr>\r\n        <p class="AddNewButton">\r\n            <button type="button" class="btn btn-primary" ng-click="addNew()">{{ to.btnText }}</button>\r\n        </p>\r\n    </div>\r\n</script>\r\n\r\n\r\n<script type="text/ng-template" id="arrayConfig.html">\r\n    <div class="row">\r\n\r\n        <div class="btn-group" style="margin-bottom: 30px; margin-left: auto; margin-right: auto; float:none !important;">\r\n            <button ng-if="!options.data.presetsOnly" class="btn btn-info" ng-click="addEntry(model)"><span class="glyphicon glyphicon-plus" style="margin-right: 10px"></span>{{\r\n                options.data.addNewText }}\r\n            </button>\r\n            <button type="button" class="btn btn-info dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\r\n                <span ng-if="options.data.presetsOnly"><span class="glyphicon glyphicon-plus" style="margin-right: 10px"></span>{{ options.data.addNewText }}</span>\r\n                <span class="caret"></span>\r\n                <span class="sr-only">Toggle Dropdown</span>\r\n            </button>\r\n            <ul class="dropdown-menu">\r\n                <li ng-repeat="preset in presets[0]">\r\n                    <a ng-click="addEntry(model, preset)">{{ preset.name }}</a>\r\n                </li>\r\n                <li ng-if="presets.length > 1" role="separator" class="divider"></li>\r\n                <li ng-repeat="preset in presets[1]">\r\n                    <a ng-click="addEntry(model, preset)">{{ preset.name }}</a>\r\n                </li>\r\n                <li ng-if="presets.length > 2" role="separator" class="divider"></li>\r\n                <li ng-repeat="preset in presets[2]">\r\n                    <a ng-click="addEntry(model, preset)">{{ preset.name }}</a>\r\n                </li>\r\n            </ul>\r\n        </div>\r\n    </div>\r\n\r\n\r\n    <div ng-repeat="entry in model | orderBy: [\'-score\', \'name\'] track by entry.name">\r\n        <div class="row">\r\n            <div style="margin-left: auto; margin-right: auto; float:none !important;">\r\n                <div ng-include="options.data.entryTemplateUrl"></div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</script>\r\n\r\n\r\n<script type="text/ng-template" id="setting-wrapper.html">\r\n    <div class="form-group form-horizontal" ng-class="{\'row\': !options.templateOptions.noRow}">\r\n        <div style="text-align:right;">\r\n            <label for="{{::id}}" class="col-md-7 control-label">\r\n                {{ to.label }} {{ to.required ? "*" : ""}}\r\n            </label>\r\n        </div>\r\n        <div class="col-md-6">\r\n            <formly-transclude></formly-transclude>\r\n            <div class="my-messages" ng-messages="fc.$error" ng-if="options.formControl.$touched || form.$submitted" ng-messages-multiple>\r\n                <div class="some-message has-error control-label" ng-message="{{::name}}" ng-repeat="(name, message) in ::options.validation.messages">\r\n                    {{ message(fc.$viewValue, fc.$modelValue, this)}}\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <span class="col-md-7 help-block" ng-bind-html="to.help | unsafe">{{ to.help | unsafe }}</span>\r\n    </div>\r\n\r\n</script>\r\n\r\n<script type="text/ng-template" id="indexerEntry.html">\r\n    <indexer-input indexer="entry" model="model" on-click="showBox"></indexer-input>\r\n</script>\r\n\r\n<script type="text/ng-template" id="downloaderEntry.html">\r\n    <div style="margin-bottom: 30px;">\r\n        <form class="form-inline">\r\n            <button ng-click="showBox(entry, model)" class="btn btn-secondary indexer-button indexer-input btn-default" style="margin-right: 10px;">{{ entry.name }}</button>\r\n            <input bs-switch type="checkbox" ng-model="entry.enabled"/>\r\n        </form>\r\n    </div>\r\n</script>\r\n\r\n<script type="text/ng-template" id="configBox.html">\r\n    <div class="modal-header" ng-show="model.name">\r\n        <h3 class="modal-title">{{ model.name }}</h3>\r\n    </div>\r\n    <div class="modal-body">\r\n        <formly-form fields="fields"\r\n                     model="model"\r\n                     form="form"\r\n                     options="options"\r\n        >\r\n        </formly-form>\r\n    </div>\r\n    <div class="modal-footer">\r\n        <button class="btn btn-danger pull-left" ng-click="deleteEntry()" ng-if="!isInitial && allowDelete">Delete</button>\r\n        <button class="btn btn-warning" ng-click="reset()">Reset</button>\r\n        <button class="btn btn-success has-spinner" ng-class="{\'active\': spinnerActive}" ng-click="obSubmit()"><span class="spinner"><i class="icon-spin icon-refresh"></i></span>Submit</button>\r\n    </div>\r\n</script>\r\n\r\n<script type="text/ng-template" id="tab-template.html">\r\n    <div>\r\n        Hallo\r\n    </div>\r\n\r\n</script>');
$templateCache.put('states/download-history.html','<div class="row" style="margin-top: 30px; margin-bottom: 20px">\r\n    <div class="col-md-5"></div>\r\n    <div class="col-md-10" style="text-align: center">\r\n        <dir-pagination-controls on-page-change="update()" pagination-id="downloads"></dir-pagination-controls>\r\n    </div>\r\n</div>\r\n<table class="table">\r\n    <thead>\r\n    <tr>\r\n        <th class="col-md-2">\r\n            <column-sortable column="time" start-mode="2" style="width: 10%">Time\r\n            </column-sortable>\r\n            <column-filter-wrapper>\r\n                <time-filter column="time" selected="preselectedTimeInterval"/>\r\n            </column-filter-wrapper>\r\n        </th>\r\n        <th class="col-md-2">\r\n            <column-sortable column="indexer.name" style="width: 10%">Indexer\r\n            </column-sortable>\r\n            <column-filter-wrapper>\r\n                <checkboxes-filter column="indexer" entries="indexersForFiltering" preselect="true" show-invert="true"/>\r\n            </column-filter-wrapper>\r\n        </th>\r\n        <th class="col-md-8" style="width: 48%">\r\n            <column-sortable column="title">Title\r\n            </column-sortable>\r\n            <column-filter-wrapper>\r\n                <freetext-filter column="title"/>\r\n            </column-filter-wrapper>\r\n        </th>\r\n        <th class="col-md-1" style="width: 9%">\r\n            <column-sortable column="result">Result <span class="glyphicon glyphicon-question-sign" tooltip-placement="auto top"\r\n                                                          uib-tooltip="Actual download result only available if Hydra\'s downloader user scripts are used"></span></div>\r\n            </column-sortable>\r\n            <column-filter-wrapper>\r\n                <checkboxes-filter column="result" entries="successfulForFiltering" preselect="true" show-invert="false"/>\r\n            </column-filter-wrapper>\r\n        </th>\r\n        <th class="col-md-1" style="width: 7%">\r\n            <column-sortable column="access_source">Source\r\n            </column-sortable>\r\n            <column-filter-wrapper>\r\n                <boolean-filter column="access_source" options="accessOptionsForFiltering" preselect="0"/>\r\n            </column-filter-wrapper>\r\n        </th>\r\n        <th class="col-md-1" style="width: 6%">\r\n            <column-sortable column="age">Age</column-sortable>\r\n            <column-filter-wrapper>\r\n                <freetext-filter column="age"/>\r\n            </column-filter-wrapper>\r\n        </th>\r\n        <th class="col-md-2" style="width: 10%">\r\n            <column-sortable column="username_or_ip">User / IP</column-sortable>\r\n            <column-filter-wrapper>\r\n                <freetext-filter column="username_or_ip"/>\r\n            </column-filter-wrapper>\r\n        </th>\r\n    </tr>\r\n    </thead>\r\n    <tbody>\r\n    <tr dir-paginate="nzbDownload in nzbDownloads | itemsPerPage: limit" total-items="totalDownloads" current-page="pagination.current" pagination-id="downloads">\r\n        <td class="narrow-row">{{ nzbDownload.time | reformatDate }}</td>\r\n        <td class="narrow-row">{{ nzbDownload.indexer.name }}</td>\r\n        <td class="narrow-row">\r\n            <addable-nzbs search-result-id="nzbDownload.searchResultId" ng-style="{\'visibility\':!nzbDownload.searchResultId ? \'hidden\' : \'initial\'}"></addable-nzbs>\r\n            <a target="_blank" href="{{ nzbDownload.detailsLink | dereferer }}" ng-if="nzbDownload.detailsLink">{{ nzbDownload.title }}</a><span ng-if="!nzbDownload.detailsLink">{{ nzbDownload.title }}</span>\r\n        </td>\r\n        <td class="narrow-row">\r\n            <span ng-bind-html="getStatusIcon(nzbDownload.status)" uib-tooltip="{{nzbDownload.status}}"></span>\r\n        </td>\r\n        <td class="narrow-row">{{ nzbDownload.accessSource === "INTERNAL" ? "Internal" : "API"}}</td>\r\n        <td class="narrow-row">{{ nzbDownload.age }}</td>\r\n        <td class="narrow-row">{{ nzbDownload.usernameOrIp }}</td>\r\n    </tr>\r\n    </tbody>\r\n</table>\r\n<dir-pagination-controls on-page-change="pageChanged(newPageNumber)" pagination-id="downloads"></dir-pagination-controls>\r\n');
$templateCache.put('states/header.html','<nav class="navbar navbar-default navbar-static-top">\r\n    <div class="container">\r\n        <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">\r\n            <ul class="nav navbar-nav">\r\n                <li ui-sref-active="active" ng-if="showSearch"><a ui-sref="root.search" ui-sref-opts="{inherit: false, reload: true}">Search</a></li>\r\n                <li ui-sref-active="{\'active\':\'root.stats\'}" ng-if="showStats"><a ui-sref="root.stats.searches">History & Stats</a></li>\r\n                <li ui-sref-active="{\'active\':\'root.config\'}" ng-if="showAdmin"><a ui-sref="root.config.main">Config</a></li>\r\n                <li ui-sref-active="{\'active\':\'root.system\'}" ng-if="showAdmin"><a ui-sref="root.system.control">System</a></li>\r\n            </ul>\r\n            <ul class="nav navbar-nav navbar-right" ng-if="showLoginout">\r\n                <li><a href="" ng-click="loginout()"\r\n                       uib-tooltip="{{ loginlogoutText}}"\r\n                       tooltip-placement="bottom"\r\n                       tooltip-trigger="mouseenter"\r\n                ><span class="glyphicon glyphicon-off" style="margin-left: 5px"></span></a></li>\r\n            </ul>\r\n\r\n        </div>\r\n    </div>\r\n</nav>');
$templateCache.put('states/indexer-statuses.html','<table class="table">\r\n    <caption>Indexer statuses</caption>\r\n    <thead>\r\n    <tr>\r\n        <th>Indexer</th>\r\n        <th>Last failure</th>\r\n        <th>Disabled until</th>\r\n        <th>Reason</th>\r\n    </tr>\r\n    </thead>\r\n    <tbody>\r\n    <tr ng-repeat="indexerStatus in statuses">\r\n        <td class="col-md-2">{{ indexerStatus.indexer.name }}</td>\r\n        <td class="col-md-3"><span ng-if="indexerStatus.lastFailure">{{ indexerStatus.lastFailure | reformatDate}}</span></td>\r\n        <td class="col-md-4">\r\n            <span ng-if="indexerStatus.disabledUntil">\r\n                <a href="" ng-click="enable(indexerStatus.indexer.name)"\r\n                   uib-tooltip="Click to enable the indexer again"\r\n                   tooltip-placement="right"\r\n                   tooltip-trigger="mouseenter">\r\n                    <span ng-if="!isInPast(indexerStatus.disabledUntil)||indexerStatus.disabledPermanently" class="glyphicon glyphicon-ok">\r\n                    </span>\r\n                </a>\r\n            </span>\r\n\r\n            <span ng-if="indexerStatus.disabledUntil">{{ indexerStatus.disabledUntil | reformatDate}}</span>\r\n            <span ng-if="indexerStatus.disabledPermanently">Permanently</span>\r\n\r\n        </td>\r\n        <td class="col-md-11">{{ indexerStatus.reason }}</td>\r\n    </tr>\r\n    </tbody>\r\n</table>');
$templateCache.put('states/login.html','<div class="row">\r\n    <div class="center-form panel">\r\n        <div class="panel-body">\r\n            <h2 class="text-center">Log in</h2>\r\n            <form method="post" ng-submit="login()" name="loginForm">\r\n                <div class="form-group has-feedback">\r\n                    <input class="form-control input-lg" type="text" name="username" ng-model="user.username" placeholder="Username" required autofocus auto-focus>\r\n                    <span class="ion-at form-control-feedback"></span>\r\n                </div>\r\n                <div class="form-group has-feedback">\r\n                    <input class="form-control input-lg" type="password" name="password" ng-model="user.password" placeholder="Password" required>\r\n                    <span class="ion-key form-control-feedback"></span>\r\n                </div>\r\n                <button type="submit" ng-disabled="loginForm.$invalid" class="btn btn-lg  btn-block btn-success">Log in</button>\r\n                You will be forwarded to the search area.\r\n            </form>\r\n        </div>\r\n    </div>\r\n</div>\r\n');
$templateCache.put('states/main-stats.html','<pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">\r\n    <path d="M-1,1 l2,-2\r\n           M0,4 l4,-4\r\n           M3,5 l2,-2"></path>\r\n</pattern>\r\n<div class="row" style="margin-top: 30px; margin-bottom: 30px">\r\n    <div class="col-md-6" style="font-size: x-small; text-align: justify; text-justify: auto">\r\n        Disclaimer: Don\'t read too much into these stats. Which indexer is picked for a download depends on its score and some more or less random values like posting time of the NZB.\r\n        Some indexers might have nightly downtime which would influence the successful percentage.\r\n    </div>\r\n    <div class="col-md-4">\r\n        <p class="input-group">\r\n            <span class="input-group-addon" id="after-addon">After</span>\r\n            <input type="text" class="form-control" uib-datepicker-popup ng-model="afterDate" is-open="after.opened" datepicker-options="dateOptions" ng-required="true" close-text="Close"\r\n                   ng-keypress="onKeypress($event)"/>\r\n            <span class="input-group-btn input-group-btn2">\r\n            <button type="button" class="btn btn-default" ng-click="openAfter()"><i class="glyphicon glyphicon-calendar"></i></button>\r\n          </span>\r\n        </p>\r\n    </div>\r\n    <div class="col-md-4">\r\n        <p class="input-group">\r\n            <span class="input-group-addon" id="before-addon">Before</span>\r\n            <input type="text" class="form-control" uib-datepicker-popup ng-model="beforeDate" is-open="before.opened" datepicker-options="dateOptions" ng-required="true" close-text="Close"\r\n                   ng-keypress="onKeypress($event)"/>\r\n            <span class="input-group-btn input-group-btn2">\r\n            <button type="button" class="btn btn-default" ng-click="openBefore()"><i class="glyphicon glyphicon-calendar"></i></button>\r\n          </span>\r\n        </p>\r\n    </div>\r\n    <div class="col-md-3">\r\n        <label>Show disabled indexers</label>\r\n        <input bs-switch type="checkbox" ng-model="foo.includeDisabledIndexersInStats" switch-change="toggleIncludeDisabledIndexers()" switch-size="mini"/>\r\n    </div>\r\n    <div class="col-md-3">\r\n        <button type="button" class="btn btn-info" ng-click="refresh()">Refresh</button>\r\n    </div>\r\n</div>\r\n\r\n\r\n<div cg-busy="{promise:statsLoadingPromise,message:\'Calculating stats\', delay:100}">\r\n    <div class="row">\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                <input bs-switch type="checkbox" ng-model="foo.statsSwichState.avgResponseTimes" switch-size="mini" ng-change="onStatsSwitchToggle(\'avgResponseTimes\')">\r\n                </span>\r\n\r\n\r\n                Avg. response times <span class="glyphicon glyphicon-question-sign" tooltip-placement="auto top"\r\n                                          uib-tooltip="Response time is the time an API request takes, from start to completion of the web call"></span></div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.avgResponseTimes">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>Indexer</th>\r\n                        <th>Avg. response time</th>\r\n                        <th>Delta</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="avgResponseTime in stats.avgResponseTimes">\r\n                        <td>{{ avgResponseTime.indexer }}</td>\r\n                        <td>{{ avgResponseTime.avgResponseTime }}</td>\r\n                        <td>{{ avgResponseTime.delta }}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart>\r\n                    <nvd3 options="avgResponseTimesChart.options" data="avgResponseTimesChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n\r\n\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                <input bs-switch type="checkbox" ng-model="foo.statsSwichState.avgIndexerSearchResultsShares" switch-size="mini" ng-change="onStatsSwitchToggle(\'avgIndexerSearchResultsShares\')">\r\n                </span>\r\n                Average results <span class="glyphicon glyphicon-question-sign" tooltip-placement="auto top"\r\n                                      uib-tooltip="How many results the indexer on average contributed to specific searches (i.e. update queries e.g. for the latest releases in a specific category are ignored)"></span>\r\n                and average unique results <span class="glyphicon glyphicon-question-sign" tooltip-placement="auto top-right"\r\n                                                 uib-tooltip-html="\'How many of the results the indexer contributed to searches were unique (only returned by this indexer). <br>Results from raw search engines are excluded because they would be misleading.\'"></span>\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.avgIndexerSearchResultsShares">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>Indexer</th>\r\n                        <th>Avg. results (%)\r\n                        </th>\r\n                        <th>Avg. unique results (%)</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="avgIndexerSearchResultsShare in stats.avgIndexerSearchResultsShares">\r\n                        <td>{{ avgIndexerSearchResultsShare.indexerName }}</td>\r\n                        <td>{{ avgIndexerSearchResultsShare.totalShare | number: 1}}</td>\r\n                        <td>{{ avgIndexerSearchResultsShare.uniqueShare | number: 1}}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n                <chart>\r\n                    <nvd3 options="resultsSharesChart.options" data="resultsSharesChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n\r\n        </div>\r\n    </div>\r\n\r\n    <div class="row" style="margin-bottom: 50px">\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                <input bs-switch type="checkbox" ng-model="foo.statsSwichState.indexerApiAccessStats" switch-size="mini" ng-change="onStatsSwitchToggle(\'indexerApiAccessStats\')">\r\n                </span>\r\n                <caption>Indexer API accesses <span class="glyphicon glyphicon-question-sign" tooltip-placement="top"\r\n                                                    uib-tooltip="An API access is considered failed only when the indexer could not be reached, not if auth was unsuccessful or Hydra had an unexpected error. The average calculation only spans the time since the first search with the indexer."></span>\r\n                </caption>\r\n            </div>\r\n            <table class="table" style="margin-top: 9px" ng-show="foo.statsSwichState.indexerApiAccessStats">\r\n                <thead>\r\n                <tr>\r\n                    <th>Indexer</th>\r\n                    <th>Avg. per day</th>\r\n                    <th>% successful</th>\r\n                    <th>% failed</th>\r\n                </tr>\r\n                </thead>\r\n                <tbody>\r\n                <tr ng-repeat="avgIndexerAccessSuccess in stats.indexerApiAccessStats">\r\n                    <td>{{ avgIndexerAccessSuccess.indexerName }}</td>\r\n                    <td>{{ avgIndexerAccessSuccess.averageAccessesPerDay | number: 0 }}</td>\r\n                    <td>{{ avgIndexerAccessSuccess.percentSuccessful | number: 0}}</td>\r\n                    <td>{{ avgIndexerAccessSuccess.percentConnectionError | number: 0 }}</td>\r\n                </tr>\r\n                </tbody>\r\n            </table>\r\n        </div>\r\n\r\n\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                <input bs-switch type="checkbox" ng-model="foo.statsSwichState.indexerDownloadShares" switch-size="mini" ng-change="onStatsSwitchToggle(\'indexerDownloadShares\')">\r\n                </span>\r\n                NZB downloads per indexer <span class="glyphicon glyphicon-question-sign" tooltip-placement="top"\r\n                                                uib-tooltip="Only downloads by enabled indexers are taken into account and displayed"></span></caption>\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.indexerDownloadShares">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>Indexer</th>\r\n                        <th>Total</th>\r\n                        <th>% of all enabled</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="indexerDownloads in stats.indexerDownloadShares">\r\n                        <td>{{ indexerDownloads.indexerName }}</td>\r\n                        <td>{{ indexerDownloads.total | number: 0}}</td>\r\n                        <td>{{ indexerDownloads.share | number: 0 }}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart>\r\n                    <nvd3 options="indexerDownloadSharesChart.options" data="indexerDownloadSharesChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n\r\n\r\n        </div>\r\n    </div>\r\n\r\n    <div class="row">\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                <input bs-switch type="checkbox" ng-model="foo.statsSwichState.downloadsPerAgeStats" switch-size="mini" ng-change="onStatsSwitchToggle(\'downloadsPerAgeStats\')">\r\n                </span>\r\n                NZB downloads per age (in 100 day steps, all downloads)\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.downloadsPerAgeStats">\r\n                <table class="table">\r\n                    <tbody>\r\n                    <tr>\r\n                        <td>Average age</td>\r\n                        <td>{{ stats.downloadsPerAgeStats.averageAge}}</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>% older than 1000 days</td>\r\n                        <td>{{ stats.downloadsPerAgeStats.percentOlder1000 | number : 1}}</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>% older than 2000 days</td>\r\n                        <td>{{ stats.downloadsPerAgeStats.percentOlder2000 | number : 1}}</td>\r\n                    </tr>\r\n                    <tr>\r\n                        <td>% older than 3000 days</td>\r\n                        <td>{{ stats.downloadsPerAgeStats.percentOlder3000 | number : 1}}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart class="downloadsPerAge">\r\n                    <nvd3 options="downloadsPerAgeChart.options" data="downloadsPerAgeChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                <input bs-switch type="checkbox" ng-model="foo.statsSwichState.successfulDownloadsPerIndexer" switch-size="mini" ng-change="onStatsSwitchToggle(\'successfulDownloadsPerIndexer\')">\r\n                    </span>\r\n                Successful downloads per indexer <span class="glyphicon glyphicon-question-sign" tooltip-placement="top"\r\n                                                       uib-tooltip="Only works if user scripts report the actual download result of a NZB\'s content"></span>\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.successfulDownloadsPerIndexer">\r\n                <table class="table">\r\n                    <thead>\r\n                    <th>Indexer</th>\r\n                    <th>% of downloads successful</th>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="stat in stats.successfulDownloadsPerIndexer">\r\n                        <td>{{ stat.indexerName}}</td>\r\n                        <td>{{ stat.percentage | number : 1}}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart class="successfulDownloadsPerIndexerChart">\r\n                    <nvd3 options="successfulDownloadsPerIndexerChart.options" data="successfulDownloadsPerIndexerChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n\r\n        </div>\r\n    </div>\r\n\r\n\r\n    <div class="row">\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                    <input bs-switch type="checkbox" ng-model="foo.statsSwichState.searchSharesPerUserOrIp" switch-size="mini" ng-change="onStatsSwitchToggle(\'searchSharesPerUserOrIp\')">\r\n                    </span>\r\n\r\n                Searches per username / IP\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.searchSharesPerUserOrIp">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>User or IP</th>\r\n                        <th>Percentage</th>\r\n                        <th>Count</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="stat in stats.searchSharesPerUserOrIp">\r\n                        <td>{{ stat.userOrIp }}</td>\r\n                        <td>{{ stat.percentage | number : 1}}</td>\r\n                        <td>{{ stat.count }}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart class="searchSharesPerUserOrIpChart">\r\n                    <nvd3 options="searchSharesPerUserOrIpChart.options" data="searchSharesPerUserOrIpChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                    <input bs-switch type="checkbox" ng-model="foo.statsSwichState.downloadSharesPerUserOrIp" switch-size="mini" ng-change="onStatsSwitchToggle(\'downloadSharesPerUserOrIp\')">\r\n                </span>\r\n                Downloads per username / IP\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.downloadSharesPerUserOrIp">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>User or IP</th>\r\n                        <th>Percentage</th>\r\n                        <th>Count</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="stat in downloadSharesPerUserOrIp">\r\n                        <td>{{ stat.userOrIp }}</td>\r\n                        <td>{{ stat.percentage | number : 1}}</td>\r\n                        <td>{{ stat.count}}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart class="downloadSharesPerUserOrIpChart">\r\n                    <nvd3 options="downloadSharesPerUserOrIpChart.options" data="downloadSharesPerUserOrIpChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n    </div>\r\n\r\n    <div class="row">\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                    <input bs-switch type="checkbox" ng-model="foo.statsSwichState.userAgentSearchShares" switch-size="mini" ng-change="onStatsSwitchToggle(\'userAgentSearchShares\')">\r\n                </span>\r\n                API Searches per user agent <span class="glyphicon glyphicon-question-sign" tooltip-placement="auto top"\r\n                                                  uib-tooltip="Some tools don\'t use specific user agents. They will most likely show up as \'Mozilla\' or as \'Other\'"></span>\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.userAgentSearchShares">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>User agent</th>\r\n                        <th>Percentage</th>\r\n                        <th>Count</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="stat in stats.userAgentSearchShares">\r\n                        <td>{{ stat.userAgent }}</td>\r\n                        <td>{{ stat.percentage | number : 1}}</td>\r\n                        <td>{{ stat.count }}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart class="userAgentSearchSharesChart">\r\n                    <nvd3 options="userAgentSearchSharesChart.options" data="userAgentSearchSharesChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                    <input bs-switch type="checkbox" ng-model="foo.statsSwichState.userAgentDownloadShares" switch-size="mini" ng-change="onStatsSwitchToggle(\'userAgentDownloadShares\')">\r\n                </span>\r\n                API downloads per user agent <span class="glyphicon glyphicon-question-sign" tooltip-placement="auto top"\r\n                                                  uib-tooltip="Some tools don\'t use specific user agents. They will most likely show up as \'Mozilla\' or as \'Other\'"></span>\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.userAgentDownloadShares">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>User agent</th>\r\n                        <th>Percentage</th>\r\n                        <th>Count</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="stat in stats.userAgentDownloadShares">\r\n                        <td>{{ stat.userAgent }}</td>\r\n                        <td>{{ stat.percentage | number : 1}}</td>\r\n                        <td>{{ stat.count }}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart class="userAgentDownloadSharesChart">\r\n                    <nvd3 options="userAgentDownloadSharesChart.options" data="userAgentDownloadSharesChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n\r\n\r\n    </div>\r\n\r\n\r\n    <div class="row">\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                    <input bs-switch type="checkbox" ng-model="foo.statsSwichState.searchesPerDayOfWeek" switch-size="mini" ng-change="onStatsSwitchToggle(\'searchesPerDayOfWeek\')">\r\n                </span>\r\n                Searches per day of week\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.searchesPerDayOfWeek">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>Day of the week</th>\r\n                        <th>Searches</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="stat in stats.searchesPerDayOfWeek">\r\n                        <td>{{ stat.day }}</td>\r\n                        <td>{{ stat.count }}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart class="weeklyChart">\r\n                    <nvd3 options="searchesPerDayOfWeekChart.options" data="searchesPerDayOfWeekChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n\r\n\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                    <input bs-switch type="checkbox" ng-model="foo.statsSwichState.searchesPerHourOfDay" switch-size="mini" ng-change="onStatsSwitchToggle(\'searchesPerHourOfDay\')">\r\n                </span>\r\n                Searches per hour of day\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.searchesPerHourOfDay">\r\n                <table>\r\n                    <table class="table">\r\n                        <thead>\r\n                        <tr>\r\n                            <th>Hour of the day</th>\r\n                            <th>Searches</th>\r\n                        </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                        <tr ng-repeat="stat in stats.searchesPerHourOfDay">\r\n                            <td>{{ stat.hour }}</td>\r\n                            <td>{{ stat.count }}</td>\r\n                        </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </table>\r\n\r\n                <chart class="dailyChart">\r\n                    <nvd3 options="searchesPerHourOfDayChart.options" data="searchesPerHourOfDayChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n\r\n        </div>\r\n    </div>\r\n\r\n\r\n    <div class="row">\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                    <input bs-switch type="checkbox" ng-model="foo.statsSwichState.downloadsPerDayOfWeek" switch-size="mini" ng-change="onStatsSwitchToggle(\'downloadsPerDayOfWeek\')">\r\n                </span>\r\n                NZB downloads per day of week\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.downloadsPerDayOfWeek">\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th>Day of the week</th>\r\n                        <th>Downloads</th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="stat in stats.downloadsPerDayOfWeek">\r\n                        <td>{{ stat.day }}</td>\r\n                        <td>{{ stat.count }}</td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n\r\n                <chart class="weeklyChart">\r\n                    <nvd3 options="downloadsPerDayOfWeekChart.options" data="downloadsPerDayOfWeekChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n\r\n\r\n        <div class="col-md-10 stat-box">\r\n            <div class="caption">\r\n                <span uib-tooltip="Hiding a stat will disable its calculation and may improve overall loading time" tooltip-placement="auto top">\r\n                    <input bs-switch type="checkbox" ng-model="foo.statsSwichState.downloadsPerHourOfDay" switch-size="mini" ng-change="onStatsSwitchToggle(\'downloadsPerHourOfDay\')">\r\n                </span>\r\n                NZB downloads per hour of day\r\n            </div>\r\n            <tab-or-chart display="chart" ng-show="foo.statsSwichState.downloadsPerHourOfDay">\r\n                <table>\r\n                    <table class="table">\r\n                        <thead>\r\n                        <tr>\r\n                            <th>Hour of the day</th>\r\n                            <th>Downloads</th>\r\n                        </tr>\r\n                        </thead>\r\n                        <tbody>\r\n                        <tr ng-repeat="stat in stats.downloadsPerHourOfDay">\r\n                            <td>{{ stat.hour }}</td>\r\n                            <td>{{ stat.count }}</td>\r\n                        </tr>\r\n                        </tbody>\r\n                    </table>\r\n                </table>\r\n\r\n                <chart class="dailyChart">\r\n                    <nvd3 options="downloadsPerHourOfDayChart.options" data="downloadsPerHourOfDayChart.data"></nvd3>\r\n                </chart>\r\n            </tab-or-chart>\r\n        </div>\r\n    </div>\r\n\r\n\r\n</div>');
$templateCache.put('states/search-history.html','<div id="content">\r\n    <div class="row" style="margin-top: 30px; margin-bottom: 20px">\r\n        <div class="col-md-5"></div>\r\n        <div class="col-md-10" style="text-align: center">\r\n            <dir-pagination-controls on-page-change="update()" pagination-id="searches"></dir-pagination-controls>\r\n        </div>\r\n    </div>\r\n    <table class="table">\r\n        <thead>\r\n        <tr>\r\n            <th class="col-md-2">\r\n                <column-sortable column="time" style="width: 10%" reversed="false" start-mode="2">Time\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <time-filter column="time" selected="preselectedTimeInterval"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th class="col-md-8" style="width: 30%">\r\n                <column-sortable column="query" reversed="false" start-mode="1">Query\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <freetext-filter column="query"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th style="width: 10%">\r\n                <column-sortable column="category_name" reversed="false" start-mode="1">Category\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <checkboxes-filter column="category_name" entries="categoriesForFiltering" preselect="true" show-invert="true"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th style="width: 32%">\r\n                Additional parameters\r\n            </th>\r\n            <th class="col-md-1" style="width: 8%">\r\n                <column-sortable column="source" reversed="false" start-mode="1">Source\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <boolean-filter column="source" options="accessOptionsForFiltering" preselect="0"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th class="col-md-2" style="width: 10%">\r\n                <column-sortable column="username_or_ip" reversed="false" start-mode="1">User / IP</column-sortable>\r\n                <column-filter-wrapper>\r\n                    <freetext-filter column="username_or_ip"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n        </tr>\r\n        </thead>\r\n        <tbody>\r\n        <tr dir-paginate="request in searchRequests | itemsPerPage: limit" total-items="totalRequests" current-page="pagination.current" pagination-id="searches">\r\n            <td class="narrow-row">{{ request.time | reformatDate }}</td>\r\n            <td class="narrow-row">\r\n                <a href="" ng-click="openSearch(request)"\r\n                   uib-tooltip="Repeat this search with all currently enabled indexers." tooltip-placement="top" tooltip-trigger="mouseenter"\r\n                ><span class="glyphicon glyphicon-search"></span></a>\r\n                <span ng-class="{\'history-title\': request.movietitle != null || request.tvtitle != null || (request.query == null && request.identifier_key == null && request.season ==null && request.episode ==null)}">\r\n                {{ formatQuery(request) }}\r\n\r\n            </span>\r\n            </td>\r\n            <td class="narrow-row">{{ request.categoryName }}</td>\r\n            <td class="narrow-row" ng-bind-html="formatAdditional(request)"></td>\r\n            <td class="narrow-row">{{ request.source === "INTERNAL" ? "Internal" : "API"}}</td>\r\n            <td class="narrow-row">{{ request.usernameOrIp }}</td>\r\n        </tr>\r\n        </tbody>\r\n    </table>\r\n    <dir-pagination-controls on-page-change="pageChanged(newPageNumber)" pagination-id="searches"></dir-pagination-controls>\r\n\r\n</div>');
$templateCache.put('states/search-results.html','<div class="row" ng-if="indexersearches.length" style="margin-top: 25px">\r\n\r\n    <div class="col-md-5"></div>\r\n    <div class="col-md-10" style="padding-right: 0px">\r\n        <uib-accordion close-others="oneAtATime">\r\n            <div uib-accordion-group panel-class="panel-indexer-statuses" is-open="foo.indexerStatusesExpanded" is-disabled="true" class="">\r\n                <uib-accordion-heading>\r\n                    <span class="indexer-statuses-accordion">\r\n                        <span ng-click="toggleIndexerStatuses()">Indexer statuses</span><span ng-if="countRejected > 0"> / Rejected results</span> <i class="pull-right glyphicon"\r\n                                                                                                                                                      ng-class="{\'glyphicon-chevron-down\': foo.indexerStatusesExpanded, \'glyphicon-chevron-right\': !foo.indexerStatusesExpanded}"\r\n                                                                                                                                                      ng-click="toggleIndexerStatuses()"></i>\r\n                    </span>\r\n                </uib-accordion-heading>\r\n\r\n                <table class="table">\r\n                    <thead>\r\n                    <tr>\r\n                        <th class="col-md-6 text-left">\r\n                            Indexer\r\n                        </th>\r\n                        <th class="col-md-2 text-left">\r\n                            Results\r\n                        </th>\r\n                        <th class="col-md-4 text-left">\r\n                            Response time\r\n                        </th>\r\n                        <th class="col-md-9 text-left">\r\n                            Status\r\n                        </th>\r\n\r\n                    </tr>\r\n                    </thead>\r\n\r\n                    <tbody>\r\n                    <tr ng-repeat-start="ps in indexersearches " ng-if="0"></tr>\r\n                    <!-- First result in the list, show regularly -->\r\n                    <tr>\r\n                        <td class="text-left">\r\n                            {{ ps.indexerName }}\r\n                        </td>\r\n                        <td class="text-left">\r\n                    <span ng-if="ps.didSearch">\r\n                        <span ng-if="!ps.totalResultsKnown && ps.numberOfAvailableResults > 0">&gt;</span>{{ ps.numberOfAvailableResults }}\r\n                    </span>\r\n                        </td>\r\n                        <td class="text-left">\r\n                    <span ng-if="ps.didSearch">\r\n                        {{ ps.responseTime }}ms\r\n                    </span>\r\n                        </td>\r\n                        <td class="text-left">\r\n                    <span ng-if="::ps.didSearch">\r\n                        <span class="glyphicon" ng-class="{\'glyphicon-ok\' : ps.wasSuccessful, \'glyphicon-remove\' : !ps.wasSuccessful}"></span>\r\n\r\n                            <span ng-if="::!ps.wasSuccessful">{{ ps.errorMessage }}</span>\r\n                        </span>\r\n                            </span>\r\n                            <span ng-if="::!ps.didSearch">\r\n                        Did not search.\r\n                    </span>\r\n                        </td>\r\n                    </tr>\r\n                    <tr ng-repeat-end ng-if="0"></tr>\r\n\r\n\r\n                    <tr ng-repeat-start="ps in notPickedIndexersWithReason" ng-if="0"></tr>\r\n                    <tr>\r\n                        <td class="text-left">\r\n                            {{ ps.indexer }}\r\n                        </td>\r\n                        <td class="text-left">\r\n                        </td>\r\n                        <td class="text-left">\r\n                        </td>\r\n                        <td class="text-left">\r\n                            <span class="glyphicon glyphicon-minus"></span>\r\n                            {{ps.reason}}\r\n                        </td>\r\n                    </tr>\r\n                    <tr ng-repeat-end ng-if="0"></tr>\r\n\r\n\r\n                    </tbody>\r\n                </table>\r\n\r\n                <table class="table" style="margin-bottom: 0px; margin-top: 5px" ng-if="countRejected > 0">\r\n                    <thead>\r\n                    <tr>\r\n                        <th class="col-md-5 text-left">\r\n                        </th>\r\n                        <th class="col-md-5 text-left" style="text-align: right">\r\n                            Reject reason\r\n                        </th>\r\n                        <th class="col-md-5 text-left">\r\n                            Count\r\n                        </th>\r\n                        <th class="col-md-5 text-left">\r\n                        </th>\r\n                    </tr>\r\n                    </thead>\r\n                    <tbody>\r\n                    <tr ng-repeat="entry in rejected | filter: filterRejectedZero(entry)">\r\n                        <td>\r\n                        </td>\r\n                        <td style="text-align: right">\r\n                            {{ entry[0] }}\r\n                        </td>\r\n                        <td>\r\n                            {{ entry[1] }}\r\n                        </td>\r\n                        <td>\r\n                        </td>\r\n                    </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </uib-accordion>\r\n    </div>\r\n</div>\r\n\r\n<div class="row" ng-if="::indexersearches.length == 0" style="margin-top: 50px">\r\n    <div class="well">\r\n        <h2>No indexers were picked for this search</h2>\r\n        <div style="width: 520px; margin: auto;text-align: left;">\r\n            Reasons:\r\n            <ul style="padding-left: 15px">\r\n                <li ng-repeat="tuple in ::notPickedIndexersWithReason">{{tuple.indexer}}: {{tuple.reason}}</li>\r\n            </ul>\r\n        </div>\r\n    </div>\r\n</div>\r\n<div class="row" ng-if="::indexersearches.length > 0 && numberOfAvailableResults === 0" style="margin-top: 50px">\r\n    <div class="well">\r\n        <h2>No results were found for this search</h2>\r\n    </div>\r\n</div>\r\n<div class="row" ng-if="::indexersearches.length > 0 && numberOfAvailableResults > 0" style="margin-top: 10px">\r\n    <div class="col-md-8" style="text-align: left;">\r\n        <input style="margin-top:20px; margin-bottom:20px;" type="checkbox" ng-model="foo.duplicatesDisplayed" ng-click="toggleDuplicatesDisplayed()" class="btn btn-default">Show duplicates</input>\r\n        <div class="btn-group">\r\n            <button class="btn btn-default" ng-click="invertSelection()">Invert selection</button>\r\n            <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\r\n                <span class="caret"></span>\r\n                <span class="sr-only">Toggle Dropdown</span>\r\n            </button>\r\n            <ul class="dropdown-menu">\r\n                <li><a href="#" ng-click="selectAll()">Select all</a></li>\r\n                <li><a href="#" ng-click="deselectAll()">Deselect all</a></li>\r\n            </ul>\r\n        </div>\r\n        <download-nzbs-button search-results="selected"></download-nzbs-button>\r\n        <download-nzbzip-button search-results="selected" search-title="searchTitle"></download-nzbzip-button>\r\n    </div>\r\n\r\n    <div class="col-md-4" style="margin-top: 20px">\r\n        <dir-pagination-controls auto-hide="false" max-size="5"></dir-pagination-controls>\r\n    </div>\r\n    <div class="col-md-8" style="text-align: right;">\r\n        <span class="badge"\r\n              uib-tooltip-html="getRejectedReasonsTooltip()"\r\n              tooltip-class="rejected-tooltip"\r\n              tooltip-placement="top"\r\n              tooltip-trigger="click"\r\n        >Loaded {{ numberOfLoadedResults }} of <span ng-if="totalAvailableUnknown">&gt;</span>{{ numberOfAvailableResults }} results (\r\n            rejected {{ numberOfRejectedResults }}\r\n            )</span>\r\n\r\n        <div class="btn-group" style="margin-top:20px; margin-bottom:20px;">\r\n            <button type="button" ng-click="loadMore(false)" class="btn btn-default" ng-disabled="!loadMoreEnabled"\r\n                    uib-tooltip="Click to load more results from the indexers"\r\n                    tooltip-placement="top"\r\n                    tooltip-trigger="mouseenter"\r\n            >Load more\r\n            </button>\r\n            <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" ng-disabled="!loadMoreEnabled">\r\n                <span class="caret"></span>\r\n                <span class="sr-only">Toggle Dropdown</span>\r\n            </button>\r\n            <ul class="dropdown-menu">\r\n                <li><a href="#" ng-click="loadMore(true)"\r\n                       uib-tooltip="Click to load all of the results from the indexers. May take a while and a lot of API requests..."\r\n                       tooltip-placement="top"\r\n                       tooltip-trigger="mouseenter"\r\n                >Load all results</a></li>\r\n            </ul>\r\n        </div>\r\n    </div>\r\n    <div class="row" ng-if="isShowFilterButtons">\r\n        <div class="col-md-5">\r\n        </div>\r\n        <div class="col-md-10">\r\n            <div class="btn-toolbar" role="toolbar" style="margin: auto; display:inline-block">\r\n                <div class="btn-group btn-group-xs" role="group" ng-if="isShowFilterButtonsMovie">\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.source.camts" uib-btn-checkbox>CAM / TS</button>\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.source.web" uib-btn-checkbox>WEB</button>\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.source.dvdbluray" uib-btn-checkbox>DVD / Blu-Ray</button>\r\n                </div>\r\n                <div class="btn-group btn-group-xs" role="group" ng-if="isShowFilterButtonsTv">\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.source.tv" uib-btn-checkbox>TV</button>\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.source.web" uib-btn-checkbox>WEB</button>\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.source.dvdbluray" uib-btn-checkbox>DVD / Blu-Ray</button>\r\n                </div>\r\n                <div class="btn-group btn-group-xs" role="group">\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.quality.q480p" uib-btn-checkbox>480p</button>\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.quality.q720p" uib-btn-checkbox>720p</button>\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.quality.q1080p" uib-btn-checkbox>1080p</button>\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.quality.q2160p" uib-btn-checkbox>2160p</button>\r\n                    <button type="button" class="btn btn-default filter-button" ng-change="onFilterButtonsModelChange()" uncheckable ng-model="filterButtonsModel.quality.q3d" uib-btn-checkbox>3D</button>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n\r\n    <table class="search-results-table table">\r\n        <thead class="search-results-header">\r\n        <tr class="search-results-row">\r\n            <th class="col-md-12 cursor-default search-results-cell result-title">\r\n                <column-sortable column="title" reversed="false" start-mode="1">Title\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <freetext-filter column="title"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th class="col-md-1 cursor-default search-results-cell result-indexer" style="vertical-align: top; text-align: right">\r\n                <column-sortable column="indexer" reversed="false" start-mode="1">Indexer\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <checkboxes-filter column="indexer" entries="indexersForFiltering" preselect="true" show-invert="true"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th class="col-md-1 cursor-default search-results-cell result-category" style="vertical-align: top; text-align: right">\r\n                <column-sortable column="category" reversed="false" start-mode="1">Category\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <checkboxes-filter column="category" entries="categoriesForFiltering" preselect="true" show-invert="true"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th class="col-md-1 cursor-default search-results-cell result-size" style="vertical-align: top; text-align: right">\r\n                <column-sortable column="size" reversed="false" start-mode="2">Size\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <number-range-filter column="size" addon="MB"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th class="col-md-1 cursor-default search-results-cell result-details" style="vertical-align: top; text-align: right">\r\n                <column-sortable column="grabs" reversed="false" start-mode="2">Grabs\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <number-range-filter column="grabs"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th class="col-md-1 cursor-default search-results-cell result-age" style="vertical-align: top; text-align: right">\r\n                <column-sortable column="epoch" reversed="true" start-mode="2">Age\r\n                </column-sortable>\r\n                <column-filter-wrapper>\r\n                    <number-range-filter column="epoch" addon="days"/>\r\n                </column-filter-wrapper>\r\n            </th>\r\n            <th class="col-md-3 search-results-cell result-links" style="vertical-align: top">\r\n                Links\r\n            </th>\r\n        </tr>\r\n        </thead>\r\n\r\n        <tbody dir-paginate-start="titleGroup in filteredResults | itemsPerPage:limitTo track by groupId(titleGroup)" ng-show="0"></tbody>\r\n\r\n        <tbody title-group titles="titleGroup" selected="selected" style="display: table-row-group" row-index="$index" do-show-duplicates="foo.duplicatesDisplayed"></tbody>\r\n\r\n        <tbody dir-paginate-end ng-show="0"></tbody>\r\n\r\n    </table>\r\n    <dir-pagination-controls auto-hide="false"></dir-pagination-controls>\r\n</div>');
$templateCache.put('states/search.html','<script type="text/ng-template" id="autocompleteTemplate.html">\r\n    <a>\r\n        <img src="{{ match.model.posterUrl }}" ng-if="match.model.posterUrl" style="width: 50px"> {{ match.model.title }} <span ng-if="match.model.year">( {{ match.model.year }} )</span>\r\n    </a>\r\n</script>\r\n<div ng-if="::availableIndexers.length == 0">\r\n    <div class="row">\r\n        <div class="col-md-5"></div>\r\n        <div class="col-md-10 alert alert-info" role="alert">\r\n            No indexers are configured or enabled. Please go to the <a ui-sref="root.config.indexers" style="text-decoration: underline">indexer configuration</a> and add or enable some.\r\n        </div>\r\n        <div class="col-md-5"></div>\r\n    </div>\r\n</div>\r\n\r\n<div ng-show="::availableIndexers.length > 0">\r\n    <div class="row">\r\n        <div class="col-md-3"></div>\r\n\r\n        <div class="">\r\n            <form class="form-horizontal">\r\n                <div class="form-group">\r\n\r\n                    <label class="col-sm-2 control-label">Search</label>\r\n\r\n                    <div class="col-sm-10">\r\n                        <div class="input-group">\r\n                        <span class="input-group-btn input-group-btn2">\r\n                              <button type="button" class="btn btn-default dropdown-toggle search-category-button" data-toggle="dropdown" aria-expanded="false" id="searchCategoryDropdownButton"\r\n                                      ng-cloak>\r\n                                  {{ category.name }} <span class="caret"></span>\r\n                              </button>\r\n                                <ul class="dropdown-menu dropdown-menu-right" role="menu" style="right: auto; top:initial; margin:0px;">\r\n                                    \r\n                                    <li ng-repeat="category in categories">\r\n                                        <a href="" class="searchCategoryButton" ng-click="toggleCategory(category)">{{ category.name }}</a>\r\n                                    </li>\r\n                                </ul>\r\n                              \r\n                            </span>\r\n\r\n                            <span class="input-group-btn" style="width:40px;" ng-show="seriesSelected()">\r\n                              <input type="text" class="form-control season-input" placeholder="S" name="season" id="seriesSearchS" style="width:40px; " ng-model="season"\r\n                                     ng-enter="submitSearch(selectedItem)"\r\n                                     uib-tooltip="Enter a season to search for."\r\n                                     tooltip-placement="top"\r\n                                     tooltip-trigger="mouseenter">\r\n                          </span>\r\n\r\n                            <span class="input-group-btn" style="width:40px;" ng-show="seriesSelected()">\r\n                              <input type="text" class="form-control episode-input" placeholder="E" name="episode" id="seriesSearchE" style="width:40px;" ng-model="episode"\r\n                                     ng-enter="submitSearch(selectedItem)"\r\n                                     uib-tooltip="Enter an episode to search for."\r\n                                     tooltip-placement="top"\r\n                                     tooltip-trigger="mouseenter">\r\n                          </span>\r\n\r\n\r\n                            <span class="input-group-addon by-id-checkbox" ng-if="isAskById"\r\n                                  uib-tooltip="If enabled the search is done using an ID from TheTVDB or IMDB. The ID is retrieved using autocomplete." tooltip-placement="top"\r\n                                  tooltip-trigger="mouseenter"\r\n                                  style="border-right-width: 0; width: 40px">\r\n                            <input type="checkbox" name="by-id" id="by-id" ng-model="isById.value" style="margin-top:0;">\r\n                    </span>\r\n\r\n\r\n                            <script type="text/ng-template" id="movieAutocompleteEntry">\r\n                                <a>{{ match.label }}</a>\r\n                            </script>\r\n                            <input id="searchfield" type="search" ngtype="search" ng-model="query" placeholder="Search" typeahead-min-length="2" typeahead-wait-ms="typeAheadWait"\r\n                                   uib-typeahead="item as item.label for item in getAutocomplete($viewValue)" typeahead-template-url="autocompleteTemplate.html"\r\n                                   ng-class="{\'autocompleteLoading\': (loadingItems && autocompleteActive), \'search-border\': !seriesSelected}" typeahead-loading="loadingItems"\r\n                                   typeahead-on-select="selectAutocompleteItem($item)" ng-enter="startQuerySearch()" class="form-control"\r\n                                   focus-on="focus-query-box"\r\n                                   uib-tooltip="Prefix terms with -- to exclude"\r\n                                   tooltip-placement="top"\r\n                                   tooltip-trigger="mouseenter"\r\n                            >\r\n                            <span class="input-group-btn input-group-btn1">\r\n                            <div class="btn-group" uib-dropdown is-open="status.isopen">\r\n                              <button id="single-button" type="button" class="btn btn-default" uib-dropdown-toggle\r\n                                      uib-tooltip="Search history"\r\n                                      tooltip-placement="top"\r\n                                      tooltip-trigger="mouseenter"\r\n                              >\r\n                                <span class="glyphicon glyphicon-time" style="margin-right: 3px"></span><span class="caret"></span>\r\n                              </button>\r\n                                <ul class="dropdown-menu" uib-dropdown-menu template-url="static/html/search-searchhistory-dropdown.html" aria-labelledby="button-template-url">\r\n                                </ul>\r\n                            </div>\r\n                        </span>\r\n\r\n                            <span class="input-group-btn input-group-btn2" style="width:51px;">\r\n                            <button class="btn btn-default" type="button" ng-click="goToSearchUrl()">Go!</button>\r\n                        </span>\r\n                        </div>\r\n                    </div>\r\n\r\n                </div>\r\n            </form>\r\n\r\n            <span ng-if="::showIndexerSelection">\r\n            <div class="col-md-3"></div>\r\n            <form class="form-horizontal">\r\n                <div class="form-group">\r\n                    <label class="col-sm-2 control-label">Indexers</label>\r\n\r\n                    <div class="col-md-10">\r\n                        <div class="input-group" style="padding-top: 10px;">\r\n                             <div class="btn-group">\r\n                                <button class="btn btn-default" ng-click="toggleAllIndexers(\'invert\')">Invert selection</button>\r\n                                <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\r\n                                    <span class="caret"></span>\r\n                                    <span class="sr-only">Toggle Dropdown</span>\r\n                                </button>\r\n                                <ul class="dropdown-menu">\r\n                                    <li><a href="#" ng-click="toggleAllIndexers(true)">Select all</a></li>\r\n                                    <li><a href="#" ng-click="toggleAllIndexers(false)">Deselect all</a></li>\r\n                                </ul>\r\n                            </div>\r\n                            <!--<button ng-click="toggleAllIndexers()" class="btn btn-default"> Invert selection</button>-->\r\n                            <span style="margin-right: 10px;"></span>\r\n                            <label ng-repeat="indexer in availableIndexers">\r\n                                <input type="checkbox" ng-class="{\'indexer-checkbox\': $index > 0}" data-checklist-model="selectedIndexers" data-checklist-value="indexer.name"> {{ indexer.name }}\r\n                            </label>\r\n\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </form>\r\n        </span>\r\n\r\n            <div class="col-md-3"></div>\r\n            <form class="form-horizontal">\r\n                <div class="form-group">\r\n                    <label class="col-sm-2 control-label">Age</label>\r\n\r\n                    <div class="col-sm-3" style="width: 11%">\r\n                        <div class="input-group">\r\n                            <span class="input-group-addon">Min</span>\r\n                            <input type="number" class="form-control" id="minage" ng-model="minage" style="width: 90px" ng-enter="startSearch()"\r\n                                   ng-model-options=\'{ debounce: 500 }\'>\r\n                        </div>\r\n                    </div>\r\n                    <div class="col-sm-3" style="width: 11%">\r\n                        <div class="input-group">\r\n                            <span class="input-group-addon">Max</span>\r\n                            <input type="number" class="form-control" id="maxage" ng-model="maxage" style="width: 90px" ng-enter="startSearch()"\r\n                                   ng-model-options=\'{ debounce: 500 }\'>\r\n                        </div>\r\n                    </div>\r\n                    <label class="col-sm-5 control-label" style="width:5%">Size</label>\r\n\r\n                    <div class="col-sm-3" style="width: 11%">\r\n                        <div class="input-group">\r\n                            <span class="input-group-addon">Min</span>\r\n                            <input type="number" class="form-control" id="minsize" ng-model="minsize" style="width: 90px" ng-enter="startSearch()"\r\n                                   ng-model-options=\'{ debounce: 500 }\'>\r\n                        </div>\r\n                    </div>\r\n                    <div class="col-sm-3" style="width: 11%">\r\n                        <div class="input-group">\r\n                            <span class="input-group-addon">Max</span>\r\n                            <input type="number" class="form-control" id="maxsize" ng-model="maxsize" style="width: 90px" ng-enter="startSearch()"\r\n                                   ng-model-options=\'{ debounce: 500 }\'>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </form>\r\n\r\n        </div>\r\n\r\n        <div class="col-md-3"></div>\r\n    </div>\r\n\r\n    <!-- Search results go here -->\r\n    <div ui-view="results"></div>');
$templateCache.put('states/stats.html','<ul class="nav nav-tabs" role="tablist">\r\n    <li role="presentation" ui-sref-active="active"><a ui-sref="root.stats.searches" role="tab">Search history</a></li>\r\n    <li role="presentation" ui-sref-active="active"><a ui-sref="root.stats.downloads" role="tab">Download history</a></li>\r\n    <li role="presentation" ui-sref-active="active"><a ui-sref="root.stats.indexers" role="tab">Indexer statuses</a></li>\r\n    <li role="presentation" ui-sref-active="active"><a ui-sref="root.stats.main" role="tab">Stats</a></li>\r\n</ul>\r\n\r\n<div ui-view="stats"></div>\r\n');
$templateCache.put('states/system.html','<ul class="nav nav-tabs" role="tablist">\r\n    <li ng-repeat="tab in allTabs" ng-class="{\'active\': $index == activeTab}">\r\n        <a href="" ng-click="goToSystemState($index)">{{ tab.name }}</a>\r\n    </li>\r\n</ul>\r\n\r\n<div class="tab-content" style="text-align: center">\r\n\r\n    <div class="system-tab-content" ng-if="activeTab==0">\r\n        <button class="btn btn-default" type="button" ng-click="shutdown()">Shutdown</button>\r\n        <button class="btn btn-default" type="button" ng-click="restart()">Restart</button>\r\n        <br>\r\n        <button class="btn btn-info" type="button" ng-click="reloadConfig()" style="margin-top: 20px">Reload config from file</button>\r\n        <br>\r\n        <button class="btn btn-info" type="button" ng-click="migrate()" style="margin-top: 20px">Migrate from NZBHydra 1</button>\r\n    </div>\r\n\r\n    <div class="system-tab-content" ng-if="activeTab==1">\r\n        <hydraupdates></hydraupdates>\r\n    </div>\r\n\r\n    <div class="system-tab-content" ng-if="activeTab==2">\r\n        <hydralog></hydralog>\r\n    </div>\r\n\r\n    <div class="system-tab-content" ng-if="activeTab==3" style="text-align: center">\r\n        <hydrabackup></hydrabackup>\r\n    </div>\r\n\r\n    <div class="system-tab-content" ng-if="activeTab==4">\r\n        <ng-include src="\'static/html/bugreport.html\'"></ng-include>\r\n    </div>\r\n\r\n    <div class="system-tab-content" ng-if="activeTab==5" style="text-align: left">\r\n        <hydra-news></hydra-news>\r\n    </div>\r\n\r\n    <div class="system-tab-content" ng-if="activeTab==6">\r\n        <ng-include src="\'static/html/about.html\'"></ng-include>\r\n    </div>\r\n</div>\r\n\r\n');}]);
//# sourceMappingURL=nzbhydra.js.map
