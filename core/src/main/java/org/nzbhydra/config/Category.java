package org.nzbhydra.config;

import com.google.common.collect.Sets;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Objects;
import java.util.Set;

@ConfigurationProperties(prefix = "categories")
@Data
@NoArgsConstructor
public class Category {


    /**
     * Internal name
     */
    protected String name;
    protected String pretty;
    protected boolean mayBeSelected;
    protected boolean supportyById;
    protected Set<Integer> newznabCategories;
    protected SearchSourceRestriction applyRestrictionsType;
    protected SearchSourceRestriction ignoreResultsFrom;
    protected Set<String> forbiddenWords = Sets.newHashSet();
    protected String forbiddenRegex;
    protected Set<String> requiredWords = Sets.newHashSet();
    protected String requiredRegex;

    public Category(String name, String pretty) {
        this.name = name;
        this.pretty = pretty;
    }

    public boolean deepEquals(Category other) {
        return mayBeSelected == other.mayBeSelected &&
                supportyById == other.supportyById &&
                com.google.common.base.Objects.equal(name, other.name) &&
                com.google.common.base.Objects.equal(pretty, other.pretty) &&
                com.google.common.base.Objects.equal(newznabCategories, other.newznabCategories) &&
                applyRestrictionsType == other.applyRestrictionsType &&
                ignoreResultsFrom == other.ignoreResultsFrom &&
                com.google.common.base.Objects.equal(forbiddenWords, other.forbiddenWords) &&
                com.google.common.base.Objects.equal(forbiddenRegex, other.forbiddenRegex) &&
                com.google.common.base.Objects.equal(requiredWords, other.requiredWords) &&
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
