/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.config.category;


import com.google.common.base.Joiner;
import com.google.common.base.MoreObjects;
import lombok.Data;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.ValidatingConfig;
import org.nzbhydra.config.category.Category.Subtype;
import org.nzbhydra.searching.CategoryProvider;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.nzbhydra.searching.dtoseventsenums.SearchType.SEARCH;

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
    private String defaultCategory = "All";

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, CategoriesConfig newConfig, BaseConfig newBaseConfig) {
        ArrayList<String> errors = new ArrayList<>();
        ArrayList<String> warnings = new ArrayList<>();
        for (Category category : categories) {
            if (category.getNewznabCategories() == null || category.getNewznabCategories().isEmpty()) {
                errors.add("Category " + category.getName() + " does not have any newznab categories configured");
            } else {
                Optional<Integer> baseNewznabCategory = category.getNewznabCategories().stream().flatMap(Collection::stream).filter(x -> x % 1000 == 0).findFirst();
                if (baseNewznabCategory.isPresent()) {
                    boolean nonBaseNewznabCategoryDefined = category.getNewznabCategories().stream().flatMap(Collection::stream).anyMatch(x -> !x.equals(baseNewznabCategory.get()) && CategoryProvider.checkCategoryMatchingMainCategory(x, baseNewznabCategory.get()));

                    if (nonBaseNewznabCategoryDefined) {
                        warnings.add("Category " + category.getName() + " uses the main category " + baseNewznabCategory.get() + ". It does not make sense to configure sublevel categories already contained by their parent category.");
                    }
                }
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
        List<Integer> allNewznabCategories = categories.stream().flatMap(x -> x.getNewznabCategories().stream().flatMap(Collection::stream)).collect(Collectors.toList());
        List<Integer> duplicateNewznabCategories = allNewznabCategories.stream().filter(x -> Collections.frequency(allNewznabCategories, 1) > 1).collect(Collectors.toList());
        if (!duplicateNewznabCategories.isEmpty()) {
            errors.add("The following newznab categories are assigned to multiple indexers: " + Joiner.on(", ").join(duplicateNewznabCategories));
        }

        if (!"All".equals(newConfig.getDefaultCategory()) && categories.stream().noneMatch(x -> x.getName().equals(newConfig.getDefaultCategory()))) {
            errors.add("Category " + newConfig.getDefaultCategory() + " set as default category but no such category exists");
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

    @Override
    public CategoriesConfig prepareForSaving(BaseConfig oldBaseConfig) {
        return this;
    }

    @Override
    public CategoriesConfig updateAfterLoading() {
        return this;
    }

    @Override
    public CategoriesConfig initializeNewConfig() {
        return this;
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("enableCategorySizes", enableCategorySizes)
                .add("categories", categories)
                .add("defaultCategory", defaultCategory)
                .toString();
    }
}
