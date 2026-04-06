angular
    .module('nzbhydraApp')
    .factory('NzbDownloadService', NzbDownloadService);

function NzbDownloadService($http, $q, $uibModal, ConfigService, DownloaderCategoriesService) {

    var service = {
        download: download,
        getEnabledDownloaders: getEnabledDownloaders
    };

    return service;

    function buildRequest(downloader, searchResults, category, reason) {
        return {
            downloaderName: downloader.name,
            searchResults: searchResults,
            category: category,
            reason: reason
        };
    }

    function sendNzbAddCommand(downloader, searchResults, category, reason) {
        var params = buildRequest(downloader, searchResults, category, reason);
        return $http.put("internalapi/downloader/addNzbs", params);
    }

    function checkIfDuplicateMovieDownloadRequiresReason(downloader, searchResults) {
        return $http.put("internalapi/downloader/checkDuplicateMovieDownload", buildRequest(downloader, searchResults, null, null))
            .then(function (response) {
                return response.data.reasonRequired;
            });
    }

    function openDuplicateMovieReasonDialog() {
        var deferred = $q.defer();
        var modalInstance = $uibModal.open({
            templateUrl: 'static/html/directives/duplicate-movie-download-reason-modal.html',
            controller: 'DuplicateMovieDownloadReasonModalController',
            size: 'md'
        });

        modalInstance.result.then(function (reason) {
            deferred.resolve(reason);
        }, function () {
            deferred.reject("dismissed");
        });

        return deferred.promise;
    }

    function download(downloader, searchResults, alwaysAsk) {
        var category = downloader.defaultCategory;
        return checkIfDuplicateMovieDownloadRequiresReason(downloader, searchResults).then(function (reasonRequired) {
            if (reasonRequired) {
                return openDuplicateMovieReasonDialog();
            }
            return null;
        }).then(function (reason) {
            if (alwaysAsk || (_.isNullOrEmpty(category) && category !== "Use original category") && category !== "Use mapped category" && category !== "Use no category") {
                return DownloaderCategoriesService.openCategorySelection(downloader).then(function (category) {
                    return sendNzbAddCommand(downloader, searchResults, category, reason);
                }, function (result) {
                    return result;
                });
            }
            return sendNzbAddCommand(downloader, searchResults, category, reason);
        }, function (result) {
            return result;
        });
    }

    function getEnabledDownloaders() {
        return _.filter(ConfigService.getSafe().downloading.downloaders, "enabled");
    }
}

angular
    .module('nzbhydraApp')
    .controller('DuplicateMovieDownloadReasonModalController', DuplicateMovieDownloadReasonModalController);

function DuplicateMovieDownloadReasonModalController($scope, $uibModalInstance) {

    $scope.reason = "";

    $scope.confirm = function () {
        $uibModalInstance.close($scope.reason);
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };
}

