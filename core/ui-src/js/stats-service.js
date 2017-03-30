angular
    .module('nzbhydraApp')
    .factory('StatsService', StatsService);

function StatsService($http) {

    return {
        get: getStats,
        getDownloadHistory: getDownloadHistory
    };

    function getStats(after, before) {
        return $http.post("internalapi/stats", {after: after, before: before}).success(function (response) {
            return response.data;
        });
    }

    function getDownloadHistory(pageNumber, limit, filterModel, sortModel) {
        var params = {page: pageNumber, limit: limit, filterModel: filterModel};
        if (angular.isUndefined(pageNumber)) {
            params.page = 1;
        }
        if (angular.isUndefined(limit)) {
            params.limit = 100;
        }
        if (angular.isUndefined(filterModel)) {
            params.filterModel = {}
        }
        if (!angular.isUndefined(sortModel)) {
            params.sortModel = sortModel;
        } else {
            params.sortModel = {
                column: "time",
                sortMode: 2
            };
        }
        return $http.post("internalapi/history/downloads", params).success(function (response) {
            return {
                nzbDownloads: response.content,
                totalDownloads: response.totalElements
            };

        });
    }

}