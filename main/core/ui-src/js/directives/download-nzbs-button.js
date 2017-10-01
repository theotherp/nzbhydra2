angular
    .module('nzbhydraApp')
    .directive('downloadNzbsButton', downloadNzbsButton);

function downloadNzbsButton() {
    return {
        templateUrl: 'static/html/directives/download-nzbs-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService, growl) {

        $scope.downloaders = NzbDownloadService.getEnabledDownloaders();

        $scope.download = function (downloader) {
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length === 0) {
                growl.info("You should select at least one result...");
            } else {

                var values = _.map(_.filter($scope.searchResults, function (value) {
                    if (value.downloadType === "NZB") {
                        return true;
                    } else {
                        console.log("Not sending result with download type " +value.downloadType + " to downloader");
                        return false;
                    }
                }), function (value) {
                    return value.searchResultId;
                });

                NzbDownloadService.download(downloader, values).then(function (response) {
                    if (response.data.successful) {
                        growl.info("Successfully added " + response.data.added + " of " + response.data.of + " NZBs");
                    } else {
                        growl.error("Error while adding NZBs");
                    }
                }, function () {
                    growl.error("Error while adding NZBs");
                });
            }
        }


    }
}

