package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.category.CategoriesConfig;

import java.util.List;
import java.util.stream.Collectors;


@Getter
public class SafeCategoriesConfig {


    private boolean enableCategorySizes = true;
    private List<SafeCategory> categories;
    private String defaultCategory = "All";

    public SafeCategoriesConfig(CategoriesConfig categoriesConfig) {
        categories = categoriesConfig.getCategories().stream().map(SafeCategory::new).collect(Collectors.toList());
        enableCategorySizes = categoriesConfig.isEnableCategorySizes();
        defaultCategory = categoriesConfig.getDefaultCategory();
        categories.add(0, new SafeCategory(CategoriesConfig.allCategory));
    }


}
