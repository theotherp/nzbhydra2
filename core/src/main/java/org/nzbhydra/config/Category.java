package org.nzbhydra.config;

import com.google.common.collect.Sets;
import lombok.Data;
import org.nzbhydra.searching.SearchRestrictionType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Set;

@ConfigurationProperties(prefix = "categories")
@Data
public class Category {


    /**
     * Internal name
     */
    private String name;
    private String pretty;
    private boolean mayBeSelected;
    private boolean supportyById;
    private Set<Integer> newznabCategories;
    private SearchRestrictionType applyRestrictionsType;
    private SearchRestrictionType ignoreResultsFrom;
    private Set<String> forbiddenWords = Sets.newHashSet();
    private String forbiddenRegex;
    private Set<String> requiredWords = Sets.newHashSet();
    private String requiredRegex;


}
