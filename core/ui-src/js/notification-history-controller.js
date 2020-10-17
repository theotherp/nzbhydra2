angular
    .module('nzbhydraApp')
    .controller('NotificationHistoryController', NotificationHistoryController);


function NotificationHistoryController($scope, StatsService, preloadData, ConfigService, $timeout, NotificationService) {
    $scope.limit = 100;
    $scope.pagination = {
        current: 1
    };
    var sortModel = {
        column: "time",
        sortMode: 2
    };
    $timeout(function () {
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode);
    }, 10);
    $scope.filterModel = {};

    $scope.preselectedTimeInterval = {beforeDate: null, afterDate: null};


    //Preloaded data
    $scope.notifications = preloadData.notifications;
    $scope.totalNotifications = preloadData.totalNotifications;


    $scope.columnSizes = {
        time: 10,
        type: 15,
        title: 15,
        body: 40,
        urls: 20
    };

    $scope.update = function () {
        StatsService.getNotificationHistory($scope.pagination.current, $scope.limit, $scope.filterModel, sortModel).then(function (data) {
            $scope.notifications = data.notifications;
            $scope.totalNotifications = data.totalNotifications;
        });
    };


    $scope.eventTypesForFiltering = [];
    var eventTypes = NotificationService.getAllEventTypes();
    _.each(eventTypes, function (key) {
        $scope.eventTypesForFiltering.push({label: NotificationService.humanize(key), id: key})
    })

    $scope.$on("sort", function (event, column, sortMode) {
        if (sortMode === 0) {
            column = "time";
            sortMode = 2;
        }
        sortModel = {
            column: column,
            sortMode: sortMode
        };
        $scope.$broadcast("newSortColumn", sortModel.column, sortModel.sortMode);
        $scope.update();
    });

    $scope.$on("filter", function (event, column, filterModel, isActive) {
        if (filterModel.filterValue) {
            $scope.filterModel[column] = filterModel;
        } else {
            delete $scope.filterModel[column];
        }
        $scope.update();
    })

    $scope.formatEventType = function (notification) {
        return NotificationService.humanize(notification.notificationEventType);
    };

    $scope.formatEventBody = function (notification) {
        return notification.body.replace("\n", "<br>");
    };

}

angular
    .module('nzbhydraApp')
    .filter('reformatDateEpoch', reformatDateEpoch);

function reformatDateEpoch() {
    return function (date) {
        return moment.unix(date).local().format("YYYY-MM-DD HH:mm");

    }
}
