angular
    .module('nzbhydraApp').directive("columnFilterWrapper", columnFilterWrapper);

function columnFilterWrapper() {
    return {
        restrict: "E",
        templateUrl: 'static/html/dataTable/columnFilterOuter.html',
        transclude: true,
        controllerAs: 'columnFilterWrapperCtrl',
        scope: true,
        bindToController: true,
        controller: controller,
        link: function (scope, element, attr) {
            scope.element = element;

        }
    };

    function controller($scope, DebugService) {
        var vm = this;

        vm.open = false;
        vm.isActive = false;

        vm.toggle = function () {
            vm.open = !vm.open;
            if (vm.open) {
                $scope.$broadcast("opened");
            }
        };

        vm.clear = function() {
            if (vm.open) {
                $scope.$broadcast("clear");
            }
        };

        $scope.$on("filter", function (event, column, filterModel, isActive) {
            vm.open = false;
            vm.isActive = isActive;
        });

        DebugService.log("filter-wrapper");

    }

}


angular
    .module('nzbhydraApp').directive("freetextFilter", freetextFilter);

function freetextFilter(DebugService) {
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterFreetext.html\'"/>',
        require: "^columnFilterWrapper",
        controllerAs: 'innerController',
        scope: {
            column: "@"
        },
        controller: controller
    };

    function controller($scope, focus) {
        $scope.data = {};

        $scope.$on("opened", function () {
            focus("freetext-filter-input");
        });

        $scope.onKeypress = function (keyEvent) {
            if (keyEvent.which === 13) {
                $scope.$emit("filter", $scope.column, {filterValue: $scope.data.filter, filterType: "freetext"}, angular.isDefined($scope.data.filter) && $scope.data.filter.length > 0);
            }
        }
        DebugService.log("filter-freetext");
    }
}

angular
    .module('nzbhydraApp').directive("checkboxesFilter", checkboxesFilter);

function checkboxesFilter() {
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterCheckboxes.html\'"/>',
        controllerAs: 'checkboxesFilterController',
        scope: {
            column: "@",
            entries: "<",
            preselect: "<",
            showInvert: "<",
            isBoolean: "<"
        },
        controller: controller
    };

    function controller($scope, DebugService) {
        $scope.selected = {
            entries: []
        };
        $scope.active = false;

        if ($scope.preselect) {
            $scope.selected.entries.push.apply($scope.selected.entries, $scope.entries);
        }

        $scope.invert = function () {
            $scope.selected.entries = _.difference($scope.entries, $scope.selected.entries);
        };

        $scope.selectAll = function () {
            $scope.selected.entries.push.apply($scope.selected.entries, $scope.entries);
        };

        $scope.deselectAll = function () {
            $scope.selected.entries.splice(0, $scope.selected.entries.length);
        };

        $scope.apply = function () {
            $scope.active =   $scope.selected.entries.length < $scope.entries.length;
            $scope.$emit("filter", $scope.column, {filterValue: _.pluck($scope.selected.entries, "id"), filterType: "checkboxes", isBoolean: $scope.isBoolean}, $scope.active)
        };
        $scope.clear = function () {

            $scope.selectAll();
            $scope.active = false;
            $scope.$emit("filter", $scope.column, {filterValue: undefined, filterType: "checkboxes", isBoolean: $scope.isBoolean}, $scope.active)
        };
        $scope.$on("clear", $scope.clear);
        DebugService.log("filter-checkboxes");
    }
}

angular
    .module('nzbhydraApp').directive("booleanFilter", booleanFilter);

function booleanFilter(DebugService) {
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterBoolean.html\'"/>',
        controllerAs: 'booleanFilterController',
        scope: {
            column: "@",
            options: "<",
            preselect: "@"
        },
        controller: controller
    };


    function controller($scope) {
        $scope.selected = {value: $scope.options[$scope.preselect].value};
        $scope.active = false;

        $scope.apply = function () {
            $scope.active = $scope.selected.value !== $scope.options[0].value;
            $scope.$emit("filter", $scope.column, {filterValue: $scope.selected.value, filterType: "boolean"}, $scope.active)
        };
        $scope.clear = function () {
            $scope.selected.value = true;
            $scope.active = false;
            $scope.$emit("filter", $scope.column, {filterValue: undefined, filterType: "boolean"}, $scope.active)
        };
        $scope.$on("clear", $scope.clear);
        DebugService.log("filter-boolean");
    }
}

angular
    .module('nzbhydraApp').directive("timeFilter", timeFilter);

function timeFilter() {
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterTime.html\'"/>',
        scope: {
            column: "@",
            selected: "<"
        },
        controller: controller
    };

    function controller($scope, DebugService) {

        $scope.dateOptions = {
            dateDisabled: false,
            formatYear: 'yy',
            startingDay: 1
        };

        $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
        $scope.format = $scope.formats[0];
        $scope.altInputFormats = ['M!/d!/yyyy'];
        $scope.active = false;

        $scope.openAfter = function () {
            $scope.after.opened = true;
        };

        $scope.openBefore = function () {
            $scope.before.opened = true;
        };

        $scope.after = {
            opened: false
        };

        $scope.before = {
            opened: false
        };

        $scope.apply = function () {
            $scope.active = $scope.selected.beforeDate || $scope.selected.afterDate;
            $scope.$emit("filter", $scope.column, {filterValue: {after: $scope.selected.afterDate, before: $scope.selected.beforeDate}, filterType: "time"}, $scope.active)
        };
        $scope.clear = function () {
            $scope.selected.beforeDate = undefined;
            $scope.selected.afterDate = undefined;
            $scope.active = false;
            $scope.$emit("filter", $scope.column, {filterValue: undefined, filterType: "time"}, $scope.active)
        };
        $scope.$on("clear", $scope.clear);
        DebugService.log("filter-time");
    }
}

angular
    .module('nzbhydraApp').directive("numberRangeFilter", numberRangeFilter);

function numberRangeFilter() {
    return {
        template: '<ng-include src="\'static/html/dataTable/columnFilterNumberRange.html\'"/>',
        scope: {
            column: "@",
            min: "<",
            max: "<",
            addon: "@"
        },
        controller: controller
    };

    function controller($scope, DebugService) {
        $scope.filterValue = {min: undefined, max: undefined};
        $scope.active = false;

        function apply() {
            $scope.active = $scope.filterValue.min || $scope.filterValue.max;
            $scope.$emit("filter", $scope.column, {filterValue: $scope.filterValue, filterType: "numberRange"}, $scope.active)
        }
        $scope.clear = function () {
            $scope.filterValue = {min: undefined, max: undefined};
            $scope.active = false;
            $scope.$emit("filter", $scope.column, {filterValue: undefined, filterType: "numberRange", isBoolean: $scope.isBoolean}, $scope.active)
        };
        $scope.$on("clear", $scope.clear);

        $scope.apply = function () {
            apply();
        };

        $scope.onKeypress = function (keyEvent) {
            if (keyEvent.which === 13) {
                apply();
            }
        }

        DebugService.log("filter-number");
    }
}


angular
    .module('nzbhydraApp').directive("columnSortable", columnSortable);

function columnSortable() {
    return {
        restrict: "E",
        templateUrl: "static/html/dataTable/columnSortable.html",
        transclude: true,
        scope: {
            sortMode: "<", //0: no sorting, 1: asc, 2: desc
            column: "@",
            reversed: "<",
            startMode: "<"
        },
        controller: controller
    };

    function controller($scope) {
        if (angular.isUndefined($scope.sortMode)) {
            $scope.sortMode = 0;
        }

        if (angular.isUndefined($scope.startMode)) {
            $scope.startMode = 1;
        }

        $scope.sortModel = {
            sortMode: $scope.sortMode,
            column: $scope.column,
            reversed: $scope.reversed,
            startMode: $scope.startMode,
            active: false
        };

        $scope.$on("newSortColumn", function (event, column, sortMode) {
            $scope.sortModel.active = column === $scope.sortModel.column;
            if (column !== $scope.sortModel.column) {
                $scope.sortModel.sortMode = 0;
            } else {
                $scope.sortModel.sortMode = sortMode;
            }
        });

        $scope.sort = function () {
            if ($scope.sortModel.sortMode === 0 || angular.isUndefined($scope.sortModel.sortMode)) {
                $scope.sortModel.sortMode = $scope.sortModel.startMode;
            } else if ($scope.sortModel.sortMode === 1) {
                $scope.sortModel.sortMode = 2;
            } else {
                $scope.sortModel.sortMode = 1;
            }
            $scope.$emit("sort", $scope.sortModel.column, $scope.sortModel.sortMode, $scope.sortModel.reversed)
        };

    }
}