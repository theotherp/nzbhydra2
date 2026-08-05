

//
angular
    .module('nzbhydraApp')
    .factory('GenericStorageService', GenericStorageService);

function GenericStorageService($http) {

    return {
        get: get,
        put: put
    };

    function get(key, forUser) {
        return $http.get("internalapi/genericstorage/" + key, {params: {forUser: forUser === true}, ignoreLoadingBar: true});
    }

    function put(key, forUser, value) {
        return $http.put("internalapi/genericstorage/" + key, value, {params: {forUser: forUser === true}, ignoreLoadingBar: true});
    }


}
