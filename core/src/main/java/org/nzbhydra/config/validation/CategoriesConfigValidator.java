

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
import java.util.Objects;
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
        for (int index = 0; index < newConfig.getCategories().size(); index++) {
            Category category = newConfig.getCategories().get(index);
            // FM-113: a nameless category has nothing to quote, so it is named by its position in
            // the catalog, counting from one. Until FM-113 this could not be reported at all --
            // CategoriesConfig.setCategories threw while sorting, inside Jackson's request-body
            // binding, before this validator was ever called.
            if (category.getName() == null || category.getName().trim().isEmpty()) {
                errors.add("Category number " + (index + 1) + " does not have a name");
            }
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
        // The null guard matches the one the loop above already applies to the same field; without
        // it the nameless-category path reported above would itself throw here (FM-113).
        List<Integer> allNewznabCategories = newConfig.getCategories().stream()
            .filter(x -> x.getNewznabCategories() != null)
            .flatMap(x -> x.getNewznabCategories().stream().flatMap(Collection::stream)).toList();
        List<Integer> duplicateNewznabCategories = allNewznabCategories.stream().filter(x -> Collections.frequency(allNewznabCategories, 1) > 1).collect(Collectors.toList());
        if (!duplicateNewznabCategories.isEmpty()) {
            errors.add("The following newznab categories are assigned to multiple indexers: " + Joiner.on(", ").join(duplicateNewznabCategories));
        }

        // Objects.equals rather than x.getName().equals(...): a nameless category in the catalog
        // must not throw here on the way to being reported above (FM-113).
        if (!"All".equals(newConfig.getDefaultCategory()) && newConfig.getCategories().stream().noneMatch(x -> Objects.equals(x.getName(), newConfig.getDefaultCategory()))) {
            errors.add("Category \"" + newConfig.getDefaultCategory() + "\" set as default category but no such category exists");
        }

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
    }
}
