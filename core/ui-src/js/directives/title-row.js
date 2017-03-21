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
        console.log("Building title row");
        $scope.duplicatesToShow = duplicatesToShow;
        function duplicatesToShow() {
            if ($scope.expanded && $scope.duplicates.length > 1) {
                console.log("Showing all duplicates in group");
                return $scope.duplicates;
            } else {
                console.log("Showing first duplicate in group");
                return [$scope.duplicates[0]];
            }
        }

    }
}