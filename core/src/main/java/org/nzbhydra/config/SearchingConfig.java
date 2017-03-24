package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.searching.SearchRestrictionType;


@Data
public class SearchingConfig {

    private boolean alwaysShowDuplicates;
    private SearchRestrictionType applyRestrictions;
    //categorySettings ;
    private int duplicateAgeThreshold;
    private int duplicateSizeThresholdInPercent;
    private String forbiddenGroups;
    private String forbiddenPosters;
    private String forbiddenRegex;
    private String forbiddenWords;
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
    private String requiredWords;
    private int timeout;
    private String userAgent;
};
