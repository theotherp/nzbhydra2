var HEADER_NAME = 'NzbHydra2-Handle-Errors-Generically';
var specificallyHandleInProgress = false;

nzbhydraapp.factory('RequestsErrorHandler', function ($q, growl, blockUI, GeneralModalService) {
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
});


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