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
            internalRowIndex: "@"
        },
        controller: controller,
        multiElement: true
    };

    function controller($scope, DebugService) {
        $scope.titlesExpanded = $scope.expanded.indexOf($scope.titles[0][0].title) > -1;

        $scope.$on("toggleTitleExpansion", function (event, isExpanded, title) {
            $scope.titlesExpanded = isExpanded;
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

        DebugService.log("title-group");

    }
}