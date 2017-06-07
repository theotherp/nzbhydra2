angular
    .module('nzbhydraApp')
    .controller('DownloadHistoryController', DownloadHistoryController);


function DownloadHistoryController($scope, StatsService, downloads, ConfigService, $timeout) {
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

    //Filter options
    $scope.indexersForFiltering = [];
    _.forEach(ConfigService.getSafe().indexers, function (indexer) {
        $scope.indexersForFiltering.push({label: indexer.name, id: indexer.name})
    });
    $scope.preselectedTimeInterval = {beforeDate: null, afterDate: null};
    $scope.successfulForFiltering = [{label: "Succesful", id: 'SUCCESSFUL'}, {label: "Connection error", id: 'CONNECTION_ERROR'}, {label: "API error", id: 'API_ERROR'}, {
        label: "Auth error",
        id: 'AUTH_ERROR'
    }, {label: "Hydra error", id: 'HYDRA_ERROR'}, {label: "Unknown", id: 'UNKNOWN'}];
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: 'API'}, {label: "Internal", value: 'INTERNAL'}];


    //Preloaded data
    $scope.nzbDownloads = downloads.data.content;
    $scope.totalDownloads = downloads.data.totalElements;


    $scope.update = function () {
        StatsService.getDownloadHistory($scope.pagination.current, $scope.limit, $scope.filterModel, sortModel).then(function (downloads) {
            $scope.nzbDownloads = downloads.data.content;
            $scope.totalDownloads = downloads.data.totalElements;
        });
    };


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

    $scope.accessResult = function (result) {
        if (result === 'UNKNOWN') {
            return 'glyphicon-question-sign';
        } else if (result === 'SUCCESSFUL') {
            return 'glyphicon-ok';
        } else {
            return 'glyphicon-remove';
        }
    };


    $scope.$on("filter", function (event, column, filterModel, isActive) {
        if (filterModel.filterValue) {
            $scope.filterModel[column] = filterModel;
        } else {
            delete $scope.filterModel[column];
        }
        $scope.update();
    })

}

angular
    .module('nzbhydraApp')
    .filter('reformatDateEpoch', reformatDateEpoch);

function reformatDateEpoch() {
    return function (date) {
        return moment.unix(date).local().format("YYYY-MM-DD HH:mm");

    }
}