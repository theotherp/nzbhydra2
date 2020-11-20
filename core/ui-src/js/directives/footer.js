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
    .directive('footer', footer);

function footer() {
    return {
        templateUrl: 'static/html/directives/footer.html',
        controller: controller
    };

    function controller($scope, $http, $uibModal, ConfigService, GenericStorageService, bootstrapped) {

        var birthday = moment("2020-12-06");
        //Hacky but I'm too dumb to do it properly and it works
        if (birthday.dayOfYear() === moment().dayOfYear() && birthday.year() === moment().year()) {

            GenericStorageService.get("birthdaySeen", true).then(function (birthdaySeen) {
                if (birthdaySeen.data === null || !birthdaySeen.data) {
                    showCelebration($uibModal, $scope, GenericStorageService);
                    GenericStorageService.put("birthdaySeen", true, true);
                }
            });
        }

        $scope.updateFooterBottom = 0;

        var safeConfig = bootstrapped.safeConfig;
        $scope.showDownloaderStatus = safeConfig.downloading.showDownloaderStatus && _.filter(safeConfig.downloading.downloaders, function (x) {
            return x.enabled
        }).length > 0;
        $scope.showUpdateFooter = false;

        $scope.$on("showDownloaderStatus", function (event, doShow) {
            $scope.showDownloaderStatus = doShow;
            updateFooterBottom();
            updatePaddingBottom();
        });
        $scope.$on("showUpdateFooter", function (event, doShow) {
            $scope.showUpdateFooter = doShow;
            updateFooterBottom();
            updatePaddingBottom();
        });
        $scope.$on("showAutomaticUpdateFooter", function (event, doShow) {
            $scope.showAutomaticUpdateFooter = doShow;
            updateFooterBottom();
            updatePaddingBottom();
        });

        function updateFooterBottom() {

            if ($scope.showDownloaderStatus) {
                if ($scope.showAutomaticUpdateFooter) {
                    $scope.updateFooterBottom = 50;
                } else {
                    $scope.updateFooterBottom = 35;
                }
            } else {
                $scope.updateFooterBottom = 0;
            }
        }

        function updatePaddingBottom() {
            var paddingBottom = 0;
            if ($scope.showDownloaderStatus) {
                paddingBottom += 30;
            }
            if ($scope.showUpdateFooter) {
                paddingBottom += 40;
            }
            $scope.paddingBottom = paddingBottom;
            document.getElementById("wrap").classList.remove("padding-bottom-0");
            document.getElementById("wrap").classList.remove("padding-bottom-30");
            document.getElementById("wrap").classList.remove("padding-bottom-40");
            document.getElementById("wrap").classList.remove("padding-bottom-70");
            var paddingBottomClass = "padding-bottom-" + paddingBottom;
            document.getElementById("wrap").classList.add(paddingBottomClass);
        }

        updatePaddingBottom();

        updateFooterBottom();


    }
}

function showCelebration($uibModal, $scope, GenericStorageService) {
    var params = {
        size: "lg",
        backdrop: 'static',
        templateUrl: "static/html/celebration-modal.html",
        controller: function ($scope, $uibModalInstance) {

            $scope.close = function () {
                $uibModalInstance.dismiss();
            };

            setTimeout(function () {

                const max_fireworks = 5,
                    max_sparks = 50;
                let canvas = document.getElementById('myCanvas');
                var dimension = [document.documentElement.clientWidth, document.documentElement.clientHeight];

                canvas.width = dimension[0];
                canvas.height = dimension[1];
                canvas.style.display = "block";
                let context = canvas.getContext('2d');
                let fireworks = [];

                for (let i = 0; i < max_fireworks; i++) {
                    let firework = {
                        sparks: []
                    };
                    for (let n = 0; n < max_sparks; n++) {
                        let spark = {
                            vx: Math.random() * 5 + .5,
                            vy: Math.random() * 5 + .5,
                            weight: Math.random() * .3 + .03,
                            red: Math.floor(Math.random() * 2),
                            green: Math.floor(Math.random() * 2),
                            blue: Math.floor(Math.random() * 2)
                        };
                        if (Math.random() > .5) spark.vx = -spark.vx;
                        if (Math.random() > .5) spark.vy = -spark.vy;
                        firework.sparks.push(spark);
                    }
                    fireworks.push(firework);
                    resetFirework(firework);
                }
                window.requestAnimationFrame(explode);

                function resetFirework(firework) {
                    firework.x = Math.floor(Math.random() * canvas.width);
                    firework.y = canvas.height;
                    firework.age = 0;
                    firework.phase = 'fly';
                }

                function explode() {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    fireworks.forEach((firework, index) => {
                        if (firework.phase === 'explode') {
                            firework.sparks.forEach((spark) => {
                                for (let i = 0; i < 10; i++) {
                                    let trailAge = firework.age + i;
                                    let x = firework.x + spark.vx * trailAge;
                                    let y = firework.y + spark.vy * trailAge + spark.weight * trailAge * spark.weight * trailAge;
                                    let fade = i * 20 - firework.age * 2;
                                    let r = Math.floor(spark.red * fade);
                                    let g = Math.floor(spark.green * fade);
                                    let b = Math.floor(spark.blue * fade);
                                    context.beginPath();
                                    context.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',1)';
                                    context.rect(x, y, 4, 4);
                                    context.fill();
                                }
                            });
                            firework.age++;
                            if (firework.age > 100 && Math.random() < .05) {
                                resetFirework(firework);
                            }
                        } else {
                            firework.y = firework.y - 10;
                            for (let spark = 0; spark < 15; spark++) {
                                context.beginPath();
                                context.fillStyle = 'rgba(' + index * 50 + ',' + spark * 17 + ',0,1)';
                                context.rect(firework.x + Math.random() * spark - spark / 2, firework.y + spark * 4, 4, 4);
                                context.fill();
                            }
                            if (Math.random() < .001 || firework.y < 200) firework.phase = 'explode';
                        }
                    });
                    window.requestAnimationFrame(explode);
                }

            }, 500);

            $scope.$on("modal.closing", function () {
                document.getElementById('myCanvas').style.display = "none";
            });
        }
    };


    $uibModal.open(params).result.then();


}