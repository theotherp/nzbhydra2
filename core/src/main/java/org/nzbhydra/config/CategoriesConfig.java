package org.nzbhydra.config;


import com.google.common.base.Joiner;
import lombok.Data;
import org.nzbhydra.config.Category.Subtype;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import static org.nzbhydra.searching.SearchType.SEARCH;

@Data
public class CategoriesConfig extends ValidatingConfig<CategoriesConfig> {

    public final static Category allCategory = new Category("All");

    static {
        allCategory.setApplyRestrictionsType(SearchSourceRestriction.NONE);
        allCategory.setIgnoreResultsFrom(SearchSourceRestriction.NONE);
        allCategory.setMayBeSelected(true);
        allCategory.setSearchType(SEARCH);
        allCategory.setSubtype(Subtype.ALL);
    }

    private boolean enableCategorySizes = true;
    private List<Category> categories = new ArrayList<>();

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, CategoriesConfig newConfig) {
        ArrayList<String> errors = new ArrayList<>();
        ArrayList<String> warnings = new ArrayList<>();
        for (Category category : categories) {
            if (category.getNewznabCategories() == null || category.getNewznabCategories().isEmpty()) {
                errors.add("Category " + category.getName() + " does not have any newznab categories configured");
            }
            if (category.getRequiredRegex().isPresent()) {
                checkRegex(errors, category.getRequiredRegex().get(), "Category " + category.getName() + " uses an invalid required regex");
            }
            if (category.getForbiddenRegex().isPresent()) {
                checkRegex(errors, category.getForbiddenRegex().get(), "Category " + category.getName() + " uses an invalid forbidden regex");
            }
            if (category.getApplyRestrictionsType() == SearchSourceRestriction.NONE) {
                if (!category.getRequiredWords().isEmpty() || !category.getForbiddenWords().isEmpty()) {
                    warnings.add("You selected not to apply any word restrictions on category " + category.getName() + " but supplied forbidden or required words");
                }
                if (category.getRequiredRegex().isPresent() || category.getForbiddenRegex().isPresent()) {
                    warnings.add("You selected not to apply any word restrictions on category " + category.getName() + " but supplied a forbidden or required regex");
                }
            }
        }
        List<Integer> allNewznabCategories = categories.stream().flatMap(x -> x.getNewznabCategories().stream()).collect(Collectors.toList());
        List<Integer> duplicateNewznabCategories = allNewznabCategories.stream().filter(x -> Collections.frequency(allNewznabCategories, 1) > 1).collect(Collectors.toList());
        if (!duplicateNewznabCategories.isEmpty()) {
            errors.add("The following newznab categories are assigned to multiple indexers: " + Joiner.on(", ").join(duplicateNewznabCategories));
        }

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
    }

    public void setCategories(List<Category> categories) {
        categories.sort(Comparator.comparing(Category::getName));
        this.categories = categories;
    }

    public List<Category> withoutAll() {
        return categories.stream().filter(x -> !allCategory.equals(x)).collect(Collectors.toList());
    }


}
