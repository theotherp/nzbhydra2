angular
  .module('nzbhydraApp')
  .factory('ConfigModel', function() {
    return {};
  });

angular
  .module('nzbhydraApp')
  .factory('ConfigWatcher', function() {
    var $scope;

    return {
      watch: watch
    };

    function watch(scope) {
      $scope = scope;
      $scope.$watchGroup(["config.main.host"], function() {}, true);
    }
  });


angular
  .module('nzbhydraApp')
  .controller('ConfigController', ConfigController);

function ConfigController($scope, $http, activeTab, ConfigService, config, DownloaderCategoriesService, ConfigFields, ConfigModel, ModalService, RestartService, localStorageService, $state, growl) {
  $scope.config = config;
  $scope.submit = submit;
  $scope.activeTab = activeTab;

  $scope.restartRequired = false;
  $scope.ignoreSaveNeeded = false;


  function updateAndAskForRestartIfNecessary() {
    if (angular.isUndefined($scope.form)) {
      console.error("Unable to determine if a restart is necessary");
      return;
    }

    $scope.form.$setPristine();
    DownloaderCategoriesService.invalidate();
    if ($scope.restartRequired) {
      ModalService.open("Restart required", "The changes you have made may require a restart to be effective.<br>Do you want to restart now?", {
        yes: {
          onYes: function() {
            RestartService.restart();
          }
        },
        no: {
          onNo: function($uibModalInstance) {
            //Needs to be clicked twice for some reason
            $scope.restartRequired = false;
            $uibModalInstance.dismiss();
            $uibModalInstance.dismiss();
          }
        }
      });
    }
  }

  function handleConfigSetResponse(response, ignoreWarnings, restartNeeded) {
    if (angular.isUndefined(ignoreWarnings)) {
      ignoreWarnings = localStorageService.get("ignoreWarnings") !== null ? localStorageService.get("ignoreWarnings") : false;
    }
    //Communication with server was successful but there might be validation errors and/or warnings
    var warningMessages = response.data.warningMessages;
    var errorMessages = response.data.errorMessages;
    $scope.restartRequired = response.data.restartNeeded || (angular.isDefined(restartNeeded) ? restartNeeded : false);
    var showMessage = errorMessages.length > 0 || (warningMessages.length > 0 && !ignoreWarnings);

    function extendMessageWithList(message, messages) {
      _.forEach(messages, function(x) {
        message += "<li>" + x + "</li>";
      });
      message += "</ul></span>";
      return message;
    }

    if (showMessage) {
      var options;
      var message;
      var title;
      if (errorMessages.length > 0) { //Actual errors which cannot be ignored
        title = "Config validation failed";
        message = '<span class="error">The following errors have been found in your config. They need to be fixed.<ul>';
        message = extendMessageWithList(message, response.data.errorMessages);
        if (warningMessages.length > 0) {
          message += '<br><span class="warning">The following warnings were found. You can ignore them if you wish.<ul>';
          message = extendMessageWithList(message, response.data.warningMessages);
        }
        options = {
          yes: {
            onYes: function() {},
            text: "OK"
          }
        };
      } else if (warningMessages.length > 0) {
        title = "Config validation warnings";
        message = '<br><span class="warning">The following warnings have been found. You can ignore them if you wish. The config was already saved.<ul>';
        message = extendMessageWithList(message, response.data.warningMessages);
        options = {
          cancel: {
            onCancel: function() {
              $scope.form.$setPristine();
              localStorageService.set("ignoreWarnings", true);
              ConfigService.set($scope.config, true).then(function(response) {
                handleConfigSetResponse(response, true, $scope.restartRequired);
                updateAndAskForRestartIfNecessary();
              }, function(response) {
                //Actual error while setting or validating config
                growl.error(response.data);
              });
            },
            text: "OK, don't show warnings again"
          },
          yes: {
            onYes: function() {
              handleConfigSetResponse(response, true, $scope.restartRequired);
              updateAndAskForRestartIfNecessary();
            },
            text: "OK"
          }
        };
      }

      ModalService.open(title, message, options, "md", "left");
    } else {
      updateAndAskForRestartIfNecessary();
    }
  }

  function submit() {
    if ($scope.form.$valid) {
      ConfigService.set($scope.config, true).then(function(response) {
        handleConfigSetResponse(response);
      }, function(response) {
        //Actual error while setting or validating config
        growl.error(response.data);
      });

    } else {
      growl.error("Config invalid. Please check your settings.");

      //Ridiculously hacky way to make the error messages appear
      try {
        if (angular.isDefined(form.$error.required)) {
          _.each(form.$error.required, function(item) {
            if (angular.isDefined(item.$error.required)) {
              _.each(item.$error.required, function(item2) {
                item2.$setTouched();
              });
            }
          });
        }
        angular.forEach($scope.form.$error.required, function(field) {
          field.$setTouched();
        });
      } catch (err) {
        //
      }

    }
  }

  ConfigModel = config;

  $scope.fields = ConfigFields.getFields($scope.config);

  $scope.allTabs = [{
      active: false,
      state: 'root.config.main',
      name: 'Main',
      model: ConfigModel.main,
      fields: $scope.fields.main,
      options: {}
    },
    {
      active: false,
      state: 'root.config.auth',
      name: 'Authorization',
      model: ConfigModel.auth,
      fields: $scope.fields.auth,
      options: {}
    },
    {
      active: false,
      state: 'root.config.searching',
      name: 'Searching',
      model: ConfigModel.searching,
      fields: $scope.fields.searching,
      options: {}
    },
    {
      active: false,
      state: 'root.config.categories',
      name: 'Categories',
      model: ConfigModel.categoriesConfig,
      fields: $scope.fields.categoriesConfig,
      options: {}
    },
    {
      active: false,
      state: 'root.config.downloading',
      name: 'Downloading',
      model: ConfigModel.downloading,
      fields: $scope.fields.downloading,
      options: {}
    },
    {
      active: false,
      state: 'root.config.indexers',
      name: 'Indexers',
      model: ConfigModel.indexers,
      fields: $scope.fields.indexers,
      options: {}
    }
  ];

  $scope.isSavingNeeded = function() {
    return $scope.form.$dirty && $scope.form.$valid && !$scope.ignoreSaveNeeded;
  };

  $scope.goToConfigState = function(index) {
    $state.go($scope.allTabs[index].state, {
      activeTab: index
    }, {
      inherit: false,
      notify: true,
      reload: true
    });
  };

  $scope.help = function() {
    var tabName = $scope.allTabs[$scope.activeTab].name;
    $http.get("internalapi/help/" + tabName).then(function(result) {
        var html = '<span style="text-align: left;">' + result.data + "</span>";
        ModalService.open(tabName + " - Help", html, {}, "lg");
      },
      function() {
        growl.error("Error while loading help");
      });
  };

  $scope.$on('$stateChangeStart',
    function(event, toState, toParams, fromState, fromParams) {
      if ($scope.isSavingNeeded()) {
        event.preventDefault();
        ModalService.open("Unsaved changed", "Do you want to save before leaving?", {
          yes: {
            onYes: function() {
              $scope.submit();
              $state.go(toState);
            },
            text: "Yes"
          },
          no: {
            onNo: function() {
              $scope.ignoreSaveNeeded = true;
              $scope.allTabs[$scope.activeTab].options.resetModel();
              $state.go(toState);
            },
            text: "No"
          },
          cancel: {
            onCancel: function() {
              event.preventDefault();
            },
            text: "Cancel"
          }
        });
      }
    });
}
