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
        for (var category in ConfigService.getSafe().categoriesConfig.categories) {
            category = ConfigService.getSafe().categoriesConfig.categories[category];
            if (category.name === name) {
                return category;
            }
        }
    }

    function getAllCategories() {
        return ConfigService.getSafe().categoriesConfig.categories;
    }

    function getWithoutAll() {
        return ConfigService.getSafe().categoriesConfig.categories.splice(1);
    }

    function getDefault() {
        return getAllCategories()[0];
    }

}