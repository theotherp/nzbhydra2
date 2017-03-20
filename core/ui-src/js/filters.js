var filters = angular.module('filters', []);

filters.filter('bytes', function () {
    return function (bytes) {
        return filesize(bytes);
    }
});

filters.filter('unsafe',
    function ($sce) {
        return function (value, type) {
            return $sce.trustAs(type || 'html', text);
        };
    }
);

