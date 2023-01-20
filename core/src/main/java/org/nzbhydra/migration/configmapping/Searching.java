
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "applyRestrictions",
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
        "removeTrailing",
        "requiredRegex",
        "requiredWords",
        "timeout",
        "userAgent"
})
@Data
@ReflectionMarker
public class Searching {

    @JsonProperty("applyRestrictions")
    public String applyRestrictions;
    @JsonProperty("duplicateAgeThreshold")
    public int duplicateAgeThreshold;
    @JsonProperty("duplicateSizeThresholdInPercent")
    public int duplicateSizeThresholdInPercent;
    @JsonProperty("forbiddenGroups")
    @JsonDeserialize(using = ListOrStringToStringDeserializer.class)
    public List<String> forbiddenGroups;
    @JsonProperty("forbiddenPosters")
    @JsonDeserialize(using = ListOrStringToStringDeserializer.class)
    public List<String> forbiddenPosters;
    @JsonProperty("forbiddenRegex")
    public String forbiddenRegex;
    @JsonProperty("forbiddenWords")
    @JsonDeserialize(using = ListOrStringToStringDeserializer.class)
    public List<String> forbiddenWords;
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
    @JsonProperty("removeTrailing")
    @JsonDeserialize(using = ListOrStringToStringDeserializer.class)
    public List<String> removeTrailing;
    @JsonProperty("requiredRegex")
    public String requiredRegex;
    @JsonProperty("requiredWords")
    @JsonDeserialize(using = ListOrStringToStringDeserializer.class)
    public List<String> requiredWords;
    @JsonProperty("timeout")
    public int timeout;
    @JsonProperty("userAgent")
    public String userAgent;

}
