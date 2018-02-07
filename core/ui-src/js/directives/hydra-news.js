angular
    .module('nzbhydraApp')
    .directive('hydraNews', hydraNews);

function hydraNews() {
    return {
        templateUrl: "static/html/directives/news.html",
        controller: controller
    };

    function controller($scope, $http) {

        return $http.get("internalapi/news") .then(function (response) {
            $scope.news = response.data;
        });


    }
}

