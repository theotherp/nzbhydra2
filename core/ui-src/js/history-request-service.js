angular
    .module('nzbhydraApp')
    .factory('HistoryRequestFactory', HistoryRequestFactory);

function HistoryRequestFactory() {
    return {
        build: build
    };

    // Keep this JSON shape aligned with org.nzbhydra.historystats.stats.HistoryRequest.
    function build(page, limit, filterModel, sortModel, distinct, onlyCurrentUser) {
        return {
            page: angular.isUndefined(page) ? 1 : page,
            limit: angular.isUndefined(limit) ? 100 : limit,
            filterModel: angular.isUndefined(filterModel) ? {} : filterModel,
            sortModel: angular.isUndefined(sortModel) ? {column: "time", sortMode: 2} : sortModel,
            distinct: angular.isUndefined(distinct) ? false : distinct,
            onlyCurrentUser: angular.isUndefined(onlyCurrentUser) ? false : onlyCurrentUser
        };
    }
}
