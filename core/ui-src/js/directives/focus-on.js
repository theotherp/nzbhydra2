angular
    .module('nzbhydraApp').directive('focusOn', focusOn);

function focusOn() {
    return directive;
    function directive(scope, elem, attr) {
        scope.$on('focusOn', function (e, name) {
            if (name === attr.focusOn) {
                elem[0].focus();
            }
        });
    }
}
