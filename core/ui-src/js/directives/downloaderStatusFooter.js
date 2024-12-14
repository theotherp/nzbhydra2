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

    function controller($scope, $http, RequestsErrorHandler, HydraAuthService, $interval, bootstrapped) {

        var downloaderStatus;
        var updateInterval = null;
        console.log("websocket");
        var socket = new SockJS(bootstrapped.baseUrl + 'websocket');
        var stompClient = Stomp.over(socket);
        stompClient.debug = null;
        stompClient.connect({}, function (frame) {
            stompClient.subscribe('/topic/downloaderStatus', function (message) {
                downloaderStatus = JSON.parse(message.body);
                updateFooter(downloaderStatus);
            });
            stompClient.send("/app/connectDownloaderStatus", function (message) {
                downloaderStatus = JSON.parse(message.body);
                updateFooter(downloaderStatus);
            })
        });


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

        function updateFooter() {
            if (downloaderStatus.lastUpdateForNow && updateInterval === null) {
                //Server will send no new status updates for a while because the last two retrieved statuses are the same.
                //We must still update the footer so that the graph doesn't stand still
                console.debug("Retrieved last update for now, starting update interval");
                updateInterval = $interval(function () {
                    //Just put the last known rate at the end to keep it going
                    $scope.downloaderChart.data[0].values.splice(0, 1);
                    $scope.downloaderChart.data[0].values.push({x: downloadRateCounter++, y: downloaderStatus.lastDownloadRate});
                    try {
                        $scope.api.update();
                    } catch (ignored) {
                    }
                    if (_.every($scope.downloaderChart.data[0].values, function (value) {
                        return value === downloaderStatus.lastDownloadRate
                    })) {
                        //The bar has been filled with the latest known value, we can now stop until we get a new update
                        console.debug("Filled the bar with last known value, stopping update interval");
                        $interval.cancel(updateInterval);
                        updateInterval = null;
                    }
                }, 1000);
            } else if (updateInterval !== null && !downloaderStatus.lastUpdateForNow) {
                //New data is incoming, cancel interval
                console.debug("Got new update, stopping update interval")
                $interval.cancel(updateInterval);
                updateInterval = null;
            }

            $scope.foo = downloaderStatus;
            if (downloaderStatus.downloaderType === 'NZBGET') {
                $scope.foo.downloaderImage = 'nzbgetlogo';
            }
            if (downloaderStatus.downloaderType === 'TORBOX') {
                $scope.foo.downloaderImage = 'torboxlogo';
            } else {
                $scope.foo.downloaderImage = 'sabnzbdlogo';
            }
            $scope.foo.url = downloaderStatus.url;
            //We need to splice the variable with the rates because it's watched by angular and when overwriting it we would lose the watch and it wouldn't be updated
            var maxEntriesHistory = 200;
            if ($scope.downloaderChart.data[0].values.length < maxEntriesHistory) {
                //Not yet full, just fill up
                console.debug("Adding data, filling bar with initial values")
                for (var i = $scope.downloaderChart.data[0].values.length; i < maxEntriesHistory; i++) {
                    if (i >= downloaderStatus.downloadingRatesInKilobytes.length) {
                        break;
                    }
                    $scope.downloaderChart.data[0].values.push({x: downloadRateCounter++, y: downloaderStatus.downloadingRatesInKilobytes[i]});
                }
            } else {
                console.debug("Adding data, moving bar")
                //Remove first one, add to the end
                $scope.downloaderChart.data[0].values.splice(0, 1);
                $scope.downloaderChart.data[0].values.push({x: downloadRateCounter++, y: downloaderStatus.lastDownloadRate});
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
            //Bad but without the state isn't updated
            $scope.$apply();
        }

    }
}

