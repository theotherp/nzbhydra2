angular
    .module('nzbhydraApp')
    .controller('IndexerStatusesController', IndexerStatusesController);

function IndexerStatusesController($scope, $http, statuses) {
    $scope.statuses = statuses.data;

    $scope.isInPast = function (epochSeconds) {
        return epochSeconds < (new Date).getTime();
    };

    $scope.enable = function (indexerName) {
        $http.get("internalapi/enableindexer", {params: {name: indexerName}}).then(function (response) {
            $scope.statuses = response.data.indexerStatuses;
        });
    }

}


angular
    .module('nzbhydraApp')
    .filter('formatDate', formatDate);

function formatDate(dateFilter) {
    return function (timestamp, hidePast) {
        if (timestamp) {
            if (timestamp * 1000 < (new Date).getTime() && hidePast) {
                return ""; //
            }

            var t = timestamp * 1000;
            t = dateFilter(t, 'yyyy-MM-dd HH:mm');
            return t;
        } else {
            return "";
        }
    }
}

angular
    .module('nzbhydraApp')
    .filter('reformatDate', reformatDate);

function reformatDate() {
    return function (date) {
        //Date in database is saved as UTC without timezone information
        return moment.unix(date).local().format("YYYY-MM-DD HH:mm");

    }
}