package org.nzbhydra.searching;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

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
    private List<Integer> newznabCategories;
    private SearchRestrictionType applyRestrictionsType;
    private SearchRestrictionType ignoreResults;
    private List<String> forbiddenWords;
    private String forbiddenRegex;
    private List<String> requiredWords;
    private String requiredRegex;


}
