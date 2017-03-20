angular
    .module('nzbhydraApp')
    .directive('titleGroup', titleGroup);

function titleGroup() {
    return {
        templateUrl: 'html/directives/title-group.html',
        scope: {
            titles: "<",
            selected: "=",
            rowIndex: "<",
            doShowDuplicates: "<",
            internalRowIndex: "@"
        },
        controller: ['$scope', '$element', '$attrs', controller],
        multiElement: true
    };

    function controller($scope, $element, $attrs) {
        $scope.expanded = false;
        $scope.titleGroupExpanded = false;

        $scope.$on("toggleTitleExpansion", function (event, args) {
            $scope.titleGroupExpanded = args;
            event.stopPropagation();
        });


        $scope.titlesToShow = titlesToShow;
        function titlesToShow() {
            return $scope.titles.slice(1);
        }

    }
}