angular
    .module('nzbhydraApp')
    .directive('titleGroup', titleGroup);

function titleGroup() {
    return {
        templateUrl: 'static/html/directives/title-group.html',
        scope: {
            titles: "<",
            selected: "=",
            expanded: "=",
            rowIndex: "<",
            doShowDuplicates: "<",
            internalRowIndex: "@"
        },
        controller: ['$scope', '$element', '$attrs', controller],
        multiElement: true
    };

    function controller($scope, $element, $attrs) {
        $scope.titleGroupExpanded = $scope.expanded.indexOf($scope.titles[0][0].title) > -1;

        $scope.$on("toggleTitleExpansion", function (event, isExpanded, title) {
            $scope.titleGroupExpanded = isExpanded;
            var index = $scope.expanded.indexOf(title);
            if (!isExpanded && index > -1) {
                $scope.expanded.splice(index, 1);
            } else if(isExpanded){
                $scope.expanded.push(title);
            }

            event.stopPropagation();
        });


        $scope.titlesToShow = titlesToShow;

        function titlesToShow() {
            return $scope.titles.slice(1);
        }

    }
}