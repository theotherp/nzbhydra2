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

    function controller($scope, $document) {
        var vm = this;

        vm.open = false;
        vm.isActive = false;

        vm.toggle = function () {
            vm.open = !vm.open;
            if (vm.open) {
                $scope.$broadcast("opened");
            }
        };

        $scope.$on("filter", function (event, column, filterModel, isActive) {
            vm.open = false;
            vm.isActive = isActive;
        });


    }

}


angular
    .module('nzbhydraApp').directive("freetextFilter", freetextFilter);

function freetextFilter() {
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

    function controller($scope) {
        $scope.selected = {
            entries: []
        };

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
            var isActive = $scope.selected.entries.length < $scope.entries.length;
            $scope.$emit("filter", $scope.column, {filterValue: _.pluck($scope.selected.entries, "id"), filterType: "checkboxes", isBoolean: $scope.isBoolean}, isActive)
        }
    }
}

angular
    .module('nzbhydraApp').directive("booleanFilter", booleanFilter);

function booleanFilter() {
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

        $scope.apply = function () {

            $scope.$emit("filter", $scope.column, {filterValue: $scope.selected.value, filterType: "boolean"}, $scope.selected.value !== $scope.options[0].value)
        }
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

    function controller($scope) {

        $scope.dateOptions = {
            dateDisabled: false,
            formatYear: 'yy',
            startingDay: 1
        };

        $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
        $scope.format = $scope.formats[0];
        $scope.altInputFormats = ['M!/d!/yyyy'];

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
            var isActive = $scope.selected.beforeDate || $scope.selected.afterDate;
            $scope.$emit("filter", $scope.column, {filterValue: {after: $scope.selected.afterDate, before: $scope.selected.beforeDate}, filterType: "time"}, isActive)
        }
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

    function controller($scope) {
        $scope.filterValue = {min: undefined, max: undefined};

        function apply() {
            var isActive = $scope.filterValue.min || $scope.filterValue.max;
            $scope.$emit("filter", $scope.column, {filterValue: $scope.filterValue, filterType: "numberRange"}, isActive)
        }

        $scope.apply = function () {
            apply();
        };

        $scope.onKeypress = function (keyEvent) {
            if (keyEvent.which === 13) {
                apply();
            }
        }
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


        $scope.$on("newSortColumn", function (event, column, sortMode, reversed) {
            $scope.sortModel.active = column === $scope.sortModel.column;
            if (column !== $scope.sortModel.column) {
                $scope.sortModel.sortMode = 0;
            } else {
                $scope.sortModel.sortMode = sortMode;
                // $scope.sortModel.reversed = reversed;
            }
        });

        $scope.sort = function () {
            //0 -> 1 -> 2
            //0 -> 2 -> 1
            if ($scope.sortModel.sortMode === 0 || angular.isUndefined($scope.sortModel.sortMode)) {
                $scope.sortModel.sortMode = $scope.sortModel.startMode;
            } else if ($scope.sortModel.sortMode === 1) {
                if ($scope.sortModel.startMode === 1) {
                    $scope.sortModel.sortMode = 2;
                } else {
                    $scope.sortModel.sortMode = 0;
                }
            } else if ($scope.sortModel.sortMode === 2) {
                if ($scope.sortModel.startMode === 2) {
                    $scope.sortModel.sortMode = 1;
                } else if ($scope.sortModel.active) {
                    //Prevent active filters to going back to 0 and then being set to 2
                    $scope.sortModel.sortMode = 1;
                } else {
                    $scope.sortModel.sortMode = 0;
                }
            }

            $scope.$emit("sort", $scope.sortModel.column, $scope.sortModel.sortMode, $scope.sortModel.reversed)
        };

    }
}