package org.nzbhydra.config;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.searching.SearchType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@ConfigurationProperties(prefix = "categories")
@Data
@NoArgsConstructor
public class Category {


    /**
     * Internal name
     */
    protected String name;

    protected boolean mayBeSelected = true;
    protected SearchType searchType;

    protected List<Integer> newznabCategories = new ArrayList<>();

    protected SearchSourceRestriction ignoreResultsFrom;

    protected SearchSourceRestriction applyRestrictionsType;
    protected String forbiddenRegex;
    protected List<String> forbiddenWords = new ArrayList<>();
    protected String requiredRegex;
    protected List<String> requiredWords = new ArrayList<>();

    protected Integer maxSizePreset;
    protected Integer minSizePreset;

    private boolean preselect; //TODO whats this

    public Category(String name) {
        this.name = name;
    }

    public boolean deepEquals(Category other) {
        return mayBeSelected == other.mayBeSelected &&
                searchType == other.searchType &&
                com.google.common.base.Objects.equal(name, other.name) &&
                com.google.common.base.Objects.equal(newznabCategories, other.newznabCategories) &&
                applyRestrictionsType == other.applyRestrictionsType &&
                ignoreResultsFrom == other.ignoreResultsFrom &&
                com.google.common.base.Objects.equal(forbiddenWords, other.forbiddenWords) &&
                com.google.common.base.Objects.equal(forbiddenRegex, other.forbiddenRegex) &&
                com.google.common.base.Objects.equal(requiredWords, other.requiredWords) &&
                com.google.common.base.Objects.equal(maxSizePreset, other.maxSizePreset) &&
                com.google.common.base.Objects.equal(minSizePreset, other.minSizePreset) &&
                com.google.common.base.Objects.equal(preselect, other.preselect) &&
                com.google.common.base.Objects.equal(requiredRegex, other.requiredRegex);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        if (!super.equals(o)) {
            return false;
        }
        Category category = (Category) o;
        return Objects.equals(name, category.name);
    }


    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), name);
    }


}
