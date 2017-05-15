
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "alwaysShowDuplicates",
        "applyRestrictions",
        "categorySettings",
        "duplicateAgeThreshold",
        "duplicateSizeThresholdInPercent",
        "forbiddenGroups",
        "forbiddenPosters",
        "forbiddenRegex",
        "forbiddenWords",
        "generate_queries",
        "htmlParser",
        "idFallbackToTitle",
        "idFallbackToTitlePerIndexer",
        "ignorePassworded",
        "ignoreTemporarilyDisabled",
        "maxAge",
        "nzbAccessType",
        "removeLanguage",
        "removeObfuscated",
        "requiredRegex",
        "requiredWords",
        "timeout",
        "userAgent"
})
@Data
public class Searching {

    @JsonProperty("alwaysShowDuplicates")
    public boolean alwaysShowDuplicates;
    @JsonProperty("applyRestrictions")
    public String applyRestrictions;
    @JsonProperty("duplicateAgeThreshold")
    public int duplicateAgeThreshold;
    @JsonProperty("duplicateSizeThresholdInPercent")
    public int duplicateSizeThresholdInPercent;
    @JsonProperty("forbiddenGroups")
    public String forbiddenGroups;
    @JsonProperty("forbiddenPosters")
    public String forbiddenPosters;
    @JsonProperty("forbiddenRegex")
    public String forbiddenRegex;
    @JsonProperty("forbiddenWords")
    public String forbiddenWords;
    @JsonProperty("generate_queries")
    public List<String> generateQueries = null;
    @JsonProperty("htmlParser")
    public String htmlParser;
    @JsonProperty("idFallbackToTitle")
    public List<String> idFallbackToTitle = null;
    @JsonProperty("idFallbackToTitlePerIndexer")
    public boolean idFallbackToTitlePerIndexer;
    @JsonProperty("ignorePassworded")
    public boolean ignorePassworded;
    @JsonProperty("ignoreTemporarilyDisabled")
    public boolean ignoreTemporarilyDisabled;
    @JsonProperty("maxAge")
    public Integer maxAge;
    @JsonProperty("nzbAccessType")
    public String nzbAccessType;
    @JsonProperty("removeLanguage")
    public boolean removeLanguage;
    @JsonProperty("removeObfuscated")
    public boolean removeObfuscated;
    @JsonProperty("requiredRegex")
    public String requiredRegex;
    @JsonProperty("requiredWords")
    public String requiredWords;
    @JsonProperty("timeout")
    public int timeout;
    @JsonProperty("userAgent")
    public String userAgent;

}
