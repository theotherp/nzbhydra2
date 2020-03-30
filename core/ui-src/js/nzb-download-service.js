angular
    .module('nzbhydraApp')
    .factory('NzbDownloadService', NzbDownloadService);

function NzbDownloadService($http, ConfigService, DownloaderCategoriesService) {

    var service = {
        download: download,
        getEnabledDownloaders: getEnabledDownloaders
    };

    return service;

    function sendNzbAddCommand(downloader, searchResults, category) {
        var params = {
            downloaderName: downloader.name,
            searchResults: searchResults,
            category: category
        };
        return $http.put("internalapi/downloader/addNzbs", params);
    }

    function download(downloader, searchResults, alwaysAsk) {
        var category = downloader.defaultCategory;
        if (alwaysAsk || ((_.isUndefined(category) || category === "" || category === null) && category !== "Use original category") && category !== "Use mapped category" && category !== "Use no category") {
            return DownloaderCategoriesService.openCategorySelection(downloader).then(function (category) {
                return sendNzbAddCommand(downloader, searchResults, category);
            }, function (result) {
                return result;
            });
        } else {
            return sendNzbAddCommand(downloader, searchResults, category)
        }
    }

    function getEnabledDownloaders() {
        return _.filter(ConfigService.getSafe().downloading.downloaders, "enabled");
    }
}

