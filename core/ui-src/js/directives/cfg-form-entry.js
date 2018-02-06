angular
  .module('nzbhydraApp')
  .directive('cfgFormEntry', cfgFormEntry);

function cfgFormEntry() {
  return {
    templateUrl: 'static/html/directives/cfg-form-entry.html',
    require: ["^title", "^cfg"],
    scope: {
      title: "@",
      cfg: "=",
      help: "@",
      type: "@?",
      options: "=?"
    },
    controller: function($scope, $element, $attrs) {
      $scope.type = angular.isDefined($scope.type) ? $scope.type : 'text';
      $scope.options = angular.isDefined($scope.type) ? $scope.$eval($attrs.options) : [];
    }
  };
}
