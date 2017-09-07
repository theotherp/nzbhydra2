angular
    .module('nzbhydraApp')
    .controller('DownloadHistoryController', DownloadHistoryController);


function DownloadHistoryController($scope, StatsService, downloads, ConfigService, $timeout, $sce) {
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

    $scope.getStatusIcon = function (result) {
        var spans;
        if (result === "NONE" || result === "REQUESTED") {
            spans = '<span class="glyphicon glyphicon-question-sign"></span>'
        }
        if (result === "INTERNAL_ERROR") {
            spans = '<span class="glyphicon glyphicon-remove"></span>'
        }
        if (result === "INTERNAL_ERROR") {
            spans = '<span class="glyphicon glyphicon-remove"></span>'
        }
        if (result === 'NZB_DOWNLOAD_SUCCESSFUL') {
            spans = '<span class="glyphicon glyphicon-ok"></span>';
        }
        if (result === 'NZB_DOWNLOAD_ERROR') {
            spans = '<span class="glyphicon glyphicon-remove"></span>';
        }
        if (result === 'NZB_ADDED') {
            spans = '<span class="glyphicon glyphicon-ok" style="margin-right: 3px"></span><span class="glyphicon glyphicon-question-sign"></span>';
        }
        if (result === 'NZB_NOT_ADDED' || result === 'NZB_ADD_ERROR' || result === 'NZB_ADD_REJECTED') {
            spans = '<span class="glyphicon glyphicon-ok" style="margin-right: 3px"></span><span class="glyphicon glyphicon-remove"></span>';
        }
        if (result === 'CONTENT_DOWNLOAD_SUCCESSFUL') {
            spans = '<span class="glyphicon glyphicon-ok" style="margin-right: 3px"><span class="glyphicon glyphicon-ok"></span><span class="glyphicon glyphicon-ok"></span>';
        }
        if (result === 'CONTENT_DOWNLOAD_ERROR' || result === 'CONTENT_DOWNLOAD_WARNING') {
            spans = '<span class="glyphicon glyphicon-ok" style="margin-right: 3px"><span class="glyphicon glyphicon-ok"></span><span class="glyphicon glyphicon-remove"></span>';
        }
        return $sce.trustAsHtml('<span tooltip-placement="auto top" uib-tooltip="' + result + '">' + spans + '</span>');

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