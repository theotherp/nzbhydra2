angular
    .module('nzbhydraApp')
    .directive('selectionButton', selectionButton);

function selectionButton() {
    return {
        templateUrl: 'static/html/directives/selection-button.html',
        scope: {
            selected: "=",
            selectable: "=",
            invertSelection: "<",
            selectAll: "<",
            deselectAll: "<",
            btn: "@"
        },
        controller: controller
    };

    function controller($scope) {

        if (angular.isUndefined($scope.btn)) {
            $scope.btn = "default"; //Will form class "btn-default"
        }

        if (angular.isUndefined($scope.invertSelection)) {
            $scope.invertSelection = function () {
                $scope.selected = _.difference($scope.selectable, $scope.selected);
            };
        }

        if (angular.isUndefined($scope.selectAll)) {
            $scope.selectAll = function () {
                $scope.selected.push.apply($scope.selected, $scope.selectable);
            };
        }

        if (angular.isUndefined($scope.deselectAll)) {
            $scope.deselectAll = function () {
                $scope.selected.splice(0, $scope.selected.length);
            };
        }


    }
}

