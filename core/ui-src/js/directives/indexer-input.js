angular
    .module('nzbhydraApp')
    .directive('indexerInput', indexerInput);

function indexerInput() {
    return {
        templateUrl: 'html/directives/indexer-input.html',
        scope: {
            indexer: "=",
            model: "=",
            onClick: "="
        },
        replace: true,
        controller: controller
    };

    function controller($scope) {
        $scope.isFocused = false;

        $scope.onFocus = function () {
            $scope.isFocused = true;
        };

        $scope.onBlur = function () {
            $scope.isFocused = false;
        };

    }
}

