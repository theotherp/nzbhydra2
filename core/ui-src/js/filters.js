var filters = angular.module('filters', []);

filters.filter('bytes', function() {
  return function(bytes) {
    return filesize(bytes);
  };
});

filters
  .filter('unsafe', ['$sce', function($sce) {
    return function(text) {
      return $sce.trustAsHtml(text);
    };
  }]);
