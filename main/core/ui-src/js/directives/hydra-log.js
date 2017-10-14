angular
    .module('nzbhydraApp')
    .directive('hydralog', hydralog);

function hydralog() {
    return {
        templateUrl: "static/html/directives/log.html",
        controller: controller
    };

    function controller($scope, $http, $interval, $uibModal, $sce, localStorageService, growl) {
        $scope.tailInterval = null;
        $scope.doUpdateLog = localStorageService.get("doUpdateLog") !== null ? localStorageService.get("doUpdateLog") : false;
        $scope.doTailLog = localStorageService.get("doTailLog") !== null ? localStorageService.get("doTailLog") : false;

        $scope.active = 0;
        $scope.currentJsonIndex = 0;
        $scope.hasMoreJsonLines = true;

        function getLog(index) {
            if ($scope.active === 0) {
                return $http.get("internalapi/debuginfos/jsonlogs", {params: {offset: index, limit: 500}}).success(function (data) {
                    $scope.jsonLogLines = angular.fromJson(data.lines);
                    $scope.hasMoreJsonLines = data.hasMore;
                });
            } else if ($scope.active === 1) {
                return $http.get("internalapi/debuginfos/logfilecontent").success(function (data) {
                    $scope.log = $sce.trustAsHtml(data);
                }, function(data) {
                    growl.error(data)
                });
            } else if ($scope.active === 2) {
                return $http.get("internalapi/debuginfos/logfilenames").success(function (data) {
                    $scope.logfilenames = data;
                });
            }
        }

        $scope.logPromise = getLog();

        $scope.select = function (index) {
            $scope.active = index;
            $scope.update();
        };

        $scope.scrollToBottom = function () {
            document.getElementById("logfile").scrollTop = 10000000;
            document.getElementById("logfile").scrollTop = 100001000;
        };

        $scope.update = function () {
            getLog($scope.currentJsonIndex);
            if ($scope.active === 1) {
                $scope.scrollToBottom();
            }
        };

        $scope.getOlderFormatted = function () {
            getLog($scope.currentJsonIndex + 500).then(function () {
                $scope.currentJsonIndex += 500;
            });

        };

        $scope.getNewerFormatted = function () {
            var index = Math.max($scope.currentJsonIndex - 500, 0);
            getLog(index);
            $scope.currentJsonIndex = index;
        };

        function startUpdateLogInterval() {
            $scope.tailInterval = $interval(function () {
                if ($scope.active === 1) {
                    $scope.update();
                    if ($scope.doTailLog && $scope.active === 1) {
                        $scope.scrollToBottom();
                    }
                }
            }, 5000);
        }

        $scope.toggleUpdate = function (doUpdateLog) {
            $scope.doUpdateLog = doUpdateLog;
            if ($scope.doUpdateLog) {
                startUpdateLogInterval();
            } else if ($scope.tailInterval !== null) {
                console.log("Cancelling");
                $interval.cancel($scope.tailInterval);
                localStorageService.set("doTailLog", false);
                $scope.doTailLog = false;
            }
            localStorageService.set("doUpdateLog", $scope.doUpdateLog);
        };

        $scope.toggleTailLog = function () {
            localStorageService.set("doTailLog", $scope.doTailLog);
        };

        $scope.openModal = function openModal(entry) {
            var modalInstance = $uibModal.open({
                templateUrl: 'log-entry.html',
                controller: LogModalInstanceCtrl,
                size: "xl",
                resolve: {
                    entry: function () {
                        return entry;
                    }
                }
            });

            modalInstance.result.then();
        };

        if ($scope.doUpdateLog) {
            startUpdateLogInterval();
        }

    }
}

angular
    .module('nzbhydraApp')
    .controller('LogModalInstanceCtrl', LogModalInstanceCtrl);

function LogModalInstanceCtrl($scope, $uibModalInstance, entry) {

    $scope.entry = entry;

    $scope.ok = function () {
        $uibModalInstance.dismiss();
    };
}

angular
    .module('nzbhydraApp')
    .filter('formatTimestamp', formatTimestamp);

function formatTimestamp() {
    return function (date) {
        return moment(date).local().format("YYYY-MM-DD HH:mm");
    }
}

angular
    .module('nzbhydraApp')
    .filter('escapeHtml', escapeHtml);

function escapeHtml($sanitize) {
    return function (text) {
        return $sanitize(text);
    }
}

angular
    .module('nzbhydraApp')
    .filter('formatClassname', formatClassname);

function formatClassname() {
    return function (fqn) {
        return fqn.substr(fqn.lastIndexOf(".") + 1);

    }
}