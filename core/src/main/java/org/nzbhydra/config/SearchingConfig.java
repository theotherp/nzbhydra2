package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.searching.SearchRestrictionType;

import java.util.HashSet;
import java.util.Set;


@Data
public class SearchingConfig {

    public enum NzbAccessType {
        REDIRECT,
        PROXY
    }

    private boolean alwaysShowDuplicates = false;
    private SearchRestrictionType applyRestrictions = SearchRestrictionType.NONE;
    //categorySettings ;
    private float duplicateAgeThreshold = 2F;
    private float duplicateSizeThresholdInPercent = 1F;
    private Set<String> forbiddenGroups = new HashSet<>();
    private Set<String> forbiddenPosters = new HashSet<>();
    private String forbiddenRegex;
    private Set<String> forbiddenWords = new HashSet<>();
    private boolean generateQueries;
    private SearchRestrictionType idFallbackToTitle = SearchRestrictionType.NONE;
    private boolean idFallbackToTitlePerIndexer = false;
    private boolean ignorePassworded = false;
    private boolean ignoreTemporarilyDisabled = false;
    private Integer maxAge;
    private NzbAccessType nzbAccessType = NzbAccessType.REDIRECT;
    private boolean removeLanguage = false;
    private boolean removeObfuscated = false;
    private String requiredRegex;
    private Set<String> requiredWords = new HashSet<>();
    private Integer timeout;
    private String userAgent = "NZBHydra";
};
