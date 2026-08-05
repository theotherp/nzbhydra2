angular
    .module('nzbhydraApp')
    .factory('DebugInfoRequestFactory', DebugInfoRequestFactory);

function DebugInfoRequestFactory() {
    return {
        buildJsonLogParams: buildJsonLogParams,
        buildSensitiveDataLoggingParams: buildSensitiveDataLoggingParams
    };

    function buildJsonLogParams(offset, limit) {
        return {
            offset: normalizeOffset(offset),
            limit: normalizeLimit(limit)
        };
    }

    function buildSensitiveDataLoggingParams(enabled) {
        return {enabled: enabled === true};
    }

    function normalizeOffset(offset) {
        offset = Number(offset);
        return isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
    }

    function normalizeLimit(limit) {
        limit = Number(limit);
        return isFinite(limit) && limit > 0 ? Math.floor(limit) : 500;
    }
}
