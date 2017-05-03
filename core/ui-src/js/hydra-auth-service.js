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