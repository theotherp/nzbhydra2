angular
    .module('nzbhydraApp')
    .directive('addableNzb', addableNzb);

function addableNzb() {
    return {
        templateUrl: 'static/html/directives/addable-nzb.html',
        scope: {
            searchResultId: "<",
            downloader: "<"
        },
        controller: controller
    };

    function controller($scope, NzbDownloadService, growl) {
        if ($scope.downloader.iconCssClass) {
            $scope.cssClass = "fa fa-" + $scope.downloader.iconCssClass.replace("fa-", "").replace("fa ", "");
        } else {
            $scope.cssClass = $scope.downloader.type === "SABNZBD" ? "sabnzbd" : "nzbget";
        }

        $scope.add = function () {
            $scope.cssClass = "nzb-spinning";
            NzbDownloadService.download($scope.downloader, [$scope.searchResultId]).then(function (response) {
                if (response.data.success) {
                    $scope.cssClass = $scope.downloader.type === "SABNZBD" ? "sabnzbd-success" : "nzbget-success";
                } else {
                    $scope.cssClass = $scope.downloader.type === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                    growl.error("Unable to add NZB. Make sure the downloader is running and properly configured.");
                }
            }, function () {
                $scope.cssClass = $scope.downloader.type === "SABNZBD" ? "sabnzbd-error" : "nzbget-error";
                growl.error("An unexpected error occurred while trying to contact NZB Hydra or add the NZB.");
            })
        };


    }
}
