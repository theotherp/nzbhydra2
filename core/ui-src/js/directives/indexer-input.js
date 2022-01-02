angular
    .module('nzbhydraApp')
    .directive('indexerInput', indexerInput);

function indexerInput() {
    return {
        templateUrl: 'static/html/directives/indexer-input.html',
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

        var expiryWarning;
        if ($scope.indexer.vipExpirationDate != null && $scope.indexer.vipExpirationDate !== "Lifetime") {
            var expiryDate = moment($scope.indexer.vipExpirationDate, "YYYY-MM-DD");
            if (expiryDate < moment()) {
                console.log("Expiry date reached for indexer " + $scope.indexer.name);
                expiryWarning = "VIP access expired on " + $scope.indexer.vipExpirationDate;
            } else if (expiryDate.subtract(7, 'days') < moment()) {
                console.log("Expiry date near for indexer " + $scope.indexer.name);
                expiryWarning = "VIP access will expire on " + $scope.indexer.vipExpirationDate;
            }
        }

        $scope.expiryWarning = expiryWarning;
        if ($scope.indexer.color !== null) {
            $scope.style = "background-color: " + $scope.indexer.color.replace("rgb", "rgba").replace(")", ",0.5)")
        }
    }

}

