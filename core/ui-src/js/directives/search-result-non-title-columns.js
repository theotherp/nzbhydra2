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
            $http.get('static/html/directives/search-result-non-title-columns.html', {cache: $templateCache}).success(function (templateContent) {
                element.replaceWith($compile(templateContent)(scope));
            });

        },
        // templateUrl: 'static/html/directives/search-result-non-title-columns.html',
        controller: controller
    };

    function controller($scope, $http, $uibModal, growl, HydraAuthService) {

        $scope.showDetailsDl = HydraAuthService.getUserInfos().maySeeDetailsDl;

        $scope.showNfo = showNfo;

        function showNfo(resultItem) {
            if (resultItem.has_nfo === 0) {
                return;
            }
            var uri = new URI("internalapi/nfo/" + resultItem.searchResultId);
            return $http.get(uri.toString()).then(function (response) {
                if (response.data.successful) {
                    if (response.data.hasNfo) {
                        $scope.openModal("lg", response.data.content)
                    } else {
                        growl.info("No NFO available");
                    }
                } else {
                    grow.error(response.data.content);
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
            if ($scope.result.hasNfo === "YES") {
                return "Show NFO"
            } else if ($scope.result.hasNfo === "MAYBE") {
                return "Try to load NFO (may not be available)";
            } else {
                return "No NFO available";
            }
        };
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

angular
    .module('nzbhydraApp')
    .filter('kify', kify);

function kify() {
    return function (number) {
        if (number > 1000) {
            return Math.round(number / 1000) + "k";
        }
        return number;
    }
}