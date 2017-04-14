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
        maySeeAdminArea: maySeeAdminArea
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