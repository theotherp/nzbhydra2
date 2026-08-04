angular
    .module('nzbhydraApp')
    .factory('DownloaderRequestFactory', DownloaderRequestFactory);

function DownloaderRequestFactory() {
    return {
        buildAddFilesRequest: buildAddFilesRequest
    };

    // Keep this JSON shape aligned with org.nzbhydra.downloading.AddFilesRequest.
    function buildAddFilesRequest(downloader, searchResults, category, reason) {
        return {
            downloaderName: downloader.name,
            searchResults: angular.isArray(searchResults) ? searchResults : [],
            category: angular.isUndefined(category) ? null : category,
            reason: angular.isUndefined(reason) ? null : reason
        };
    }
}
