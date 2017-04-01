package org.nzbhydra.config;

import com.google.common.collect.Sets;
import lombok.Data;
import org.nzbhydra.searching.SearchRestrictionType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashSet;
import java.util.Set;

@ConfigurationProperties(prefix = "categories")
@Data
public class Category {


    /**
     * Internal name
     */
    private String name;
    private String pretty;
    private boolean mayBeSelected = true;
    private boolean supportyById;
    private Set<Integer> newznabCategories = new HashSet<>();
    private SearchRestrictionType applyRestrictionsType = SearchRestrictionType.NONE;
    private SearchRestrictionType ignoreResultsFrom = SearchRestrictionType.NONE;
    private Set<String> forbiddenWords = Sets.newHashSet();
    private String forbiddenRegex;
    private Set<String> requiredWords = Sets.newHashSet();
    private String requiredRegex;


}
