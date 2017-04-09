package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import lombok.Data;

import java.util.Set;


@Data
public class SearchingConfig {

    private boolean alwaysShowDuplicates;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction applyRestrictions;
    //categorySettings ;
    private float duplicateAgeThreshold;
    private float duplicateSizeThresholdInPercent;
    private boolean enableCategorySizes;
    private Set<String> forbiddenGroups;
    private Set<String> forbiddenPosters;
    private String forbiddenRegex;
    private Set<String> forbiddenWords;
    private SearchSourceRestriction generateQueries;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction idFallbackToTitle;
    private boolean idFallbackToTitlePerIndexer;
    private boolean ignorePassworded;
    private boolean ignoreTemporarilyDisabled;
    private Integer maxAge;
    @JsonFormat(shape = Shape.STRING)
    private NzbAccessType nzbAccessType;
    private boolean removeLanguage;
    private boolean removeObfuscated;
    private String requiredRegex;
    private Set<String> requiredWords;
    private Integer timeout;
    private String userAgent;
};
