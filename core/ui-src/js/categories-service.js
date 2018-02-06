angular
  .module('nzbhydraApp')
  .factory('CategoriesService', CategoriesService);

function CategoriesService(ConfigService) {

  return {
    getByName: getByName,
    getAllCategories: getAllCategories,
    getDefault: getDefault,
    getWithoutAll: getWithoutAll
  };


  function getByName(name) {
    for (var cat in ConfigService.getSafe().categoriesConfig.categories) {
      var category = ConfigService.getSafe().categoriesConfig.categories[cat];
      if (category.name === name) {
        return category;
      }
    }
  }

  function getAllCategories() {
    return ConfigService.getSafe().categoriesConfig.categories;
  }

  function getWithoutAll() {
    var cats = ConfigService.getSafe().categoriesConfig.categories;
    return cats.slice(1, cats.length);
  }

  function getDefault() {
    return getAllCategories()[0];
  }

}
