//Can be used in an ng-repeat directive to call a function when the last element was rendered
//We use it to mark the end of sorting / filtering so we can stop blocking the UI

angular
    .module('nzbhydraApp')
    .directive('onFinishRender', onFinishRender);

function onFinishRender($timeout) {
    function linkFunction(scope, element, attr) {

        if (scope.$last === true) {
            $timeout(function () {
                scope.$evalAsync(attr.onFinishRender);
            });
        }
    }

    return {
        link: linkFunction
    }
}