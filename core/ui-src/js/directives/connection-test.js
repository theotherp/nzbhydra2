angular
    .module('nzbhydraApp')
    .directive('connectionTest', connectionTest);

function connectionTest() {
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

