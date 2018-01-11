//Fork of https://github.com/dotansimha/angularjs-dropdown-multiselect to make it compatible with formly
angular
    .module('nzbhydraApp')
    .directive('multiselectDropdown',

        dropdownMultiselectDirective
    );

function dropdownMultiselectDirective() {
    return {
        scope: {
            selectedModel: '=',
            options: '=',
            settings: '=?',
            events: '=?'
        },
        transclude: {
            toggleDropdown: '?toggleDropdown'
        },
        templateUrl: 'static/html/directives/multiselect-dropdown.html',
        controller: function dropdownMultiselectController($scope, $element, $filter, $document) {
            var $dropdownTrigger = $element.children()[0];

            var settings = {
                showSelectedValues: true
            };
            angular.extend(settings, $scope.settings || []);
            angular.extend($scope, {settings: settings});

            $scope.buttonText = "";
                $scope.$watch("selectedModel", function () {
                    if (settings.showSelectedValues) {
                        if ($scope.selectedModel.length === 0){
                            $scope.buttonText = "None selected";
                        }else if ($scope.selectedModel.length === $scope.options.length){
                            $scope.buttonText = "All selected";
                        } else {
                            $scope.buttonText = $scope.selectedModel.join(", ");
                        }
                    } else {
                        $scope.buttonText = $scope.selectedModel.length + " / " + $scope.options.length + " selected";
                    }
                }, true);
            $scope.open = false;

            $scope.toggleDropdown = function() {
                $scope.open = !$scope.open;
            };

            $scope.toggleItem = function(option) {
                var index = $scope.selectedModel.indexOf(option.id);
                var oldValue = index > -1;
                if (oldValue) {
                    $scope.selectedModel.splice(index, 1);
                } else {
                    $scope.selectedModel.push(option.id);
                }
            };

            $scope.selectAll = function() {
                $scope.selectedModel = _.pluck($scope.options, "id");
            };

            $scope.deselectAll = function() {
                $scope.selectedModel.splice(0, $scope.selectedModel.length);
            };

            //Close when clicked outside

            $document.on('click', function (e) {
                function contains(collection, target) {
                    var containsTarget = false;
                    collection.some(function (object) {
                        if (object === target) {
                            containsTarget = true;
                            return true;
                        }
                        return false;
                    });
                    return containsTarget;
                }

                if ($scope.open) {
                    var target = e.target.parentElement;
                    var parentFound = false;

                    while (angular.isDefined(target) && target !== null && !parentFound) {
                        if (!!target.className.split && contains(target.className.split(' '), 'multiselect-parent') && !parentFound) {
                            if (target === $dropdownTrigger) {
                                parentFound = true;
                            }
                        }
                        target = target.parentElement;
                    }

                    if (!parentFound) {
                        $scope.$apply(function () {
                            $scope.open = false;
                        });
                    }
                }
            });


        }

    }
}