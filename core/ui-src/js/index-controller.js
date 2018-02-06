angular
  .module('nzbhydraApp')
  .controller('IndexController', IndexController);

function IndexController($scope, $http, $stateParams, $state) {

  $state.go("root.search");
}
