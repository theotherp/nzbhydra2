

angular
    .module('nzbhydraApp')
    .directive('hydraTasks', hydraTasks);

function hydraTasks() {
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

