angular
    .module('nzbhydraApp')
    .directive('addableNzbs', addableNzbs);

function addableNzbs() {
    return {
        templateUrl: 'static/html/directives/addable-nzbs.html',
        require: ['^searchResultId'],
        scope: {
            searchResultId: "<",
            downloadType: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService) {
        $scope.downloaders = _.filter(NzbDownloadService.getEnabledDownloaders(), function (downloader) {
            if ($scope.downloadType != "nzb") {
                return downloader.downloadType == $scope.downloadType
            }
            return true;
        });
    }
}
