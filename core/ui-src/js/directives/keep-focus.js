angular
  .module('nzbhydraApp').directive("keepFocus", ['$timeout', function($timeout) {
    /*
     Intended use:
     <input keep-focus ng-model='someModel.value'></input>
     */
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function($scope, $element, attrs, ngModel) {

        ngModel.$parsers.unshift(function(value) {
          $timeout(function() {
            $element[0].focus();
          });
          return value;
        });

      }
    };
  }]);
