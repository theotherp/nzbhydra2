angular
    .module('nzbhydraApp')
    .directive('downloadNzbsButton', downloadNzbsButton);

function downloadNzbsButton() {
    return {
        templateUrl: 'static/html/directives/download-nzbs-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<",
            callback: "&"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService, growl) {

        $scope.downloaders = NzbDownloadService.getEnabledDownloaders();

        $scope.download = function (downloader) {
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length === 0) {
                growl.info("You should select at least one result...");
            } else {

                var searchResults = _.filter($scope.searchResults, function (value) {
                    if (value.downloadType === "NZB") {
                        return true;
                    } else {
                        console.log("Not sending result with download type " + value.downloadType + " to downloader");
                        return false;
                    }
                });

                NzbDownloadService.download(downloader, searchResults).then(function (response) {
                    if (angular.isDefined(response.data)) {
                        if (response !== "dismissed") {
                            if (response.data.successful) {
                                growl.info("Successfully added all NZBs");
                            } else {
                                growl.error(response.data.message);
                            }
                        } else {
                            growl.error("Error while adding NZBs");
                        }
                        if (angular.isDefined($scope.callback)) {
                            $scope.callback({result: response.data.addedIds});
                        }
                    }
                }, function () {
                    growl.error("Error while adding NZBs");
                });
            }
        }

    }
}

