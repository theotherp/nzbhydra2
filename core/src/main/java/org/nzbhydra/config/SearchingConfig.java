package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;


@Data
public class SearchingConfig {

    private boolean alwaysShowDuplicates;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction applyRestrictions;
    //categorySettings ;
    private float duplicateAgeThreshold;
    private float duplicateSizeThresholdInPercent;
    private boolean enableCategorySizes;
    private List<String> forbiddenGroups = new ArrayList<>();
    private List<String> forbiddenPosters = new ArrayList<>();
    private String forbiddenRegex;
    private List<String> forbiddenWords = new ArrayList<>();
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
    private List<String> requiredWords = new ArrayList<>();
    private Integer timeout;
    private String userAgent;


};
