/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

angular
    .module('nzbhydraApp')
    .directive('downloaderStatusFooter', downloaderStatusFooter);

function downloaderStatusFooter() {
    return {
        templateUrl: 'static/html/directives/downloader-status-footer.html',
        controller: controller
    };

    function controller($scope, $interval, $http, RequestsErrorHandler, HydraAuthService) {

        $scope.$emit("showDownloaderStatus", true);
        var downloadRateCounter = 0;

        $scope.downloaderChart = {
            options: {
                chart: {
                    type: 'stackedAreaChart',
                    height: 35,
                    width: 300,
                    margin: {
                        top: 5,
                        right: 0,
                        bottom: 0,
                        left: 0
                    },
                    x: function (d) {
                        return d.x;
                    },
                    y: function (d) {
                        return d.y;
                    },
                    interactive: true,
                    useInteractiveGuideline: false,
                    transitionDuration: 0,
                    showControls: false,
                    showLegend: false,
                    showValues: false,
                    duration: 0,
                    tooltip: {
                        valueFormatter: function (d, i) {
                            return d + " kb/s";
                        },
                        keyFormatter: function () {
                            return "";
                        },
                        id: "downloader-status-tooltip"
                    },
                    css: "float:right;"
                }
            },
            data: [{values: [], key: "Bla", color: '#00a950'}],
            config: {
                refreshDataOnly: true,
                deepWatchDataDepth: 0,
                deepWatchData: false,
                deepWatchOptions: false
            }
        };


        function update() {
            var userInfos = HydraAuthService.getUserInfos();
            if (!userInfos.maySeeStats) {
                return false;
            }

            RequestsErrorHandler.specificallyHandled(function () {
                $http.get("internalapi/downloader/getStatus", {ignoreLoadingBar: true}).then(function (response) {
                        try {
                            if (!response) {
                                console.error("No downloader status response from server");
                                return;
                            }
                            $scope.foo = response.data;
                            $scope.foo.downloaderImage = response.data.downloaderType === 'NZBGET' ? 'nzbgetlogo' : 'sabnzbdlogo';
                            $scope.foo.url = response.data.url;
                            //We need to splice the variable with the rates because it's watched by angular and when overwriting it we would lose the watch and it wouldn't be updated
                            var maxEntriesHistory = 200;
                            if ($scope.downloaderChart.data[0].values.length < maxEntriesHistory) {
                                //Not yet full, just fill up
                                for (var i = $scope.downloaderChart.data[0].values.length; i < maxEntriesHistory; i++) {
                                    if (i >= response.data.downloadingRatesInKilobytes.length) {
                                        break;
                                    }
                                    $scope.downloaderChart.data[0].values.push({x: downloadRateCounter++, y: response.data.downloadingRatesInKilobytes[i]});
                                }
                            } else {
                                //Remove first one, add to the end
                                $scope.downloaderChart.data[0].values.splice(0, 1);
                                $scope.downloaderChart.data[0].values.push({x: downloadRateCounter++, y: response.data.lastDownloadRate});
                            }
                            try {
                                $scope.api.update();
                            } catch (ignored) {
                            }
                            if ($scope.foo.state === "DOWNLOADING") {
                                $scope.foo.buttonClass = "play";
                            } else if ($scope.foo.state === "PAUSED") {
                                $scope.foo.buttonClass = "pause";
                            } else if ($scope.foo.state === "OFFLINE") {
                                $scope.foo.buttonClass = "off";
                            } else {
                                $scope.foo.buttonClass = "time";
                            }
                            $scope.foo.state = $scope.foo.state.substr(0, 1) + $scope.foo.state.substr(1).toLowerCase();
                        } catch (e) {
                            console.error(e);
                            clearInterval(timer);
                        }
                    },
                    function () {
                        console.error("Error while loading downloader status");
                        clearInterval(timer);
                    }
                );
            });
        }

        update();
        var timer = setInterval(function () {
            update();
        }, 1000);

    }
}

