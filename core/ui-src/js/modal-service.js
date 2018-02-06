angular
  .module('nzbhydraApp')
  .service('GeneralModalService', GeneralModalService);

function GeneralModalService() {


  this.open = function(msg, template, templateUrl, size, data) {

    //Prevent circular dependency
    var myInjector = angular.injector(["ng", "ui.bootstrap"]);
    var $uibModal = myInjector.get("$uibModal");
    var params = {};

    if (angular.isUndefined(size)) {
      params.size = size;
    }
    if (angular.isUndefined(template)) {
      if (angular.isUndefined(templateUrl)) {
        params.template = '<pre style="margin:0">' + msg + '</pre>';
      } else {
        params.templateUrl = templateUrl;
      }
    } else {
      params.template = template;
    }
    params.resolve = {
      data: function() {
        return data;
      }
    };

    var modalInstance = $uibModal.open(params);

    modalInstance.result.then();

  };


}
