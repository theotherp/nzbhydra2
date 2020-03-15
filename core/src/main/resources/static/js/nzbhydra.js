// For caching HTML templates, see http://paulsalaets.com/pre-caching-angular-templates-with-gulp
angular.module('templates', []);

var nzbhydraapp = angular.module('nzbhydraApp', ['angular-loading-bar', 'cgBusy', 'ui.bootstrap', 'ipCookie', 'angular-growl',
    'angular.filter', 'filters', 'ui.router', 'blockUI', 'mgcrea.ngStrap', 'angularUtils.directives.dirPagination',
    'nvd3', 'formly', 'formlyBootstrap', 'frapontillo.bootstrap-switch', 'ui.select', 'ngSanitize', 'checklist-model',
    'ngAria', 'ngMessages', 'ui.router.title', 'LocalStorageModule', 'angular.filter', 'ngFileUpload', 'ngCookies', 'angular.chips',
    'templates', 'base64', 'duScroll']);

nzbhydraapp.config(['$compileProvider', function ($compileProvider) {
    $compileProvider.debugInfoEnabled(true);
}]);

nzbhydraapp.config(['$animateProvider', function ($animateProvider) {
    //$animateProvider.classNameFilter(/ng-animate-enabled/);
}]);

angular.module('nzbhydraApp').config(["$stateProvider", "$urlRouterProvider", "$locationProvider", "blockUIConfig", "$urlMatcherFactoryProvider", "localStorageServiceProvider", "bootstrapped", function ($stateProvider, $urlRouterProvider, $locationProvider, blockUIConfig, $urlMatcherFactoryProvider, localStorageServiceProvider, bootstrapped) {
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
                    controller: 'HeaderController',
                    resolve: {
                        bootstrapped: function () {
                            return bootstrapped;
                        }
                    }
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
                        $scope.bootstrapped = bootstrapped;
                        console.log(bootstrapped);
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
                            return $http.get("internalapi/indexerstatuses").then(function (response) {
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
        .state("root.system.tasks", {
            url: "/tasks",
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
                            return "System (Tasks)"
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
                            return 4;
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
                            return 5;
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
                            return 6;
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
                            return 7;
                        }],
                        $title: ["$stateParams", function ($stateParams) {
                            return "System (About)"
                        }]
                    }
                }
            }
        })

        .state("root.search", {
            url: "/?category&query&imdbId&tvdbId&title&season&episode&minsize&maxsize&minage&maxage&offsets&tvrageId&mode&tmdbId&indexers&tvmazeId&sortby&sortdirection",
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
                    params: {
                        modalInstance: null
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

nzbhydraapp.filter('derefererExtracting', ["ConfigService", function (ConfigService) {
    return function (aString) {
        if (!ConfigService.getSafe().dereferer || !aString) {
            return aString
        }
        var matches = aString.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/);
        if (matches === null) {
            return aString;
        }

        aString = aString.replace(matches[0], ConfigService.getSafe().dereferer.replace("$s", escape(matches[0])))

        return aString;
    }
}]);

nzbhydraapp.filter('binsearch', ["ConfigService", function (ConfigService) {
    return function (url) {
        return "http://binsearch.info/?q=" + encodeURIComponent(url) + "&max=100&adv_age=3000&server=";
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
    $httpProvider.defaults.xsrfCookieName = 'HYDRA-XSRF-TOKEN';
}]);

nzbhydraapp.directive('autoFocus', ["$timeout", function ($timeout) {
    return {
        restrict: 'AC',
        link: function (_scope, _element, attrs) {
            if (attrs.noFocus) {
                return;
            }
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
    .directive('hydraTasks', hydraTasks);

function hydraTasks() {
    controller.$inject = ["$scope", "$http"];
    return {
        templateUrl: 'static/html/directives/tasks.html',
        controller: controller
    };

    function controller($scope, $http) {

        $http.get("internalapi/tasks").then(function (response) {
            $scope.tasks = response.data;
        });

        $scope.runTask = function (taskName) {
            $http.put("internalapi/tasks/" + taskName).then(function (response) {
                $scope.tasks = response.data;
            });
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
    .directive('selectionButton', selectionButton);

function selectionButton() {
    controller.$inject = ["$scope"];
    return {
        templateUrl: 'static/html/directives/selection-button.html',
        scope: {
            selected: "=",
            selectable: "=",
            invertSelection: "<",
            selectAll: "<",
            deselectAll: "<",
            btn: "@"
        },
        controller: controller
    };

    function controller($scope) {

        if (angular.isUndefined($scope.btn)) {
            $scope.btn = "default"; //Will form class "btn-default"
        }

        if (angular.isUndefined($scope.invertSelection)) {
            $scope.invertSelection = function () {
                $scope.selected = _.difference($scope.selectable, $scope.selected);
            };
        }

        if (angular.isUndefined($scope.selectAll)) {
            $scope.selectAll = function () {
                $scope.selected.push.apply($scope.selected, $scope.selectable);
            };
        }

        if (angular.isUndefined($scope.deselectAll)) {
            $scope.deselectAll = function () {
                $scope.selected.splice(0, $scope.selected.length);
            };
        }


    }
}



NfoModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "nfo"];angular
    .module('nzbhydraApp')
    .directive('searchResult', searchResult);

function searchResult() {
    controller.$inject = ["$scope", "$element", "$http", "growl", "$attrs", "$uibModal", "$window", "DebugService", "localStorageService", "HydraAuthService", "ConfigService"];
    return {
        templateUrl: 'static/html/directives/search-result.html',
        require: '^result',
        replace: false,
        scope: {
            result: "<",
            searchResultsControllerShared: "<"
        },
        controller: controller
    };


    function handleDisplay($scope, localStorageService, ConfigService) {
        //Display state / expansion
        $scope.foo.duplicatesDisplayed = localStorageService.get("duplicatesDisplayed") !== null ? localStorageService.get("duplicatesDisplayed") : false;
        $scope.foo.showCovers = localStorageService.get("showCovers") !== null ? localStorageService.get("showCovers") : true;
        $scope.duplicatesExpanded = false;
        $scope.titlesExpanded = false;
        $scope.coverSize = ConfigService.getSafe().searching.coverSize;

        function calculateDisplayState() {
            $scope.resultDisplayed = ($scope.result.titleGroupIndex === 0 || $scope.titlesExpanded) && ($scope.duplicatesExpanded || $scope.result.duplicateGroupIndex === 0);
        }

        calculateDisplayState();

        $scope.toggleTitleExpansion = function () {
            $scope.titlesExpanded = !$scope.titlesExpanded;
            $scope.$emit("toggleTitleExpansionUp", $scope.titlesExpanded, $scope.result.titleGroupIndicator);
        };

        $scope.toggleDuplicateExpansion = function () {
            $scope.duplicatesExpanded = !$scope.duplicatesExpanded;
            $scope.$emit("toggleDuplicateExpansionUp", $scope.duplicatesExpanded, $scope.result.hash);
        };

        $scope.$on("toggleTitleExpansionDown", function ($event, value, titleGroupIndicator) {
            if ($scope.result.titleGroupIndicator === titleGroupIndicator) {
                $scope.titlesExpanded = value;
                calculateDisplayState();
            }
        });

        $scope.$on("toggleDuplicateExpansionDown", function ($event, value, hash) {
            if ($scope.result.hash === hash) {
                $scope.duplicatesExpanded = value;
                calculateDisplayState();
            }
        });

        $scope.$on("toggleShowCovers", function ($event, value) {
            $scope.foo.showCovers = value;
        });

        $scope.$on("duplicatesDisplayed", function ($event, value) {
            $scope.foo.duplicatesDisplayed = value;
            if (!value) {
                //Collapse duplicate groups they shouldn't be displayed
                $scope.duplicatesExpanded = false;
            }
            calculateDisplayState();
        });

        $scope.$on("calculateDisplayState", function () {
            calculateDisplayState();
        });
    }

    function handleSelection($scope, $element) {
        $scope.foo.selected = false;

        function sendSelectionEvent(isSelected) {
            $scope.$emit("selectionUp", $scope.result, isSelected);
        }

        $scope.clickCheckbox = function (event, result) {
            var isSelected = event.currentTarget.checked;
            sendSelectionEvent(isSelected);
            $scope.$emit("checkboxClicked", event, $scope.rowIndex, isSelected, event.currentTarget);
        };

        function isBetween(num, betweena, betweenb) {
            return (betweena <= num && num <= betweenb) || (betweena >= num && num >= betweenb);
        }

        $scope.$on("shiftClick", function (event, startIndex, endIndex, newValue, previousClickTargetElement, newClickTargetElement) {
            var fromYlocation = $($(previousClickTargetElement).prop("parentNode")).prop("offsetTop");
            var newYlocation = $($(newClickTargetElement).prop("parentNode")).prop("offsetTop");
            var elementYlocation = $($element).prop("offsetTop");
            if (!$scope.resultDisplayed) {
                return;
            }

            if (isBetween(elementYlocation, fromYlocation, newYlocation)) {
                sendSelectionEvent(newValue);
                $scope.foo.selected = newValue === 1;
            }
        });

        $scope.$on("invertSelection", function () {
            if (!$scope.resultDisplayed) {
                return;
            }
            $scope.foo.selected = !$scope.foo.selected;
            sendSelectionEvent($scope.foo.selected);
        });

        $scope.$on("deselectAll", function () {
            if (!$scope.resultDisplayed) {
                return;
            }
            $scope.foo.selected = false;
            sendSelectionEvent($scope.foo.selected);
        });

        $scope.$on("selectAll", function () {
            if (!$scope.resultDisplayed) {
                return;
            }
            $scope.foo.selected = true;

            sendSelectionEvent($scope.foo.selected);
        });

        $scope.$on("toggleSelection", function ($event, result, value) {
            if (!$scope.resultDisplayed || result !== $scope.result) {
                return;
            }
            $scope.foo.selected = value;
        });
    }

    function handleNfoDisplay($scope, $http, growl, $uibModal, HydraAuthService) {
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
                    growl.error(response.data.content);
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

    function handleNzbDownload($scope, $window) {
        $scope.downloadNzb = downloadNzb;

        function downloadNzb(resultItem) {
            //href = "{{ result.link }}"
            $window.location.href = resultItem.link;
        }
    }


    function controller($scope, $element, $http, growl, $attrs, $uibModal, $window, DebugService, localStorageService, HydraAuthService, ConfigService) {
        $scope.foo = {};
        handleDisplay($scope, localStorageService, ConfigService);
        handleSelection($scope, $element);
        handleNfoDisplay($scope, $http, growl, $uibModal, HydraAuthService);
        handleNzbDownload($scope, $window);

        $scope.kify = function () {
            return function (number) {
                if (number > 1000) {
                    return Math.round(number / 1000) + "k";
                }
                return number;
            };
        };
        DebugService.log("search-result");
    }
}

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

angular
    .module('nzbhydraApp')
    .filter('kify', function () {
        return function (number) {
            if (number > 1000) {
                return Math.round(number / 1000) + "k";
            }
            return number;
        }
    });
angular
    .module('nzbhydraApp')
    .directive('saveOrSendTorrent', saveOrSendTorrent);

function saveOrSendTorrent() {
    controller.$inject = ["$scope", "$http", "growl", "ConfigService"];
    return {
        templateUrl: 'static/html/directives/save-or-send-torrent.html',
        scope: {
            searchResultId: "<",
            isFile: "<"
        },
        controller: controller
    };

    function controller($scope, $http, growl, ConfigService) {
        $scope.enableButton = (ConfigService.getSafe().downloading.saveTorrentsTo !== null && ConfigService.getSafe().downloading.saveTorrentsTo !== "") || ConfigService.getSafe().downloading.sendMagnetLinks;
        $scope.cssClass = "glyphicon-save-file";
        $scope.add = function () {
            $scope.cssClass = "nzb-spinning";
            $http.put("internalapi/saveOrSendTorrent", [$scope.searchResultId]).then(function (response) {
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

//Can be used in an ng-repeat directive to call a function when the last element was rendered
//We use it to mark the end of sorting / filtering so we can stop blocking the UI

onFinishRender.$inject = ["$timeout"];
angular
    .module('nzbhydraApp')
    .directive('onFinishRender', onFinishRender);

function onFinishRender($timeout) {
    function linkFunction(scope, element, attr) {

        if (scope.$last === true) {
            // console.log("Render finished");
            // console.timeEnd("Presenting");
            // console.timeEnd("searchall");
            scope.$emit("onFinishRender")
        }
    }

    return {
        link: linkFunction
    }
}
//Fork of https://github.com/dotansimha/angularjs-dropdown-multiselect to make it compatible with formly
angular
    .module('nzbhydraApp')
    .directive('multiselectDropdown',

        dropdownMultiselectDirective
    );

function dropdownMultiselectDirective() {
    return {
        scope: {
            selectedModel: '=',
            options: '=',
            settings: '=?',
            events: '=?'
        },
        transclude: {
            toggleDropdown: '?toggleDropdown'
        },
        templateUrl: 'static/html/directives/multiselect-dropdown.html',
        controller: ["$scope", "$element", "$filter", "$document", function dropdownMultiselectController($scope, $element, $filter, $document) {
            var $dropdownTrigger = $element.children()[0];

            var settings = {
                showSelectedValues: true,
                showSelectAll: true,
                showDeselectAll: true,
                noSelectedText: 'None selected'
            };
            var events = {
                onToggleItem: angular.noop
            };
            angular.extend(events, $scope.events || []);
            angular.extend(settings, $scope.settings || []);
            angular.extend($scope, {settings: settings, events: events});

            $scope.buttonText = "";
            if (settings.buttonText) {
                $scope.buttonText = settings.buttonText;
            } else {
                $scope.$watch("selectedModel", function () {
                    if (angular.isDefined($scope.selectedModel) && settings.showSelectedValues) {
                        if ($scope.selectedModel.length === 0) {
                            if ($scope.settings.noSelectedText) {
                                $scope.buttonText = $scope.settings.noSelectedText;
                            } else {
                                $scope.buttonText = "None selected";
                            }
                        } else if ($scope.selectedModel.length === $scope.options.length) {
                            $scope.buttonText = "All selected";
                        } else {
                            $scope.buttonText = $scope.selectedModel.join(", ");
                        }
                    } else {
                        if (angular.isUndefined($scope.selectedModel) || ($scope.settings.noSelectedText && $scope.selectedModel.length === 0)) {
                            $scope.buttonText = $scope.settings.noSelectedText;
                        } else {
                            $scope.buttonText = $scope.selectedModel.length + " / " + $scope.options.length + " selected";
                        }
                    }
                }, true);
            }
            $scope.open = false;

            $scope.toggleDropdown = function () {
                $scope.open = !$scope.open;
            };

            $scope.toggleItem = function (option) {
                var index = $scope.selectedModel.indexOf(option.id);
                var oldValue = index > -1;
                if (oldValue) {
                    $scope.selectedModel.splice(index, 1);
                } else {
                    $scope.selectedModel.push(option.id);
                }
                $scope.events.onToggleItem(option, !oldValue);
            };

            $scope.selectAll = function () {
                $scope.selectedModel = _.pluck($scope.options, "id");
            };

            $scope.deselectAll = function () {
                $scope.selectedModel.splice(0, $scope.selectedModel.length);
            };

            //Close when clicked outside

            $document.on('click', function (e) {
                function contains(collection, target) {
                    var containsTarget = false;
                    collection.some(function (object) {
                        if (object === target) {
                            containsTarget = true;
                            return true;
                        }
                        return false;
                    });
                    return containsTarget;
                }

                if ($scope.open) {
                    var target = e.target.parentElement;
                    var parentFound = false;

                    while (angular.isDefined(target) && target !== null && !parentFound) {
                        if (!!target.className.split && contains(target.className.split(' '), 'multiselect-parent') && !parentFound) {
                            if (target === $dropdownTrigger) {
                                parentFound = true;
                            }
                        }
                        target = target.parentElement;
                    }

                    if (!parentFound) {
                        $scope.$apply(function () {
                            $scope.open = false;
                        });
                    }
                }
            });


        }]

    }
}
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
}]);
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
    .directive('indexerStateSwitch', indexerStateSwitch);

function indexerStateSwitch() {
    controller.$inject = ["$scope"];
    return {
        templateUrl: 'static/html/directives/indexer-state-switch.html',
        scope: {
            indexer: "=",
            handleWidth: "@"
        },
        replace: true,
        controller: controller
    };

    function controller($scope) {
        $scope.value = $scope.indexer.state === "ENABLED";
        $scope.handleWidth = $scope.handleWidth || "130px";
        var initialized = false;

        function calculateTextAndColor() {
            if ($scope.indexer.state === "DISABLED_USER") {
                $scope.offText = "Disabled by user";
                $scope.offColor = "default";
            } else if ($scope.indexer.state === "DISABLED_SYSTEM_TEMPORARY") {
                $scope.offText = "Temporary disabled";
                $scope.offColor = "warning";
            } else if ($scope.indexer.state === "DISABLED_SYSTEM") {
                $scope.offText = "Disabled by system";
                $scope.offColor = "danger";
            }
        }

        calculateTextAndColor();

        $scope.onChange = function () {
            if (initialized) {
                //Skip on first call when initial value is set
                $scope.indexer.state = $scope.value ? "ENABLED" : "DISABLED_USER";
                calculateTextAndColor();
            }
            initialized = true;
        }
    }
}
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
    .directive('indexerSelectionButton', indexerSelectionButton);

function indexerSelectionButton() {
    controller.$inject = ["$scope"];
    return {
        templateUrl: 'static/html/directives/indexer-selection-button.html',
        scope: {
            selectedIndexers: "=",
            availableIndexers: "=",
            btn: "@"
        },
        controller: controller
    };

    function controller($scope) {

        $scope.anyTorrentIndexersSelectable = _.any($scope.availableIndexers,
            function (indexer) {
                return indexer.searchModuleType === "TORZNAB";
            }
        );

        $scope.invertSelection = function () {
            _.forEach($scope.availableIndexers, function (x) {
                var index = _.indexOf($scope.selectedIndexers, x.name);
                if (index === -1) {
                    $scope.selectedIndexers.push(x.name);
                } else {
                    $scope.selectedIndexers.splice(index, 1);
                }
            });
        };

        $scope.selectAll = function () {
            $scope.deselectAll();
            $scope.selectedIndexers.push.apply($scope.selectedIndexers, _.pluck($scope.availableIndexers, "name"));
        };

        $scope.deselectAll = function () {
            $scope.selectedIndexers.splice(0, $scope.selectedIndexers.length);
        };

        function selectByPredicate(predicate) {
            $scope.deselectAll();
            $scope.selectedIndexers.push.apply($scope.selectedIndexers,
                _.pluck(
                    _.filter($scope.availableIndexers,
                        predicate
                    ), "name")
            );
        }

        $scope.reset = function () {
            selectByPredicate(function (indexer) {
                return indexer.preselect;
            });
        };

        $scope.selectAllUsenet = function () {
            selectByPredicate(function (indexer) {
                return indexer.searchModuleType !== "TORZNAB";
            });
        };

        $scope.selectAllTorrent = function () {
            selectByPredicate(function (indexer) {
                return indexer.searchModuleType === "TORZNAB";
            });
        }
    }
}


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

        $scope.loadingPromise = UpdateService.getInfos().then(function (response) {
            $scope.currentVersion = response.data.currentVersion;
            $scope.repVersion = response.data.latestVersion;
            $scope.updateAvailable = response.data.updateAvailable;
            $scope.latestVersionIgnored = response.data.latestVersionIgnored;
            $scope.changelog = response.data.changelog;
            $scope.runInDocker = response.data.runInDocker;
            $scope.wrapperOutdated = response.data.wrapperOutdated;
            $scope.showUpdateBannerOnDocker = response.data.showUpdateBannerOnDocker;
            if ($scope.runInDocker && !$scope.showUpdateBannerOnDocker) {
                $scope.updateAvailable = false;
            }
        });

        UpdateService.getVersionHistory().then(function (response) {
            $scope.versionHistory = response.data;
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

NewsModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "news"];
WelcomeModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "$state", "MigrationService"];
angular
    .module('nzbhydraApp')
    .directive('hydraUpdatesFooter', hydraUpdatesFooter);

function hydraUpdatesFooter() {
    controller.$inject = ["$scope", "UpdateService", "RequestsErrorHandler", "HydraAuthService", "$http", "$uibModal", "ConfigService", "GenericStorageService", "ModalService"];
    return {
        templateUrl: 'static/html/directives/updates-footer.html',
        controller: controller
    };

    function controller($scope, UpdateService, RequestsErrorHandler, HydraAuthService, $http, $uibModal, ConfigService, GenericStorageService, ModalService) {

        $scope.updateAvailable = false;
        $scope.checked = false;
        var welcomeIsBeingShown = false;

        $scope.mayUpdate = HydraAuthService.getUserInfos().maySeeAdmin;

        $scope.$on("user:loggedIn", function () {
            if (HydraAuthService.getUserInfos().maySeeAdmin && !$scope.checked) {
                retrieveUpdateInfos();
            }
        });

        function checkForOutOfMemoryException() {
            GenericStorageService.get("outOfMemoryDetected", false).then(function (response) {
                if (response.data !== "" && response.data) {
                    //headline, message, params, size, textAlign
                    ModalService.open("Out of memory error detected", 'The log indicates that the process ran out of memory. Please increase the XMX value in the main config and restart.', {
                        yes: {
                            text: "OK"
                        }
                    }, undefined, "left");
                    GenericStorageService.put("outOfMemoryDetected", false, false);
                }
            });
        }

        function checkForOutdatedWrapper() {
            $http.get("internalapi/updates/isDisplayWrapperOutdated").then(function (response) {
                var data = response.data;
                if (data !== undefined && data !== null && data) {
                    ModalService.open("Outdated wrapper detected", 'The NZBHydra wrapper (i.e. the executable or python script you use to run NZBHydra) seems to be outdated. Please update it:<br>Shut down NZBHydra, <a href="https://github.com/theotherp/nzbhydra2/releases/latest">download the latest version</a> and extract it into your main NZBHydra folder. Start NZBHydra again.', {
                        yes: {
                            text: "OK",
                            onYes: function () {
                                $http.put("internalapi/updates/setOutdatedWrapperDetectedWarningShown")
                            }
                        },
                        cancel: {
                            text: "Remind me again"
                        }
                    }, undefined, "left");

                }
            });
        }

        if ($scope.mayUpdate) {
            retrieveUpdateInfos();
            checkForOutOfMemoryException();
            checkForOutdatedWrapper();
        }

        function retrieveUpdateInfos() {
            $scope.checked = true;
            UpdateService.getInfos().then(function (response) {
                if (response) {
                    $scope.currentVersion = response.data.currentVersion;
                    $scope.latestVersion = response.data.latestVersion;
                    $scope.updateAvailable = response.data.updateAvailable;
                    $scope.changelog = response.data.changelog;
                    $scope.runInDocker = response.data.runInDocker;
                    $scope.showUpdateBannerOnDocker = response.data.showUpdateBannerOnDocker;
                    if ($scope.runInDocker && !$scope.showUpdateBannerOnDocker) {
                        $scope.updateAvailable = false;
                    }
                    $scope.automaticUpdateToNotice = response.data.automaticUpdateToNotice;


                    $scope.$emit("showUpdateFooter", $scope.updateAvailable);
                    $scope.$emit("showAutomaticUpdateFooter", $scope.automaticUpdateToNotice);
                } else {
                    $scope.$emit("showUpdateFooter", false);
                }
            });
        }

        $scope.update = function () {
            UpdateService.update();
        };

        $scope.ignore = function () {
            UpdateService.ignore($scope.latestVersion);
            $scope.updateAvailable = false;
            $scope.$emit("showUpdateFooter", $scope.updateAvailable);
        };

        $scope.showChangelog = function () {
            UpdateService.showChanges();
        };

        $scope.showChangesFromAutomaticUpdate = function () {
            UpdateService.showChangesFromAutomaticUpdate();
            $scope.automaticUpdateToNotice = null;
            $scope.$emit("showAutomaticUpdateFooter", false);
        };

        function checkAndShowNews() {
            RequestsErrorHandler.specificallyHandled(function () {
                if (ConfigService.getSafe().showNews) {
                    $http.get("internalapi/news/forcurrentversion").then(function (response) {
                        var data = response.data;
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
            RequestsErrorHandler.specificallyHandled(function () {
                $http.get("internalapi/welcomeshown").then(function (response) {
                    if (!response.data) {
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
                        _.defer(checkAndShowNews);
                    }
                }, function () {
                    console.log("Error while checking for welcome")
                });
            });
        }

        checkAndShowWelcome();
    }
}

angular
    .module('nzbhydraApp')
    .controller('NewsModalInstanceCtrl', NewsModalInstanceCtrl);

function NewsModalInstanceCtrl($scope, $uibModalInstance, news) {
    $scope.news = news;
    $scope.close = function () {
        $uibModalInstance.dismiss();
    };
}

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

        return $http.get("internalapi/news").then(function (response) {
            $scope.news = response.data;
        });


    }
}



LogModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "entry"];
escapeHtml.$inject = ["$sanitize"];angular
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
                return $http.get("internalapi/debuginfos/jsonlogs", {
                    params: {
                        offset: index,
                        limit: 500
                    }
                }).then(function (response) {
                    var data = response.data;
                    $scope.jsonLogLines = angular.fromJson(data.lines);
                    $scope.hasMoreJsonLines = data.hasMore;
                });
            } else if ($scope.active === 1) {
                return $http.get("internalapi/debuginfos/currentlogfile").then(function (response) {
                    var data = response.data;
                    $scope.log = $sce.trustAsHtml(data.replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;"));
                }, function (data) {
                    growl.error(data)
                });
            } else if ($scope.active === 2) {
                return $http.get("internalapi/debuginfos/logfilenames").then(function (response) {
                    $scope.logfilenames = response.data;
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

        $scope.$on('$destroy', function () {
            if ($scope.tailInterval !== null) {
                $interval.cancel($scope.tailInterval);
            }
        });

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

angular
    .module('nzbhydraApp')
    .filter('formatTimestamp', formatTimestamp);

function formatTimestamp() {
    return function (date) {
        //1579392000
        //1579374757
        if (date === null || date === undefined) {
            return null;
        }
        if (date < 1979374757) {
            date *= 1000;
        }
        return moment(date).local().format("YYYY-MM-DD HH:mm");
    }
}

angular
    .module('nzbhydraApp')
    .filter('escapeHtml', escapeHtml);

function escapeHtml($sanitize) {
    return function (text) {
        return $sanitize(text);
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
    .directive('footer', footer);

function footer() {
    controller.$inject = ["$scope", "$interval", "$http", "ConfigService", "bootstrapped"];
    return {
        templateUrl: 'static/html/directives/footer.html',
        controller: controller
    };

    function controller($scope, $interval, $http, ConfigService, bootstrapped) {

        $scope.updateFooterBottom = 0;

        var safeConfig = bootstrapped.safeConfig;
        $scope.showDownloaderStatus = safeConfig.downloading.showDownloaderStatus && _.filter(safeConfig.downloading.downloaders, function (x) {
            return x.enabled
        }).length > 0;
        $scope.showUpdateFooter = false;

        $scope.$on("showDownloaderStatus", function (event, doShow) {
            $scope.showDownloaderStatus = doShow;
            updateFooterBottom();
            updatePaddingBottom();
        });
        $scope.$on("showUpdateFooter", function (event, doShow) {
            $scope.showUpdateFooter = doShow;
            updateFooterBottom();
            updatePaddingBottom();
        });
        $scope.$on("showAutomaticUpdateFooter", function (event, doShow) {
            $scope.showAutomaticUpdateFooter = doShow;
            updateFooterBottom();
            updatePaddingBottom();
        });

        function updateFooterBottom() {

            if ($scope.showDownloaderStatus) {
                if ($scope.showAutomaticUpdateFooter) {
                    $scope.updateFooterBottom = 50;
                } else {
                    $scope.updateFooterBottom = 35;
                }
            } else {
                $scope.updateFooterBottom = 0;
            }
        }

        function updatePaddingBottom() {
            var paddingBottom = 0;
            if ($scope.showDownloaderStatus) {
                paddingBottom += 30;
            }
            if ($scope.showUpdateFooter) {
                paddingBottom += 40;
            }
            $scope.paddingBottom = paddingBottom;
            document.getElementById("wrap").classList.remove("padding-bottom-0");
            document.getElementById("wrap").classList.remove("padding-bottom-30");
            document.getElementById("wrap").classList.remove("padding-bottom-40");
            document.getElementById("wrap").classList.remove("padding-bottom-70");
            var paddingBottomClass = "padding-bottom-" + paddingBottom;
            document.getElementById("wrap").classList.add(paddingBottomClass);
        }

        updatePaddingBottom();

        updateFooterBottom();


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
    .directive('downloaderStatusFooter', downloaderStatusFooter);

function downloaderStatusFooter() {
    controller.$inject = ["$scope", "$interval", "$http", "RequestsErrorHandler", "HydraAuthService"];
    return {
        templateUrl: 'static/html/directives/downloader-status-footer.html',
        controller: controller
    };

    function controller($scope, $interval, $http, RequestsErrorHandler, HydraAuthService) {

        $scope.$emit("showDownloaderStatus", true);
        var downloadRateCounter = 0;

        $scope.downloaderChart = {
            options: {
                chart: {
                    type: 'stackedAreaChart',
                    height: 35,
                    width: 300,
                    margin: {
                        top: 5,
                        right: 0,
                        bottom: 0,
                        left: 0
                    },
                    x: function (d) {
                        return d.x;
                    },
                    y: function (d) {
                        return d.y;
                    },
                    interactive: true,
                    useInteractiveGuideline: false,
                    transitionDuration: 0,
                    showControls: false,
                    showLegend: false,
                    showValues: false,
                    duration: 0,
                    tooltip: {
                        valueFormatter: function (d, i) {
                            return d + " kb/s";
                        },
                        keyFormatter: function () {
                            return "";
                        },
                        id: "downloader-status-tooltip"
                    },
                    css: "float:right;"
                }
            },
            data: [{values: [], key: "Bla", color: '#00a950'}],
            config: {
                refreshDataOnly: true,
                deepWatchDataDepth: 0,
                deepWatchData: false,
                deepWatchOptions: false
            }
        };

        function update() {
            var userInfos = HydraAuthService.getUserInfos();
            if (!userInfos.maySeeStats) {
                return false;
            }

            RequestsErrorHandler.specificallyHandled(function () {
                $http.get("internalapi/downloader/getStatus", {ignoreLoadingBar: true}).then(function (response) {
                        try {
                            if (!response) {
                                console.error("No downloader status response from server");
                                return;
                            }
                            $scope.foo = response.data;
                            $scope.foo.downloaderImage = response.data.downloaderType === 'NZBGET' ? 'nzbgetlogo' : 'sabnzbdlogo';
                            //We need to splice the variable with the rates because it's watched by angular and when overwriting it we would lose the watch and it wouldn't be updated
                            var maxEntriesHistory = 200;
                            if ($scope.downloaderChart.data[0].values.length < maxEntriesHistory) {
                                //Not yet full, just fill up
                                for (var i = $scope.downloaderChart.data[0].values.length; i < maxEntriesHistory; i++) {
                                    if (i >= response.data.downloadingRatesInKilobytes.length) {
                                        break;
                                    }
                                    $scope.downloaderChart.data[0].values.push({x: downloadRateCounter++, y: response.data.downloadingRatesInKilobytes[i]});
                                }
                            } else {
                                //Remove first one, add to the end
                                $scope.downloaderChart.data[0].values.splice(0, 1);
                                $scope.downloaderChart.data[0].values.push({x: downloadRateCounter++, y: response.data.lastDownloadRate});
                            }
                            $scope.api.update();
                            if ($scope.foo.state === "DOWNLOADING") {
                                $scope.foo.buttonClass = "play";
                            } else if ($scope.foo.state === "PAUSED") {
                                $scope.foo.buttonClass = "pause";
                            } else if ($scope.foo.state === "OFFLINE") {
                                $scope.foo.buttonClass = "off";
                            } else {
                                $scope.foo.buttonClass = "time";
                            }
                            $scope.foo.state = $scope.foo.state.substr(0, 1) + $scope.foo.state.substr(1).toLowerCase();
                        } catch (e) {
                            console.error(e);
                            clearInterval(timer);
                        }
                    },
                    function () {
                        console.error("Error while loading downloader status");
                        clearInterval(timer);
                    }
                );
            });
        }

        update();
        var timer = setInterval(function () {
            update();
        }, 1000);

    }
}


angular
    .module('nzbhydraApp')
    .directive('downloadNzbzipButton', downloadNzbzipButton);

function downloadNzbzipButton() {
    controller.$inject = ["$scope", "growl", "$http", "FileDownloadService"];
    return {
        templateUrl: 'static/html/directives/download-nzbzip-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<",
            searchTitle: "<",
            callback: "&"
        },
        controller: controller
    };

    function controller($scope, growl, $http, FileDownloadService) {
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
                $http({method: "post", url: link, data: values}).then(function (response) {
                    if (response.data.successful && response.data.zip !== null) {
                        //FileDownloadService.sendFile($base64.decode(response.zip), filename);
                        link = "internalapi/nzbzipDownload";
                        FileDownloadService.downloadFile(link, filename, "POST", response.data.zipFilepath);
                        if (angular.isDefined($scope.callback)) {
                            $scope.callback({result: response.data.addedIds});
                        }
                        if (response.data.missedIds.length > 0) {
                            growl.error("Unable to add " + response.missedIds.length + " out of " + values.length + " NZBs to ZIP");
                        }
                    } else {
                        growl.error(response.data.message);
                    }
                }, function (data, status, headers, config) {
                    growl.error(status);
                });
            }
        }
    }
}


angular
    .module('nzbhydraApp')
    .directive('downloadNzbsButton', downloadNzbsButton);

function downloadNzbsButton() {
    controller.$inject = ["$scope", "$http", "NzbDownloadService", "ConfigService", "growl"];
    return {
        templateUrl: 'static/html/directives/download-nzbs-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<",
            callback: "&"
        },
        controller: controller
    };

    function controller($scope, $http, NzbDownloadService, ConfigService, growl) {

        $scope.downloaders = NzbDownloadService.getEnabledDownloaders();
        $scope.blackholeEnabled = ConfigService.getSafe().downloading.saveTorrentsTo !== null;

        $scope.download = function (downloader) {
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length === 0) {
                growl.info("You should select at least one result...");
            } else {

                var didFilterOutResults = false;
                var didKeepAnyResults = false;
                var searchResults = _.filter($scope.searchResults, function (value) {
                    if (value.downloadType === "NZB") {
                        didKeepAnyResults = true;
                        return true;
                    } else {
                        console.log("Not sending torrent result to downloader");
                        didFilterOutResults = true;
                        return false;
                    }
                });
                if (didFilterOutResults && !didKeepAnyResults) {
                    growl.info("None of the selected results were NZBs. Adding aborted");
                    if (angular.isDefined($scope.callback)) {
                        $scope.callback({result: []});
                    }
                    return;
                } else if (didFilterOutResults && didKeepAnyResults) {
                    growl.info("Some the selected results are torrent results which were skipped");
                }

                var tos = _.map(searchResults, function (entry) {
                    return {searchResultId: entry.searchResultId, originalCategory: entry.originalCategory}
                });

                NzbDownloadService.download(downloader, tos).then(function (response) {
                    if (angular.isDefined(response.data)) {
                        if (response !== "dismissed") {
                            if (response.data.successful) {
                                if (response.data.message == null) {
                                    growl.info("Successfully added all NZBs");
                                } else {
                                    growl.warning(response.data.message);
                                }
                            } else {
                                growl.error(response.data.message);
                            }
                        } else {
                            growl.error("Error while adding NZBs");
                        }
                        if (angular.isDefined($scope.callback)) {
                            $scope.callback({result: response.data.addedIds});
                        }
                    }
                }, function () {
                    growl.error("Error while adding NZBs");
                });
            }
        };

        $scope.sendToBlackhole = function () {
            var didFilterOutResults = false;
            var didKeepAnyResults = false;
            var searchResults = _.filter($scope.searchResults, function (value) {
                if (value.downloadType === "TORRENT") {
                    didKeepAnyResults = true;
                    return true;
                } else {
                    console.log("Not sending NZB result to black hole");
                    didFilterOutResults = true;
                    return false;
                }
            });
            if (didFilterOutResults && !didKeepAnyResults) {
                growl.info("None of the selected results were torrents. Adding aborted");
                if (angular.isDefined($scope.callback)) {
                    $scope.callback({result: []});
                }
                return;
            } else if (didFilterOutResults && didKeepAnyResults) {
                growl.info("Some the selected results are NZB results which were skipped");
            }
            var searchResultIds = _.pluck(searchResults, "searchResultId");
            $http.put("internalapi/saveTorrent", searchResultIds).then(function (response) {
                if (response.data.successful) {
                    growl.info("Successfully saved all torrents");
                } else {
                    growl.error(response.data.message);
                }
                if (angular.isDefined($scope.callback)) {
                    $scope.callback({result: response.data.addedIds});
                }
            });
        }

    }
}



freetextFilter.$inject = ["DebugService"];
booleanFilter.$inject = ["DebugService"];angular
    .module('nzbhydraApp').directive("columnFilterWrapper", columnFilterWrapper);

function columnFilterWrapper() {
    controller.$inject = ["$scope", "DebugService"];
    return {
        restrict: "E",
        templateUrl: 'static/html/dataTable/columnFilterOuter.html',
        transclude: true,
        controllerAs: 'columnFilterWrapperCtrl',
        scope: {
            inline: "@"
        },
        bindToController: true,
        controller: controller,
        link: function (scope, element, attr, ctrl) {
            scope.element = element;
        }
    };

    function controller($scope, DebugService) {
        var vm = this;

        vm.open = false;
        vm.isActive = false;

        vm.toggle = function () {
            vm.open = !vm.open;
            if (vm.open) {
                $scope.$broadcast("opened");
            }
        };

        vm.clear = function () {
            if (vm.open) {
                $scope.$broadcast("clear");
            }
        };

        $scope.$on("filter", function (event, column, filterModel, isActive, open) {
            vm.open = open || false;
            vm.isActive = isActive;
        });

        DebugService.log("filter-wrapper");
    }

}


angular
    .module('nzbhydraApp').directive("freetextFilter", freetextFilter);

function freetextFilter(DebugService) {
    controller.$inject = ["$scope", "focus"];
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterFreetext.html\'"/>',
        require: "^columnFilterWrapper",
        controllerAs: 'innerController',
        scope: {
            column: "@",
            onKey: "@",
            placeholder: "@",
            tooltip: "@"
        },
        controller: controller
    };

    function controller($scope, focus) {
        $scope.inline = $scope.$parent.$parent.columnFilterWrapperCtrl.inline; //Hacky way of getting the value from the outer wrapper
        $scope.data = {};
        $scope.tooltip = $scope.tooltip || "";

        $scope.$on("opened", function () {
            focus("freetext-filter-input");
        });

        function emitFilterEvent(isOpen) {
            isOpen = $scope.inline || isOpen;
            $scope.$emit("filter", $scope.column, {
                filterValue: $scope.data.filter,
                filterType: "freetext"
            }, angular.isDefined($scope.data.filter) && $scope.data.filter.length > 0, isOpen);
        }

        $scope.$on("clear", function () {
            //Don't clear but close window (event is fired when clicked outside)
            emitFilterEvent(false);
        });

        $scope.onKeyUp = function (keyEvent) {
            if (keyEvent.which === 13 || $scope.onKey) {
                emitFilterEvent($scope.onKey && keyEvent.which !== 13); //Keep open if triggered by key, close always when enter pressed
            }
        };
        DebugService.log("filter-freetext");
    }
}

angular
    .module('nzbhydraApp').directive("checkboxesFilter", checkboxesFilter);

function checkboxesFilter() {
    controller.$inject = ["$scope", "DebugService"];
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

    function controller($scope, DebugService) {
        $scope.selected = {
            entries: []
        };
        $scope.active = false;

        if ($scope.preselect) {
            $scope.selected.entries.push.apply($scope.selected.entries, $scope.entries);
        }

        $scope.invert = function () {
            $scope.selected.entries = _.difference($scope.entries, $scope.selected.entries);
        };

        $scope.selectAll = function () {
            $scope.selected.entries.push.apply($scope.selected.entries, $scope.entries);
        };

        $scope.deselectAll = function () {
            $scope.selected.entries.splice(0, $scope.selected.entries.length);
        };

        $scope.apply = function () {
            $scope.active = $scope.selected.entries.length < $scope.entries.length;
            $scope.$emit("filter", $scope.column, {
                filterValue: _.pluck($scope.selected.entries, "id"),
                filterType: "checkboxes",
                isBoolean: $scope.isBoolean
            }, $scope.active)
        };
        $scope.clear = function () {
            $scope.selectAll();
            $scope.active = false;
            $scope.$emit("filter", $scope.column, {
                filterValue: undefined,
                filterType: "checkboxes",
                isBoolean: $scope.isBoolean
            }, $scope.active)
        };
        $scope.$on("clear", $scope.clear);
        DebugService.log("filter-checkboxes");
    }
}

angular
    .module('nzbhydraApp').directive("booleanFilter", booleanFilter);

function booleanFilter(DebugService) {
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
        $scope.active = false;

        $scope.apply = function () {
            $scope.active = $scope.selected.value !== $scope.options[0].value;
            $scope.$emit("filter", $scope.column, {
                filterValue: $scope.selected.value,
                filterType: "boolean"
            }, $scope.active)
        };
        $scope.clear = function () {
            $scope.selected.value = true;
            $scope.active = false;
            $scope.$emit("filter", $scope.column, {filterValue: undefined, filterType: "boolean"}, $scope.active)
        };
        $scope.$on("clear", $scope.clear);
        DebugService.log("filter-boolean");
    }
}

angular
    .module('nzbhydraApp').directive("timeFilter", timeFilter);

function timeFilter() {
    controller.$inject = ["$scope", "DebugService"];
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterTime.html\'"/>',
        scope: {
            column: "@",
            selected: "<"
        },
        controller: controller
    };

    function controller($scope, DebugService) {

        $scope.dateOptions = {
            dateDisabled: false,
            formatYear: 'yy',
            startingDay: 1
        };

        $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
        $scope.format = $scope.formats[0];
        $scope.altInputFormats = ['M!/d!/yyyy'];
        $scope.active = false;

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
            $scope.active = $scope.selected.beforeDate || $scope.selected.afterDate;
            $scope.$emit("filter", $scope.column, {
                filterValue: {
                    after: $scope.selected.afterDate,
                    before: $scope.selected.beforeDate
                }, filterType: "time"
            }, $scope.active)
        };
        $scope.clear = function () {
            $scope.selected.beforeDate = undefined;
            $scope.selected.afterDate = undefined;
            $scope.active = false;
            $scope.$emit("filter", $scope.column, {filterValue: undefined, filterType: "time"}, $scope.active)
        };
        $scope.$on("clear", $scope.clear);
        DebugService.log("filter-time");
    }
}

angular
    .module('nzbhydraApp').directive("numberRangeFilter", numberRangeFilter);

function numberRangeFilter() {
    controller.$inject = ["$scope", "DebugService"];
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

    function controller($scope, DebugService) {
        $scope.filterValue = {min: undefined, max: undefined};
        $scope.active = false;

        function apply() {
            $scope.active = $scope.filterValue.min || $scope.filterValue.max;
            $scope.$emit("filter", $scope.column, {
                filterValue: $scope.filterValue,
                filterType: "numberRange"
            }, $scope.active)
        }

        $scope.clear = function () {
            $scope.filterValue = {min: undefined, max: undefined};
            $scope.active = false;
            $scope.$emit("filter", $scope.column, {
                filterValue: undefined,
                filterType: "numberRange",
                isBoolean: $scope.isBoolean
            }, $scope.active)
        };
        $scope.$on("clear", $scope.clear);

        $scope.apply = function () {
            apply();
        };

        $scope.onKeypress = function (keyEvent) {
            if (keyEvent.which === 13) {
                apply();
            }
        };

        DebugService.log("filter-number");
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

        $scope.$on("newSortColumn", function (event, column, sortMode) {
            $scope.sortModel.active = column === $scope.sortModel.column;
            if (column !== $scope.sortModel.column) {
                $scope.sortModel.sortMode = 0;
            } else {
                $scope.sortModel.sortMode = sortMode;
            }
        });

        $scope.sort = function () {
            if ($scope.sortModel.sortMode === 0 || angular.isUndefined($scope.sortModel.sortMode)) {
                $scope.sortModel.sortMode = $scope.sortModel.startMode;
            } else if ($scope.sortModel.sortMode === 1) {
                $scope.sortModel.sortMode = 2;
            } else {
                $scope.sortModel.sortMode = 1;
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
            $http.get(url, {params: params}).then(function (result) {
                    //Using ng-class and a scope variable doesn't work for some reason, is only updated at second click
                    if (result.successful) {
                        angular.element(testMessage).text("");
                        showSuccess();
                    } else {
                        angular.element(testMessage).text(result.message);
                        showError();
                    }

                }, function () {
                    angular.element(testMessage).text(result.message);
                    showError();
                }
            ).finally(function () {
                angular.element(testButton).removeClass("glyphicon-refresh-animate");
            })
        }

    }
}


//Taken from https://github.com/IamAdamJowett/angular-click-outside

clickOutside.$inject = ["$document", "$parse", "$timeout"];
function childOf(/*child node*/c, /*parent node*/p) { //returns boolean
    while ((c = c.parentNode) && c !== p) ;
    return !!c;
}

angular
    .module('nzbhydraApp').directive("clickOutside", clickOutside);

/**
 * @ngdoc directive
 * @name angular-click-outside.directive:clickOutside
 * @description Directive to add click outside capabilities to DOM elements
 * @requires $document
 * @requires $parse
 * @requires $timeout
 **/
function clickOutside($document, $parse, $timeout) {
    return {
        restrict: 'A',
        link: function ($scope, elem, attr) {

            // postpone linking to next digest to allow for unique id generation
            $timeout(function () {
                var classList = (attr.outsideIfNot !== undefined) ? attr.outsideIfNot.split(/[ ,]+/) : [],
                    fn;

                function eventHandler(e) {
                    var i,
                        element,
                        r,
                        id,
                        classNames,
                        l;

                    // check if our element already hidden and abort if so
                    if (angular.element(elem).hasClass("ng-hide")) {
                        return;
                    }

                    // if there is no click target, no point going on
                    if (!e || !e.target) {
                        return;
                    }

                    if (angular.isDefined(attr.outsideIgnore) && $scope.$eval(attr.outsideIgnore)) {
                        return;
                    }
                    var isChild = childOf(e.target, elem.context);
                    if (isChild) {
                        return;
                    }
                    // loop through the available elements, looking for classes in the class list that might match and so will eat
                    for (element = e.target; element; element = element.parentNode) {
                        // check if the element is the same element the directive is attached to and exit if so (props @CosticaPuntaru)
                        if (element === elem[0]) {
                            return;
                        }

                        // now we have done the initial checks, start gathering id's and classes
                        id = element.id,
                            classNames = element.className,
                            l = classList.length;

                        // Unwrap SVGAnimatedString classes
                        if (classNames && classNames.baseVal !== undefined) {
                            classNames = classNames.baseVal;
                        }

                        // if there are no class names on the element clicked, skip the check
                        if (classNames || id) {

                            // loop through the elements id's and classnames looking for exceptions
                            for (i = 0; i < l; i++) {
                                //prepare regex for class word matching
                                r = new RegExp('\\b' + classList[i] + '\\b');

                                // check for exact matches on id's or classes, but only if they exist in the first place
                                if ((id !== undefined && id === classList[i]) || (classNames && r.test(classNames))) {
                                    // now let's exit out as it is an element that has been defined as being ignored for clicking outside
                                    return;
                                }
                            }
                        }
                    }

                    // if we have got this far, then we are good to go with processing the command passed in via the click-outside attribute
                    $timeout(function () {
                        fn = $parse(attr['clickOutside']);
                        fn($scope, {event: e});
                    });
                }

                // if the devices has a touchscreen, listen for this event
                if (_hasTouch()) {
                    $document.on('touchstart', eventHandler);
                }

                // still listen for the click event even if there is touch to cater for touchscreen laptops
                $document.on('click', eventHandler);

                // when the scope is destroyed, clean up the documents event handlers as we don't want it hanging around
                $scope.$on('$destroy', function () {
                    if (_hasTouch()) {
                        $document.off('touchstart', eventHandler);
                    }

                    $document.off('click', eventHandler);
                });

                /**
                 * @description Private function to attempt to figure out if we are on a touch device
                 * @private
                 **/
                function _hasTouch() {
                    // works on most browsers, IE10/11 and Surface
                    return 'ontouchstart' in window || navigator.maxTouchPoints;
                }
            });
        }
    };
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
                        if (response.data.successful) {
                            $scope.uploadActive = false;
                            RestartService.startCountdown("Upload successful. Restarting for wrapper to restore data.");
                        } else {
                            file.progress = 0;
                            growl.error(response.data.message)
                        }

                    }, function (response) {
                        growl.error(response.data.message)
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
                    RestartService.startCountdown("Extraction of backup successful. Restarting for wrapper to restore data.");
                },
                function (response) {
                    growl.error(response.data);
                })
        }

    }
}



addableNzbs.$inject = ["DebugService"];angular
    .module('nzbhydraApp')
    .directive('addableNzbs', addableNzbs);

function addableNzbs(DebugService) {
    controller.$inject = ["$scope", "NzbDownloadService"];
    return {
        templateUrl: 'static/html/directives/addable-nzbs.html',
        require: [],
        scope: {
            searchresult: "<",
            alwaysAsk: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService) {
        $scope.alwaysAsk = $scope.alwaysAsk === "true";
        $scope.downloaders = _.filter(NzbDownloadService.getEnabledDownloaders(), function (downloader) {
            if ($scope.searchresult.downloadType !== "NZB") {
                return downloader.downloadType === $scope.searchresult.downloadType
            }
            return true;
        });
    }
}


addableNzb.$inject = ["DebugService"];angular
    .module('nzbhydraApp')
    .directive('addableNzb', addableNzb);

function addableNzb(DebugService) {
    controller.$inject = ["$scope", "NzbDownloadService", "growl"];
    return {
        templateUrl: 'static/html/directives/addable-nzb.html',
        scope: {
            searchresult: "=",
            downloader: "<",
            alwaysAsk: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService, growl) {
        if ($scope.downloader.iconCssClass !== undefined && $scope.downloader.iconCssClass !== '') {
            $scope.cssClass = "fa fa-" + $scope.downloader.iconCssClass.replace("fa-", "").replace("fa ", "");
        } else {
            $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd" : "nzbget";
        }

        $scope.add = function () {
            var originalClass = $scope.cssClass;
            $scope.cssClass = "nzb-spinning";
            NzbDownloadService.download($scope.downloader, [{
                searchResultId: $scope.searchresult.searchResultId ? $scope.searchresult.searchResultId : $scope.searchresult.id,
                originalCategory: $scope.searchresult.originalCategory,
                mappedCategory: $scope.searchresult.category
            }], $scope.alwaysAsk).then(function (response) {
                if (response !== "dismissed") {
                    if (response.data.successful && (response.data.addedIds != null && response.data.addedIds.indexOf(Number($scope.searchresult.searchResultId)) > -1)) {
                        $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-success" : "nzbget-success";
                    } else {
                        $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                        growl.error(response.data.message);
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

CheckCapsModalInstanceCtrl.$inject = ["$scope", "$interval", "$http", "$timeout", "growl", "capsCheckRequest"];
IndexerConfigBoxService.$inject = ["$http", "$q", "$uibModal"];
IndexerCheckBeforeCloseService.$inject = ["$q", "ModalService", "IndexerConfigBoxService", "growl", "blockUI"];
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
    if ((indexerModel.searchModuleType === "NEWZNAB" || indexerModel.searchModuleType === "TORZNAB") && !isInitial) {
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
                    required: true,
                    help: 'Used for identification.' + (isInitial ? '' : ' Changing the name will lose all history and stats!')
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

    fieldset.push({
        key: 'state',
        type: 'horizontalIndexerStateSwitch',
        templateOptions: {
            type: 'switch',
            label: 'State',
            help: stateHelp
        }
    });

    if (indexerModel.searchModuleType === 'NEWZNAB' || indexerModel.searchModuleType === 'TORZNAB') {
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

    if ((indexerModel.searchModuleType === 'NEWZNAB' || indexerModel.searchModuleType === 'TORZNAB') && indexerModel.host !== 'https://feed.animetosho.org') {
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
                help: 'When duplicate search results are found the result from the indexer with the highest number will be selected.'
            }
        });

    fieldset.push(
        {
            key: 'timeout',
            type: 'horizontalInput',
            templateOptions: {
                type: 'number',
                label: 'Timeout',
                help: 'Supercedes the general timeout in "Searching".'
            }
        },
        {
            key: 'schedule',
            type: 'horizontalChips',
            templateOptions: {
                type: 'text',
                label: 'Schedule',
                help: 'Determines when an indexer should be selected. See <a href="https://github.com/theotherp/nzbhydra2/wiki/Indexer-schedules" target="_blank">wiki</a>. You can enter multiple time spans. Apply values with return key.'
            }
        }
    );

    if (indexerModel.searchModuleType === 'NEWZNAB' || indexerModel.searchModuleType === 'TORZNAB') {
        fieldset.push(
            {
                key: 'hitLimit',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'number',
                    label: 'API hit limit',
                    help: 'Maximum number of API hits since "API hit reset time".'
                },
                validators: {
                    greaterThanZero: {
                        expression: function ($viewValue, $modelValue) {
                            var value = $modelValue || $viewValue;
                            return angular.isUndefined(value) || value === null || value === "" || value > 0;
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
                            return angular.isUndefined(value) || value === null || value === "" || value > 0;
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
                    help: 'UTC hour of day at which the API hit counter is reset (0-23). Leave empty for a rolling reset counter.'
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
                    help: 'If set indexer will only be picked for one out of x API searches (on average).'
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
            }
        );
    }
    if (indexerModel.searchModuleType === 'NEWZNAB' || indexerModel.searchModuleType === 'TORZNAB') {
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

    if (indexerModel.searchModuleType === 'NEWZNAB') {
        fieldset.push(
            {
                key: 'userAgent',
                type: 'horizontalInput',
                templateOptions: {
                    type: 'text',
                    required: false,
                    label: 'User agent',
                    help: 'Rarely needed. Will supercede the one in the main searching settings.'
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
                help: 'Select for which searches this indexer will be used. "Update queries" are searches without query or ID (e.g. done by Sonarr periodically).'
            }
        }
    );

    if (indexerModel.searchModuleType !== "ANIZB") {
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
                    }
                }
            }
        );
    }

    if ((indexerModel.searchModuleType === 'NEWZNAB' || indexerModel.searchModuleType === 'TORZNAB') && !isInitial) {
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
                    noSelectedText: "None"
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
                        {label: 'TV', id: 'TVSEARCH'}
                    ],
                    buttonText: "None"
                }
            }
        );
        fieldset.push(
            {
                type: 'horizontalCheckCaps',
                hideExpression: '!model.host || !model.name',
                templateOptions: {
                    label: 'Check capabilities',
                    help: 'Find out what search types and IDs the indexer supports. Done automatically for new indexers.'
                }
            }
        )
    }

    if (indexerModel.searchModuleType === 'nzbindex') {
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


function _showBox(indexerModel, parentModel, isInitial, $uibModal, CategoriesService, form, callback) {
    var modalInstance = $uibModal.open({
        templateUrl: 'static/html/config/indexer-config-box.html',
        controller: 'IndexerConfigBoxInstanceController',
        size: 'lg',
        resolve: {
            model: function () {
                return indexerModel;
            },
            fields: function () {
                return getIndexerBoxFields(indexerModel, parentModel, isInitial, CategoriesService);
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
    .config(["formlyConfigProvider", function config(formlyConfigProvider) {

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
                    _showBox(indexerModel, model, false, $uibModal, CategoriesService, $scope.form)
                }

            }
        });
    }]);


angular.module('nzbhydraApp').controller('IndexerConfigSelectionBoxInstanceController', ["$scope", "$q", "$uibModalInstance", "$uibModal", "$http", "model", "form", "growl", "CategoriesService", "$timeout", function ($scope, $q, $uibModalInstance, $uibModal, $http, model, form, growl, CategoriesService, $timeout) {

    $scope.showBox = showBox;
    $scope.isInitial = false;

    $scope.select = function (modelPreset) {
        addEntry(modelPreset);
        $timeout(function () {
                $uibModalInstance.close();
            },
            200);
    };

    function showBox(indexerModel, model) {
        _showBox(indexerModel, model, false, $uibModal, CategoriesService, form)
    }

    function addEntry(preset) {
        if (checkAddingAllowed(model, preset)) {
            var indexerModel = angular.copy({
                allCapsChecked: false,
                apiKey: null,
                backend: 'NEWZNAB',
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
            if (angular.isDefined(preset)) {
                _.extend(indexerModel, preset);
            }

            $scope.isInitial = true;

            _showBox(indexerModel, model, true, $uibModal, CategoriesService, form, function (isSubmitted, returnedModel) {
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
            configComplete: true
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
            host: "https://api.omgwtfnzbs.me"
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
}]);


angular.module('nzbhydraApp').controller('IndexerConfigBoxInstanceController', ["$scope", "$q", "$uibModalInstance", "$http", "model", "form", "fields", "isInitial", "parentModel", "growl", "IndexerCheckBeforeCloseService", function ($scope, $q, $uibModalInstance, $http, model, form, fields, isInitial, parentModel, growl, IndexerCheckBeforeCloseService) {

    $scope.model = model;
    $scope.fields = fields;
    $scope.isInitial = isInitial;
    $scope.spinnerActive = false;
    $scope.needsConnectionTest = false;

    $scope.obSubmit = function () {
        if (form.$valid) {
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
}]);


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
        if (!scope.isInitial && (!scope.needsConnectionTest || scope.form.capsChecked)) {
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
DownloaderConfigBoxService.$inject = ["$http", "$q", "$uibModal"];
DownloaderCheckBeforeCloseService.$inject = ["$q", "DownloaderConfigBoxService", "growl", "ModalService", "blockUI"];
angular
    .module('nzbhydraApp')
    .config(["formlyConfigProvider", function config(formlyConfigProvider) {

        formlyConfigProvider.setType({
            name: 'downloaderConfig',
            templateUrl: 'static/html/config/downloader-config.html',
            controller: function ($scope, $uibModal, growl, CategoriesService) {
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
                        url: "http://nzbget:tegbzn6789@localhost:6789"
                    },
                    {
                        url: "http://localhost:8080",
                        downloaderType: "SABNZBD",
                        name: "SABnzbd",
                        nzbAddingType: "UPLOAD",
                        nzbAccessType: "REDIRECT",
                        iconCssClass: "",
                        downloadType: "NZB"
                    }
                ];

                function _showBox(model, parentModel, isInitial, callback) {
                    var modalInstance = $uibModal.open({
                        templateUrl: 'static/html/config/downloader-config-box.html',
                        controller: 'DownloaderConfigBoxInstanceController',
                        size: 'lg',
                        resolve: {
                            model: function () {
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
                                help: 'When adding NZBs this category will be used instead of asking for the category. Write "Use original category" or "Use mapped category" to not be asked.',
                                placeholder: 'Ask when downloading'
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
                                help: "How NZBs are added to the downloader, either by sending a link to the NZB or by uploading the NZB data. Uploading is recommended"
                            }
                        },
                        {
                            key: 'iconCssClass',
                            type: 'horizontalInput',
                            templateOptions: {
                                type: 'text',
                                label: 'Icon CSS class',
                                help: 'Copy an icon name from https://fontawesome.com/v4.7.0/icons/ (e.g. "film")',
                                placeholder: 'Default'
                            }
                        }
                    ]);

                    return fieldset;
                }
            }
        });

    }]);


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

angular.module('nzbhydraApp').controller('DownloaderConfigBoxInstanceController', ["$scope", "$q", "$uibModalInstance", "$http", "model", "fields", "isInitial", "parentModel", "data", "growl", "DownloaderCheckBeforeCloseService", function ($scope, $q, $uibModalInstance, $http, model, fields, isInitial, parentModel, data, growl, DownloaderCheckBeforeCloseService) {

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
}]);


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

hashCode = function (s) {
    return s.split("").reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a
    }, 0);
};

angular
    .module('nzbhydraApp').run(["formlyConfig", "formlyValidationMessages", function (formlyConfig, formlyValidationMessages) {
    formlyValidationMessages.addStringMessage('required', 'This field is required');
    formlyValidationMessages.addStringMessage('newznabCategories', 'Invalid');
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
                '<legend><span class="config-fieldset-legend">{{options.templateOptions.label}}</span></legend>',
                '<formly-transclude></formly-transclude>',
                '</fieldset>'
            ].join(' ')
        });

        formlyConfigProvider.setType({
            name: 'help',
            template: [
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
            model.hitLimit = indexerConfig.hitLimit;
            model.downloadLimit = indexerConfig.downloadLimit;
            model.state = indexerConfig.state;
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
    }]);



ConfigService.$inject = ["$http", "$q", "$cacheFactory", "bootstrapped"];angular
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
        reloadConfig: reloadConfig,
        apiHelp: apiHelp
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
        return $http.get('internalapi/config/reload').then(function (response) {
            return response.data;
        });
    }

    function apiHelp() {
        return $http.get('internalapi/config/apiHelp').then(function (response) {
            return response.data;
        });
    }

    function get() {
        var config = cache.get("config");
        if (angular.isUndefined(config)) {
            config = $http.get('internalapi/config').then(function (response) {
                return response.data;
            });
            cache.put("config", config);
        }

        return config;
    }

    function getSafe() {
        return safeConfig;
    }

    function invalidateSafe() {
        $http.get('internalapi/config/safe').then(function (response) {
            safeConfig = response.data;
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

ConfigFields.$inject = ["$injector"];
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
                                help: "If enabled indexers will not be temporarily disabled after an error. Unrecoverable errors (e.g. wrong API key) will still disable the indexer"
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

ConfigController.$inject = ["$scope", "$http", "activeTab", "ConfigService", "config", "DownloaderCategoriesService", "ConfigFields", "ConfigModel", "ModalService", "RestartService", "localStorageService", "$state", "growl", "$window"];angular
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

function ConfigController($scope, $http, activeTab, ConfigService, config, DownloaderCategoriesService, ConfigFields, ConfigModel, ModalService, RestartService, localStorageService, $state, growl, $window) {
    $scope.config = config;
    $scope.submit = submit;
    $scope.activeTab = activeTab;

    $scope.restartRequired = false;
    $scope.ignoreSaveNeeded = false;


    function updateAndAskForRestartIfNecessary(responseData) {
        if (angular.isUndefined($scope.form)) {
            console.error("Unable to determine if a restart is necessary");
            return;
        }

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
                        $scope.config = responseData.newConfig;
                        $window.location.reload();
                    }
                }
            });
        } else {
            $scope.config = responseData.newConfig;
            $window.location.reload();
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
                message = '<span class="error-message">The following errors have been found in your config. They need to be fixed.<ul>';
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
                                updateAndAskForRestartIfNecessary(response.data);
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
                            updateAndAskForRestartIfNecessary(response.data);
                        },
                        text: "OK"
                    }
                };
            }

            ModalService.open(title, message, options, "md", "left");
        } else {
            updateAndAskForRestartIfNecessary(response.data);
        }
    }

    function submit() {
        if ($scope.form.$valid && !$scope.myShowError) {
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

    $scope.apiHelp = function () {

        if ($scope.isSavingNeeded()) {
            growl.info("Please save first");
            return;
        }
        var apiHelp = ConfigService.apiHelp().then(function (data) {

            var html = '<span style="text-align: left;"><table>' +
                '<tr><td>Newznab API endpoint:</td><td style="padding-left: 10px">%newznab%</td></tr>' +
                '<tr><td>Torznab API endpoint:</td><td style="padding-left: 10px">%torznab%</td></tr>' +
                '<tr><td>API key:</td><td style="padding-left: 10px">%apikey%</td></tr>' +
                '</table></span>';
            //Torznab API endpoint: <span class="label label-default">%torznab%</span><br>API key: <span class="label label-default">%apikey%
            html = html.replace("%newznab%", data.newznabApi);
            html = html.replace("%torznab%", data.torznabApi);
            html = html.replace("%apikey%", data.apiKey);
            ModalService.open("API infos", html, {}, "md");
        });
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
        });

    $scope.$watch("$scope.form.$valid", function () {
        console.log($scope.form.$valid);
    });

    $scope.$on('$formValidity', function (event, isValid) {
        console.log("Received $formValidity event: " + isValid);
        $scope.form.$valid = isValid;
        $scope.form.$invalid = !isValid;
        $scope.showError = !isValid;
        $scope.myShowError = !isValid;
    });
}




UpdateService.$inject = ["$http", "growl", "blockUI", "RestartService", "RequestsErrorHandler", "$uibModal", "$timeout"];
UpdateModalInstanceCtrl.$inject = ["$scope", "$http", "$interval", "RequestsErrorHandler"];angular
    .module('nzbhydraApp')
    .factory('UpdateService', UpdateService);

function UpdateService($http, growl, blockUI, RestartService, RequestsErrorHandler, $uibModal, $timeout) {

    var currentVersion;
    var latestVersion;
    var updateAvailable;
    var latestVersionIgnored;
    var versionHistory;
    var runInDocker;


    return {
        update: update,
        showChanges: showChanges,
        getInfos: getInfos,
        getVersionHistory: getVersionHistory,
        ignore: ignore,
        showChangesFromAutomaticUpdate: showChangesFromAutomaticUpdate
    };

    function getInfos() {
        return RequestsErrorHandler.specificallyHandled(function () {
            return $http.get("internalapi/updates/infos").then(
                function (response) {
                    currentVersion = response.data.currentVersion;
                    latestVersion = response.data.latestVersion;
                    updateAvailable = response.data.updateAvailable;
                    latestVersionIgnored = response.data.latestVersionIgnored;
                    runInDocker = response.data.runInDocker;
                    automaticUpdateToNotice = response.data.automaticUpdateToNotice;
                    return response;
                }, function () {

                }
            );
        });
    }

    function ignore(version) {
        return $http.put("internalapi/updates/ignore?version=" + version).then(function (response) {
            return response;
        });
    }

    function getVersionHistory() {
        return $http.get("internalapi/updates/versionHistory").then(function (response) {
            versionHistory = response.data;
            return response;
        });
    }

    function showChanges() {
        return $http.get("internalapi/updates/changesSince").then(function (response) {
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

    function showChangesFromAutomaticUpdate() {
        return $http.get("internalapi/updates/automaticUpdateVersionHistory").then(function (response) {
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
            return $http.get("internalapi/updates/ackAutomaticUpdateVersionHistory").then(function (response) {

            });
        });
    }


    function update() {
        var modalInstance = $uibModal.open({
            templateUrl: 'static/html/update-modal.html',
            controller: 'UpdateModalInstanceCtrl',
            size: "md",
            backdrop: 'static',
            keyboard: false
        });
        $http.put("internalapi/updates/installUpdate").then(function () {
                //Handle like restart, ping application and wait
                //Perhaps save the version to which we want to update, ask later and see if they're equal. If not updating apparently failed...
                $timeout(function () {
                    //Give user some time to read the last message
                    RestartService.startCountdown("");
                    modalInstance.close();
                }, 2000);
            },
            function () {
                growl.info("An error occurred while updating. Please check the logs.");
                modalInstance.close();
            });
    }
}

angular
    .module('nzbhydraApp')
    .controller('UpdateModalInstanceCtrl', UpdateModalInstanceCtrl);

function UpdateModalInstanceCtrl($scope, $http, $interval, RequestsErrorHandler) {
    $scope.messages = [];

    var interval = $interval(function () {
            RequestsErrorHandler.specificallyHandled(function () {
                $http.get("internalapi/updates/messages").then(
                    function (data) {
                        $scope.messages = data.data;
                    }
                );
            });
        },
        200);

    $scope.$on('$destroy', function () {
        if (interval !== null) {
            $interval.cancel(interval);
        }
    });

}

SystemController.$inject = ["$scope", "$state", "activeTab", "$http", "growl", "RestartService", "MigrationService", "ConfigService", "NzbHydraControlService"];angular
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
            state: 'root.system.tasks',
            name: "Tasks"
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
        $http({
            method: 'GET',
            url: 'internalapi/debuginfos/logandconfig',
            responseType: 'arraybuffer'
        }).then(function (response, status, headers, config) {
            var a = document.createElement('a');
            var blob = new Blob([response.data], {'type': "application/octet-stream"});
            a.href = URL.createObjectURL(blob);
            a.download = "nzbhydra-debuginfos-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip";

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    };

    $scope.executeSqlQuery = function () {
        $http.post('internalapi/debuginfos/executesqlquery', $scope.foo.sql).then(function (response) {
            if (response.data.successful) {
                $scope.foo.csv = response.data.message;
            } else {
                growl.error(response.data.message);
            }
        });
    };

    $scope.executeSqlUpdate = function () {
        $http.post('internalapi/debuginfos/executesqlupdate', $scope.foo.sql).then(function (response) {
            if (response.data.successful) {
                $scope.foo.csv = response.data.message + " rows affected";
            } else {
                growl.error(response.data.message);
            }
        });
    };


}

StatsService.$inject = ["$http"];angular
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
        return $http.post("internalapi/stats", requestBody).then(function (response) {
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
        return $http.post("internalapi/history/downloads", params).then(function (response) {
            return {
                nzbDownloads: response.data.content,
                totalDownloads: response.data.totalElements
            };

        });
    }

}

StatsController.$inject = ["$scope", "$filter", "StatsService", "blockUI", "localStorageService", "$timeout", "$window", "ConfigService"];angular
    .module('nzbhydraApp')
    .controller('StatsController', StatsController);

function StatsController($scope, $filter, StatsService, blockUI, localStorageService, $timeout, $window, ConfigService) {

    $scope.dateOptions = {
        dateDisabled: false,
        formatYear: 'yy',
        startingDay: 1
    };
    var initializingAfter = true;
    var initializingBefore = true;
    $scope.afterDate = moment().subtract(30, "days").toDate();
    $scope.beforeDate = moment().add(1, "days").toDate();
    var historyInfoTypeUserEnabled = ConfigService.getSafe().logging.historyUserInfoType === 'USERNAME' || ConfigService.getSafe().logging.historyUserInfoType === 'BOTH';
    var historyInfoTypeIpEnabled = ConfigService.getSafe().logging.historyUserInfoType === 'IP' || ConfigService.getSafe().logging.historyUserInfoType === 'BOTH';
    $scope.foo = {
        includeDisabledIndexersInStats: localStorageService.get("includeDisabledIndexersInStats") !== null ? localStorageService.get("includeDisabledIndexersInStats") : false,
        statsSwichState: localStorageService.get("statsSwitchState") !== null ? localStorageService.get("statsSwitchState") :
            {
                indexerApiAccessStats: true,
                avgIndexerUniquenessScore: true,
                avgResponseTimes: true,
                indexerDownloadShares: true,
                downloadsPerDayOfWeek: true,
                downloadsPerHourOfDay: true,
                searchesPerDayOfWeek: true,
                searchesPerHourOfDay: true,
                downloadsPerAgeStats: true,
                successfulDownloadsPerIndexer: true,
                downloadSharesPerUser: historyInfoTypeUserEnabled,
                searchSharesPerUser: historyInfoTypeIpEnabled,
                downloadSharesPerIp: true,
                searchSharesPerIp: true,
                userAgentSearchShares: true,
                userAgentDownloadShares: true
            }
    };
    localStorageService.set("statsSwitchState", $scope.foo.statsSwichState);
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

    $scope.refresh = function () {
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
        //Only update those stats that were calculated (because this might be an update when one stat has just been enabled)
        _.forEach(stats, function (value, key) {
            if (value !== null) {
                $scope.stats[key] = value;
            }
        });

        if ($scope.stats.avgResponseTimes) {
            $scope.avgResponseTimesChart = getChart("multiBarHorizontalChart", $scope.stats.avgResponseTimes, "indexer", "avgResponseTime", "", "Response time (ms)");
            $scope.avgResponseTimesChart.options.chart.margin.left = 100;
            $scope.avgResponseTimesChart.options.chart.yAxis.rotateLabels = -30;
            $scope.avgResponseTimesChart.options.chart.height = Math.max($scope.stats.avgResponseTimes.length * 30, 350);
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
            $scope.successfulDownloadsPerIndexerChart = getChart("multiBarHorizontalChart", $scope.stats.successfulDownloadsPerIndexer, "indexerName", "percentSuccessful", "Indexer", '% successful');
            $scope.successfulDownloadsPerIndexerChart.options.chart.xAxis.rotateLabels = 90;
            $scope.successfulDownloadsPerIndexerChart.options.chart.yAxis.tickFormat = function (d) {
                return $filter('number')(d, 0);
            };
            $scope.successfulDownloadsPerIndexerChart.options.chart.valueFormat = function (d) {
                return $filter('number')(d, 0);
            };
            $scope.successfulDownloadsPerIndexerChart.options.chart.showValues = true;
            $scope.successfulDownloadsPerIndexerChart.options.chart.margin.left = 80;
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

        if ($scope.stats.searchSharesPerIp !== null) {
            $scope.downloadSharesPerIpChart = getSharesPieChart($scope.stats.downloadSharesPerIp, 300, "key", "percentage");
        }
        if ($scope.stats.searchSharesPerIpChart !== null) {
            $scope.searchSharesPerIpChart = getSharesPieChart($scope.stats.searchSharesPerIp, 300, "key", "percentage");
        }
        if ($scope.stats.searchSharesPerUser !== null) {
            $scope.downloadSharesPerUserChart = getSharesPieChart($scope.stats.downloadSharesPerUser, 300, "key", "percentage");
        }
        if ($scope.stats.searchSharesPerUserChart !== null) {
            $scope.searchSharesPerUserChart = getSharesPieChart($scope.stats.searchSharesPerUser, 300, "key", "percentage");
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
}

//
SearchService.$inject = ["$http"];
angular
    .module('nzbhydraApp')
    .factory('SearchService', SearchService);

function SearchService($http) {


    var lastExecutedQuery;
    var lastExecutedSearchRequestParameters;
    var lastResults;
    var modalInstance;

    return {
        search: search,
        getLastResults: getLastResults,
        loadMore: loadMore,
        getSearchState: getSearchState,
        getModalInstance: getModalInstance,
        setModalInstance: setModalInstance,
    };

    function getModalInstance() {
        return modalInstance;
    }

    function setModalInstance(mi) {
        modalInstance = mi;
    }

    function search(searchRequestId, category, query, metaData, season, episode, minsize, maxsize, minage, maxage, indexers, mode) {
        // console.time("search");
        var uri = new URI("internalapi/search");
        var searchRequestParameters = {};
        searchRequestParameters.searchRequestId = searchRequestId;
        searchRequestParameters.query = query;
        searchRequestParameters.minsize = minsize;
        searchRequestParameters.maxsize = maxsize;
        searchRequestParameters.minage = minage;
        searchRequestParameters.maxage = maxage;
        searchRequestParameters.category = category;
        searchRequestParameters.mode = mode;
        if (!angular.isUndefined(indexers) && indexers !== null) {
            searchRequestParameters.indexers = indexers.split(",");
        }

        if (metaData) {
            searchRequestParameters.title = metaData.title;
            if (category.indexOf("Movies") > -1 || (category.indexOf("20") === 0) || mode === "movie") {
                searchRequestParameters.tmdbId = metaData.tmdbId;
                searchRequestParameters.imdbId = metaData.imdbId;
            } else if (category.indexOf("TV") > -1 || (category.indexOf("50") === 0) || mode === "tvsearch") {
                searchRequestParameters.tvdbId = metaData.tvdbId;
                searchRequestParameters.tvrageId = metaData.rid;
                searchRequestParameters.tvmazeId = metaData.tvmazeId;
                searchRequestParameters.season = season;
                searchRequestParameters.episode = episode;
            }
        }

        lastExecutedQuery = uri;
        lastExecutedSearchRequestParameters = searchRequestParameters;
        return $http.post(uri.toString(), searchRequestParameters).then(processData);
    }

    function loadMore(offset, limit, loadAll) {
        lastExecutedSearchRequestParameters.offset = offset;
        lastExecutedSearchRequestParameters.limit = limit;
        lastExecutedSearchRequestParameters.loadAll = angular.isDefined(loadAll) ? loadAll : false;

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
        // console.timeEnd("searchonly");
        return lastResults;
    }

    function getLastResults() {
        return lastResults;
    }
}

SearchResultsController.$inject = ["$stateParams", "$scope", "$q", "$timeout", "$document", "blockUI", "growl", "localStorageService", "SearchService", "ConfigService", "CategoriesService", "DebugService", "GenericStorageService", "ModalService"];angular
    .module('nzbhydraApp')
    .controller('SearchResultsController', SearchResultsController);

//SearchResultsController.$inject = ['blockUi'];
function SearchResultsController($stateParams, $scope, $q, $timeout, $document, blockUI, growl, localStorageService, SearchService, ConfigService, CategoriesService, DebugService, GenericStorageService, ModalService) {
    // console.time("Presenting");
    DebugService.log("foobar");
    $scope.limitTo = ConfigService.getSafe().searching.loadLimitInternal;
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
    $scope.lastClickedRowIndex = null;
    $scope.lastClickedValue = null;

    var allSearchResults = [];
    var sortModel = {};
    $scope.filterModel = {};


    $scope.filterButtonsModel = {
        source: {},
        quality: {}
    };
    $scope.filterButtonsModelMap = {
        tv: ['hdtv'],
        camts: ['cam', 'ts'],
        web: ['webrip', 'web-dl', 'webdl'],
        dvd: ['dvd'],
        bluray: ['bluray', 'blu-ray']
    };
    if ($stateParams.sortby !== undefined) {
        $stateParams.sortby = $stateParams.sortby.toLowerCase();
        sortModel = {};
        sortModel.reversed = false;
        if ($stateParams.sortby === "title") {
            sortModel.column = "title";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "indexer") {
            sortModel.column = "indexer";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "category") {
            sortModel.column = "category";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "size") {
            sortModel.column = "size";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "details") {
            sortModel.column = "grabs";
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 1;
            } else {
                sortModel.sortMode = 2;
            }
        } else if ($stateParams.sortby === "age") {
            sortModel.column = "epoch";
            sortModel.reversed = true;
            if ($stateParams.sortdirection === "asc" || $stateParams.sortdirection === undefined) {
                sortModel.sortMode = 2;
            } else {
                sortModel.sortMode = 1;
            }
        }


    } else if (localStorageService.get("sorting") !== null) {
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
        duplicatesDisplayed: localStorageService.get("duplicatesDisplayed") !== null ? localStorageService.get("duplicatesDisplayed") : false,
        groupTorrentAndNewznabResults: localStorageService.get("groupTorrentAndNewznabResults") !== null ? localStorageService.get("groupTorrentAndNewznabResults") : false,
        sumGrabs: localStorageService.get("sumGrabs") !== null ? localStorageService.get("sumGrabs") : true,
        scrollToResults: localStorageService.get("scrollToResults") !== null ? localStorageService.get("scrollToResults") : true,
        showCovers: localStorageService.get("showCovers") !== null ? localStorageService.get("showCovers") : true,
        groupEpisodes: localStorageService.get("groupEpisodes") !== null ? localStorageService.get("groupEpisodes") : true
    };


    $scope.isShowFilterButtons = ConfigService.getSafe().searching.showQuickFilterButtons;
    $scope.isShowFilterButtonsMovie = $scope.isShowFilterButtons && $stateParams.category.toLowerCase().indexOf("movie") > -1;
    $scope.isShowFilterButtonsTv = $scope.isShowFilterButtons && $stateParams.category.toLowerCase().indexOf("tv") > -1;

    $scope.shared = {
        isGroupEpisodes: $scope.foo.groupEpisodes && $stateParams.category.toLowerCase().indexOf("tv") > -1 && $stateParams.episode === undefined
    };

    if ($scope.shared.isGroupEpisodes) {
        GenericStorageService.get("isGroupEpisodesHelpShown", true).then(function (response) {
            if (!response.data) {
                ModalService.open("Sorting of TV episodes", 'When searching in the TV categories results are automatically grouped by episodes. This makes it easier to download one episode each. You can disable this feature any time using the "Display options" button to the upper left.', {
                    yes: {
                        text: "OK"
                    }
                });
                GenericStorageService.put("isGroupEpisodesHelpShown", true, true);
            }

        })
    }

    $scope.loadMoreEnabled = false;
    $scope.totalAvailableUnknown = false;
    $scope.expandedTitlegroups = [];
    $scope.optionsOptions = [
        {id: "duplicatesDisplayed", label: "Show duplicate display triggers"},
        {id: "groupTorrentAndNewznabResults", label: "Group torrent and usenet results"},
        {id: "sumGrabs", label: "Use sum of grabs / seeders for filtering / sorting of groups"},
        {id: "scrollToResults", label: "Scroll to results when finished"},
        {id: "showCovers", label: "Show movie covers in results"},
        {id: "groupEpisodes", label: "Group TV results by season/episode"}
    ];
    $scope.optionsSelectedModel = [];
    for (var key in $scope.optionsOptions) {
        if ($scope.foo[$scope.optionsOptions[key]["id"]]) {
            $scope.optionsSelectedModel.push($scope.optionsOptions[key].id);
        }
    }

    $scope.optionsExtraSettings = {
        showSelectAll: false,
        showDeselectAll: false,
        buttonText: "Display options"
    };

    $scope.optionsEvents = {
        onToggleItem: function (item, newValue) {
            if (item.id === "duplicatesDisplayed") {
                toggleDuplicatesDisplayed(newValue);
            } else if (item.id === "groupTorrentAndNewznabResults") {
                toggleGroupTorrentAndNewznabResults(newValue);
            } else if (item.id === "sumGrabs") {
                toggleSumGrabs(newValue);
            } else if (item.id === "scrollToResults") {
                toggleScrollToResults(newValue);
            } else if (item.id === "showCovers") {
                toggleshowCovers(newValue);
            } else if (item.id === "groupEpisodes") {
                togglesGroupEpisodes(newValue);
            }
        }
    };

    function toggleDuplicatesDisplayed(value) {
        localStorageService.set("duplicatesDisplayed", value);
        $scope.$broadcast("duplicatesDisplayed", value);
        $scope.foo.duplicatesDisplayed = value;
    }

    function toggleGroupTorrentAndNewznabResults(value) {
        localStorageService.set("groupTorrentAndNewznabResults", value);
        $scope.foo.groupTorrentAndNewznabResults = value;
        blockAndUpdate();
    }

    function toggleSumGrabs(value) {
        localStorageService.set("sumGrabs", value);
        $scope.foo.sumGrabs = value;
        blockAndUpdate();
    }

    function toggleScrollToResults(value) {
        localStorageService.set("scrollToResults", value);
        $scope.foo.scrollToResults = value;
    }

    function toggleshowCovers(value) {
        localStorageService.set("showCovers", value);
        $scope.foo.showCovers = value;
        $scope.$broadcast("toggleShowCovers", value);
    }

    function togglesGroupEpisodes(value) {
        localStorageService.set("groupEpisodes", value);
        $scope.shared.isGroupEpisodes = value;
        blockAndUpdate();
    }


    $scope.indexersForFiltering = [];
    _.forEach($scope.indexersearches, function (indexer) {
        $scope.indexersForFiltering.push({label: indexer.indexerName, id: indexer.indexerName})
    });
    $scope.categoriesForFiltering = [];
    _.forEach(CategoriesService.getWithoutAll(), function (category) {
        $scope.categoriesForFiltering.push({label: category.name, id: category.name})
    });
    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerResultsInfo[ps.indexerName.toLowerCase()] = {loadedResults: ps.loaded_results};
    });

    setDataFromSearchResult(SearchService.getLastResults(), []);
    $scope.$emit("searchResultsShown");
    if (!SearchService.getLastResults().searchResults || SearchService.getLastResults().searchResults.length === 0) {
        //Close modal instance because no search results will be rendered that could trigger the closing
        SearchService.getModalInstance().close();
        $scope.doShowResults = true;
    }
    //stopBlocking();

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

    $scope.onFilterButtonsModelChange = function () {
        blockAndUpdate();
    };

    function blockAndUpdate() {
        startBlocking("Sorting / filtering...").then(function () {
            $scope.filteredResults = sortAndFilter(allSearchResults);
            //stopBlocking();
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

    function getCleanedTitle(element) {
        return element.title.toLowerCase().replace(/[\s\-\._]/ig, "");
    }

    function getGroupingString(element) {

        var groupingString;
        if ($scope.shared.isGroupEpisodes) {
            groupingString = (element.showtitle + "x" + element.season + "x" + element.episode).toLowerCase().replace(/[\._\-]/ig, "");
            if (groupingString === "nullxnullxnull") {
                groupingString = getCleanedTitle(element);
            }
        } else {
            groupingString = getCleanedTitle(element);
            if (!$scope.foo.groupTorrentAndNewznabResults) {
                groupingString = groupingString + element.downloadType;
            }
        }
        return groupingString;
    }

    function sortAndFilter(results) {
        var query;
        var words;
        if ("title" in $scope.filterModel) {
            query = $scope.filterModel.title.filterValue;
            if (!(query.startsWith("/") && query.endsWith("/"))) {
                words = query.toLowerCase().split(/[\s.\-]+/);
            }
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

            if ("epoch" in $scope.filterModel) {
                var filterValue = $scope.filterModel.epoch.filterValue;
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
                if (angular.isDefined(filterValue.min)) {
                    if ((item.seeders !== null && item.seeders < filterValue.min) || (item.seeders === null && item.grabs !== null && item.grabs < filterValue.min)) {
                        return false;
                    }
                }
                if (angular.isDefined(filterValue.max)) {
                    if ((item.seeders !== null && item.seeders > filterValue.max) || (item.seeders === null && item.grabs !== null && item.grabs > filterValue.max)) {
                        return false;
                    }
                }
            }

            if ("title" in $scope.filterModel) {
                var ok;
                if (query.startsWith("/") && query.endsWith("/")) {
                    ok = item.title.toLowerCase().match(new RegExp(query.substr(1, query.length - 2), "gi"));
                } else {
                    ok = _.every(words, function (word) {
                        if (word.startsWith("!")) {
                            if (word.length === 1) {
                                return true;
                            }
                            return item.title.toLowerCase().indexOf(word.substring(1)) === -1;
                        }
                        return item.title.toLowerCase().indexOf(word) > -1;
                    });
                }
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
                _.each($scope.filterButtonsModel.source, function (value, key) { //key is something like 'camts', value is true or false
                    if (value) {
                        Array.prototype.push.apply(mustContain, $scope.filterButtonsModelMap[key]);
                    }
                });
                if (mustContain.length > 0) {
                    var containsAtLeastOne = _.any(mustContain, function (word) {
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
                _.each($scope.filterButtonsModel.quality, function (value, key) { //key is something like 'q720p', value is true or false
                    anyRequired = anyRequired || value;
                    if (value && item.title.toLowerCase().indexOf(key.substring(1)) > -1) {
                        containsAtLeastOne = true;
                    }
                });
                return !anyRequired || containsAtLeastOne;
            }

            return true;
        }


        var sortPredicateKey = sortModel.column;
        var sortReversed = sortModel.reversed;

        function getSortPredicateValue(containgObject) {
            var sortPredicateValue;
            if (sortPredicateKey === "grabs") {
                if (containgObject["seeders"] !== null) {
                    sortPredicateValue = containgObject["seeders"];
                } else if (containgObject["grabs"] !== null) {
                    sortPredicateValue = containgObject["grabs"];
                } else {
                    sortPredicateValue = 0;
                }
            } else if (sortPredicateKey === "title") {
                sortPredicateValue = getCleanedTitle(containgObject);
            } else if (sortPredicateKey === "indexer") {
                sortPredicateValue = containgObject["indexer"].toLowerCase();
            } else {
                sortPredicateValue = containgObject[sortPredicateKey];
            }
            return sortPredicateValue;
        }

        function createSortedHashgroups(titleGroup) {
            function createHashGroup(hashGroup) {
                //Sorting hash group's contents should not matter for size and age and title but might for category (we might remove this, it's probably mostly unnecessary)
                var sortedHashGroup = _.sortBy(hashGroup, function (item) {
                    var sortPredicateValue = getSortPredicateValue(item);
                    return sortReversed ? -sortPredicateValue : sortPredicateValue;
                });
                //Now sort the hash group by indexer score (inverted) so that the result with the highest indexer score is shown on top (or as the only one of a hash group if it's collapsed)
                sortedHashGroup = _.sortBy(sortedHashGroup, function (item) {
                    return item.indexerscore * -1;
                });
                return sortedHashGroup;
            }

            function getHashGroupFirstElementSortPredicate(hashGroup) {
                if (sortPredicateKey === "title") {
                    //Sorting a title group internally by title doesn't make sense so fall back to sorting by age so that newest result is at the top
                    return ((10000000000 * hashGroup[0]["indexerscore"]) + hashGroup[0]["epoch"]) * -1;
                }
                var sortPredicateValue = getSortPredicateValue(hashGroup[0]);
                return sortPredicateValue;
            }

            var grouped = _.groupBy(titleGroup, "hash");
            var mapped = _.map(grouped, createHashGroup);
            var sorted = _.sortBy(mapped, getHashGroupFirstElementSortPredicate);
            if (sortModel.sortMode === 2 && sortPredicateKey !== "title") {
                sorted = sorted.reverse();
            }

            return sorted;
        }

        function getTitleGroupFirstElementsSortPredicate(titleGroup) {
            var sortPredicateValue;
            if (sortPredicateKey === "grabs" && $scope.foo.sumGrabs) {
                var sumOfGrabs = 0;
                _.each(titleGroup, function (element1) {
                    _.each(element1, function (element2) {
                        sumOfGrabs += getSortPredicateValue(element2);
                    })
                });

                sortPredicateValue = sumOfGrabs;
            } else {
                sortPredicateValue = getSortPredicateValue(titleGroup[0][0]);
            }
            return sortPredicateValue
        }


        var filtered = _.filter(results, filter);
        var newSelected = $scope.selected;
        _.forEach($scope.selected, function (x) {
            if (x === undefined) {
                return;
            }
            if (filtered.indexOf(x) === -1) {
                $scope.$broadcast("toggleSelection", x, false);
                newSelected.splice($scope.selected.indexOf(x), 1);
            }
        });
        $scope.selected = newSelected;

        var grouped = _.groupBy(filtered, getGroupingString);

        var mapped = _.map(grouped, createSortedHashgroups);
        var sorted = _.sortBy(mapped, getTitleGroupFirstElementsSortPredicate);
        if (sortModel.sortMode === 2) {
            sorted = sorted.reverse();
        }

        $scope.lastClickedRowIndex = null;

        var filteredResults = [];
        var countTitleGroups = 0;
        var countResultsUntilTitleGroupLimitReached = 0;
        _.forEach(sorted, function (titleGroup) {
            var titleGroupIndex = 0;
            countTitleGroups++;

            _.forEach(titleGroup, function (duplicateGroup) {
                var duplicateIndex = 0;
                _.forEach(duplicateGroup, function (result) {
                    result.titleGroupIndicator = getGroupingString(result);
                    result.titleGroupIndex = titleGroupIndex;
                    result.duplicateGroupIndex = duplicateIndex;
                    result.duplicatesLength = duplicateGroup.length;
                    result.titlesLength = titleGroup.length;
                    filteredResults.push(result);
                    duplicateIndex += 1;
                    if (countTitleGroups <= $scope.limitTo) {
                        countResultsUntilTitleGroupLimitReached++;
                    }
                });
                titleGroupIndex += 1;

            });
        });
        $scope.limitTo = Math.max($scope.limitTo, countResultsUntilTitleGroupLimitReached);

        $scope.$broadcast("calculateDisplayState");

        return filteredResults;
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
        allSearchResults = uniq(allSearchResults);
        $scope.filteredResults = sortAndFilter(allSearchResults);

        $scope.numberOfAvailableResults = data.numberOfAvailableResults;
        $scope.rejectedReasonsMap = data.rejectedReasonsMap;
        $scope.anyResultsRejected = !_.isEmpty(data.rejectedReasonsMap);
        $scope.anyIndexersSearchedSuccessfully = _.any(data.indexerSearchMetaDatas, function (x) {
            return x.wasSuccessful;
        });
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
        //Only show those categories in filter that are actually present in the results
        $scope.categoriesForFiltering = [];
        var allUsedCategories = _.uniq(_.pluck(allSearchResults, "category"));
        _.forEach(CategoriesService.getWithoutAll(), function (category) {
            if (allUsedCategories.indexOf(category.name) > -1) {
                $scope.categoriesForFiltering.push({label: category.name, id: category.name})
            }
        });
    }

    function uniq(searchResults) {
        var seen = {};
        var out = [];
        var len = searchResults.length;
        var j = 0;
        for (var i = 0; i < len; i++) {
            var item = searchResults[i];
            if (seen[item.searchResultId] !== 1) {
                seen[item.searchResultId] = 1;
                out[j++] = item;
            }
        }
        return out;
    }

    $scope.loadMore = loadMore;

    function loadMore(loadAll) {
        startBlocking(loadAll ? "Loading all results..." : "Loading more results...").then(function () {
            var limit = loadAll ? $scope.numberOfAvailableResults - $scope.numberOfProcessedResults : null;
            SearchService.loadMore($scope.numberOfLoadedResults, limit, loadAll).then(function (data) {
                setDataFromSearchResult(data, allSearchResults);
                //stopBlocking();
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

    $scope.getRejectedReasonsTooltip = function () {
        if (_.isEmpty($scope.rejectedReasonsMap)) {
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

    $scope.$on("checkboxClicked", function (event, originalEvent, rowIndex, newCheckedValue, clickTargetElement) {
        if (originalEvent.shiftKey && $scope.lastClickedRowIndex !== null) {
            $scope.$broadcast("shiftClick", Number($scope.lastClickedRowIndex), Number(rowIndex), Number($scope.lastClickedValue), $scope.lastClickedElement, clickTargetElement);
        }
        $scope.lastClickedRowIndex = rowIndex;
        $scope.lastClickedElement = clickTargetElement;
        $scope.lastClickedValue = newCheckedValue;
    });

    $scope.$on("toggleTitleExpansionUp", function ($event, value, titleGroupIndicator) {
        $scope.$broadcast("toggleTitleExpansionDown", value, titleGroupIndicator);
    });

    $scope.$on("toggleDuplicateExpansionUp", function ($event, value, hash) {
        $scope.$broadcast("toggleDuplicateExpansionDown", value, hash);
    });

    $scope.$on("selectionUp", function ($event, result, value) {
        var index = $scope.selected.indexOf(result);
        if (value && index === -1) {
            $scope.selected.push(result);
        } else if (!value && index > -1) {
            $scope.selected.splice(index, 1);
        }
    });

    $scope.downloadNzbsCallback = function (addedIds) {
        if (addedIds !== null && addedIds.length > 0) {
            growl.info("Removing downloaded NZBs from selection");
            var toRemove = _.filter($scope.selected, function (x) {
                return addedIds.indexOf(Number(x.searchResultId)) > -1;
            });
            var newSelected = $scope.selected;
            _.forEach(toRemove, function (x) {
                $scope.$broadcast("toggleSelection", x, false);
                newSelected.splice($scope.selected.indexOf(x), 1);
            });
            $scope.selected = newSelected;
        }
    };


    $scope.filterRejectedZero = function () {
        return function (entry) {
            return entry[1] > 0;
        }
    };

    $scope.onPageChange = function (newPageNumber, oldPageNumber) {
        _.each($scope.selected, function (x) {
            $scope.$broadcast("toggleSelection", x, true);
        })
    };

    $scope.$on("onFinishRender", function () {
        $scope.doShowResults = true;
        $timeout(function () {
            if ($scope.foo.scrollToResults) {
                var searchResultsElement = angular.element(document.getElementById('display-options'));
                $document.scrollToElement(searchResultsElement, 0, 500);
            }
            stopBlocking();
            SearchService.getModalInstance().close();
        }, 1);
    });

    $timeout(function () {
        DebugService.print();
    }, 3000);

    $timeout(function () {
        function getWatchers(root) {
            root = angular.element(root || document.documentElement);
            var watcherCount = 0;
            var ids = [];

            function getElemWatchers(element, ids) {
                var isolateWatchers = getWatchersFromScope(element.data().$isolateScope, ids);
                var scopeWatchers = getWatchersFromScope(element.data().$scope, ids);
                var watchers = scopeWatchers.concat(isolateWatchers);
                angular.forEach(element.children(), function (childElement) {
                    watchers = watchers.concat(getElemWatchers(angular.element(childElement), ids));
                });
                return watchers;
            }

            function getWatchersFromScope(scope, ids) {
                if (scope) {
                    if (_.indexOf(ids, scope.$id) > -1) {
                        return [];
                    }
                    ids.push(scope.$id);
                    if (scope.$$watchers) {
                        if (scope.$$watchers.length > 1) {
                            var a;
                            a = 1;
                        }
                        return scope.$$watchers;
                    }
                    {
                        return [];
                    }

                } else {
                    return [];
                }
            }

            return getElemWatchers(root, ids);
        }

    }, $scope.limitTo);

}



SearchHistoryService.$inject = ["$filter", "$http"];angular
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
        return $http.post("internalapi/history/searches/forsearching").then(function (response) {
            return {
                searchRequests: response.data
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
        return $http.post("internalapi/history/searches", params).then(function (response) {
            return {
                searchRequests: response.data.content,
                totalRequests: response.data.totalElements
            }
        });
    }

    function formatRequest(request, includeIdLink, includequery, describeEmptySearch, includeTitle) {
        var result = [];
        result.push('<span class="history-title">Category: </span>' + request.categoryName);
        if (includequery && request.query) {
            result.push('<span class="history-title">Query: </span>' + request.query);
        }
        if (request.title && includeTitle) {
            result.push('<span class="history-title">Title: </span>' + request.title);
        } //Only include identifiers if title is unknown
        else if (request.identifiers.length > 0) {
            var href;
            var key;
            var value;
            var identifiers = _.indexBy(request.identifiers, 'identifierKey');
            if ("IMDB" in identifiers) {
                key = "IMDB ID";
                value = identifiers.IMDB.identifierValue;
                href = "https://www.imdb.com/title/tt" + value;
            } else if ("TVDB" in identifiers) {
                key = "TVDB ID";
                value = identifiers.TVDB.identifierValue;
                href = "https://thetvdb.com/?tab=series&id=" + value;
            } else if ("TVRAGE" in identifiers) {
                key = "TVRage ID";
                value = identifiers.TVRAGE.identifierValue;
                href = "internalapi/redirect_rid?rid=" + value;
            } else if ("TMDB" in identifiers) {
                key = "TMDB ID";
                value = identifiers.TMDB.identifierValue;
                href = "https://www.themoviedb.org/movie/" + value;
            }
            href = $filter("dereferer")(href);
            if (includeIdLink) {
                result.push('<span class="history-title">' + key + ': </span><a target="_blank" href="' + href + '">' + value + "</a>");
            } else {
                result.push('<span class="history-title">' + key + ": </span>" + value);
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
        if (result.length === 0 && describeEmptySearch) {
            result = ['<span class="history-title">Empty search</span>'];
        }

        return result.join(", ");

    }

    function getStateParamsForRepeatedSearch(request) {
        var stateParams = {};
        stateParams.mode = "search";
        var availableIdentifiers = _.pluck(request.identifiers, "identifierKey");
        if (availableIdentifiers.indexOf("TMDB") > -1 || availableIdentifiers.indexOf("IMDB") > -1) {
            stateParams.mode = "movie";
        } else if (availableIdentifiers.indexOf("TVRAGE") > -1 || availableIdentifiers.indexOf("TVMAZE") > -1 || availableIdentifiers.indexOf("TVDB") > -1) {
            stateParams.mode = "tvsearch";
        }
        if (request.season) {
            stateParams.season = request.season;
        }
        if (request.episode) {
            stateParams.episode = request.episode;
        }

        _.each(request.identifiers, function (entry) {
            switch (entry.identifierKey) {
                case "TMDB":
                    stateParams.tmdbId = entry.identifierValue;
                    break;
                case "IMDB":
                    stateParams.imdbId = entry.identifierValue;
                    break;
                case "TVMAZE":
                    stateParams.tvmazeId = entry.identifierValue;
                    break;
                case "TVRAGE":
                    stateParams.tvrageId = entry.identifierValue;
                    break;
                case "TVDB":
                    stateParams.tvdbId = entry.identifierValue;
                    break;
            }
        });


        if (request.query !== "") {
            stateParams.query = request.query;
        }

        if (request.title) {
            stateParams.title = request.title;
        }

        if (request.categoryName) {
            stateParams.category = request.categoryName;
        }

        return stateParams;
    }


}

SearchHistoryController.$inject = ["$scope", "$state", "SearchHistoryService", "ConfigService", "history", "$sce", "$filter", "$timeout", "$http", "$uibModal"];angular
    .module('nzbhydraApp')
    .controller('SearchHistoryController', SearchHistoryController);


function SearchHistoryController($scope, $state, SearchHistoryService, ConfigService, history, $sce, $filter, $timeout, $http, $uibModal) {
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
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: 'API'}, {
        label: "Internal",
        value: 'INTERNAL'
    }];

    //Preloaded data
    $scope.searchRequests = history.searchRequests;
    $scope.totalRequests = history.totalRequests;

    var anyUsername = false;
    var anyIp = false;
    for (var request in $scope.searchRequests) {
        if (request.username) {
            anyUsername = true;
        }
        if (request.ip) {
            anyIp = true;
        }
        if (anyIp && anyUsername) {
            break;
        }
    }
    $scope.columnSizes = {
        time: 10,
        query: 30,
        category: 10,
        additionalParameters: 22,
        source: 8,
        username: 10,
        ip: 10
    };
    if (ConfigService.getSafe().logging.historyUserInfoType === "NONE" || (!anyUsername && !anyIp)) {
        $scope.columnSizes.username = 0;
        $scope.columnSizes.ip = 0;
        $scope.columnSizes.query += 10;
        $scope.columnSizes.additionalParameters += 10;
    } else if (ConfigService.getSafe().logging.historyUserInfoType === "IP") {
        $scope.columnSizes.username = 0;
        $scope.columnSizes.query += 5;
        $scope.columnSizes.additionalParameters += 5;
    } else if (ConfigService.getSafe().logging.historyUserInfoType === "USERNAME") {
        $scope.columnSizes.ip = 0;
        $scope.columnSizes.query += 5;
        $scope.columnSizes.additionalParameters += 5;
    }

    $scope.update = function () {
        SearchHistoryService.getSearchHistory($scope.pagination.current, $scope.limit, $scope.filterModel, sortModel).then(function (history) {
            $scope.searchRequests = history.searchRequests;
            $scope.totalRequests = history.totalRequests;
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


    $scope.openSearch = function (request) {
        $state.go("root.search", SearchHistoryService.getStateParamsForRepeatedSearch(request), {
            inherit: false,
            notify: true,
            reload: true
        });
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
                href = ("https://www.imdb.com/title/tt" + pair.identifierValue).replace("tttt", "tt");
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
        return $sce.trustAsHtml(result.join(", "));
    };

    $scope.showDetails = function (searchId) {

        ModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "$http", "searchId"];
        function ModalInstanceCtrl($scope, $uibModalInstance, $http, searchId) {
            $http.get("internalapi/history/searches/details/" + searchId).then(function (response) {
                $scope.details = response.data;
            });
        }

        $uibModal.open({
            templateUrl: 'static/html/search-history-details-modal.html',
            controller: ModalInstanceCtrl,
            size: "md",
            resolve: {
                searchId: function () {
                    return searchId;
                }
            }
        });


    }

}



SearchController.$inject = ["$scope", "$http", "$stateParams", "$state", "$uibModal", "$timeout", "$sce", "growl", "SearchService", "focus", "ConfigService", "HydraAuthService", "CategoriesService", "$element", "SearchHistoryService"];
SearchUpdateModalInstanceCtrl.$inject = ["$scope", "$interval", "SearchService", "$uibModalInstance", "searchRequestId", "onCancel"];angular
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
    var epochEnter;

    //Fill the form with the search values we got from the state params (so that their values are the same as in the current url)
    $scope.mode = $stateParams.mode;
    $scope.query = "";
    $scope.selectedItem = null;
    $scope.categories = _.filter(CategoriesService.getAllCategories(), function (c) {
        return c.mayBeSelected && !(c.ignoreResultsFrom === "INTERNAL" || c.ignoreResultsFrom === "BOTH");
    });
    if (angular.isDefined($stateParams.category) && $stateParams.category) {
        $scope.category = CategoriesService.getByName($stateParams.category);
    } else {
        $scope.category = CategoriesService.getDefault();
    }
    $scope.category = (_.isUndefined($stateParams.category) || $stateParams.category === "") ? CategoriesService.getDefault() : CategoriesService.getByName($stateParams.category);
    $scope.season = $stateParams.season;
    $scope.episode = $stateParams.episode;
    $scope.query = $stateParams.query;
    $scope.minsize = getNumberOrUndefined($stateParams.minsize);
    $scope.maxsize = getNumberOrUndefined($stateParams.maxsize);
    $scope.minage = getNumberOrUndefined($stateParams.minage);
    $scope.maxage = getNumberOrUndefined($stateParams.maxage);
    if (angular.isDefined($stateParams.indexers)) {
        $scope.indexers = decodeURIComponent($stateParams.indexers).split(",");
    }
    if (angular.isDefined($stateParams.title) || (angular.isDefined($stateParams.tmdbId) || angular.isDefined($stateParams.imdbId) || angular.isDefined($stateParams.tvmazeId) || angular.isDefined($stateParams.rid) || angular.isDefined($stateParams.tvdbId))) {
        $scope.selectedItem = {
            tmdbId: $stateParams.tmdbId,
            imdbId: $stateParams.imdbId,
            tvmazeId: $stateParams.tvmazeId,
            rid: $stateParams.rid,
            tvdbId: $stateParams.tvdbId,
            title: $stateParams.title
        }
    }

    $scope.showIndexers = {};

    $scope.searchHistory = [];

    var safeConfig = ConfigService.getSafe();
    $scope.showIndexerSelection = HydraAuthService.getUserInfos().showIndexerSelection;


    $scope.typeAheadWait = 300;

    $scope.autocompleteLoading = false;
    $scope.isAskById = $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";
    $scope.isById = {value: $scope.selectedItem !== null || angular.isUndefined($scope.mode) || $scope.mode === null}; //If true the user wants to search by id so we enable autosearch. Was unable to achieve this using a simple boolean. Set to false if last search was not by ID
    $scope.availableIndexers = [];
    $scope.selectedIndexers = [];
    $scope.autocompleteClass = "autocompletePosterMovies";

    $scope.toggleCategory = function (searchCategory) {
        var oldCategory = $scope.category;
        $scope.category = searchCategory;

        //Show checkbox to ask if the user wants to search by ID (using autocomplete)
        if ($scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE") {
            $scope.isAskById = true;
            $scope.isById.value = true;
        } else {
            $scope.isAskById = false;
            $scope.isById.value = false;
        }

        if (oldCategory.searchType !== searchCategory.searchType) {
            $scope.selectedItem = null;
        }

        focus('searchfield');

        //Hacky way of triggering the autocomplete loading
        var searchModel = $element.find("#searchfield").controller("ngModel");
        if (angular.isDefined(searchModel.$viewValue)) {
            searchModel.$setViewValue(searchModel.$viewValue + " ");
        }

        if (safeConfig.categoriesConfig.enableCategorySizes) {
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
        if (!$scope.isById.value || $scope.selectedItem) {
            return {};
        }

        if ($scope.category.searchType === "MOVIE") {
            return $http.get('internalapi/autocomplete/MOVIE/', {params: {input: val}}).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else if ($scope.category.searchType === "TVSEARCH") {
            return $http.get('internalapi/autocomplete/TV/', {params: {input: val}}).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else {
            return {};
        }
    };

    $scope.onTypeAheadEnter = function () {
        if (angular.isDefined(epochEnter)) {
            //Very hacky way of preventing a press of "enter" to select an autocomplete item from triggering a search
            //This is called *after* selectAutoComplete() is called
            var epochEnterNow = (new Date).getTime();
            var diff = epochEnterNow - epochEnter;
            if (diff > 50) {
                $scope.initiateSearch();
            }
        } else {
            $scope.initiateSearch();
        }
    };

    $scope.onTypeAheadKeyDown = function (event) {
        if (event.keyCode === 8) {
            if ($scope.query === "") {
                $scope.clearAutocomplete();
            }
        }
    };

    //Is called when the search page is opened with params, either because the user initiated the search (which triggered a goTo to this page) or because a search URL was entered
    $scope.startSearch = function () {
        // console.time("searchonly");
        // console.time("searchall");
        isSearchCancelled = false;
        searchRequestId = Math.round(Math.random() * 999999);
        var modalInstance = $scope.openModal(searchRequestId);

        var indexers = angular.isUndefined($scope.indexers) ? undefined : $scope.indexers.join(",");
        SearchService.search(searchRequestId, $scope.category.name, $scope.query, $scope.selectedItem, $scope.season, $scope.episode, $scope.minsize, $scope.maxsize, $scope.minage, $scope.maxage, indexers, $scope.mode).then(function () {
                //modalInstance.close();
                SearchService.setModalInstance(modalInstance);
                if (!isSearchCancelled) {
                    $state.go("root.search.results", {
                        minsize: $scope.minsize,
                        maxsize: $scope.maxsize,
                        minage: $scope.minage,
                        maxage: $scope.maxage
                    }, {
                        inherit: true
                    });
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
        stateParams.imdbId = $scope.selectedItem === null ? null : $scope.selectedItem.imdbId;
        stateParams.tmdbId = $scope.selectedItem === null ? null : $scope.selectedItem.tmdbId;
        stateParams.tvdbId = $scope.selectedItem === null ? null : $scope.selectedItem.tvdbId;
        stateParams.tvrageId = $scope.selectedItem === null ? null : $scope.selectedItem.tvrageId;
        stateParams.tvmazeId = $scope.selectedItem === null ? null : $scope.selectedItem.tvmazeId;
        stateParams.title = $scope.selectedItem === null ? null : $scope.selectedItem.title;
        stateParams.season = $scope.season;
        stateParams.episode = $scope.episode;
        stateParams.query = $scope.query;
        stateParams.minsize = $scope.minsize;
        stateParams.maxsize = $scope.maxsize;
        stateParams.minage = $scope.minage;
        stateParams.maxage = $scope.maxage;
        stateParams.category = $scope.category.name;
        stateParams.indexers = encodeURIComponent($scope.selectedIndexers.join(","));
        $state.go("root.search", stateParams, {inherit: false, notify: true, reload: true});
    };

    $scope.repeatSearch = function (request) {
        var stateParams = SearchHistoryService.getStateParamsForRepeatedSearch(request);
        stateParams.indexers = encodeURIComponent($scope.selectedIndexers.join(","));
        $state.go("root.search", stateParams, {inherit: false, notify: true, reload: true});
    };

    $scope.searchBoxTooltip = "Prefix terms with -- to exclude'";
    $scope.$watchGroup(['isAskById', 'selectedItem'], function () {
        if (!$scope.isAskById) {
            $scope.searchBoxTooltip = "Prefix terms with -- to exclude";
        } else if ($scope.selectedItem === null) {
            $scope.searchBoxTooltip = "Enter search terms for autocomplete";
        } else {
            $scope.searchBoxTooltip = "Enter additional search terms to limit the query";
        }
    });

    $scope.clearAutocomplete = function () {
        $scope.selectedItem = null;
        $scope.query = ""; //Input is now for autocomplete and not for limiting the results
        focus('searchfield');
    };

    function calculateWidth(text) {
        var canvas = calculateWidth.canvas || (calculateWidth.canvas = document.createElement("canvas"));
        var context = canvas.getContext("2d");
        context.font = "13px Roboto";
        return context.measureText(text).width;
    }

    $scope.selectAutocompleteItem = function ($item) {
        $scope.selectedItem = $item;
        $scope.query = "";
        epochEnter = (new Date).getTime();
        var width = calculateWidth($item.title) + 30;
        $scope.selectedItemWidth = width + "px";
    };

    $scope.initiateSearch = function () {
        if ($scope.selectedIndexers.length === 0) {
            growl.error("You didn't select any indexers");
            return;
        }
        if ($scope.selectedItem) {
            //Movie or tv show was selected
            $scope.goToSearchUrl();
        } else {
            //Simple query search
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
            if (!indexer.showOnSearch) {
                return false;
            }
            var categorySelectedForIndexer = (angular.isUndefined(indexer.categories) || indexer.categories.length === 0 || $scope.category.name.toLowerCase() === "all" || indexer.categories.indexOf($scope.category.name) > -1);
            return categorySelectedForIndexer;
        }).sortBy(function (indexer) {
            return indexer.name.toLowerCase();
        })
            .map(function (indexer) {
                return {
                    name: indexer.name,
                    activated: isIndexerPreselected(indexer),
                    preselect: indexer.preselect,
                    categories: indexer.categories,
                    searchModuleType: indexer.searchModuleType
                };
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


    $scope.formatRequest = function (request) {
        return $sce.trustAsHtml(SearchHistoryService.formatRequest(request, false, true, true, true));
    };

    $scope.availableIndexers = getAvailableIndexers();

    function getAndSetSearchRequests() {
        SearchHistoryService.getSearchHistoryForSearching().then(function (response) {
            $scope.searchHistory = response.searchRequests;
        });
    }

    if ($scope.mode) {
        $scope.startSearch();
    } else {
        //Getting the search history only makes sense when we're not currently searching
        _.defer(getAndSetSearchRequests);
    }

    $scope.$on("searchResultsShown", function () {
        _.defer(getAndSetSearchRequests); //Defer because otherwise the results are only shown when this returns which may take a while with big databases
    });
}

angular
    .module('nzbhydraApp')
    .controller('SearchUpdateModalInstanceCtrl', SearchUpdateModalInstanceCtrl);

function SearchUpdateModalInstanceCtrl($scope, $interval, SearchService, $uibModalInstance, searchRequestId, onCancel) {

    var updateSearchMessagesInterval = undefined;
    var loggedSearchFinished = false;
    $scope.messages = [];
    $scope.indexerSelectionFinished = false;
    $scope.indexersSelected = 0;
    $scope.indexersFinished = 0;

    updateSearchMessagesInterval = $interval(function () {
        SearchService.getSearchState(searchRequestId).then(function (response) {
                $scope.indexerSelectionFinished = response.data.indexerSelectionFinished;
                $scope.searchFinished = response.data.searchFinished;
                $scope.indexersSelected = response.data.indexersSelected;
                $scope.indexersFinished = response.data.indexersFinished;
                $scope.progressMax = response.data.indexersSelected;
                if ($scope.progressMax > response.data.indexersSelected) {
                    $scope.progressMax = ">=" + response.data.indexersSelected;
                }
                if (response.data.messages) {
                    $scope.messages = response.data.messages;
                }
                if ($scope.searchFinished && !loggedSearchFinished) {
                    $scope.messages.push("Finished searching. Preparing results...");
                    loggedSearchFinished = true;
                }
            },
            function () {
                $interval.cancel(updateSearchMessagesInterval);
            }
        );
    }, 100);

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


RestartService.$inject = ["growl", "NzbHydraControlService", "$uibModal"];
RestartModalInstanceCtrl.$inject = ["$scope", "$timeout", "$http", "$window", "RequestsErrorHandler", "message", "baseUrl"];angular
    .module('nzbhydraApp')
    .factory('RestartService', RestartService);

function RestartService(growl, NzbHydraControlService, $uibModal) {

    return {
        restart: restart,
        startCountdown: startCountdown
    };

    function restart(message) {
        NzbHydraControlService.restart().then(function (response) {
            startCountdown(message, response.data.message);
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

angular
    .module('nzbhydraApp')
    .controller('RestartModalInstanceCtrl', RestartModalInstanceCtrl);

function RestartModalInstanceCtrl($scope, $timeout, $http, $window, RequestsErrorHandler, message, baseUrl) {

    message = (angular.isDefined(message) ? message : "");
    $scope.message = message + "Will reload page when NZBHydra is back";
    $scope.baseUrl = baseUrl;
    $scope.pingUrl = angular.isDefined(baseUrl) ? (baseUrl + "/internalapi/control/ping") : "internalapi/control/ping";

    $scope.internalCaR = function (message, timer) {
        if (timer === 45) {
            $scope.message = message + " Restarting takes longer than expected. You might want to check the log to see what's going on.";
        } else {
            $scope.message = message + " Will reload page when NZBHydra is back.";
            $timeout(function () {
                RequestsErrorHandler.specificallyHandled(function () {
                    $http.get($scope.pingUrl, {ignoreLoadingBar: true}).then(
                        function () {
                            $timeout(function () {
                                $scope.message = "Reloading page...";
                                if (angular.isDefined($scope.baseUrl)) {
                                    $window.location.href = $scope.baseUrl;
                                } else {
                                    $window.location.reload();
                                }
                            }, 2000); //Give Hydra some time to load in the background, it might return the ping but not be completely up yet
                        }, function () {
                            $scope.internalCaR(message, timer + 1);
                        });
                });
            }, 1000);
            $scope.message = message + " Will reload page when NZBHydra is back.";
        }
    };

    //Wait three seconds because otherwise the currently running instance will be found
    $timeout(function () {
        $scope.internalCaR(message, 0);
    }, 3000)
}

NzbHydraControlService.$inject = ["$http"];angular
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


NzbDownloadService.$inject = ["$http", "ConfigService", "DownloaderCategoriesService"];angular
    .module('nzbhydraApp')
    .factory('NzbDownloadService', NzbDownloadService);

function NzbDownloadService($http, ConfigService, DownloaderCategoriesService) {

    var service = {
        download: download,
        getEnabledDownloaders: getEnabledDownloaders
    };

    return service;

    function sendNzbAddCommand(downloader, searchResults, category) {
        var params = {
            downloaderName: downloader.name,
            searchResults: searchResults,
            category: category
        };
        return $http.put("internalapi/downloader/addNzbs", params);
    }

    function download(downloader, searchResults, alwaysAsk) {
        var category = downloader.defaultCategory;
        if (alwaysAsk || ((_.isUndefined(category) || category === "" || category === null) && category !== "Use original category") && category !== "Use mapped category") {
            return DownloaderCategoriesService.openCategorySelection(downloader).then(function (category) {
                return sendNzbAddCommand(downloader, searchResults, category);
            }, function (result) {
                return result;
            });
        } else {
            return sendNzbAddCommand(downloader, searchResults, category)
        }
    }

    function getEnabledDownloaders() {
        return _.filter(ConfigService.getSafe().downloading.downloaders, "enabled");
    }
}



ModalService.$inject = ["$uibModal"];
ModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "headline", "message", "params", "textAlign"];angular
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

MigrationService.$inject = ["$uibModal"];
MigrationModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "$interval", "$http", "blockUI", "ModalService"];angular
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

angular
    .module('nzbhydraApp')
    .controller('MigrationModalInstanceCtrl', MigrationModalInstanceCtrl);

function MigrationModalInstanceCtrl($scope, $uibModalInstance, $interval, $http, blockUI, ModalService) {

    $scope.baseUrl = "http://127.0.0.1:5075";

    $scope.foo = {isMigrating: false, baseUrl: $scope.baseUrl};
    $scope.doMigrateDatabase = true;

    $scope.yes = function () {
        var params;
        var url;
        if ($scope.foo.baseUrl && $scope.foo.isFileBasedOpen) {
            $scope.foo.baseUrl = null;
        }


        if ($scope.foo.isUrlBasedOpen) {
            url = "internalapi/migration/url";
            params = {baseurl: $scope.foo.baseUrl, doMigrateDatabase: $scope.doMigrateDatabase};
            if (!params.baseurl) {
                $scope.foo.isMigrating = false;
                ModalService.open("Requirements not met", "You did not enter a URL", {
                    yes: {
                        text: "OK"
                    }
                });
                return;
            }
        } else {
            url = "internalapi/migration/files";
            params = {
                settingsCfgFile: $scope.foo.settingsCfgFile,
                dbFile: $scope.foo.nzbhydraDbFile,
                doMigrateDatabase: $scope.doMigrateDatabase
            };
            if (!params.settingsCfgFile || (!params.dbFile && params.doMigrateDatabase)) {
                $scope.foo.isMigrating = false;
                ModalService.open("Requirements not met", "You did not enter all required valued", {
                    yes: {
                        text: "OK"
                    }
                });
                return;
            }
        }

        $scope.foo.isMigrating = true;

        var updateMigrationMessagesInterval = $interval(function () {
            $http.get("internalapi/migration/messages").then(function (response) {
                    $scope.foo.messages = response.data;
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
                                RestartService.restart();
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
            }, function (response) {
                $interval.cancel(updateMigrationMessagesInterval);
                $scope.foo.isMigrating = false;
                $scope.foo.messages = [response.data.message];
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


LoginController.$inject = ["$scope", "RequestsErrorHandler", "$state", "HydraAuthService", "growl"];angular
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


IndexerStatusesController.$inject = ["$scope", "$http", "statuses"];
formatDate.$inject = ["dateFilter"];angular
    .module('nzbhydraApp')
    .controller('IndexerStatusesController', IndexerStatusesController);

function IndexerStatusesController($scope, $http, statuses) {
    $scope.statuses = statuses.data;

    $scope.formatState = function (state) {
        if (state === "ENABLED") {
            return "Enabled";
        } else if (state === "DISABLED_SYSTEM_TEMPORARY") {
            return "Temporarily disabled by system";
        } else if (state === "DISABLED_SYSTEM") {
            return "Disabled by system";
        } else {
            return "Disabled by user";
        }
    };

    $scope.getLabelClass = function (state) {
        if (state === "ENABLED") {
            return "primary";
        } else if (state === "DISABLED_SYSTEM_TEMPORARY") {
            return "warning";
        } else if (state === "DISABLED_SYSTEM") {
            return "danger";
        } else {
            return "default";
        }
    };

    $scope.isInPast = function (epochSeconds) {
        return epochSeconds < moment().unix();
    };
}

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

angular
    .module('nzbhydraApp')
    .filter('reformatDate', reformatDate);

function reformatDate() {
    return function (date, format) {
        if (!date) {
            return "";
        }
        if (angular.isUndefined(format)) {
            format = "YYYY-MM-DD HH:mm";
        }
        //Date in database is saved as UTC without timezone information
        return moment.unix(date).local().format(format);
    }
}

angular
    .module('nzbhydraApp')
    .filter('reformatDateSeconds', reformatDateSeconds);

function reformatDateSeconds() {
    return function (date, format) {
        return moment.unix(date).local().format("YYYY-MM-DD HH:mm:ss");
    }
}


angular
    .module('nzbhydraApp')
    .filter('humanizeDate', humanizeDate);

function humanizeDate() {
    return function (date) {
        return moment().to(moment.unix(date));
    }
}

IndexController.$inject = ["$scope", "$http", "$stateParams", "$state"];angular
    .module('nzbhydraApp')
    .controller('IndexController', IndexController);

function IndexController($scope, $http, $stateParams, $state) {

    $state.go("root.search");
}


HydraAuthService.$inject = ["$q", "$rootScope", "$http", "bootstrapped", "$httpParamSerializerJQLike", "$state"];angular
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
        return {
            maySeeStats: userInfos.maySeeStats,
            maySeeAdmin: userInfos.maySeeAdmin,
            maySeeSearch: userInfos.maySeeSearch
        };
    }

    function getUserName() {
        return bootstrapped.username;
    }


}

HeaderController.$inject = ["$scope", "$state", "growl", "HydraAuthService", "bootstrapped"];angular
    .module('nzbhydraApp')
    .controller('HeaderController', HeaderController);

function HeaderController($scope, $state, growl, HydraAuthService, bootstrapped) {


    $scope.showLoginout = false;
    $scope.oldUserName = null;
    $scope.bootstrapped = bootstrapped;

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

    };
}

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

//
GenericStorageService.$inject = ["$http"];
angular
    .module('nzbhydraApp')
    .factory('GenericStorageService', GenericStorageService);

function GenericStorageService($http) {

    return {
        get: get,
        put: put
    };

    function get(key, forUser) {
        return $http.get("internalapi/genericstorage/" + key, {params: {forUser: forUser}});
    }

    function put(key, forUser, value) {
        return $http.put("internalapi/genericstorage/" + key, value, {params: {forUser: forUser}});
    }


}
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
var filters = angular.module('filters', []);

filters.filter('bytes', function () {
    return function (bytes) {
        return filesize(bytes);
    }
});

filters
    .filter('unsafe', ['$sce', function ($sce) {
        return function (text) {
            return $sce.trustAsHtml(text);
        };
    }]);



FileSelectionService.$inject = ["$http", "$q", "$uibModal"];angular
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
                    return $http.post("internalapi/config/folderlisting", {
                        fullPath: angular.isDefined(fullPath) ? fullPath : null,
                        goUp: false,
                        type: type
                    });
                },
                type: function () {
                    return type;
                }
            }
        });

        instance.result.then(function (selection) {
                deferred.resolve(selection);
            }, function () {
                deferred.reject("dismissed");
            }
        );
        deferred = $q.defer();
        return deferred.promise;
    }

}

angular
    .module('nzbhydraApp').controller('FileSelectionModalController', ["$scope", "$http", "$uibModalInstance", "FileSelectionService", "data", "type", function ($scope, $http, $uibModalInstance, FileSelectionService, data, type) {

    $scope.type = type;
    $scope.showType = type === "file" ? "File" : "Folder";
    $scope.data = data.data;

    $scope.select = function (fileOrFolder, selectType) {
        if (selectType === "file" && type === "file") {
            $uibModalInstance.close(fileOrFolder.fullPath);
        } else if (selectType === "folder") {
            $http.post("internalapi/config/folderlisting", {
                fullPath: fileOrFolder.fullPath,
                type: type,
                goUp: false
            }).then(function (data) {
                $scope.data = data.data;
            })
        }
    };

    $scope.goUp = function () {
        $http.post("internalapi/config/folderlisting", {
            fullPath: $scope.data.fullPath,
            type: type,
            goUp: true
        }).then(function (data) {
            $scope.data = data.data;
        })
    };

    $scope.submit = function () {
        $uibModalInstance.close($scope.data.fullPath);
    }

}]);

FileDownloadService.$inject = ["$http", "growl"];angular
    .module('nzbhydraApp')
    .factory('FileDownloadService', FileDownloadService);

function FileDownloadService($http, growl) {

    var service = {
        downloadFile: downloadFile
    };

    return service;

    function downloadFile(link, filename, method, data) {
        return $http({
            method: method,
            url: link,
            data: data,
            responseType: 'arraybuffer'
        }).then(function (response, status, headers, config) {
            var a = document.createElement('a');
            var blob = new Blob([response.data], {'type': "application/octet-stream"});
            a.href = URL.createObjectURL(blob);
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, function (data, status, headers, config) {
            growl.error(status);
        });

    }


}



DownloaderCategoriesService.$inject = ["$http", "$q", "$uibModal"];angular
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
            if (downloader.name in categories) {
                var deferred = $q.defer();
                deferred.resolve(categories[downloader.name]);
                return deferred.promise;
            }

            return $http.get(encodeURI('internalapi/downloader/' + downloader.name + "/categories"))
                .then(function (categoriesResponse) {
                    categories[downloader.name] = categoriesResponse.data;
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

        instance.result.then(function () {
            }, function () {
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
        categories = {};
    }
}

angular
    .module('nzbhydraApp').controller('DownloaderCategorySelectionController', ["$scope", "$uibModalInstance", "DownloaderCategoriesService", "categories", function ($scope, $uibModalInstance, DownloaderCategoriesService, categories) {

    $scope.categories = categories;
    $scope.select = function (category) {
        DownloaderCategoriesService.select(category);
        $uibModalInstance.close($scope);
    }
}]);

DownloadHistoryController.$inject = ["$scope", "StatsService", "downloads", "ConfigService", "$timeout", "$sce"];angular
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
    $scope.statusesForFiltering = [
        {label: "None", id: 'NONE'},
        {label: "Requested", id: 'REQUESTED'},
        {label: "Internal error", id: 'INTERNAL_ERROR'},
        {label: "NZB downloaded successful", id: 'NZB_DOWNLOAD_SUCCESSFUL'},
        {label: "NZB download error", id: 'NZB_DOWNLOAD_ERROR'},
        {label: "NZB added", id: 'NZB_ADDED'},
        {label: "NZB not added", id: 'NZB_NOT_ADDED'},
        {label: "NZB add error", id: 'NZB_ADD_ERROR'},
        {label: "NZB add rejected", id: 'NZB_ADD_REJECTED'},
        {label: "Content download successful", id: 'CONTENT_DOWNLOAD_SUCCESSFUL'},
        {label: "Content download warning", id: 'CONTENT_DOWNLOAD_WARNING'},
        {label: "Content download error", id: 'CONTENT_DOWNLOAD_ERROR'}
    ];
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: 'API'}, {
        label: "Internal",
        value: 'INTERNAL'
    }];

    //Preloaded data
    $scope.nzbDownloads = downloads.nzbDownloads;
    $scope.totalDownloads = downloads.totalDownloads;

    $scope.columnSizes = {
        time: 10,
        indexer: 10,
        title: 37,
        result: 9,
        source: 8,
        age: 6,
        username: 10,
        ip: 10
    };
    var anyUsername = false;
    var anyIp = false;
    for (var download in $scope.nzbDownloads) {
        if (download.username) {
            anyUsername = true;
        }
        if (download.ip) {
            anyIp = true;
        }
        if (anyIp && anyUsername) {
            break;
        }
    }

    if (ConfigService.getSafe().logging.historyUserInfoType === "NONE" || (!anyUsername && !anyIp)) {
        $scope.columnSizes.username = 0;
        $scope.columnSizes.ip = 0;
        $scope.columnSizes.title += 20;
    } else if (ConfigService.getSafe().logging.historyUserInfoType === "IP") {
        $scope.columnSizes.username = 0;
        $scope.columnSizes.title += 10;
    } else if (ConfigService.getSafe().logging.historyUserInfoType === "USERNAME") {
        $scope.columnSizes.ip = 0;
        $scope.columnSizes.title += 10;
    }


    $scope.update = function () {
        StatsService.getDownloadHistory($scope.pagination.current, $scope.limit, $scope.filterModel, sortModel).then(function (downloads) {
            $scope.nzbDownloads = downloads.nzbDownloads;
            $scope.totalDownloads = downloads.totalDownloads;
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

angular
    .module('nzbhydraApp')
    .filter('reformatDateEpoch', reformatDateEpoch);

function reformatDateEpoch() {
    return function (date) {
        return moment.unix(date).local().format("YYYY-MM-DD HH:mm");

    }
}

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

DebugService.$inject = ["$filter"];
angular
    .module('nzbhydraApp')
    .factory('DebugService', DebugService);

function DebugService($filter) {

    var debug = {};

    return {
        log: log,
        print: print
    };

    function log(name) {
        if (!(name in debug)) {
            debug[name] = {first: new Date().getTime(), last: new Date().getTime()};
        } else {
            debug[name]["last"] = new Date().getTime();
        }
    }

    function print() {
         //Re-enable if necessary
        // for (var key in debug) {
        //     if (debug.hasOwnProperty(key)) {
        //         console.log("First " + key + ": " + $filter("date")(new Date(debug[key]["first"]), "h:mm:ss:sss"));
        //         console.log("Last " + key + ": " + $filter("date")(new Date(debug[key]["last"]), "h:mm:ss:sss"));
        //         console.log("Diff: " + (debug[key]["last"] - debug[key]["first"]));
        //     }
        // }
    }


}

CategoriesService.$inject = ["ConfigService"];angular
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
        for (var cat in ConfigService.getSafe().categoriesConfig.categories) {
            var category = ConfigService.getSafe().categoriesConfig.categories[cat];
            if (category.name === name) {
                return category;
            }
        }
    }

    function getAllCategories() {
        return ConfigService.getSafe().categoriesConfig.categories;
    }

    function getWithoutAll() {
        var cats = ConfigService.getSafe().categoriesConfig.categories;
        return cats.slice(1, cats.length);
    }

    function getDefault() {
        return getByName(ConfigService.getSafe().categoriesConfig.defaultCategory);
    }

}

BackupService.$inject = ["$http"];angular
    .module('nzbhydraApp')
    .factory('BackupService', BackupService);

function BackupService($http) {

    return {
        getBackupsList: getBackupsList,
        restoreFromFile: restoreFromFile
    };


    function getBackupsList() {
        return $http.get('internalapi/backup/list').then(function (response) {
            return response.data;
        });
    }

    function restoreFromFile(filename) {
        return $http.get('internalapi/backup/restore', {params: {filename: filename}}).then(function (response) {
            return response;
        });
    }

}
//Copied from https://github.com/oblador/angular-scroll because installing it via bower caused errors
var duScrollDefaultEasing = function (x) {


    if (x < 0.5) {
        return Math.pow(x * 2, 2) / 2;
    }
    return 1 - Math.pow((1 - x) * 2, 2) / 2;
};

var duScroll = angular.module('duScroll', [
    'duScroll.scrollspy',
    'duScroll.smoothScroll',
    'duScroll.scrollContainer',
    'duScroll.spyContext',
    'duScroll.scrollHelpers'
])
//Default animation duration for smoothScroll directive
    .value('duScrollDuration', 350)
    //Scrollspy debounce interval, set to 0 to disable
    .value('duScrollSpyWait', 100)
    //Scrollspy forced refresh interval, use if your content changes or reflows without scrolling.
    //0 to disable
    .value('duScrollSpyRefreshInterval', 0)
    //Wether or not multiple scrollspies can be active at once
    .value('duScrollGreedy', false)
    //Default offset for smoothScroll directive
    .value('duScrollOffset', 0)
    //Default easing function for scroll animation
    .value('duScrollEasing', duScrollDefaultEasing)
    //Which events on the container (such as body) should cancel scroll animations
    .value('duScrollCancelOnEvents', 'scroll mousedown mousewheel touchmove keydown')
    //Whether or not to activate the last scrollspy, when page/container bottom is reached
    .value('duScrollBottomSpy', false)
    //Active class name
    .value('duScrollActiveClass', 'active');

if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = duScroll;
}


angular.module('duScroll.scrollHelpers', ['duScroll.requestAnimation'])
    .run(["$window", "$q", "cancelAnimation", "requestAnimation", "duScrollEasing", "duScrollDuration", "duScrollOffset", "duScrollCancelOnEvents", function ($window, $q, cancelAnimation, requestAnimation, duScrollEasing, duScrollDuration, duScrollOffset, duScrollCancelOnEvents) {
        'use strict';

        var proto = {};

        var isDocument = function (el) {
            return (typeof HTMLDocument !== 'undefined' && el instanceof HTMLDocument) || (el.nodeType && el.nodeType === el.DOCUMENT_NODE);
        };

        var isElement = function (el) {
            return (typeof HTMLElement !== 'undefined' && el instanceof HTMLElement) || (el.nodeType && el.nodeType === el.ELEMENT_NODE);
        };

        var unwrap = function (el) {
            return isElement(el) || isDocument(el) ? el : el[0];
        };

        proto.duScrollTo = function (left, top, duration, easing) {
            var aliasFn;
            if (angular.isElement(left)) {
                aliasFn = this.duScrollToElement;
            } else if (angular.isDefined(duration)) {
                aliasFn = this.duScrollToAnimated;
            }
            if (aliasFn) {
                return aliasFn.apply(this, arguments);
            }
            var el = unwrap(this);
            if (isDocument(el)) {
                return $window.scrollTo(left, top);
            }
            el.scrollLeft = left;
            el.scrollTop = top;
        };

        var scrollAnimation, deferred;
        proto.duScrollToAnimated = function (left, top, duration, easing) {
            if (duration && !easing) {
                easing = duScrollEasing;
            }
            var startLeft = this.duScrollLeft(),
                startTop = this.duScrollTop(),
                deltaLeft = Math.round(left - startLeft),
                deltaTop = Math.round(top - startTop);

            var startTime = null, progress = 0;
            var el = this;

            var cancelScrollAnimation = function ($event) {
                if (!$event || (progress && $event.which > 0)) {
                    if (duScrollCancelOnEvents) {
                        el.unbind(duScrollCancelOnEvents, cancelScrollAnimation);
                    }
                    cancelAnimation(scrollAnimation);
                    deferred.reject();
                    scrollAnimation = null;
                }
            };

            if (scrollAnimation) {
                cancelScrollAnimation();
            }
            deferred = $q.defer();

            if (duration === 0 || (!deltaLeft && !deltaTop)) {
                if (duration === 0) {
                    el.duScrollTo(left, top);
                }
                deferred.resolve();
                return deferred.promise;
            }

            var animationStep = function (timestamp) {
                if (startTime === null) {
                    startTime = timestamp;
                }

                progress = timestamp - startTime;
                var percent = (progress >= duration ? 1 : easing(progress / duration));

                el.scrollTo(
                    startLeft + Math.ceil(deltaLeft * percent),
                    startTop + Math.ceil(deltaTop * percent)
                );
                if (percent < 1) {
                    scrollAnimation = requestAnimation(animationStep);
                } else {
                    if (duScrollCancelOnEvents) {
                        el.unbind(duScrollCancelOnEvents, cancelScrollAnimation);
                    }
                    scrollAnimation = null;
                    deferred.resolve();
                }
            };

            //Fix random mobile safari bug when scrolling to top by hitting status bar
            el.duScrollTo(startLeft, startTop);

            if (duScrollCancelOnEvents) {
                el.bind(duScrollCancelOnEvents, cancelScrollAnimation);
            }

            scrollAnimation = requestAnimation(animationStep);
            return deferred.promise;
        };

        proto.duScrollToElement = function (target, offset, duration, easing) {
            var el = unwrap(this);
            if (!angular.isNumber(offset) || isNaN(offset)) {
                offset = duScrollOffset;
            }
            var top = this.duScrollTop() + unwrap(target).getBoundingClientRect().top - offset;
            if (isElement(el)) {
                top -= el.getBoundingClientRect().top;
            }
            return this.duScrollTo(0, top, duration, easing);
        };

        proto.duScrollLeft = function (value, duration, easing) {
            if (angular.isNumber(value)) {
                return this.duScrollTo(value, this.duScrollTop(), duration, easing);
            }
            var el = unwrap(this);
            if (isDocument(el)) {
                return $window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft;
            }
            return el.scrollLeft;
        };
        proto.duScrollTop = function (value, duration, easing) {
            if (angular.isNumber(value)) {
                return this.duScrollTo(this.duScrollLeft(), value, duration, easing);
            }
            var el = unwrap(this);
            if (isDocument(el)) {
                return $window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
            }
            return el.scrollTop;
        };

        proto.duScrollToElementAnimated = function (target, offset, duration, easing) {
            return this.duScrollToElement(target, offset, duration || duScrollDuration, easing);
        };

        proto.duScrollTopAnimated = function (top, duration, easing) {
            return this.duScrollTop(top, duration || duScrollDuration, easing);
        };

        proto.duScrollLeftAnimated = function (left, duration, easing) {
            return this.duScrollLeft(left, duration || duScrollDuration, easing);
        };

        angular.forEach(proto, function (fn, key) {
            angular.element.prototype[key] = fn;

            //Remove prefix if not already claimed by jQuery / ui.utils
            var unprefixed = key.replace(/^duScroll/, 'scroll');
            if (angular.isUndefined(angular.element.prototype[unprefixed])) {
                angular.element.prototype[unprefixed] = fn;
            }
        });

    }]);


//Adapted from https://gist.github.com/paulirish/1579671
angular.module('duScroll.polyfill', [])
    .factory('polyfill', ["$window", function ($window) {
        'use strict';

        var vendors = ['webkit', 'moz', 'o', 'ms'];

        return function (fnName, fallback) {
            if ($window[fnName]) {
                return $window[fnName];
            }
            var suffix = fnName.substr(0, 1).toUpperCase() + fnName.substr(1);
            for (var key, i = 0; i < vendors.length; i++) {
                key = vendors[i] + suffix;
                if ($window[key]) {
                    return $window[key];
                }
            }
            return fallback;
        };
    }]);

angular.module('duScroll.requestAnimation', ['duScroll.polyfill'])
    .factory('requestAnimation', ["polyfill", "$timeout", function (polyfill, $timeout) {
        'use strict';

        var lastTime = 0;
        var fallback = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = $timeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

        return polyfill('requestAnimationFrame', fallback);
    }])
    .factory('cancelAnimation', ["polyfill", "$timeout", function (polyfill, $timeout) {
        'use strict';

        var fallback = function (promise) {
            $timeout.cancel(promise);
        };

        return polyfill('cancelAnimationFrame', fallback);
    }]);


angular.module('duScroll.spyAPI', ['duScroll.scrollContainerAPI'])
    .factory('spyAPI', ["$rootScope", "$timeout", "$interval", "$window", "$document", "scrollContainerAPI", "duScrollGreedy", "duScrollSpyWait", "duScrollSpyRefreshInterval", "duScrollBottomSpy", "duScrollActiveClass", function ($rootScope, $timeout, $interval, $window, $document, scrollContainerAPI, duScrollGreedy, duScrollSpyWait, duScrollSpyRefreshInterval, duScrollBottomSpy, duScrollActiveClass) {
        'use strict';

        var createScrollHandler = function (context) {
            var timer = false, queued = false;
            var handler = function () {
                queued = false;
                var container = context.container,
                    containerEl = container[0],
                    containerOffset = 0,
                    bottomReached;

                if (typeof HTMLElement !== 'undefined' && containerEl instanceof HTMLElement || containerEl.nodeType && containerEl.nodeType === containerEl.ELEMENT_NODE) {
                    containerOffset = containerEl.getBoundingClientRect().top;
                    bottomReached = Math.round(containerEl.scrollTop + containerEl.clientHeight) >= containerEl.scrollHeight;
                } else {
                    var documentScrollHeight = $document[0].body.scrollHeight || $document[0].documentElement.scrollHeight; // documentElement for IE11
                    bottomReached = Math.round($window.pageYOffset + $window.innerHeight) >= documentScrollHeight;
                }
                var compareProperty = (duScrollBottomSpy && bottomReached ? 'bottom' : 'top');

                var i, currentlyActive, toBeActive, spies, spy, pos;
                spies = context.spies;
                currentlyActive = context.currentlyActive;
                toBeActive = undefined;

                for (i = 0; i < spies.length; i++) {
                    spy = spies[i];
                    pos = spy.getTargetPosition();
                    if (!pos || !spy.$element) continue;

                    if ((duScrollBottomSpy && bottomReached) || (pos.top + spy.offset - containerOffset < 20 && (duScrollGreedy || pos.top * -1 + containerOffset) < pos.height)) {
                        //Find the one closest the viewport top or the page bottom if it's reached
                        if (!toBeActive || toBeActive[compareProperty] < pos[compareProperty]) {
                            toBeActive = {
                                spy: spy
                            };
                            toBeActive[compareProperty] = pos[compareProperty];
                        }
                    }
                }

                if (toBeActive) {
                    toBeActive = toBeActive.spy;
                }
                if (currentlyActive === toBeActive || (duScrollGreedy && !toBeActive)) return;
                if (currentlyActive && currentlyActive.$element) {
                    currentlyActive.$element.removeClass(duScrollActiveClass);
                    $rootScope.$broadcast(
                        'duScrollspy:becameInactive',
                        currentlyActive.$element,
                        angular.element(currentlyActive.getTargetElement())
                    );
                }
                if (toBeActive) {
                    toBeActive.$element.addClass(duScrollActiveClass);
                    $rootScope.$broadcast(
                        'duScrollspy:becameActive',
                        toBeActive.$element,
                        angular.element(toBeActive.getTargetElement())
                    );
                }
                context.currentlyActive = toBeActive;
            };

            if (!duScrollSpyWait) {
                return handler;
            }

            //Debounce for potential performance savings
            return function () {
                if (!timer) {
                    handler();
                    timer = $timeout(function () {
                        timer = false;
                        if (queued) {
                            handler();
                        }
                    }, duScrollSpyWait, false);
                } else {
                    queued = true;
                }
            };
        };

        var contexts = {};

        var createContext = function ($scope) {
            var id = $scope.$id;
            var context = {
                spies: []
            };

            context.handler = createScrollHandler(context);
            contexts[id] = context;

            $scope.$on('$destroy', function () {
                destroyContext($scope);
            });

            return id;
        };

        var destroyContext = function ($scope) {
            var id = $scope.$id;
            var context = contexts[id], container = context.container;
            if (context.intervalPromise) {
                $interval.cancel(context.intervalPromise);
            }
            if (container) {
                container.off('scroll', context.handler);
            }
            delete contexts[id];
        };

        var defaultContextId = createContext($rootScope);

        var getContextForScope = function (scope) {
            if (contexts[scope.$id]) {
                return contexts[scope.$id];
            }
            if (scope.$parent) {
                return getContextForScope(scope.$parent);
            }
            return contexts[defaultContextId];
        };

        var getContextForSpy = function (spy) {
            var context, contextId, scope = spy.$scope;
            if (scope) {
                return getContextForScope(scope);
            }
            //No scope, most likely destroyed
            for (contextId in contexts) {
                context = contexts[contextId];
                if (context.spies.indexOf(spy) !== -1) {
                    return context;
                }
            }
        };

        var isElementInDocument = function (element) {
            while (element.parentNode) {
                element = element.parentNode;
                if (element === document) {
                    return true;
                }
            }
            return false;
        };

        var addSpy = function (spy) {
            var context = getContextForSpy(spy);
            if (!context) return;
            context.spies.push(spy);
            if (!context.container || !isElementInDocument(context.container)) {
                if (context.container) {
                    context.container.off('scroll', context.handler);
                }
                context.container = scrollContainerAPI.getContainer(spy.$scope);
                if (duScrollSpyRefreshInterval && !context.intervalPromise) {
                    context.intervalPromise = $interval(context.handler, duScrollSpyRefreshInterval, 0, false);
                }
                context.container.on('scroll', context.handler).triggerHandler('scroll');
            }
        };

        var removeSpy = function (spy) {
            var context = getContextForSpy(spy);
            if (spy === context.currentlyActive) {
                $rootScope.$broadcast('duScrollspy:becameInactive', context.currentlyActive.$element);
                context.currentlyActive = null;
            }
            var i = context.spies.indexOf(spy);
            if (i !== -1) {
                context.spies.splice(i, 1);
            }
            spy.$element = null;
        };

        return {
            addSpy: addSpy,
            removeSpy: removeSpy,
            createContext: createContext,
            destroyContext: destroyContext,
            getContextForScope: getContextForScope
        };
    }]);


angular.module('duScroll.scrollContainerAPI', [])
    .factory('scrollContainerAPI', ["$document", function ($document) {
        'use strict';

        var containers = {};

        var setContainer = function (scope, element) {
            var id = scope.$id;
            containers[id] = element;
            return id;
        };

        var getContainerId = function (scope) {
            if (containers[scope.$id]) {
                return scope.$id;
            }
            if (scope.$parent) {
                return getContainerId(scope.$parent);
            }

        };

        var getContainer = function (scope) {
            var id = getContainerId(scope);
            return id ? containers[id] : $document;
        };

        var removeContainer = function (scope) {
            var id = getContainerId(scope);
            if (id) {
                delete containers[id];
            }
        };

        return {
            getContainerId: getContainerId,
            getContainer: getContainer,
            setContainer: setContainer,
            removeContainer: removeContainer
        };
    }]);


angular.module('duScroll.smoothScroll', ['duScroll.scrollHelpers', 'duScroll.scrollContainerAPI'])
    .directive('duSmoothScroll', ["duScrollDuration", "duScrollOffset", "scrollContainerAPI", function (duScrollDuration, duScrollOffset, scrollContainerAPI) {
        'use strict';

        return {
            link: function ($scope, $element, $attr) {
                $element.on('click', function (e) {
                    if ((!$attr.href || $attr.href.indexOf('#') === -1) && $attr.duSmoothScroll === '') return;

                    var id = $attr.href ? $attr.href.replace(/.*(?=#[^\s]+$)/, '').substring(1) : $attr.duSmoothScroll;

                    var target = document.getElementById(id) || document.getElementsByName(id)[0];
                    if (!target || !target.getBoundingClientRect) return;

                    if (e.stopPropagation) e.stopPropagation();
                    if (e.preventDefault) e.preventDefault();

                    var offset = $attr.offset ? parseInt($attr.offset, 10) : duScrollOffset;
                    var duration = $attr.duration ? parseInt($attr.duration, 10) : duScrollDuration;
                    var container = scrollContainerAPI.getContainer($scope);

                    container.duScrollToElement(
                        angular.element(target),
                        isNaN(offset) ? 0 : offset,
                        isNaN(duration) ? 0 : duration
                    );
                });
            }
        };
    }]);


angular.module('duScroll.spyContext', ['duScroll.spyAPI'])
    .directive('duSpyContext', ["spyAPI", function (spyAPI) {
        'use strict';

        return {
            restrict: 'A',
            scope: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs, controller) {
                        spyAPI.createContext($scope);
                    }
                };
            }
        };
    }]);


angular.module('duScroll.scrollContainer', ['duScroll.scrollContainerAPI'])
    .directive('duScrollContainer', ["scrollContainerAPI", function (scrollContainerAPI) {
        'use strict';

        return {
            restrict: 'A',
            scope: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs, controller) {
                        iAttrs.$observe('duScrollContainer', function (element) {
                            if (angular.isString(element)) {
                                element = document.getElementById(element);
                            }

                            element = (angular.isElement(element) ? angular.element(element) : iElement);
                            scrollContainerAPI.setContainer($scope, element);
                            $scope.$on('$destroy', function () {
                                scrollContainerAPI.removeContainer($scope);
                            });
                        });
                    }
                };
            }
        };
    }]);


angular.module('duScroll.scrollspy', ['duScroll.spyAPI'])
    .directive('duScrollspy', ["spyAPI", "duScrollOffset", "$timeout", "$rootScope", function (spyAPI, duScrollOffset, $timeout, $rootScope) {
        'use strict';

        var Spy = function (targetElementOrId, $scope, $element, offset) {
            if (angular.isElement(targetElementOrId)) {
                this.target = targetElementOrId;
            } else if (angular.isString(targetElementOrId)) {
                this.targetId = targetElementOrId;
            }
            this.$scope = $scope;
            this.$element = $element;
            this.offset = offset;
        };

        Spy.prototype.getTargetElement = function () {
            if (!this.target && this.targetId) {
                this.target = document.getElementById(this.targetId) || document.getElementsByName(this.targetId)[0];
            }
            return this.target;
        };

        Spy.prototype.getTargetPosition = function () {
            var target = this.getTargetElement();
            if (target) {
                return target.getBoundingClientRect();
            }
        };

        Spy.prototype.flushTargetCache = function () {
            if (this.targetId) {
                this.target = undefined;
            }
        };

        return {
            link: function ($scope, $element, $attr) {
                var href = $attr.ngHref || $attr.href;
                var targetId;

                if (href && href.indexOf('#') !== -1) {
                    targetId = href.replace(/.*(?=#[^\s]+$)/, '').substring(1);
                } else if ($attr.duScrollspy) {
                    targetId = $attr.duScrollspy;
                } else if ($attr.duSmoothScroll) {
                    targetId = $attr.duSmoothScroll;
                }
                if (!targetId) return;

                // Run this in the next execution loop so that the scroll context has a chance
                // to initialize
                var timeoutPromise = $timeout(function () {
                    var spy = new Spy(targetId, $scope, $element, -($attr.offset ? parseInt($attr.offset, 10) : duScrollOffset));
                    spyAPI.addSpy(spy);

                    $scope.$on('$locationChangeSuccess', spy.flushTargetCache.bind(spy));
                    var deregisterOnStateChange = $rootScope.$on('$stateChangeSuccess', spy.flushTargetCache.bind(spy));
                    $scope.$on('$destroy', function () {
                        spyAPI.removeSpy(spy);
                        deregisterOnStateChange();
                    });
                }, 0, false);
                $scope.$on('$destroy', function () {
                    $timeout.cancel(timeoutPromise);
                });
            }
        };
    }]);

//# sourceMappingURL=nzbhydra.js.map
