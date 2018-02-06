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

  function controller($scope, $http, NzbDownloadService, ConfigService, growl) {

    $scope.downloaders = NzbDownloadService.getEnabledDownloaders();
    $scope.blackholeEnabled = ConfigService.getSafe().downloading.saveTorrentsTo !== null;

    $scope.download = function(downloader) {
      if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length === 0) {
        growl.info("You should select at least one result...");
      } else {

        var didFilterOutResults = false;
        var didKeepAnyResults = false;
        var searchResults = _.filter($scope.searchResults, function(value) {
          if (value.downloadType === "NZB") {
            didKeepAnyResults = true;
            return true;
          } else {
            console.log("Not sending torrent result to downloader");
            didFilterOutResults = true;
            return false;
          }
        });
        if (didFilterOutResults && !didKeepAnyResults) {
          growl.info("None of the selected results were NZBs. Adding aborted");
          if (angular.isDefined($scope.callback)) {
            $scope.callback({
              result: []
            });
          }
          return;
        } else if (didFilterOutResults && didKeepAnyResults) {
          growl.info("Some the selected results are torrent results which were skipped");
        }

        var tos = _.map(searchResults, function(entry) {
          return {
            searchResultId: entry.searchResultId,
            originalCategory: entry.originalCategory
          };
        });

        NzbDownloadService.download(downloader, tos).then(function(response) {
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
              $scope.callback({
                result: response.data.addedIds
              });
            }
          }
        }, function() {
          growl.error("Error while adding NZBs");
        });
      }
    };

    $scope.sendToBlackhole = function() {
      var didFilterOutResults = false;
      var didKeepAnyResults = false;
      var searchResults = _.filter($scope.searchResults, function(value) {
        if (value.downloadType === "TORRENT") {
          didKeepAnyResults = true;
          return true;
        } else {
          console.log("Not sending NZB result to black hole");
          didFilterOutResults = true;
          return false;
        }
      });
      if (didFilterOutResults && !didKeepAnyResults) {
        growl.info("None of the selected results were torrents. Adding aborted");
        if (angular.isDefined($scope.callback)) {
          $scope.callback({
            result: []
          });
        }
        return;
      } else if (didFilterOutResults && didKeepAnyResults) {
        growl.info("Some the selected results are NZB results which were skipped");
      }
      var searchResultIds = _.pluck(searchResults, "searchResultId");
      $http.put("internalapi/saveTorrent", searchResultIds).then(function(response) {
        if (response.data.successful) {
          growl.info("Successfully saved all torrents");
        } else {
          growl.error(response.data.message);
        }
        if (angular.isDefined($scope.callback)) {
          $scope.callback({
            result: response.data.addedIds
          });
        }
      });
    };

  }
}
