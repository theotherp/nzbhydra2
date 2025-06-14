angular
    .module('nzbhydraApp')
    .directive('addableNzbs', addableNzbs);

function addableNzbs(DebugService) {
    return {
        templateUrl: 'static/html/directives/addable-nzbs.html',
        require: [],
        scope: {
            searchresult: "<",
            alwaysAsk: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService) {
        $scope.alwaysAsk = $scope.alwaysAsk === "true";
        $scope.downloaders = _.filter(NzbDownloadService.getEnabledDownloaders(), function (downloader) {
            // console.log(downloader.downloaderType);
            // console.log($scope.searchresult.downloadType);
            if ($scope.searchresult.downloadType === "TORBOX" && downloader.downloaderType === "TORBOX") {
                return true;
            }
            if ($scope.searchresult.downloadType !== "NZB") {
                return downloader.downloadType === $scope.searchresult.downloadType
            }
            return true;
        });
        console.log($scope.downloaders);
    }
}
