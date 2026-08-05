angular
    .module('nzbhydraApp')
    .factory('IndexerConfigImportRequestFactory', IndexerConfigImportRequestFactory);

function IndexerConfigImportRequestFactory() {
    return {
        buildProwlarr: buildProwlarr,
        buildJackett: buildJackett
    };

    // Keep these JSON shapes aligned with IndexerWeb's importer request DTOs.
    function buildProwlarr(existingIndexers, prowlarrConfig) {
        return {
            existingIndexers: angular.isArray(existingIndexers) ? existingIndexers : [],
            prowlarrConfig: angular.isUndefined(prowlarrConfig) ? null : prowlarrConfig
        };
    }

    function buildJackett(existingIndexers, jackettConfig) {
        return {
            existingIndexers: angular.isArray(existingIndexers) ? existingIndexers : [],
            jackettConfig: angular.isUndefined(jackettConfig) ? null : jackettConfig
        };
    }
}
