angular
    .module('nzbhydraApp')
    .directive('saveOrSendTorrent', saveOrSendTorrent);

function saveOrSendTorrent() {
    return {
        templateUrl: 'static/html/directives/save-or-send-torrent.html',
        scope: {
            searchResultId: "<",
            isFile: "<"
        },
        controller: controller
    };

    function controller($scope, $http, growl, ConfigService) {
        $scope.enableButton = (ConfigService.getSafe().downloading.saveTorrentsTo !== null && ConfigService.getSafe().downloading.saveTorrentsTo !== "") || ConfigService.getSafe().downloading.sendMagnetLinks;
        $scope.cssClass = "glyphicon-save-file";
        $scope.add = function () {
            $scope.cssClass = "nzb-spinning";
            $http.put("internalapi/saveOrSendTorrent", [$scope.searchResultId]).then(function (response) {
                if (response.data.successful) {
                    $scope.cssClass = "glyphicon-ok";
                } else {
                    $scope.cssClass = "glyphicon-remove";
                    growl.error(response.data.message);
                }
            });
        };
    }
}
