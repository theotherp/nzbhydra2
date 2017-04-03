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
            if (angular.isDefined(categories) && angular.isDefined(categories.downloader)) {
                var deferred = $q.defer();
                deferred.resolve(categories.downloader);
                return deferred.promise;
            }

            return $http.get(encodeURI('internalapi/downloader/' + downloader.name + "/categories"))
                .then(function (categoriesResponse) {

                    console.log("Updating downloader categories cache");
                    var categories = {downloader: categoriesResponse.data.categories};
                    return categoriesResponse.data.categories;

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
        $uibModal.open({
            templateUrl: 'static/html/directives/addable-nzb-modal.html',
            controller: 'DownloaderCategorySelectionController',
            size: "sm",
            resolve: {
                categories: function () {
                    return getCategories(downloader)
                }
            }
        });
        deferred = $q.defer();
        return deferred.promise;
    }

    function select(category) {
        selectedCategory = category;
        console.log("Selected category " + category);
        deferred.resolve(category);
    }

    function invalidate() {
        console.log("Invalidating categories");
        categories = undefined;
    }
}

angular
    .module('nzbhydraApp').controller('DownloaderCategorySelectionController', function ($scope, $uibModalInstance, DownloaderCategoriesService, categories) {
    console.log(categories);
    $scope.categories = categories;
    $scope.select = function (category) {
        DownloaderCategoriesService.select(category);
        $uibModalInstance.close($scope);
    }
});