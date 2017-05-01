package org.nzbhydra.config;


import com.google.common.base.Joiner;
import lombok.Data;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static org.nzbhydra.searching.SearchType.SEARCH;

@Data
public class CategoriesConfig extends ValidatingConfig {

    public final static Category allCategory = new Category("All");

    static {
        allCategory.setApplyRestrictionsType(SearchSourceRestriction.NONE);
        allCategory.setIgnoreResultsFrom(SearchSourceRestriction.NONE);
        allCategory.setMayBeSelected(true);
        allCategory.setSearchType(SEARCH);
    }

    private boolean enableCategorySizes = true;
    private List<Category> categories = new ArrayList<>();

    @Override
    public List<String> validateConfig() {
        ArrayList<String> errorMessages = new ArrayList<>();
        for (Category category : categories) {
            if (category.getNewznabCategories() == null || category.getNewznabCategories().isEmpty()) {
                errorMessages.add("Category " + category.getName() + " does not have any newznab categories configured");
            }
            checkRegex(errorMessages, category.getRequiredRegex(), "Category " + category.getName() + " uses an invalid required regex");
            checkRegex(errorMessages, category.getForbiddenRegex(), "Category " + category.getName() + " uses an invalid forbidden regex");
        }
        List<Integer> allNewznabCategories = categories.stream().flatMap(x -> x.getNewznabCategories().stream()).collect(Collectors.toList());
        List<Integer> duplicateNewznabCategories = allNewznabCategories.stream().filter(x -> Collections.frequency(allNewznabCategories, 1) > 1).collect(Collectors.toList());
        if (!duplicateNewznabCategories.isEmpty()) {
            errorMessages.add("The following newznab categories are assigned to multiple indexers: " + Joiner.on(", ").join(duplicateNewznabCategories));
        }

        return errorMessages;
    }


}
