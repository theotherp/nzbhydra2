angular
    .module('nzbhydraApp')
    .factory('StatsService', StatsService);

function StatsService($http, HistoryRequestFactory, StatsRequestFactory) {

    return {
        get: getStats,
        getDownloadHistory: getDownloadHistory,
        getNotificationHistory: getNotificationHistory
    };

    function getStats(after, before, includeDisabled, switchState) {
        var requestBody = StatsRequestFactory.build(after, before, includeDisabled, switchState);
        return $http.post("internalapi/stats", requestBody).then(function (response) {
            return response.data;
        });
    }

    function getDownloadHistory(pageNumber, limit, filterModel, sortModel) {
        var params = HistoryRequestFactory.build(pageNumber, limit, filterModel, sortModel);
        return $http.post("internalapi/history/downloads", params).then(function (response) {
            return {
                nzbDownloads: response.data.content,
                totalDownloads: response.data.totalElements
            };

        });
    }

    function getNotificationHistory(pageNumber, limit, filterModel, sortModel) {
        var params = HistoryRequestFactory.build(pageNumber, limit, filterModel, sortModel);
        return $http.post("internalapi/history/notifications", params).then(function (response) {
            return {
                notifications: response.data.content,
                totalNotifications: response.data.totalElements
            };

        });
    }

}
