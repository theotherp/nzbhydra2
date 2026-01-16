

package org.nzbhydra.config.category;


import com.google.common.base.MoreObjects;
import lombok.Data;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.category.Category.Subtype;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import static org.nzbhydra.config.searching.SearchType.SEARCH;

@Data
@ReflectionMarker
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
