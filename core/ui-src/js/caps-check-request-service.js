angular
    .module('nzbhydraApp')
    .factory('CapsCheckRequestFactory', CapsCheckRequestFactory);

function CapsCheckRequestFactory() {
    return {
        build: build
    };

    // Keep this JSON shape aligned with org.nzbhydra.config.indexer.CapsCheckRequest.
    function build(indexerConfig, checkType) {
        return {
            indexerConfig: angular.isUndefined(indexerConfig) ? null : indexerConfig,
            checkType: checkType
        };
    }
}
