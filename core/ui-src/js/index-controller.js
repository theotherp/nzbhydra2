angular
    .module('nzbhydraApp')
    .controller('IndexController', IndexController);

function IndexController($scope, $http, $stateParams, $state) {
    console.log("Index");
    $state.go("root.search");
}
