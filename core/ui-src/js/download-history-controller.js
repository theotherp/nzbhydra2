angular
    .module('nzbhydraApp')
    .controller('DownloadHistoryController', DownloadHistoryController);


function DownloadHistoryController($scope, StatsService, downloads, ConfigService) {
    $scope.limit = 100;
    $scope.pagination = {
        current: 1
    };
    $scope.sortModel = {
        column: "time",
        sortMode: 2
    };
    $scope.filterModel = {};

    //Filter options
    $scope.indexersForFiltering = [];
    _.forEach(ConfigService.getSafe().indexers, function (indexer) {
        $scope.indexersForFiltering.push({label: indexer.name, id: indexer.name})
    });
    $scope.preselectedTimeInterval = {beforeDate: null, afterDate: null};
    $scope.successfulForFiltering = [{label: "Succesful", id: true}, {label: "Unsuccesful", id: false}, {label: "Unknown", id: null}];
    $scope.accessOptionsForFiltering = [{label: "All", value: "all"}, {label: "API", value: false}, {label: "Internal", value: true}];


    //Preloaded data
    $scope.nzbDownloads = downloads.data.nzbDownloads;
    $scope.totalDownloads = downloads.data.totalDownloads;


    $scope.update = function () {
        StatsService.getDownloadHistory($scope.pagination.current, $scope.limit, $scope.filterModel, $scope.sortModel).then(function (downloads) {
            $scope.nzbDownloads = downloads.data.nzbDownloads;
            $scope.totalDownloads = downloads.data.totalDownloads;
        });
    };


    $scope.$on("sort", function (event, column, sortMode) {
        if (sortMode == 0) {
            column = "time";
            sortMode = 2;
        }
        $scope.sortModel = {
            column: column,
            sortMode: sortMode
        };
        $scope.$broadcast("newSortColumn", column);
        $scope.update();
    });


    $scope.$on("filter", function (event, column, filterModel, isActive) {
        if (filterModel.filter) {
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