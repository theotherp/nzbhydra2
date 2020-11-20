angular
    .module('nzbhydraApp')
    .directive('addableNzb', addableNzb);

function addableNzb(DebugService) {
    return {
        templateUrl: 'static/html/directives/addable-nzb.html',
        scope: {
            searchresult: "=",
            downloader: "<",
            alwaysAsk: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService, growl) {
        if (!_.isNullOrEmpty($scope.downloader.iconCssClass)) {
            $scope.cssClass = "fa fa-" + $scope.downloader.iconCssClass.replace("fa-", "").replace("fa ", "");
        } else {
            $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd" : "nzbget";
        }

        $scope.add = function () {
            var originalClass = $scope.cssClass;
            $scope.cssClass = "nzb-spinning";
            NzbDownloadService.download($scope.downloader, [{
                searchResultId: $scope.searchresult.searchResultId ? $scope.searchresult.searchResultId : $scope.searchresult.id,
                originalCategory: $scope.searchresult.originalCategory,
                mappedCategory: $scope.searchresult.category
            }], $scope.alwaysAsk).then(function (response) {
                if (response !== "dismissed") {
                    if (response.data.successful && (response.data.addedIds != null && response.data.addedIds.indexOf(Number($scope.searchresult.searchResultId)) > -1)) {
                        $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-success" : "nzbget-success";
                    } else {
                        $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                        growl.error(response.data.message);
                    }
                } else {
                    $scope.cssClass = originalClass;
                }
            }, function () {
                $scope.cssClass = $scope.downloader.downloaderType === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                growl.error("An unexpected error occurred while trying to contact NZBHydra or add the NZB.");
            })
        };
    }
}