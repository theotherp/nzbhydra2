angular
    .module('nzbhydraApp')
    .factory('NzbDownloadService', NzbDownloadService);

function NzbDownloadService($http, ConfigService, DownloaderCategoriesService) {

    var service = {
        download: download,
        getEnabledDownloaders: getEnabledDownloaders
    };

    return service;

    function sendNzbAddCommand(downloader, searchresultids, category) {
        var params = {downloaderName: downloader.name, searchResultIds: searchresultids};
        if (category !== "No category") {
            params["category"] = category;
        }
        return $http.put("internalapi/downloader/addNzbs", params);
    }

    function download(downloader, searchresultids) {

        var category = downloader.defaultCategory;

        if ((_.isUndefined(category) || category === "" || category === null) && category !== "No category") {
            return DownloaderCategoriesService.openCategorySelection(downloader).then(function (category) {
                return sendNzbAddCommand(downloader, searchresultids, category)
            }, function (error) {
                throw error;
            });
        } else {
            return sendNzbAddCommand(downloader, searchresultids, category)
        }
    }

    function getEnabledDownloaders() {
        return _.filter(ConfigService.getSafe().downloading.downloaders, "enabled");
    }
}

