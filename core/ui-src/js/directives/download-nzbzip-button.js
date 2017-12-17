angular
    .module('nzbhydraApp')
    .directive('downloadNzbzipButton', downloadNzbzipButton);

function downloadNzbzipButton() {
    return {
        templateUrl: 'static/html/directives/download-nzbzip-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<",
            searchTitle: "<",
            callback: "&"
        },
        controller: controller
    };

    function controller($scope, growl, $http, FileDownloadService) {

        $scope.download = function () {
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length === 0) {
                growl.info("You should select at least one result...");
            } else {
                var values = _.map($scope.searchResults, function (value) {
                    return value.searchResultId;
                });
                var link = "internalapi/nzbzip";

                var searchTitle;
                if (angular.isDefined($scope.searchTitle)) {
                    searchTitle = " for " + $scope.searchTitle.replace("[^a-zA-Z0-9.-]", "_");
                } else {
                    searchTitle = "";
                }
                var filename = "NZBHydra NZBs" + searchTitle + ".zip";
                $http({method: "post", url: link, data: values}).success(function (response) {
                    if (response.successful && response.zip !== null) {
                        //FileDownloadService.sendFile($base64.decode(response.zip), filename);
                        link = "internalapi/nzbzipDownload";
                        FileDownloadService.downloadFile(link, filename, "POST", response.zipFilepath);
                        if (angular.isDefined($scope.callback)) {
                            $scope.callback({result:response.addedIds});
                        }
                        if (response.missedIds.length > 0) {
                            growl.error("Unable to add " + response.missedIds.length + " out of " + values.length + " NZBs to ZIP");
                        }
                    }
                }).error(function (data, status, headers, config) {
                    growl.error(status);
                });
            }
        }
    }
}

