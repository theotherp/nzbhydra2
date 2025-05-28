angular
    .module('nzbhydraApp')
    .directive('saveOrSendFile', saveOrSendFile);

function saveOrSendFile() {
    return {
        templateUrl: 'static/html/directives/save-or-send-file.html',
        scope: {
            searchResultId: "<",
            isFile: "<",
            type: "<"
        },
        controller: controller
    };

    function controller($scope, $http, growl, ConfigService) {
        $scope.cssClass = "glyphicon-save-file";
        var endpoint;
        var toSend = [$scope.searchResultId]
        if ($scope.type === "TORRENT") {
            $scope.enableButton = !_.isNullOrEmpty(ConfigService.getSafe().downloading.saveTorrentsTo) || ConfigService.getSafe().downloading.sendMagnetLinks;
            $scope.tooltip = "Save torrent to black hole or send magnet link";
            endpoint = "internalapi/saveOrSendTorrents";
        } else {
            $scope.tooltip = "Save NZB to black hole";
            $scope.enableButton = !_.isNullOrEmpty(ConfigService.getSafe().downloading.saveNzbsTo);
            endpoint = "internalapi/saveNzbsToBlackhole";
        }
        $scope.add = function () {
            $scope.cssClass = "nzb-spinning";
            $http.put(endpoint, toSend).then(function (response) {
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
