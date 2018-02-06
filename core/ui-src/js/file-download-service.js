angular
  .module('nzbhydraApp')
  .factory('FileDownloadService', FileDownloadService);

function FileDownloadService($http, growl) {

  var service = {
    downloadFile: downloadFile
  };

  return service;

  function downloadFile(link, filename, method, data) {
    return $http({
      method: method,
      url: link,
      data: data,
      responseType: 'arraybuffer'
    }).success(function(data, status, headers, config) {
      var a = document.createElement('a');
      var blob = new Blob([data], {
        'type': "application/octet-stream"
      });
      a.href = URL.createObjectURL(blob);
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }).error(function(data, status, headers, config) {
      growl.error(status);
    });

  }


}
