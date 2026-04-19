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
            events: '=?',
            actions: '=?'
        },
        transclude: {
            toggleDropdown: '?toggleDropdown'
        },
        templateUrl: 'static/html/directives/multiselect-dropdown.html',
        controller: function dropdownMultiselectController($scope, $element, $filter, $document, $timeout, $window) {
            var $dropdownTrigger = $element.children()[0];
            var $windowElement = angular.element($window);

            var settings = {
                showSelectedValues: true,
                showSelectAll: true,
                showDeselectAll: true,
                noSelectedText: 'None selected'
            };
            var events = {
                onToggleItem: angular.noop
            };
            angular.extend(events, $scope.events || []);
            angular.extend(settings, $scope.settings || []);
            angular.extend($scope, {settings: settings, events: events});
            $scope.actions = $scope.actions || [];

            function updateGroupedOptions() {
                var groups = [];
                var groupedByName = {};

                _.each($scope.options || [], function (option) {
                    var groupName = option.group || '';
                    if (!groupedByName[groupName]) {
                        groupedByName[groupName] = {
                            name: groupName,
                            options: []
                        };
                        groups.push(groupedByName[groupName]);
                    }
                    groupedByName[groupName].options.push(option);
                });

                $scope.groupedOptions = groups;
            }

            function getSelectableOptions() {
                return _.filter($scope.options || [], function (option) {
                    return !option.action;
                });
            }

            $scope.$watchCollection('options', updateGroupedOptions);
            $scope.$watchCollection('actions', function (actions) {
                $scope.actions = actions || [];
            });
            updateGroupedOptions();

            $scope.buttonText = "";

            function getFallbackButtonText() {
                var selectedCount = ($scope.selectedModel || []).length;
                var totalCount = getSelectableOptions().length;
                var selectionNoun = settings.selectionNoun ? " " + settings.selectionNoun : "";
                return selectedCount + "/" + totalCount + selectionNoun + " selected";
            }

            function getSelectedLabels() {
                var selected = [];
                _.each(getSelectableOptions(), function (x) {
                    if ($scope.selectedModel.indexOf(x.id) > -1) {
                        selected.push(x.label);
                    }
                });
                return selected;
            }

            function textFitsButton(text) {
                var button = $element[0].querySelector('button.dropdown-toggle');
                if (!button) {
                    return true;
                }
                var computedStyle = $window.getComputedStyle(button);
                var paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
                var paddingRight = parseFloat(computedStyle.paddingRight) || 0;
                var availableWidth = button.clientWidth - paddingLeft - paddingRight - 30;
                if (availableWidth <= 0) {
                    return true;
                }
                var canvas = textFitsButton.canvas || (textFitsButton.canvas = document.createElement("canvas"));
                var context = canvas.getContext("2d");
                context.font = computedStyle.font;
                return context.measureText(text).width <= availableWidth;
            }

            function updateAdaptiveButtonText() {
                if (!(angular.isDefined($scope.selectedModel) && settings.showSelectedValues)) {
                    if (angular.isUndefined($scope.selectedModel) || ($scope.settings.noSelectedText && $scope.selectedModel.length === 0)) {
                        $scope.buttonText = $scope.settings.noSelectedText;
                    } else {
                        $scope.buttonText = getFallbackButtonText();
                    }
                    return;
                }

                if ($scope.selectedModel.length === 0) {
                    $scope.buttonText = $scope.settings.noSelectedText || "None selected";
                    return;
                }

                if ($scope.selectedModel.length === getSelectableOptions().length && !settings.selectionNoun) {
                    $scope.buttonText = "All selected";
                    return;
                }

                var selectedLabels = getSelectedLabels();
                var labelText = selectedLabels.join(", ");
                if (textFitsButton(labelText)) {
                    $scope.buttonText = labelText;
                } else {
                    $scope.buttonText = getFallbackButtonText();
                }
            }

            function updateButtonText() {
                if (settings.buttonText) {
                    $scope.buttonText = settings.buttonText;
                    return;
                }
                $timeout(updateAdaptiveButtonText);
            }

            $scope.$watchCollection("selectedModel", updateButtonText);
            $scope.$watchCollection("options", updateButtonText);
            updateButtonText();
            $scope.open = false;

            $scope.toggleDropdown = function () {
                $scope.open = !$scope.open;
            };

            $scope.toggleItem = function (option) {
                if (option.action) {
                    option.action();
                    return;
                }
                var index = $scope.selectedModel.indexOf(option.id);
                var oldValue = index > -1;
                if (oldValue) {
                    $scope.selectedModel.splice(index, 1);
                } else {
                    $scope.selectedModel.push(option.id);
                }
                $scope.events.onToggleItem(option, !oldValue);
            };

            $scope.selectAll = function () {
                $scope.deselectAll();
                Array.prototype.push.apply($scope.selectedModel, _.pluck(getSelectableOptions(), "id"));
            };

            $scope.deselectAll = function () {
                $scope.selectedModel.splice(0, $scope.selectedModel.length);
            };

            $scope.executeAction = function (action) {
                if (action && angular.isFunction(action.action)) {
                    action.action();
                }
            };

            //Close when clicked outside

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

            var clickHandler = function (e) {
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
            };

            $document.on('click', clickHandler);
            $windowElement.on('resize', updateButtonText);

            // Clean up document click handler to prevent memory leaks
            $scope.$on('$destroy', function () {
                $document.off('click', clickHandler);
                $windowElement.off('resize', updateButtonText);
            });

        }

    }
}
