angular
    .module('nzbhydraApp')
    .directive('otherColumns', otherColumns);

function otherColumns($http, $templateCache, $compile, $window) {
    return {
        scope: {
            result: "<"
        },
        multiElement: true,

        link: function (scope, element, attrs) {
            $http.get('html/directives/search-result-non-title-columns.html', {cache: $templateCache}).success(function (templateContent) {
                element.replaceWith($compile(templateContent)(scope));
            });

        },
        controller: controller
    };

    function controller($scope, $http, $uibModal, growl, HydraAuthService) {

        $scope.showDetailsDl = HydraAuthService.getUserInfos().maySeeDetailsDl;

        $scope.showNfo = showNfo;
        function showNfo(resultItem) {
            if (resultItem.has_nfo == 0) {
                return;
            }
            var uri = new URI("internalapi/getnfo");
            uri.addQuery("searchresultid", resultItem.searchResultId);
            return $http.get(uri.toString()).then(function (response) {
                if (response.data.has_nfo) {
                    $scope.openModal("lg", response.data.nfo)
                } else {
                    if (!angular.isUndefined(resultItem.message)) {
                        growl.error(resultItem.message);
                    } else {
                        growl.info("No NFO available");
                    }
                }
            });
        }

        $scope.openModal = openModal;

        function openModal(size, nfo) {
            var modalInstance = $uibModal.open({
                template: '<pre class="nfo"><span ng-bind-html="nfo"></span></pre>',
                controller: NfoModalInstanceCtrl,
                size: size,
                resolve: {
                    nfo: function () {
                        return nfo;
                    }
                }
            });

            modalInstance.result.then();
        }

        $scope.downloadNzb = downloadNzb;

        function downloadNzb(resultItem) {
            //href = "{{ result.link }}"
            $window.location.href = resultItem.link;
        }

        $scope.getNfoTooltip = function () {
            if ($scope.result.has_nfo == 1) {
                return "Show NFO"
            } else if ($scope.result.has_nfo == 2) {
                return "Try to load NFO (may not be available)";
            } else {
                return "No NFO available";
            }
        }
    }
}

angular
    .module('nzbhydraApp')
    .controller('NfoModalInstanceCtrl', NfoModalInstanceCtrl);

function NfoModalInstanceCtrl($scope, $uibModalInstance, nfo) {

    $scope.nfo = nfo;

    $scope.ok = function () {
        $uibModalInstance.close($scope.selected.item);
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss();
    };
}