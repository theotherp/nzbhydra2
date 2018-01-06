angular
    .module('nzbhydraApp')
    .directive('sendTorrentToBlackhole', sendTorrentToBlackhole);

function sendTorrentToBlackhole() {
    return {
        templateUrl: 'static/html/directives/send-torrent-to-blackhole.html',
        scope: {
            searchResultId: "<"
        },
        controller: controller
    };

    function controller($scope, $http, growl, ConfigService, DebugService) {
        $scope.useBlackhole = ConfigService.getSafe().downloading.saveTorrentsTo !== null && ConfigService.getSafe().downloading.saveTorrentsTo !== "";
        $scope.cssClass = "glyphicon-save-file";
        $scope.add = function () {
            $scope.cssClass = "nzb-spinning";
            $http.put("internalapi/saveTorrent", [$scope.searchResultId]).then(function (response) {
                if (response.data.successful) {
                    $scope.cssClass = "glyphicon-ok";
                } else {
                    $scope.cssClass = "glyphicon-remove";
                    growl.error(response.data.message);
                }
            });

        };
        DebugService.log("blackhole");

    }
}
