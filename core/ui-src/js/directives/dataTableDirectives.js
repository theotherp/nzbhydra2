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
        controller: controller
    };

    function controller($scope) {
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
        })
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
                $scope.$emit("filter", $scope.column, {filter: $scope.data.filter, filtertype: "freetext"}, angular.isDefined($scope.data.filter) && $scope.data.filter.length > 0);
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
            $scope.selected.entries = $scope.entries.slice();
        }

        $scope.invert = function () {
            $scope.selected.entries = _.difference($scope.entries, $scope.selected.entries);
        };

        $scope.apply = function () {
            console.log($scope.selected);
            var isActive = $scope.selected.entries.length < $scope.entries.length;
            $scope.$emit("filter", $scope.column, {filter: _.pluck($scope.selected.entries, "id"), filtertype: "checkboxes", isBoolean: $scope.isBoolean}, isActive)
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
            console.log($scope.selected);
            $scope.$emit("filter", $scope.column, {filter: $scope.selected.value, filtertype: "boolean"}, $scope.selected.value != $scope.options[0].value)
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
            $scope.$emit("filter", $scope.column, {filter: {after: $scope.selected.afterDate, before: $scope.selected.beforeDate}, filtertype: "time"}, isActive)
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
            sortMode: "@", //0: no sorting, 1: asc, 2: desc
            column: "@"
        },
        controller: controller
    };

    function controller($scope) {

        if (angular.isUndefined($scope.sortMode)) {
            $scope.sortMode = 0;
        }

        $scope.$on("newSortColumn", function (event, column) {
            if (column != $scope.column) {
                $scope.sortMode = 0;
            }
        });

        $scope.sort = function () {
            $scope.sortMode = ($scope.sortMode + 1) % 3;
            $scope.$emit("sort", $scope.column, $scope.sortMode)
        };

    }
}