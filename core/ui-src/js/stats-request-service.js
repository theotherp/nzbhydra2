angular
    .module('nzbhydraApp')
    .factory('StatsRequestFactory', StatsRequestFactory);

function StatsRequestFactory() {
    return {
        build: build
    };

    // Keep this JSON shape aligned with org.nzbhydra.historystats.stats.StatsRequest.
    function build(after, before, includeDisabled, switchState) {
        switchState = switchState || {};
        return {
            after: after,
            before: before,
            includeDisabled: includeDisabled === true,
            indexerApiAccessStats: switchState.indexerApiAccessStats === true,
            avgIndexerUniquenessScore: switchState.avgIndexerUniquenessScore === true,
            avgResponseTimes: switchState.avgResponseTimes === true,
            indexerDownloadShares: switchState.indexerDownloadShares === true,
            downloadsPerDayOfWeek: switchState.downloadsPerDayOfWeek === true,
            downloadsPerHourOfDay: switchState.downloadsPerHourOfDay === true,
            searchesPerDayOfWeek: switchState.searchesPerDayOfWeek === true,
            searchesPerHourOfDay: switchState.searchesPerHourOfDay === true,
            downloadsPerAgeStats: switchState.downloadsPerAgeStats === true,
            successfulDownloadsPerIndexer: switchState.successfulDownloadsPerIndexer === true,
            downloadSharesPerUser: switchState.downloadSharesPerUser === true,
            downloadSharesPerIp: switchState.downloadSharesPerIp === true,
            searchSharesPerUser: switchState.searchSharesPerUser === true,
            searchSharesPerIp: switchState.searchSharesPerIp === true,
            userAgentSearchShares: switchState.userAgentSearchShares === true,
            userAgentDownloadShares: switchState.userAgentDownloadShares === true
        };
    }
}
