angular
    .module('nzbhydraApp')
    .factory('StatsService', StatsService);

function StatsService($http) {

    return {
        get: getStats,
        getDownloadHistory: getDownloadHistory,
        getNotificationHistory: getNotificationHistory
    };

    function getStats(after, before, includeDisabled, switchState) {
        var requestBody = {after: after, before: before, includeDisabled: includeDisabled};
        requestBody = _.extend(requestBody, switchState);
        return $http.post("internalapi/stats", requestBody).then(function (response) {
            return response.data;
        });
    }

    function buildParams(pageNumber, limit, filterModel, sortModel) {
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
        return params;
    }

    function getDownloadHistory(pageNumber, limit, filterModel, sortModel) {
        var params = buildParams(pageNumber, limit, filterModel, sortModel);
        return $http.post("internalapi/history/downloads", params).then(function (response) {
            return {
                nzbDownloads: response.data.content,
                totalDownloads: response.data.totalElements
            };

        });
    }

    function getNotificationHistory(pageNumber, limit, filterModel, sortModel) {
        var params = buildParams(pageNumber, limit, filterModel, sortModel);
        return $http.post("internalapi/history/notifications", params).then(function (response) {
            return {
                notifications: response.data.content,
                totalNotifications: response.data.totalElements
            };

        });
    }

}