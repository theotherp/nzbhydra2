/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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


import com.google.common.base.MoreObjects;
import lombok.Data;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.category.Category.Subtype;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import static org.nzbhydra.config.searching.SearchType.SEARCH;

@Data
public class CategoriesConfig {

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


    public void setCategories(List<Category> categories) {
        categories.sort(Comparator.comparing(Category::getName));
        this.categories = categories;
    }

    public List<Category> withoutAll() {
        return categories.stream().filter(x -> !allCategory.equals(x)).collect(Collectors.toList());
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
