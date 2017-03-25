package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.searching.SearchRestrictionType;

import java.util.HashSet;
import java.util.Set;


@Data
public class SearchingConfig {

    private boolean alwaysShowDuplicates;
    private SearchRestrictionType applyRestrictions;
    //categorySettings ;
    private int duplicateAgeThreshold;
    private int duplicateSizeThresholdInPercent;
    private Set<String> forbiddenGroups = new HashSet<>();
    private Set<String> forbiddenPosters = new HashSet<>();
    private String forbiddenRegex;
    private Set<String> forbiddenWords = new HashSet<>();
    private boolean generateQueries;
    private SearchRestrictionType idFallbackToTitle;
    private boolean idFallbackToTitlePerIndexer;
    private boolean ignorePassworded;
    private boolean ignoreTemporarilyDisabled;
    private Integer maxAge;
    private String nzbAccessType;
    private boolean removeLanguage;
    private boolean removeObfuscated;
    private String requiredRegex;
    private Set<String> requiredWords = new HashSet<>();
    private int timeout;
    private String userAgent;
};
