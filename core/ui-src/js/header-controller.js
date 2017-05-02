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
