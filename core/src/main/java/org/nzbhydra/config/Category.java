package org.nzbhydra.config;

import com.google.common.collect.Sets;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@ConfigurationProperties(prefix = "categories")
@Data
public class Category {


    /**
     * Internal name
     */
    protected String name;
    protected String pretty;
    protected boolean mayBeSelected = true;
    protected boolean supportyById;
    protected Set<Integer> newznabCategories = new HashSet<>();
    protected SearchSourceRestriction applyRestrictionsType = SearchSourceRestriction.NONE;
    protected SearchSourceRestriction ignoreResultsFrom = SearchSourceRestriction.NONE;
    protected Set<String> forbiddenWords = Sets.newHashSet();
    protected String forbiddenRegex;
    protected Set<String> requiredWords = Sets.newHashSet();
    protected String requiredRegex;

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
