

package org.nzbhydra.config.validation;

import com.google.common.base.Joiner;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.searching.CategoryProvider;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.nzbhydra.config.validation.ConfigValidationTools.checkRegex;

@Component
public class CategoriesConfigValidator implements ConfigValidator<CategoriesConfig> {

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == CategoriesConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, CategoriesConfig newConfig) {
        ArrayList<String> errors = new ArrayList<>();
        ArrayList<String> warnings = new ArrayList<>();
        for (Category category : newConfig.getCategories()) {
            if (category.getNewznabCategories() == null || category.getNewznabCategories().isEmpty()) {
                errors.add("Category \"" + category.getName() + "\" does not have any newznab categories configured");
            } else {
                Optional<Integer> baseNewznabCategory = category.getNewznabCategories().stream().flatMap(Collection::stream).filter(x -> x % 1000 == 0).findFirst();
                if (baseNewznabCategory.isPresent()) {
                    boolean nonBaseNewznabCategoryDefined = category.getNewznabCategories().stream().flatMap(Collection::stream).anyMatch(x -> !x.equals(baseNewznabCategory.get()) && CategoryProvider.checkCategoryMatchingMainCategory(x, baseNewznabCategory.get()));

                    if (nonBaseNewznabCategoryDefined) {
                        warnings.add("Category " + category.getName() + " uses the main category \"" + baseNewznabCategory.get() + "\". It does not make sense to configure sublevel categories already contained by their parent category.");
                    }
                }
            }

            if (category.getRequiredRegex().isPresent()) {
                checkRegex(errors, category.getRequiredRegex().get(), "Category \"" + category.getName() + "\" uses an invalid required regex");
            }
            if (category.getForbiddenRegex().isPresent()) {
                checkRegex(errors, category.getForbiddenRegex().get(), "Category \"" + category.getName() + "\" uses an invalid forbidden regex");
            }
            if (category.getApplyRestrictionsType() == SearchSourceRestriction.NONE) {
                if (!category.getRequiredWords().isEmpty() || !category.getForbiddenWords().isEmpty()) {
                    warnings.add("You selected not to apply any word restrictions on category \"" + category.getName() + "\" but supplied forbidden or required words");
                }
                if (category.getRequiredRegex().isPresent() || category.getForbiddenRegex().isPresent()) {
                    warnings.add("You selected not to apply any word restrictions on category \"" + category.getName() + "\" but supplied a forbidden or required regex");
                }
            }
        }
        List<Integer> allNewznabCategories = newConfig.getCategories().stream().flatMap(x -> x.getNewznabCategories().stream().flatMap(Collection::stream)).toList();
        List<Integer> duplicateNewznabCategories = allNewznabCategories.stream().filter(x -> Collections.frequency(allNewznabCategories, 1) > 1).collect(Collectors.toList());
        if (!duplicateNewznabCategories.isEmpty()) {
            errors.add("The following newznab categories are assigned to multiple indexers: " + Joiner.on(", ").join(duplicateNewznabCategories));
        }

        if (!"All".equals(newConfig.getDefaultCategory()) && newConfig.getCategories().stream().noneMatch(x -> x.getName().equals(newConfig.getDefaultCategory()))) {
            errors.add("Category \"" + newConfig.getDefaultCategory() + "\" set as default category but no such category exists");
        }

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
    }
}
