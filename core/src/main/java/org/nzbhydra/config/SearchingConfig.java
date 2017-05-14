package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import lombok.Data;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;


@Data
public class SearchingConfig extends ValidatingConfig {

    private boolean alwaysShowDuplicates;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction applyRestrictions = SearchSourceRestriction.BOTH;
    //categorySettings ;
    private float duplicateAgeThreshold;
    private float duplicateSizeThresholdInPercent;
    private boolean enableCategorySizes;
    private List<String> forbiddenGroups = new ArrayList<>();
    private List<String> forbiddenPosters = new ArrayList<>();
    private String forbiddenRegex;
    private List<String> forbiddenWords = new ArrayList<>();
    private SearchSourceRestriction generateQueries = SearchSourceRestriction.NONE;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction idFallbackToTitle = SearchSourceRestriction.NONE;
    private boolean idFallbackToTitlePerIndexer;
    private boolean ignorePassworded;
    private boolean ignoreTemporarilyDisabled;
    private int keepSearchResultsForDays;
    private Integer maxAge;
    @JsonFormat(shape = Shape.STRING)
    private NzbAccessType nzbAccessType = NzbAccessType.REDIRECT;
    private boolean removeLanguage;
    private boolean removeObfuscated;
    private String requiredRegex;
    private List<String> requiredWords = new ArrayList<>();
    private Integer timeout = 30;
    private String userAgent;
    private boolean wrapApiErrors;


    @Override
    public ConfigValidationResult validateConfig() {
        List<String> errors = new ArrayList<>();
        checkRegex(errors, requiredRegex, "The required regex in \"Searching\" is invalid");
        checkRegex(errors, forbiddenRegex, "The forbidden in \"Searching\" is invalid");
        return new ConfigValidationResult(errors.isEmpty(), errors, Collections.emptyList());
    }
};
