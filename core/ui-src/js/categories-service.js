angular
    .module('nzbhydraApp')
    .factory('CategoriesService', CategoriesService);

function CategoriesService(ConfigService) {

    return {
        getByName: getByName,
        getAll: getAll,
        getDefault: getDefault
    };


    function getByName(name) {
        for (var category in ConfigService.getSafe().categories) {
            category = ConfigService.getSafe().categories[category];
            if (category.name == name || category.pretty == name) {
                return category;
            }
        }
    }

    function getAll() {
        return ConfigService.getSafe().categories;
    }

    function getDefault() {
        return getAll()[1];
    }

}