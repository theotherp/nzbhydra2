

angular
    .module('nzbhydraApp')
    .directive('indexerStateSwitch', indexerStateSwitch);

function indexerStateSwitch() {
    return {
        templateUrl: 'static/html/directives/indexer-state-switch.html',
        scope: {
            indexer: "=",
            handleWidth: "@"
        },
        replace: true,
        controller: controller
    };

    function controller($scope) {
        $scope.value = $scope.indexer.state === "ENABLED";
        $scope.handleWidth = $scope.handleWidth || "130px";
        var initialized = false;

        function calculateTextAndColor() {
            if ($scope.indexer.state === "DISABLED_USER") {
                $scope.offText = "Disabled by user";
                $scope.offColor = "default";
            } else if ($scope.indexer.state === "DISABLED_SYSTEM_TEMPORARY") {
                $scope.offText = "Temporary disabled";
                $scope.offColor = "warning";
            } else if ($scope.indexer.state === "DISABLED_SYSTEM") {
                $scope.offText = "Disabled by system";
                $scope.offColor = "danger";
            }
        }

        calculateTextAndColor();

        $scope.onChange = function () {
            if (initialized) {
                //Skip on first call when initial value is set
                $scope.indexer.state = $scope.value ? "ENABLED" : "DISABLED_USER";
                calculateTextAndColor();
            }
            initialized = true;
        }
    }
}