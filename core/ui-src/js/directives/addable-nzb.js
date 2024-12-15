angular
    .module('nzbhydraApp')
    .directive('addableNzb', addableNzb);

function getCssClass(downloaderType) {
    if (downloaderType === "SABNZBD") {
        return "sabnzbd";
    } else if (downloaderType === "TORBOX") {
        return "torbox";
    } else {
        return "nzbget";
    }
}

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
            $scope.cssClass = getCssClass($scope.downloader.downloaderType);
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
                        $scope.cssClass = getCssClass($scope.downloader.downloaderType) + "-success";
                    } else {
                        $scope.cssClass = getCssClass($scope.downloader.downloaderType) + "-error";
                        growl.error(response.data.message);
                    }
                } else {
                    $scope.cssClass = originalClass;
                }
            }, function () {
                $scope.cssClass = getCssClass($scope.downloader.downloaderType) + "-error";
                growl.error("An unexpected error occurred while trying to contact NZBHydra or add the NZB.");
            })
        };
    }
}