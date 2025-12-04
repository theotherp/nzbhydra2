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
        var stompClient = null;
        var socket = null;
        var downloadRateCounter = 0;
        var maxXValue = 10000; // Reset counter before it gets too large
        var isTabVisible = !document.hidden;
        var bufferedRates = []; // Buffer download rates while tab is in background
        var maxBufferedRates = 200; // Limit buffer size to prevent memory issues

        // Handle tab visibility changes to prevent memory buildup in background
        function handleVisibilityChange() {
            isTabVisible = !document.hidden;
            if (isTabVisible && bufferedRates.length > 0 && downloaderStatus) {
                // Tab became visible and we have buffered data - apply all buffered rates
                console.log("Tab became visible - applying " + bufferedRates.length + " buffered download rates");
                applyBufferedRates();
                updateFooter();
            } else if (isTabVisible && downloaderStatus) {
                // Tab became visible but no buffered rates - just update footer
                updateFooter();
            }
        }

        function applyBufferedRates() {
            var maxEntriesHistory = 200;
            var chartValues = $scope.downloaderChart.data[0].values;

            // Apply each buffered rate to the chart
            for (var i = 0; i < bufferedRates.length; i++) {
                if (chartValues.length >= maxEntriesHistory) {
                    // Chart is full - remove first, add to end
                    chartValues.splice(0, 1);
                }
                chartValues.push({x: getNextXValue(), y: bufferedRates[i]});
            }

            // Clear the buffer
            bufferedRates = [];

            // Update chart display
            try {
                $scope.api.update();
            } catch (ignored) {
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        function connectWebSocket() {
            console.log("websocket");
            socket = new SockJS(bootstrapped.baseUrl + 'websocket');
            stompClient = Stomp.over(socket);
            stompClient.debug = null;
            stompClient.connect({}, function (frame) {
                stompClient.subscribe('/topic/downloaderStatus', function (message) {
                    downloaderStatus = JSON.parse(message.body);
                    if (isTabVisible) {
                        updateFooter();
                    } else {
                        // Tab is in background - buffer the download rate for later
                        // This prevents memory buildup from chart updates and digest cycles
                        // while still preserving the download rate history
                        if (bufferedRates.length < maxBufferedRates) {
                            bufferedRates.push(downloaderStatus.lastDownloadRate);
                        } else {
                            // Buffer is full - shift out oldest, add newest (sliding window)
                            bufferedRates.shift();
                            bufferedRates.push(downloaderStatus.lastDownloadRate);
                        }
                    }
                });
                stompClient.send("/app/connectDownloaderStatus", function (message) {
                    downloaderStatus = JSON.parse(message.body);
                    if (isTabVisible) {
                        updateFooter();
                    }
                    // No need to buffer on initial connect - full history comes with downloaderStatus
                })
            });
        }

        connectWebSocket();

        // Clean up on scope destroy to prevent memory leaks
        $scope.$on('$destroy', function () {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (updateInterval !== null) {
                $interval.cancel(updateInterval);
                updateInterval = null;
            }
            if (stompClient !== null) {
                try {
                    stompClient.disconnect();
                } catch (ignored) {
                }
                stompClient = null;
            }
            if (socket !== null) {
                try {
                    socket.close();
                } catch (ignored) {
                }
                socket = null;
            }
        });

        $scope.$emit("showDownloaderStatus", true);

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

        function getNextXValue() {
            downloadRateCounter++;
            // Reset counter to prevent number overflow after extended use
            if (downloadRateCounter > maxXValue) {
                downloadRateCounter = 0;
            }
            return downloadRateCounter;
        }

        function safeApply() {
            // Only apply if not already in a digest cycle
            if (!$scope.$$phase && !$scope.$root.$$phase) {
                $scope.$apply();
            }
        }

        function updateFooter() {
            if (downloaderStatus.lastUpdateForNow && updateInterval === null) {
                //Server will send no new status updates for a while because the last two retrieved statuses are the same.
                //We must still update the footer so that the graph doesn't stand still
                console.debug("Retrieved last update for now, starting update interval");
                updateInterval = $interval(function () {
                    //Just put the last known rate at the end to keep it going
                    $scope.downloaderChart.data[0].values.splice(0, 1);
                    $scope.downloaderChart.data[0].values.push({x: getNextXValue(), y: downloaderStatus.lastDownloadRate});
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
            $scope.foo.downloaderImage = downloaderStatus.downloaderType.toLowerCase() + "logo";

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
                    $scope.downloaderChart.data[0].values.push({x: getNextXValue(), y: downloaderStatus.downloadingRatesInKilobytes[i]});
                }
            } else {
                console.debug("Adding data, moving bar")
                //Remove first one, add to the end
                $scope.downloaderChart.data[0].values.splice(0, 1);
                $scope.downloaderChart.data[0].values.push({x: getNextXValue(), y: downloaderStatus.lastDownloadRate});
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
            safeApply();
        }

    }
}

