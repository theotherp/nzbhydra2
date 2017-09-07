angular
    .module('nzbhydraApp')
    .directive('titleRow', titleRow);

function titleRow() {
    return {
        templateUrl: 'static/html/directives/title-row.html',
        scope: {
            duplicates: "<",
            selected: "<",
            rowIndex: "@"
        },
        controller: ['$scope', '$element', '$attrs', titleRowController]
    };

    function titleRowController($scope) {
        $scope.expanded = false;

        $scope.duplicatesToShow = duplicatesToShow;

        function duplicatesToShow() {
            if ($scope.expanded && $scope.duplicates.length > 1) {

                return $scope.duplicates;
            } else {

                return [$scope.duplicates[0]];
            }
        }

    }
}