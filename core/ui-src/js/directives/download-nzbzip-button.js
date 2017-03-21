angular
    .module('nzbhydraApp')
    .directive('downloadNzbzipButton', downloadNzbzipButton);

function downloadNzbzipButton() {
    return {
        templateUrl: 'static/html/directives/download-nzbzip-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<",
            searchTitle: "<"
        },
        controller: controller
    };

    function controller($scope, growl, FileDownloadService) {

        $scope.download = function () {
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length == 0) {
                growl.info("You should select at least one result...");
            } else {

                var values = _.map($scope.searchResults, function (value) {
                    return value.searchResultId;
                });
                var link = "getnzbzip?searchresultids=" + values.join("|");
                var searchTitle;
                if (angular.isDefined($scope.searchTitle)) {
                    searchTitle = " for " + $scope.searchTitle;
                } else {
                    searchTitle = "";
                }
                var filename = "NZBHydra NZBs" + searchTitle + ".zip";
                FileDownloadService.downloadFile(link, filename);
            }
        }
    }
}

