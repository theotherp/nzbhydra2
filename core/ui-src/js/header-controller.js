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
