angular
    .module('nzbhydraApp')
    .factory('FileSelectionService', FileSelectionService);

function FileSelectionService($http, $q, $uibModal, DirectoryListingRequestFactory) {

    var categories = {};
    var selectedCategory = {};

    var service = {
        open: open
    };

    var deferred;

    return service;


    function open(fullPath, type) {
        var instance = $uibModal.open({
            templateUrl: 'static/html/file-selection.html',
            controller: 'FileSelectionModalController',
            size: "md",
            resolve: {
                data: function () {
                    return $http.post("internalapi/config/folderlisting", DirectoryListingRequestFactory.build(fullPath, type, false));
                },
                type: function () {
                    return type;
                }
            }
        });

        instance.result.then(function (selection) {
                deferred.resolve(selection);
            }, function () {
                deferred.reject("dismissed");
            }
        );
        deferred = $q.defer();
        return deferred.promise;
    }

}

angular
    .module('nzbhydraApp').controller('FileSelectionModalController', function ($scope, $http, $uibModalInstance, FileSelectionService, DirectoryListingRequestFactory, data, type) {

    $scope.type = type;
    $scope.showType = type === "file" ? "File" : "Folder";
    $scope.data = data.data;

    $scope.select = function (fileOrFolder, selectType) {
        if (selectType === "file" && type === "file") {
            $uibModalInstance.close(fileOrFolder.fullPath);
        } else if (selectType === "folder") {
            $http.post("internalapi/config/folderlisting", DirectoryListingRequestFactory.build(fileOrFolder.fullPath, type, false)).then(function (data) {
                $scope.data = data.data;
            })
        }
    };

    $scope.goUp = function () {
        $http.post("internalapi/config/folderlisting", DirectoryListingRequestFactory.build($scope.data.fullPath, type, true)).then(function (data) {
            $scope.data = data.data;
        })
    };

    $scope.submit = function () {
        $uibModalInstance.close($scope.data.fullPath);
    }

});
