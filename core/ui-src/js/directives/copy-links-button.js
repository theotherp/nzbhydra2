angular
    .module('nzbhydraApp')
    .directive('copyLinksButton', copyLinksButton);

function copyLinksButton() {
    return {
        templateUrl: 'static/html/directives/copy-links-button.html',
        require: ['^searchResults'],
        scope: {
            searchResults: "<"
        },
        controller: controller
    };


    function controller($scope, $window, growl) {
        $scope.copyLinks = function () {
            if (angular.isUndefined($scope.searchResults) || $scope.searchResults.length === 0) {
                growl.info("You should select at least one result...");
            } else {
                var baseUrl = $window.location.origin + $window.location.pathname.replace(/\/$/, '');
                var links = _.map($scope.searchResults, function (result) {
                    return baseUrl + '/getnzb/user/' + result.searchResultId;
                });
                var linkText = links.join('\n');

                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(linkText).then(function () {
                        growl.success("Copied " + links.length + " links to clipboard");
                    }).catch(function (err) {
                        growl.error("Failed to copy links to clipboard");
                    });
                } else {
                    var textArea = document.createElement("textarea");
                    textArea.value = linkText;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-999999px";
                    textArea.style.top = "-999999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        growl.success("Copied " + links.length + " links to clipboard");
                    } catch (err) {
                        growl.error("Failed to copy links to clipboard");
                    } finally {
                        document.body.removeChild(textArea);
                    }
                }
            }
        };
    }
}