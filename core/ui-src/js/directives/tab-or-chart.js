angular
    .module('nzbhydraApp')
    .directive('tabOrChart', tabOrChart);

function tabOrChart() {
    return {
        templateUrl: 'html/directives/tab-or-chart.html',
        transclude: {
            "chartSlot": "chart",
            "tableSlot": "table"
        },
        restrict: 'E',
        replace: true,
        scope: {
            display: "@"
        }

    };

}
