package org.nzbhydra.searching;

import lombok.Data;

import java.util.List;

@Data
public class Category {

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
