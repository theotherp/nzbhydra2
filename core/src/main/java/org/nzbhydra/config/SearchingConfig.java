package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import lombok.Data;

import java.util.HashSet;
import java.util.Set;


@Data
public class SearchingConfig {

    private boolean alwaysShowDuplicates = false;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction applyRestrictions = SearchSourceRestriction.NONE;
    //categorySettings ;
    private float duplicateAgeThreshold = 2F;
    private float duplicateSizeThresholdInPercent = 1F;
    private boolean enableCategorySizes = true;
    private Set<String> forbiddenGroups = new HashSet<>();
    private Set<String> forbiddenPosters = new HashSet<>();
    private String forbiddenRegex;
    private Set<String> forbiddenWords = new HashSet<>();
    private SearchSourceRestriction generateQueries;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction idFallbackToTitle = SearchSourceRestriction.NONE;
    private boolean idFallbackToTitlePerIndexer = false;
    private boolean ignorePassworded = false;
    private boolean ignoreTemporarilyDisabled = false;
    private Integer maxAge;
    @JsonFormat(shape = Shape.STRING)
    private NzbAccessType nzbAccessType = NzbAccessType.REDIRECT;
    private boolean removeLanguage = false;
    private boolean removeObfuscated = false;
    private String requiredRegex;
    private Set<String> requiredWords = new HashSet<>();
    private Integer timeout = 20;
    private String userAgent = "NZBHydra";
};
