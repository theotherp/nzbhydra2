angular
    .module('nzbhydraApp')
    .factory('DownloaderCategoriesService', DownloaderCategoriesService);

function DownloaderCategoriesService($http, $q, $uibModal) {

    var categories = {};
    var selectedCategory = {};

    var service = {
        get: getCategories,
        invalidate: invalidate,
        select: select,
        openCategorySelection: openCategorySelection
    };

    var deferred;

    return service;


    function getCategories(downloader) {
        function loadAll() {
            if (downloader.name in categories) {
                var deferred = $q.defer();
                deferred.resolve(categories[downloader.name]);
                return deferred.promise;
            }

            return $http.get(encodeURI('internalapi/downloader/' + downloader.name + "/categories"))
                .then(function (categoriesResponse) {
                    categories[downloader.name] = categoriesResponse.data;
                    return categoriesResponse.data;

                }, function (error) {
                    throw error;
                });
        }

        return loadAll().then(function (categories) {
            return categories;
        }, function (error) {
            throw error;
        });
    }


    function openCategorySelection(downloader) {
        var instance = $uibModal.open({
            templateUrl: 'static/html/directives/addable-nzb-modal.html',
            controller: 'DownloaderCategorySelectionController',
            size: "sm",
            resolve: {
                categories: function () {
                    return getCategories(downloader)
                }
            }
        });

        instance.result.then(function () {
            }, function () {
                deferred.reject("dismissed");
            }
        );
        deferred = $q.defer();
        return deferred.promise;
    }

    function select(category) {
        selectedCategory = category;

        deferred.resolve(category);
    }

    function invalidate() {
        categories = {};
    }
}

angular
    .module('nzbhydraApp').controller('DownloaderCategorySelectionController', function ($scope, $uibModalInstance, DownloaderCategoriesService, categories) {

    $scope.categories = categories;
    categories.sort();
    console.log(categories);
    $scope.select = function (category) {
        DownloaderCategoriesService.select(category);
        $uibModalInstance.close($scope);
    }
});