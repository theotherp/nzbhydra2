angular
    .module('nzbhydraApp')
    .factory('DirectoryListingRequestFactory', DirectoryListingRequestFactory);

function DirectoryListingRequestFactory() {
    return {
        build: build
    };

    // Keep this JSON shape aligned with org.nzbhydra.config.FileSystemBrowser.DirectoryListingRequest.
    function build(fullPath, type, goUp) {
        return {
            fullPath: angular.isUndefined(fullPath) ? null : fullPath,
            type: type,
            goUp: goUp === true
        };
    }
}
