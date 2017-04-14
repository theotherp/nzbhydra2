var nzbhydraapp = angular.module('nzbhydraApp', ['angular-loading-bar', 'cgBusy', 'ui.bootstrap', 'ipCookie', 'angular-growl', 'angular.filter', 'filters', 'ui.router', 'blockUI', 'mgcrea.ngStrap', 'angularUtils.directives.dirPagination', 'nvd3', 'formly', 'formlyBootstrap', 'frapontillo.bootstrap-switch', 'ui.select', 'ngSanitize', 'checklist-model', 'ngAria', 'ngMessages', 'ui.router.title', 'LocalStorageModule', 'angular.filter', 'ngFileUpload', 'ngCookies']);

angular.module('nzbhydraApp').config(["$stateProvider", "$urlRouterProvider", "$locationProvider", "blockUIConfig", "$urlMatcherFactoryProvider", "localStorageServiceProvider", "bootstrapped", function ($stateProvider, $urlRouterProvider, $locationProvider, blockUIConfig, $urlMatcherFactoryProvider, localStorageServiceProvider, bootstrapped) {

    console.log("Starting");

    blockUIConfig.autoBlock = false;
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
        .state("root.config.downloader", {
            url: "/downloader",
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
                            return "Config (Downloader)"
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
                            return $http.get("internalapi/indexertatuses").success(function (response) {
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
                        askAdmin: ['loginRequired', '$http', function (loginRequired, $http) {
                            return $http.get("internalapi/askadmin");
                        }],

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
                            return 5;
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
        if (type == "search") {
            allowed = !userInfos.searchRestricted || userInfos.maySeeSearch;
        } else if (type == "stats") {
            allowed = !userInfos.statsRestricted || userInfos.maySeeStats;
        } else if (type == "admin") {
            allowed = !userInfos.adminRestricted || userInfos.maySeeAdmin;
        } else {
            allowed = true;
        }
        if (allowed || userInfos.authType != "form") {
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
        if (!userInfos.searchRestricted || userInfos.maySeeSearch || userInfos.authType != "form") {
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
        if (!userInfos.statsRestricted || userInfos.maySeeStats || userInfos.authType != "form") {
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


nzbhydraapp.filter('unsafe', ["$sce", function ($sce) {
    return $sce.trustAsHtml;
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
                console.log(exception);
                var stack = exception.stack.split('\n').map(function (line) {
                    return line.trim();
                });
                stack = stack.join("\n");
                //$injector.get("$http").put("internalapi/logerror", {error: stack, cause: angular.isDefined(cause) ? cause.toString() : "No known cause"});

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
        console.log("Building title row");
        $scope.duplicatesToShow = duplicatesToShow;
        function duplicatesToShow() {
            if ($scope.expanded && $scope.duplicates.length > 1) {
                console.log("Showing all duplicates in group");
                return $scope.duplicates;
            } else {
                console.log("Showing first duplicate in group");
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
        controller: controller
    };

    function controller($scope, $http, $uibModal, growl, HydraAuthService) {

        $scope.showDetailsDl = HydraAuthService.getUserInfos().maySeeDetailsDl;

        $scope.showNfo = showNfo;
        function showNfo(resultItem) {
            if (resultItem.has_nfo === 0) {
                return;
            }
            var uri = new URI("internalapi/getnfo");
            uri.addQuery("searchresultid", resultItem.searchResultId);
            return $http.get(uri.toString()).then(function (response) {
                if (response.data.has_nfo) {
                    $scope.openModal("lg", response.data.nfo)
                } else {
                    if (!angular.isUndefined(resultItem.message)) {
                        growl.error(resultItem.message);
                    } else {
                        growl.info("No NFO available");
                    }
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
            if ($scope.result.has_nfo == 1) {
                return "Show NFO"
            } else if ($scope.result.has_nfo == 2) {
                return "Try to load NFO (may not be available)";
            } else {
                return "No NFO available";
            }
        }
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
    controller.$inject = ["$scope", "UpdateService", "$sce"];
    return {
        templateUrl: 'static/html/directives/updates.html',
        controller: controller
    };

    function controller($scope, UpdateService, $sce) {

        $scope.loadingPromise = UpdateService.getVersions().then(function (data) {
            $scope.currentVersion = data.data.currentVersion;
            $scope.repVersion = data.data.repVersion;
            $scope.updateAvailable = data.data.updateAvailable;
            $scope.changelog = data.data.changelog;
        });

        UpdateService.getVersionHistory().then(function (data) {
            $scope.versionHistory = $sce.trustAsHtml(data.data.versionHistory);
        });

        $scope.update = function () {
            UpdateService.update();
        };

        $scope.showChangelog = function () {
            UpdateService.showChanges($scope.changelog);
        };


    }
}


angular
    .module('nzbhydraApp')
    .directive('hydralog', hydralog);

function hydralog() {
    controller.$inject = ["$scope", "$http", "$sce", "$interval", "localStorageService"];
    return {
        templateUrl: "static/html/directives/log.html",
        controller: controller
    };

    function controller($scope, $http, $sce, $interval, localStorageService) {
        $scope.tailInterval = null;
        $scope.doUpdateLog = localStorageService.get("doUpdateLog") !== null ? localStorageService.get("doUpdateLog") : false;
        $scope.doTailLog = localStorageService.get("doTailLog") !== null ? localStorageService.get("doTailLog") : false;


        function getAndShowLog() {
            return $http.get("internalapi/getlogs").success(function (data) {
                $scope.log = $sce.trustAsHtml(data.log);
            });
        }

        $scope.logPromise = getAndShowLog();

        $scope.scrollToBottom = function () {
            document.getElementById("logfile").scrollTop = 10000000;
            document.getElementById("logfile").scrollTop = 100001000;
        };

        $scope.update = function () {
            getAndShowLog();
            $scope.scrollToBottom();
        };

        function startUpdateLogInterval() {
            $scope.tailInterval = $interval(function () {
                getAndShowLog();
                if ($scope.doTailLog) {
                    $scope.scrollToBottom();
                }
            }, 5000);
        }

        $scope.toggleUpdate = function () {
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

        if ($scope.doUpdateLog) {
            startUpdateLogInterval();
        }

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

        $scope.$on("duplicatesDisplayed", function (event, args) {
            $scope.foo.duplicatesDisplayed = args;
        });

        $scope.clickCheckbox = function (event) {
            var globalCheckboxIndex = $scope.rowIndex * 1000 + $scope.internalRowIndex * 100 + Number(event.currentTarget.dataset.checkboxIndex);
            console.log(globalCheckboxIndex);
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
                        if (i == 0 || $scope.duplicatesExpanded) {
                            console.log("Indirectly clicked row with global index " + (globalDuplicateGroupIndex + i) + " setting new checkbox value to " + newValue);
                            var index = _.indexOf($scope.selected, $scope.duplicates[i]);
                            if (index == -1 && newValue) {
                                console.log("Adding to selection");
                                $scope.selected.push($scope.duplicates[i]);
                            } else if (index > -1 && !newValue) {
                                $scope.selected.splice(index, 1);
                                console.log("Removing from selection");
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
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length == 0) {
                growl.info("You should select at least one result...");
            } else {

                var values = _.map($scope.searchResults, function (value) {
                    return value.searchResultId;
                });
                var link = "getnzbzip?searchresultids=" + values.join("|");
                var searchTitle;
                if (angular.isDefined($scope.searchTitle)) {
                    searchTitle = " for " + $scope.searchTitle;
                } else {
                    searchTitle = "";
                }
                var filename = "NZBHydra NZBs" + searchTitle + ".zip";
                FileDownloadService.downloadFile(link, filename);
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
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length == 0) {
                growl.info("You should select at least one result...");
            } else {

                var values = _.map($scope.searchResults, function (value) {
                    return value.searchResultId;
                });

                NzbDownloadService.download(downloader, values).then(function (response) {
                    if (response.data.success) {
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
    controller.$inject = ["$scope"];
    return {
        restrict: "E",
        templateUrl: 'static/html/dataTable/columnFilterOuter.html',
        transclude: true,
        controllerAs: 'columnFilterWrapperCtrl',
        scope: true,
        bindToController: true,
        controller: controller
    };

    function controller($scope) {
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
        })
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
            console.log($scope.selected);
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
            console.log($scope.selected);
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
    .module('nzbhydraApp').directive("columnSortable", columnSortable);

function columnSortable() {
    controller.$inject = ["$scope"];
    return {
        restrict: "E",
        templateUrl: "static/html/dataTable/columnSortable.html",
        transclude: true,
        scope: {
            sortMode: "@", //0: no sorting, 1: asc, 2: desc
            column: "@"
        },
        controller: controller
    };

    function controller($scope) {

        if (angular.isUndefined($scope.sortMode)) {
            $scope.sortMode = 0;
        }

        $scope.$on("newSortColumn", function (event, column) {
            if (column != $scope.column) {
                $scope.sortMode = 0;
            }
        });

        $scope.sort = function () {
            $scope.sortMode = ($scope.sortMode + 1) % 3;
            $scope.$emit("sort", $scope.column, $scope.sortMode)
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
        console.log($scope);

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
    controller.$inject = ["$scope", "BackupService", "Upload", "FileDownloadService", "RequestsErrorHandler", "growl", "RestartService"];
    return {
        templateUrl: 'static/html/directives/backup.html',
        controller: controller
    };

    function controller($scope, BackupService, Upload, FileDownloadService, RequestsErrorHandler, growl, RestartService) {
        $scope.refreshBackupList = function () {
            BackupService.getBackupsList().then(function (backups) {
                $scope.backups = backups;
            });
        };

        $scope.refreshBackupList();

        $scope.uploadActive = false;


        $scope.createAndDownloadBackupFile = function () {
            FileDownloadService.downloadFile("internalapi/getbackup", "nzbhydra-backup-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip");
        };

        $scope.uploadBackupFile = function (file, errFiles) {
            RequestsErrorHandler.specificallyHandled(function () {
                console.log("Hallo");
                $scope.file = file;
                $scope.errFile = errFiles && errFiles[0];
                if (file) {
                    $scope.uploadActive = true;
                    file.upload = Upload.upload({
                        url: 'internalapi/restorebackup',
                        data: {content: file}
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
                    RestartService.restart("Restore successful.");
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
            if ($scope.downloadType != "NZB") {
                return downloader.downloadType == $scope.downloadType
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
            $scope.cssClass = "nzb-spinning";
            NzbDownloadService.download($scope.downloader, [$scope.searchResultId]).then(function (response) {
                if (response.data.success) {
                    $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-success" : "nzbget-success";
                } else {
                    $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                    growl.error("Unable to add NZB. Make sure the downloader is running and properly configured.");
                }
            }, function () {
                $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                growl.error("An unexpected error occurred while trying to contact NZB Hydra or add the NZB.");
            })
        };


    }
}

angular
    .module('nzbhydraApp')
    .factory('UpdateService', UpdateService);

function UpdateService($http, growl, blockUI, RestartService) {

    var currentVersion;
    var latestVersion;
    var updateAvailable;
    var changelog;
    var versionHistory;

    return {
        update: update,
        showChanges: showChanges,
        getVersions: getVersions,
        getChangelog: getChangelog,
        getVersionHistory: getVersionHistory
    };

    function getVersions() {
        return $http.get("internalapi/updates/versions").then(function (data) {
            currentVersion = data.data.currentVersion;
            latestVersion = data.data.latestVersion;
            updateAvailable = data.data.updateAvailable;
            return data;
        });
    }

    function getChangelog() {
        return $http.get("internalapi/changesSince").then(function (data) {
            changelog = data.data;
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
                templateUrl: "static/html/changelog.html",
                resolve: {
                    changelog: function () {
                        return response.data.message;
                    }
                },
                controller: function ($scope, $sce, $uibModalInstance, changelog) {
                    //I fucking hate that untrusted HTML shit
                    changelog = $sce.trustAsHtml(changelog);
                    $scope.changelog = changelog;
                    console.log(changelog);
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
        blockUI.start("Updating. Please stand by...");
        $http.get("internalapi/updates/installUpdate").then(function (data) {
                //Handle like restart, ping application and wait
                //Perhaps save the version to which we want to update, ask later and see if they're equal. If not updating apparently failed...
                growl.info("Installed update...");
            },
            function () {
                blockUI.reset();
                growl.info("An error occurred while updating. Please check the logs.");
            });
    }
}
UpdateService.$inject = ["$http", "growl", "blockUI", "RestartService"];


angular
    .module('nzbhydraApp')
    .controller('UpdateFooterController', UpdateFooterController);

function UpdateFooterController($scope, UpdateService, HydraAuthService) {

    $scope.updateAvailable = false;
    $scope.checked = false;

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
        UpdateService.getVersions().then(function (data) {
            $scope.currentVersion = data.data.currentVersion;
            $scope.latestVersion = data.data.latestVersion;
            $scope.updateAvailable = data.data.updateAvailable;
            $scope.changelog = data.data.changelog;
        });
    }


    $scope.update = function () {
        UpdateService.update();
    };

    $scope.showChangelog = function () {
        UpdateService.showChanges();
    }

}
UpdateFooterController.$inject = ["$scope", "UpdateService", "HydraAuthService"];

angular
    .module('nzbhydraApp')
    .controller('SystemController', SystemController);

function SystemController($scope, $state, activeTab, $http, growl, RestartService, ModalService, UpdateService, ConfigService, NzbHydraControlService) {

    $scope.activeTab = activeTab;

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

    $scope.deleteLogAndDatabase = function () {
        ModalService.open("Delete log and db", "Are you absolutely sure you want to delete your database and log files? Hydra will restart to do that.", {
            yes: {
                onYes: function () {
                    NzbHydraControlService.deleteLogAndDb();
                    RestartService.countdown();
                },
                text: "Yes, delete log and database"
            },
            no: {
                onCancel: function () {

                },
                text: "Nah"
            }
        });
    };

    $scope.forceUpdate = function () {
        UpdateService.update()
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
            name: "Bugreport"
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
        $http({method: 'GET', url: 'internalapi/getdebugginginfos', responseType: 'arraybuffer'}).success(function (data, status, headers, config) {
            var a = document.createElement('a');
            var blob = new Blob([data], {'type': "application/octet-stream"});
            a.href = URL.createObjectURL(blob);
            var filename = "nzbhydra-debuginfo-" + moment().format("YYYY-MM-DD-HH-mm") + ".zip";
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }).error(function (data, status, headers, config) {
            console.log("Error:" + status);
        });
    }

}
SystemController.$inject = ["$scope", "$state", "activeTab", "$http", "growl", "RestartService", "ModalService", "UpdateService", "ConfigService", "NzbHydraControlService"];

angular
    .module('nzbhydraApp')
    .factory('StatsService', StatsService);

function StatsService($http) {

    return {
        get: getStats,
        getDownloadHistory: getDownloadHistory
    };

    function getStats(after, before) {
        return $http.post("internalapi/stats", {after: after, before: before}).success(function (response) {
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

function StatsController($scope, $filter, StatsService, blockUI) {

    $scope.dateOptions = {
        dateDisabled: false,
        formatYear: 'yy',
        startingDay: 1
    };
    var initializingAfter = true;
    var initializingBefore = true;
    $scope.afterDate = moment().subtract(30, "days").toDate();
    $scope.beforeDate = moment().add(1, "days").toDate();
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

    function updateStats() {
        blockUI.start("Updating stats...");
        var after = $scope.afterDate != null ? $scope.afterDate : null;
        var before = $scope.beforeDate != null ? $scope.beforeDate : null;
        StatsService.get(after, before).then(function (stats) {
            $scope.setStats(stats);
        });

        blockUI.reset();
    }

    $scope.$watch('beforeDate', function () {
        if (initializingBefore) {
            initializingBefore = false;
        } else {
            updateStats();
        }
    });


    $scope.$watch('afterDate', function () {
        if (initializingAfter) {
            initializingAfter = false;
        } else {
            updateStats();
        }
    });

    $scope.onKeypress = function (keyEvent) {
        if (keyEvent.which === 13) {
            updateStats();
        }
    };

    $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
    $scope.format = $scope.formats[0];
    $scope.altInputFormats = ['M!/d!/yyyy'];

    $scope.setStats = function (stats) {
        stats = stats.data;

        $scope.nzbDownloads = null;
        $scope.avgResponseTimes = stats.avgResponseTimes;
        $scope.avgIndexerSearchResultsShares = stats.avgIndexerSearchResultsShares;
        $scope.indexerApiAccessStats = stats.indexerApiAccessStats;
        $scope.indexerDownloadShares = stats.indexerDownloadShares;
        $scope.downloadsPerHourOfDay = stats.downloadsPerHourOfDay;
        $scope.downloadsPerDayOfWeek = stats.downloadsPerDayOfWeek;
        $scope.searchesPerHourOfDay = stats.searchesPerHourOfDay;
        $scope.searchesPerDayOfWeek = stats.searchesPerDayOfWeek;


        var numIndexers = $scope.avgResponseTimes.length;

        $scope.avgResponseTimesChart = getChart("multiBarHorizontalChart", $scope.avgResponseTimes, "indexer", "avgResponseTime", "", "Response time");
        $scope.avgResponseTimesChart.options.chart.margin.left = 100;
        $scope.avgResponseTimesChart.options.chart.yAxis.rotateLabels = -30;
        var avgResponseTimesChartHeight = Math.max(numIndexers * 30, 350);
        $scope.avgResponseTimesChart.options.chart.height = avgResponseTimesChartHeight;

        $scope.resultsSharesChart = getResultsSharesChart();

        var rotation = 30;
        if (numIndexers > 30) {
            rotation = 70;
        }
        $scope.resultsSharesChart.options.chart.xAxis.rotateLabels = rotation;
        $scope.resultsSharesChart.options.chart.height = avgResponseTimesChartHeight;

        $scope.downloadsPerHourOfDayChart = getChart("discreteBarChart", $scope.downloadsPerHourOfDay, "hour", "count", "Hour of day", 'Downloads');
        $scope.downloadsPerHourOfDayChart.options.chart.xAxis.rotateLabels = 0;

        $scope.downloadsPerDayOfWeekChart = getChart("discreteBarChart", $scope.downloadsPerDayOfWeek, "day", "count", "Day of week", 'Downloads');
        $scope.downloadsPerDayOfWeekChart.options.chart.xAxis.rotateLabels = 0;

        $scope.searchesPerHourOfDayChart = getChart("discreteBarChart", $scope.searchesPerHourOfDay, "hour", "count", "Hour of day", 'Searches');
        $scope.searchesPerHourOfDayChart.options.chart.xAxis.rotateLabels = 0;

        $scope.searchesPerDayOfWeekChart = getChart("discreteBarChart", $scope.searchesPerDayOfWeek, "day", "count", "Day of week", 'Searches');
        $scope.searchesPerDayOfWeekChart.options.chart.xAxis.rotateLabels = 0;

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
                    duration: 500,
                    labelThreshold: 0.01,
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
            data: $scope.indexerDownloadShares
        };

        $scope.indexerDownloadSharesChart.options.chart.height = Math.min(Math.max(numIndexers * 40, 350), 900);
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
                            return d + "%";
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
                            return d;
                        }
                    }
                }
            },

            data: [
                {
                    key: "Results",
                    values: _.map($scope.avgIndexerSearchResultsShares, function (stats) {
                        return {series: 0, y: stats.totalShare, x: stats.indexerName}
                    })
                },
                {
                    key: "Unique results",
                    values: _.map($scope.avgIndexerSearchResultsShares, function (stats) {
                        return {series: 1, y: stats.uniqueShare, x: stats.indexerName}
                    })
                }
            ]
        };
    }


}
StatsController.$inject = ["$scope", "$filter", "StatsService", "blockUI"];

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
        loadMore: loadMore
    };


    function search(category, query, tmdbid, imdbId, title, tvdbId, rid, season, episode, minsize, maxsize, minage, maxage, indexers, mode) {
        var uri;
        var searchRequestParameters = {};
        searchRequestParameters.query = query;
        searchRequestParameters.title = title;
        searchRequestParameters.minsize = minsize;
        searchRequestParameters.maxsize = maxsize;
        searchRequestParameters.minage = minage;
        searchRequestParameters.maxage = maxage;
        if (!angular.isUndefined(indexers) && indexers !== null) {
            searchRequestParameters.indexers = indexers.split("|");
        }

        searchRequestParameters.category = category;

        if (category.indexOf("Movies") > -1 || (category.indexOf("20") === 0) || mode === "movie") {
            uri = new URI("internalapi/search/movie");

            searchRequestParameters.tmdbId = tmdbid;
            searchRequestParameters.imdbId = imdbId;
        } else if (category.indexOf("TV") > -1 || (category.indexOf("50") === 0) || mode === "tvsearch") {
            uri = new URI("internalapi/search/tv");

            searchRequestParameters.tvdbId = tvdbId;
            searchRequestParameters.tvrageId = rid;
            searchRequestParameters.season = season;
            searchRequestParameters.episode = episode;
        } else {
            uri = new URI("internalapi/search");
        }

        lastExecutedQuery = uri;
        lastExecutedSearchRequestParameters = searchRequestParameters;
        return $http.post(uri.toString(), searchRequestParameters).then(processData);
    }

    function loadMore(offset, loadAll) {
        lastExecutedSearchRequestParameters.offset = offset;
        lastExecutedSearchRequestParameters.loadAll = loadAll;

        return $http.post(lastExecutedQuery.toString(), lastExecutedSearchRequestParameters).then(processData); //TODO: loadMore/loadAll: see above
    }

    function processData(response) {
        var searchResults = response.data.searchResults;
        var indexerSearchMetaDatas = response.data.indexerSearchMetaDatas;
        var numberOfAvailableResults = response.data.numberOfAvailableResults;
        var numberOfRejectedResults = response.data.numberOfRejectedResults;
        var numberOfResults = response.data.numberOfResults;
        var rejectedReasonsMap = response.data.rejectedReasonsMap;


        lastResults = {
            "searchResults": searchResults,
            "indexerSearchMetaDatas": indexerSearchMetaDatas,
            "numberOfAvailableResults": numberOfAvailableResults,
            "numberOfResults": numberOfResults,
            "numberOfRejectedResults": numberOfRejectedResults,
            "rejectedReasonsMap": rejectedReasonsMap
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

function sumRejected(rejected) {
    return _.reduce(rejected, function (memo, entry) {
        return memo + entry[1];
    }, 0);
}

//SearchResultsController.$inject = ['blockUi'];
function SearchResultsController($stateParams, $scope, $q, $timeout, blockUI, growl, localStorageService, SearchService, ConfigService) {

    if (localStorageService.get("sorting") != null) {
        var sorting = localStorageService.get("sorting");
        $scope.sortPredicate = sorting.predicate;
        $scope.sortReversed = sorting.reversed;
    } else {
        $scope.sortPredicate = "epoch";
        $scope.sortReversed = true;
    }
    $scope.limitTo = 100;
    $scope.offset = 0;
    //Handle incoming data

    $scope.indexersearches = SearchService.getLastResults().indexerSearchMetaDatas;
    $scope.indexerDisplayState = []; //Stores if a indexerName's searchResults should be displayed or not
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

    $scope.lastClicked = null;
    $scope.lastClickedValue = null;

    $scope.foo = {
        indexerStatusesExpanded: localStorageService.get("indexerStatusesExpanded") != null ? localStorageService.get("indexerStatusesExpanded") : false,
        duplicatesDisplayed: localStorageService.get("duplicatesDisplayed") != null ? localStorageService.get("duplicatesDisplayed") : false
    };

    $scope.countFilteredOut = 0;

    //Initially set visibility of all found indexers to true, they're needed for initial filtering / sorting
    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerDisplayState[ps.indexerName.toLowerCase()] = true;
    });

    _.forEach($scope.indexersearches, function (ps) {
        $scope.indexerResultsInfo[ps.indexerName.toLowerCase()] = {loadedResults: ps.loaded_results};
    });

    //Process searchResults
    $scope.results = SearchService.getLastResults().searchResults;
    $scope.numberOfAvailableResults = SearchService.getLastResults().numberOfAvailableResults;
    $scope.numberOfResults = SearchService.getLastResults().numberOfResults;
    $scope.rejected = SearchService.getLastResults().rejectedReasonsMap;
    $scope.numberOfRejectedResults = SearchService.getLastResults().numberOfRejectedResults;
    $scope.filteredResults = sortAndFilter($scope.results);

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

    //Block the UI and return after timeout. This way we make sure that the blocking is done before angular starts updating the model/view. There's probably a better way to achieve that?
    function startBlocking(message) {
        var deferred = $q.defer();
        blockUI.start(message);
        $timeout(function () {
            deferred.resolve();
        }, 100);
        return deferred.promise;
    }

    //Set sorting according to the predicate. If it's the same as the old one, reverse, if not sort by the given default (so that age is descending, name ascending, etc.)
    //Sorting (and filtering) are really slow (about 2 seconds for 1000 results from 5 indexers) but I haven't found any way of making it faster, apart from the tracking
    $scope.setSorting = setSorting;
    function setSorting(predicate, reversedDefault) {
        if (predicate == $scope.sortPredicate) {
            $scope.sortReversed = !$scope.sortReversed;
        } else {
            $scope.sortReversed = reversedDefault;
        }
        $scope.sortPredicate = predicate;
        startBlocking("Sorting / filtering...").then(function () {
            $scope.filteredResults = sortAndFilter($scope.results);
            blockUI.reset();
            localStorageService.set("sorting", {predicate: predicate, reversed: $scope.sortReversed});
        });
    }

    $scope.inlineFilter = inlineFilter;
    function inlineFilter(result) {
        var ok = true;
        ok = ok && $scope.titleFilter && result.title.toLowerCase().indexOf($scope.titleFilter) > -1;
        ok = ok && $scope.minSizeFilter && $scope.minSizeFilter * 1024 * 1024 < result.size;
        ok = ok && $scope.maxSizeFilter && $scope.maxSizeFilter * 1024 * 1024 > result.size;
        return ok;
    }


    $scope.$on("searchInputChanged", function (event, query, minage, maxage, minsize, maxsize) {
        $scope.filteredResults = sortAndFilter($scope.results, query, minage, maxage, minsize, maxsize);
    });

    $scope.resort = function () {
    };

    function sortAndFilter(results, query, minage, maxage, minsize, maxsize) {
        $scope.countFilteredOut = 0;

        function filterByAgeAndSize(item) {
            var ok = true;
            ok = ok && (!_.isNumber(minsize) || item.size / 1024 / 1024 >= minsize)
                && (!_.isNumber(maxsize) || item.size / 1024 / 1024 <= maxsize)
                && (!_.isNumber(minage) || item.age_days >= Number(minage))
                && (!_.isNumber(maxage) || item.age_days <= Number(maxage));

            if (ok && query) {
                var words = query.toLowerCase().split(" ");
                ok = _.every(words, function (word) {
                    return item.title.toLowerCase().indexOf(word) > -1;
                });
            }
            if (!ok) {
                $scope.countFilteredOut++;
            }
            return ok;
        }


        function getItemIndexerDisplayState(item) {
            return true;
            return $scope.indexerDisplayState[item.indexer.toLowerCase()];
        }

        function getCleanedTitle(element) {
            return element.title.toLowerCase().replace(/[\s\-\._]/ig, "");
        }

        function createSortedHashgroups(titleGroup) {

            function createHashGroup(hashGroup) {
                //Sorting hash group's contents should not matter for size and age and title but might for category (we might remove this, it's probably mostly unnecessary)
                var sortedHashGroup = _.sortBy(hashGroup, function (item) {
                    var sortPredicateValue;
                    if ($scope.sortPredicate == "grabs") {
                        sortPredicateValue = angular.isDefined(item.grabs) ? item.grabs : 0;
                    } else {
                        sortPredicateValue = item[$scope.sortPredicate];
                    }
                    //var sortPredicateValue = item[$scope.sortPredicate];
                    return $scope.sortReversed ? -sortPredicateValue : sortPredicateValue;
                });
                //Now sort the hash group by indexer score (inverted) so that the result with the highest indexer score is shown on top (or as the only one of a hash group if it's collapsed)
                sortedHashGroup = _.sortBy(sortedHashGroup, function (item) {
                    return item.indexerscore * -1;
                });
                return sortedHashGroup;
            }

            function getHashGroupFirstElementSortPredicate(hashGroup) {
                if ($scope.sortPredicate == "grabs") {
                    sortPredicateValue = angular.isDefined(hashGroup[0].grabs) ? hashGroup[0].grabs : 0;
                } else {
                    var sortPredicateValue = hashGroup[0][$scope.sortPredicate];
                }
                return $scope.sortReversed ? -sortPredicateValue : sortPredicateValue;
            }

            return _.chain(titleGroup).groupBy("hash").map(createHashGroup).sortBy(getHashGroupFirstElementSortPredicate).value();
        }

        function getTitleGroupFirstElementsSortPredicate(titleGroup) {
            var sortPredicateValue;
            if ($scope.sortPredicate == "title") {
                sortPredicateValue = titleGroup[0][0].title.toLowerCase();
            } else if ($scope.sortPredicate == "grabs") {
                sortPredicateValue = angular.isDefined(titleGroup[0][0].grabs) ? titleGroup[0][0].grabs : 0;
            } else {
                sortPredicateValue = titleGroup[0][0][$scope.sortPredicate];
            }

            return sortPredicateValue;
        }

        var filtered = _.chain(results)
        //Filter by age, size and title
            .filter(filterByAgeAndSize)
            //Remove elements of which the indexer is currently hidden
            .filter(getItemIndexerDisplayState)
            //Make groups of results with the same title
            .groupBy(getCleanedTitle)
            //For every title group make subgroups of duplicates and sort the group    
            .map(createSortedHashgroups)
            //And then sort the title group using its first hashgroup's first item (the group itself is already sorted and so are the hash groups)    
            .sortBy(getTitleGroupFirstElementsSortPredicate)
            .value();
        if ($scope.sortReversed) {
            filtered = filtered.reverse();
        }
        if ($scope.countFilteredOut > 0) {
            growl.info("Filtered " + $scope.countFilteredOut + " of the retrieved results");
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

    $scope.loadMore = loadMore;
    function loadMore(loadAll) {
        startBlocking(loadAll ? "Loading all results..." : "Loading more results...").then(function () {
            SearchService.loadMore($scope.resultsCount, loadAll).then(function (data) {
                $scope.results = $scope.results.concat(data.results);
                $scope.filteredResults = sortAndFilter($scope.results);
                $scope.total = data.total;
                $scope.rejected = data.rejected;
                $scope.countRejected = sumRejected($scope.rejected);
                $scope.resultsCount += data.resultsCount;
                stopBlocking();
            });
        });
    }


//Filters the results according to new visibility settings.
    $scope.toggleIndexerDisplay = toggleIndexerDisplay;
    function toggleIndexerDisplay(indexer) {
        $scope.indexerDisplayState[indexer.toLowerCase()] = $scope.indexerDisplayState[indexer.toLowerCase()];
        startBlocking("Filtering. Sorry...").then(function () {
            $scope.filteredResults = sortAndFilter($scope.results);
        }).then(function () {
            stopBlocking();
        });
    }

    $scope.countResults = countResults;
    function countResults() {
        return $scope.results.length;
    }

    $scope.invertSelection = function invertSelection() {
        $scope.$broadcast("invertSelection");
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

    $scope.$on("checkboxClicked", function (event, originalEvent, rowIndex, newCheckedValue) {
        if (originalEvent.shiftKey && $scope.lastClicked != null) {
            $scope.$broadcast("shiftClick", Number($scope.lastClicked), Number(rowIndex), Number($scope.lastClickedValue));
        }
        $scope.lastClicked = rowIndex;
        $scope.lastClickedValue = newCheckedValue;
    });

    $scope.filterRejectedZero = function () {
        return function (entry) {
            return entry[1] > 0;
        }
    }
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
        //TODO
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


function SearchHistoryController($scope, $state, SearchHistoryService, ConfigService, history, $sce, $filter) {
    $scope.limit = 100;
    $scope.pagination = {
        current: 1
    };
    $scope.sortModel = {
        column: "time",
        sortMode: 2
    };
    $scope.filterModel = {};

    //Filter options
    $scope.categoriesForFiltering = [];
    _.forEach(ConfigService.getSafe().categories, function (category) {
        $scope.categoriesForFiltering.push({label: category.name, id: category.name})
    });
    $scope.preselectedTimeInterval = {beforeDate: null, afterDate: null};
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: 'API'}, {label: "Internal", value: 'INTERNAL'}];

    //Preloaded data
    $scope.searchRequests = history.data.content;
    $scope.totalRequests = history.data.totalElements;

    $scope.update = function () {
        SearchHistoryService.getSearchHistory($scope.pagination.current, $scope.limit, $scope.filterModel, $scope.sortModel).then(function (history) {
            $scope.searchRequests = history.data.content;
            $scope.totalRequests = history.data.totalElements;
        });
    };

    $scope.$on("sort", function (event, column, sortMode) {
        if (sortMode == 0) {
            column = "time";
            sortMode = 2;
        }
        $scope.sortModel = {
            column: column,
            sortMode: sortMode
        };
        $scope.$broadcast("newSortColumn", column);
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
        var stateParams = {};
        if (request.identifier_key == "imdbId") {
            stateParams.imdbId = request.identifier_value;
        } else if (request.identifier_key == "tvdbId" || request.identifier_key == "rid") {
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
        if (request.type == "tv") {
            stateParams.mode = "tvsearch"
        } else if (request.type == "movie") {
            stateParams.mode = "movie"
        } else {
            stateParams.mode = "search"
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

        $state.go("root.search", stateParams, {inherit: false});
    };

    $scope.formatQuery = function (request) {
        if (request.movietitle != null) {
            return request.movietitle;
        }
        if (request.tvtitle != null) {
            return request.tvtitle;
        }

        if (!request.query && !request.identifier_key && !request.season && !request.episode) {
            return "Update query";
        }
        return request.query;
    };

    //TODO Reenable
    $scope.formatAdditional = function (request) {
        var result = [];
        //ID key: ID value
        //season
        //episode
        //author
        //title
        if (request.identifier_key) {
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
            result.push(key + ": " + '<a target="_blank" href="' + href + '">' + request.identifier_value + "</a>");
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
SearchHistoryController.$inject = ["$scope", "$state", "SearchHistoryService", "ConfigService", "history", "$sce", "$filter"];

angular
    .module('nzbhydraApp')
    .controller('SearchController', SearchController);

function SearchController($scope, $http, $stateParams, $state, $window, $filter, $sce, growl, SearchService, focus, ConfigService, HydraAuthService, CategoriesService, blockUI, $element, ModalService, SearchHistoryService) {

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

    //Fill the form with the search values we got from the state params (so that their values are the same as in the current url)
    $scope.mode = $stateParams.mode;
    $scope.categories = _.filter(CategoriesService.getAllCategories(), function (c) {
        return c.mayBeSelected && !(c.ignoreResultsFrom === "INTERNAL" || c.ignoreResults === "BOTH");
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

    //Doesn't belong here but whatever
    var firstStartThreeDaysAgo = ConfigService.getSafe().firstStart < moment().subtract(3, "days").unix();
    var doShowSurvey = (ConfigService.getSafe().pollShown === 0 && firstStartThreeDaysAgo) || ConfigService.getSafe().pollShown === 1;
    if (doShowSurvey) {
        var message;
        if (ConfigService.getSafe().pollShown === 0) {
            message = "Dear user, I would like to ask you to answer a short query about NZB Hydra. It is absolutely anonymous and will not take more than a couple of minutes. You would help me a lot!";
        } else {
            message = "Dear user, thank you for answering my last survey. Unfortunately I'm an idiot and didn't know that SurveyMonkey would only show me the first 100 results. Please be so kind and answer the new survey :-)";
        }
        ModalService.open("User query",
            message, {
                yes: {
                    onYes: function () {
                        $window.open($filter("dereferer")("https://goo.gl/forms/F3PwtEor2krBxLcR2"), "_blank");
                        $http.get("internalapi/pollshown", {params: {selection: 1}});
                        ConfigService.getSafe().pollShown = 2;
                    },
                    text: "Yes, I want to help. Take me there."
                },
                cancel: {
                    onCancel: function () {
                        $http.get("internalapi/pollshown", {params: {selection: 0}});
                        ConfigService.getSafe().pollShown = 0;
                    },
                    text: "Not now. Remind me."
                },
                no: {
                    onNo: function () {
                        $http.get("internalapi/pollshown", {params: {selection: -1}});
                        ConfigService.getSafe().pollShown = -1;
                    },
                    text: "Nah, feck off!"
                }
            });
    }


    $scope.typeAheadWait = 300;
    $scope.selectedItem = "";
    $scope.autocompleteLoading = false;
    $scope.isAskById = $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";
    $scope.isById = {value: true}; //If true the user wants to search by id so we enable autosearch. Was unable to achieve this using a simple boolean
    $scope.availableIndexers = [];
    $scope.autocompleteClass = "autocompletePosterMovies";

    $scope.toggle = function (searchCategory) {
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
            var min = searchCategory.min;
            var max = searchCategory.max;
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

        if ($scope.category.name.indexOf("movies") > -1) {
            return $http.get('internalapi/autocomplete/MOVIE/' + val).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else if ($scope.category.name.indexOf("tv") > -1) {
            return $http.get('internalapi/autocomplete/TV/' + val).then(function (response) {
                $scope.autocompleteLoading = false;
                return response.data;
            });
        } else {
            return {};
        }
    };


    $scope.startSearch = function () {
        blockUI.start("Searching...");
        var indexers = angular.isUndefined($scope.indexers) ? undefined : $scope.indexers.join("|");
        SearchService.search($scope.category.name, $scope.query, $scope.tmdbId, $scope.imdbId, $scope.title, $scope.tvdbId, $scope.rid, $scope.season, $scope.episode, $scope.minsize, $scope.maxsize, $scope.minage, $scope.maxage, indexers, $scope.mode).then(function () {
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
        });
    };

    function getSelectedIndexers() {
        var activatedIndexers = _.filter($scope.availableIndexers).filter(function (indexer) {
            return indexer.activated;
        });
        return _.pluck(activatedIndexers, "name").join("|");
    }


    $scope.goToSearchUrl = function () {
        //State params (query parameters) should all be lowercase
        var stateParams = {};
        if ($scope.category.name.indexOf("movies") > -1) {
            stateParams.title = $scope.title;
        } else if ($scope.category.name.indexOf("tv") > -1) {
            stateParams.title = $scope.title;
        }
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
        stateParams.indexers = encodeURIComponent(getSelectedIndexers());
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
        return $scope.category.searchType === "TVSEARCH" || $scope.category.searchType === "MOVIE";
    };

    $scope.seriesSelected = function () {
        return $scope.category.name.indexOf("tv") > -1;
    };

    $scope.toggleIndexer = function (indexer) {
        $scope.indexers[indexer] = !$scope.indexers[indexer]
    };


    function isIndexerPreselected(indexer) {
        if (angular.isUndefined($scope.indexers)) {
            return indexer.preselect;
        } else {
            return _.contains($scope.indexers, indexer.name);
        }

    }


    function getAvailableIndexers() {
        return _.chain(safeConfig.indexers).filter(function (indexer) {
            return indexer.enabled && indexer.showOnSearch && (angular.isUndefined(indexer.categories) || indexer.categories.length === 0 || $scope.category.name === "all" || indexer.categories.indexOf($scope.category.name) > -1);
        }).sortBy(function (indexer) {
            return indexer.name.toLowerCase();
        })
            .map(function (indexer) {
                return {name: indexer.name, activated: isIndexerPreselected(indexer), categories: indexer.categories};
            }).value();
    }


    $scope.toggleAllIndexers = function () {
        angular.forEach($scope.availableIndexers, function (indexer) {
            indexer.activated = !indexer.activated;
        })
    };

    $scope.searchInputChanged = function () {
        $scope.$broadcast("searchInputChanged", $scope.query !== $stateParams.query ? $scope.query : null, $scope.minage, $scope.maxage, $scope.minsize, $scope.maxsize);
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
SearchController.$inject = ["$scope", "$http", "$stateParams", "$state", "$window", "$filter", "$sce", "growl", "SearchService", "focus", "ConfigService", "HydraAuthService", "CategoriesService", "blockUI", "$element", "ModalService", "SearchHistoryService"];

angular
    .module('nzbhydraApp')
    .factory('RestartService', RestartService);

function RestartService(blockUI, $timeout, $window, growl, $http, NzbHydraControlService) {

    return {
        restart: restart,
        countdown: countdown
    };


    function internalCaR(message, timer) {
        if (timer === 45) {
            blockUI.start(message + "Restarting takes longer than expected. You might want to check the log to see what's going on.");
        } else {
            blockUI.start(message + " Will reload page when NZB Hydra is back.");
            $timeout(function () {
                $http.get("internalapi/control/ping").then(function () {
                    $timeout(function () {
                        blockUI.start("Reloading page...");
                        $window.location.reload();
                    }, 500);
                }, function () {
                    internalCaR(message, timer + 1);
                });
            }, 1000);
            blockUI.start(message + " Will reload page when NZB Hydra is back.");
        }
    }

    function countdown() {
        internalCaR("", 15);
    }

    function restart(message) {
        message = angular.isDefined(message) ? message + " " : "";
        NzbHydraControlService.restart().then(function () {
                blockUI.start(message + " Will reload page when NZB Hydra is back.");
                $timeout(function () {
                    internalCaR(message, 0);
                }, 3000)
            },
            function (x) {
                console.log(x);
                growl.info("Unable to send restart command.");
            }
        )
    }
}
RestartService.$inject = ["blockUI", "$timeout", "$window", "growl", "$http", "NzbHydraControlService"];

angular
    .module('nzbhydraApp')
    .factory('NzbHydraControlService', NzbHydraControlService);

function NzbHydraControlService($http) {

    return {
        restart: restart,
        shutdown: shutdown,
        deleteLogAndDb: deleteLogAndDb
    };

    function restart() {
        return $http.get("internalapi/control/restart");
    }

    function shutdown() {
        return $http.get("internalapi/control/shutdown");
    }

    function deleteLogAndDb() {
        //TODO
        return $http.get("internalapi/control/deleteloganddb");
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
        if (category != "No category") {
            params["category"] = category;
        }
        return $http.put("internalapi/downloader/addNzbs", params);
    }

    function download(downloader, searchresultids) {

        var category = downloader.defaultCategory;

        if ((_.isUndefined(category) || category == "" || category == null) && category != "No category") {
            return DownloaderCategoriesService.openCategorySelection(downloader).then(function (category) {
                return sendNzbAddCommand(downloader, searchresultids, category)
            }, function (error) {
                throw error;
            });
        } else {
            return sendNzbAddCommand(downloader, searchresultids, category)
        }
    }

    function getEnabledDownloaders() {
        return _.filter(ConfigService.getSafe().downloaders, "enabled");
    }
}
NzbDownloadService.$inject = ["$http", "ConfigService", "DownloaderCategoriesService"];


angular
    .module('nzbhydraApp')
    .factory('ModalService', ModalService);

function ModalService($uibModal, $q) {

    return {
        open: open
    };

    function open(headline, message, params, size) {
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
                }
            }
        });

        modalInstance.result.then(function () {

        }, function () {

        });
    }

}
ModalService.$inject = ["$uibModal", "$q"];

angular
    .module('nzbhydraApp')
    .controller('ModalInstanceCtrl', ModalInstanceCtrl);

function ModalInstanceCtrl($scope, $uibModalInstance, headline, message, params) {

    $scope.message = message;
    $scope.headline = headline;
    $scope.params = params;
    $scope.showCancel = angular.isDefined(params) && angular.isDefined(params.cancel);
    $scope.showNo = angular.isDefined(params) && angular.isDefined(params.no);

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
            $scope.params.no.onNo();
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
ModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "headline", "message", "params"];

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
        $http.post("internalapi/indexertatuses/enable/" + encodeURI(indexerName)).then(function (response) {
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
    console.log("Index");
    $state.go("root.search");
}
IndexController.$inject = ["$scope", "$http", "$stateParams", "$state"];

angular
    .module('nzbhydraApp')
    .factory('HydraAuthService', HydraAuthService);

function HydraAuthService($q, $rootScope, $http, bootstrapped) {

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
        return $http.post("auth/login", data = {username: username, password: password}).then(function (data) {
            bootstrapped = data.data;
            loggedIn = true;
            $rootScope.$broadcast("user:loggedIn");
            deferred.resolve();
        });
    }

    function askForPassword(params) {
        return $http.get("internalapi/askforpassword", {params: params}).then(function (data) {
            bootstrapped = data.data;
            return bootstrapped;
        });

    }

    function logout() {
        var deferred = $q.defer();
        return $http.post("auth/logout").then(function (data) {
            $rootScope.$broadcast("user:loggedOut");
            bootstrapped = data.data;
            loggedIn = false;
            deferred.resolve();
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
HydraAuthService.$inject = ["$q", "$rootScope", "$http", "bootstrapped"];
angular
    .module('nzbhydraApp')
    .controller('HeaderController', HeaderController);

function HeaderController($scope, $state, growl, HydraAuthService) {


    $scope.showLoginout = false;
    $scope.oldUserName = null;

    function update() {

        $scope.userInfos = HydraAuthService.getUserInfos();
        if (!$scope.userInfos.authConfigured) {
            $scope.showAdmin = true;
            $scope.showStats = true;
            $scope.showLoginout = false;
        } else {
            if ($scope.userInfos.username) {
                $scope.showAdmin = $scope.userInfos.maySeeAdmin || !$scope.userInfos.adminRestricted;
                $scope.showStats = $scope.userInfos.maySeeStats || !$scope.userInfos.statsRestricted;
                $scope.showLoginout = true;
                $scope.username = $scope.userInfos.username;
                $scope.loginlogoutText = "Logout " + $scope.username;
                $scope.oldUserName = $scope.username;
            } else {
                $scope.showAdmin = !$scope.userInfos.adminRestricted;
                $scope.showStats = !$scope.userInfos.statsRestricted;
                $scope.loginlogoutText = "Login";
                $scope.showLoginout = $scope.userInfos.adminRestricted || $scope.userInfos.statsRestricted || $scope.userInfos.searchRestricted;
                $scope.username = "";
            }
        }
    }

    update();


    $scope.$on("user:loggedIn", function (event, data) {
        update();
    });

    $scope.$on("user:loggedOut", function (event, data) {
        update();
    });

    $scope.loginout = function () {
        if (HydraAuthService.isLoggedIn()) {
            HydraAuthService.logout().then(function () {
                if ($scope.userInfos.authType == "basic") {
                    growl.info("Logged out. Close your browser to make sure session is closed.");
                }
                else if ($scope.userInfos.authType == "form") {
                    growl.info("Logged out");
                }
                update();
                //$state.go("root.search", null, {reload: true});
            });

        } else {
            if ($scope.userInfos.authType == "basic") {
                var params = {};
                if ($scope.oldUserName) {
                    params = {
                        old_username: $scope.oldUserName
                    }
                }
                HydraAuthService.askForPassword(params).then(function () {
                    growl.info("Login successful!");
                    update();
                    $scope.oldUserName = null;
                    $state.go("root.search");
                })
            } else if ($scope.userInfos.authType == "form") {
                $state.go("root.login");
            } else {
                growl.info("You shouldn't need to login but here you go!");
            }
        }
    }
}
HeaderController.$inject = ["$scope", "$state", "growl", "HydraAuthService"];

var HEADER_NAME = 'MyApp-Handle-Errors-Generically';
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
                    message = "An unknown error occurred while communicating with NZB Hydra:<br><br>" + JSON.stringify(rejection);
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
                '<div class="panel-body">',
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
                    $scope.model[$scope.options.key] = (Math.random() * 1e32).toString(36);
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
            name: 'checkCaps',
            templateUrl: 'button-check-caps.html',
            controller: function ($scope, ConfigBoxService, ModalService) {
                $scope.message = "";
                $scope.uniqueId = hashCode($scope.model.name) + hashCode($scope.model.host);

                var testButton = "#button-check-caps-" + $scope.uniqueId;
                var testMessage = "#message-check-caps-" + $scope.uniqueId;

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

                $scope.checkCaps = function () {
                    angular.element(testButton).addClass("glyphicon-refresh-animate");

                    var url = "internalapi/indexer/checkCaps";
                    ConfigBoxService.checkCaps(url, $scope.model).then(function (data, model) {
                        angular.element(testMessage).text("Supports: " + data.supportedSearchIds + "," ? data.supportedSearchIds && data.supportedSearchTypes : "" + data.supportedSearchTypes);
                        showSuccess();
                    }, function (message) {
                        angular.element(testMessage).text(message);
                        showError();
                        ModalService.open("Error testing capabilities", 'The capabilities of the indexer could not be checked. You can set the IDs manually. Refer to the <a href="https://github.com/theotherp/nzbhydra/wiki/Supported-Search-Types-And-Indexer-Hosts" target="_blank">Wiki</a> for the IDs supported by some indexers.<br><br>You may repeat the check at any time to try again.');
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
                    $scope.model[$scope.options.key] = $scope.model[$scope.options.key] || [];
                    var repeatsection = $scope.model[$scope.options.key];
                    var newsection = angular.copy($scope.options.templateOptions.defaultModel);
                    repeatsection.push(newsection);
                }

                function remove($index) {
                    $scope.model[$scope.options.key].splice($index, 1);
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


                    modalInstance.result.then(function () {
                        $scope.form.$setDirty(true);
                        if (angular.isDefined(callback)) {
                            callback(true);
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

                        $scope._showBox(model, entriesCollection, true, function (isSubmitted) {
                            if (isSubmitted) {
                                entriesCollection.push(model);
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
        console.log($scope);
        if ($scope.form.$valid) {

            var a = data.checkBeforeClose($scope, model).then(function () {
                $uibModalInstance.close($scope);
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

    $scope.reset = function () {
        $scope.reset();
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
        if (reason == "backdrop click") {
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
                deferred.resolve();
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
            model.supportedSearchIds = data.supportedSearchIds;
            model.supportedSearchTypes = data.supportedSearchTypes;
            model.enabledCategories = [];
            model.categoryConfig = data.categoryConfig;
            model.backend = data.backend;
            deferred.resolve({supportedSearchIds: data.supportedSearchIds, supportedSearchTypes: data.supportedSearchTypes}, model);

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

filters.filter('unsafe',
    ["$sce", function ($sce) {
        return function (value, type) {
            return $sce.trustAs(type || 'html', text);
        };
    }]
);


angular
    .module('nzbhydraApp')
    .factory('FileDownloadService', FileDownloadService);

function FileDownloadService($http, growl) {

    var service = {
        downloadFile: downloadFile
    };

    return service;

    function downloadFile(link, filename) {
        $http({method: 'GET', url: link, responseType: 'arraybuffer'}).success(function (data, status, headers, config) {
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
            if (angular.isDefined(categories) && angular.isDefined(categories.downloader)) {
                var deferred = $q.defer();
                deferred.resolve(categories.downloader);
                return deferred.promise;
            }

            return $http.get(encodeURI('internalapi/downloader/' + downloader.name + "/categories"))
                .then(function (categoriesResponse) {

                    console.log("Updating downloader categories cache");
                    var categories = {downloader: categoriesResponse.data.categories};
                    return categoriesResponse.data.categories;

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
        $uibModal.open({
            templateUrl: 'static/html/directives/addable-nzb-modal.html',
            controller: 'DownloaderCategorySelectionController',
            size: "sm",
            resolve: {
                categories: function () {
                    return getCategories(downloader)
                }
            }
        });
        deferred = $q.defer();
        return deferred.promise;
    }

    function select(category) {
        selectedCategory = category;
        console.log("Selected category " + category);
        deferred.resolve(category);
    }

    function invalidate() {
        console.log("Invalidating categories");
        categories = undefined;
    }
}
DownloaderCategoriesService.$inject = ["$http", "$q", "$uibModal"];

angular
    .module('nzbhydraApp').controller('DownloaderCategorySelectionController', ["$scope", "$uibModalInstance", "DownloaderCategoriesService", "categories", function ($scope, $uibModalInstance, DownloaderCategoriesService, categories) {
    console.log(categories);
    $scope.categories = categories;
    $scope.select = function (category) {
        DownloaderCategoriesService.select(category);
        $uibModalInstance.close($scope);
    }
}]);
angular
    .module('nzbhydraApp')
    .controller('DownloadHistoryController', DownloadHistoryController);


function DownloadHistoryController($scope, StatsService, downloads, ConfigService) {
    $scope.limit = 100;
    $scope.pagination = {
        current: 1
    };
    $scope.sortModel = {
        column: "time",
        sortMode: 2
    };
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
        StatsService.getDownloadHistory($scope.pagination.current, $scope.limit, $scope.filterModel, $scope.sortModel).then(function (downloads) {
            $scope.nzbDownloads = downloads.data.content;
            $scope.totalDownloads = downloads.data.totalElements;
        });
    };


    $scope.$on("sort", function (event, column, sortMode) {
        if (sortMode == 0) {
            column = "time";
            sortMode = 2;
        }
        $scope.sortModel = {
            column: column,
            sortMode: sortMode
        };
        $scope.$broadcast("newSortColumn", column);
        $scope.update();
    });

    $scope.accessResult = function (result) {
        if (result === 'UNKNOWN') {
            return 'glyphicon-question-sign';
        } else if (result === 'SUCCESSFUL') {
            return 'glyphicon-ok';
        } else {
            return 'glyphicon-remove';
        }
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
DownloadHistoryController.$inject = ["$scope", "StatsService", "downloads", "ConfigService"];

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


    function set(newConfig) {
        var deferred = $q.defer();
        $http.put('internalapi/config', newConfig)
            .then(function (response) {
                if (response.ok) {
                    console.log("Settings saved. Updating cache");
                    cache.put("config", newConfig);
                    invalidateSafe();
                    deferred.resolve(response);
                } else {
                    deferred.reject(response);
                }


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
                                help: 'Meta data from searches is stored in the database. When they\'re deleted links to Hydra become invalid.'
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
                            categoryConfig: {anime: null, audiobook: null, comic: null, ebook: null},
                            enabled: true,
                            categories: [],
                            downloadLimit: null,
                            loadLimitOnRandom: null,
                            host: null,
                            apiKey: null,
                            hitLimit: null,
                            hitLimitResetTime: 0,
                            timeout: null,
                            name: null,
                            showOnSearch: true,
                            score: 0,
                            username: null,
                            password: null,
                            preselect: true,
                            searchModuleType: 'NEWZNAB',
                            accessType: "BOTH",
                            supportedSearchIds: undefined, //["imdbId", "rid", "tvdbId"],
                            supportedSearchTypes: undefined, //["tvsearch", "movie"]
                            backend: 'NEWZNAB',
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
                searchModuleType: "JACKETT",
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

    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'JACKETT') {
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
    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'JACKETT') {
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

    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'JACKETT') {
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

    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'JACKETT') {
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
    if (model.searchModuleType !== "JACKETT") {
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
    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'JACKETT') {
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

    if (model.searchModuleType === 'NEWZNAB' || model.searchModuleType === 'JACKETT') {
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
                function (data, model) {
                    blockUI.reset();
                    scope.spinnerActive = false;
                    if (model.allChecked) {
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
IndexerCheckBeforeCloseService.$inject = ["$q", "ModalService", "ConfigBoxService", "blockUI", "growl"];


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

function ConfigController($scope, $http, activeTab, ConfigService, config, DownloaderCategoriesService, ConfigFields, ConfigModel, ModalService, RestartService, $state, growl) {
    $scope.config = config;
    $scope.submit = submit;
    $scope.activeTab = activeTab;

    $scope.restartRequired = false;
    $scope.ignoreSaveNeeded = false;

    ConfigFields.setRestartWatcher(function () {
        $scope.restartRequired = true;
    });


    function submit() {
        if ($scope.form.$valid) {


            ConfigService.set($scope.config).then(function () {
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
                            onNo: function () {
                                $scope.restartRequired = false;
                            }
                        }
                    });
                }
            }, function (response) {
                console.log(response);
                growl.error(response.data.errorMessages.join("<br>"));
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
            fields: $scope.fields.main
        },
        {
            active: false,
            state: 'root.config.auth',
            name: 'Authorization',
            model: ConfigModel.auth,
            fields: $scope.fields.auth
        },
        {
            active: false,
            state: 'root.config.searching',
            name: 'Searching',
            model: ConfigModel.searching,
            fields: $scope.fields.searching
        },
        {
            active: false,
            state: 'root.config.categories',
            name: 'Categories',
            model: ConfigModel.categoriesConfig,
            fields: $scope.fields.categoriesConfig
        },
        {
            active: false,
            state: 'root.config.downloader',
            name: 'Downloaders',
            model: ConfigModel.downloaders,
            fields: $scope.fields.downloaders
        },
        {
            active: false,
            state: 'root.config.indexers',
            name: 'Indexers',
            model: ConfigModel.indexers,
            fields: $scope.fields.indexers
        }
    ];

    $scope.isSavingNeeded = function () {
        return $scope.form.$dirty && $scope.form.$valid && !$scope.ignoreSaveNeeded;
    };

    $scope.goToConfigState = function (index) {
        $state.go($scope.allTabs[index].state, {activeTab: index}, {inherit: false, notify: true, reload: true});
    };

    $scope.help = function () {
        $http.get("internalapi/gethelp", {params: {id: $scope.activeTab.name}}).then(function (result) {
                var html = '<span style="text-align: left;">' + result.data + "</span>";
                ModalService.open($scope.activeTab.name + " - Help", html, {}, "lg");
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
                            $scope.ctrl.options.resetModel();
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
ConfigController.$inject = ["$scope", "$http", "activeTab", "ConfigService", "config", "DownloaderCategoriesService", "ConfigFields", "ConfigModel", "ModalService", "RestartService", "$state", "growl"];



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
        return $http.get('internalapi/getbackups').then(function (data) {
            return data.data.backups;
        });
    }

    function restoreFromFile(filename) {
        return $http.get('internalapi/restorefrombackupfile', {params: {filename: filename}}).then(function (response) {
            return response;
        });
    }

}
BackupService.$inject = ["$http"];
//# sourceMappingURL=nzbhydra.js.map
