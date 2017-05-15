
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "applyRestrictions",
        "forbiddenRegex",
        "forbiddenWords",
        "ignoreResults",
        "max",
        "min",
        "newznabCategories",
        "requiredRegex",
        "requiredWords"
})
@Data
public class Category {

    @JsonProperty("applyRestrictions")
    public String applyRestrictions;
    @JsonProperty("forbiddenRegex")
    public String forbiddenRegex;
    @JsonProperty("forbiddenWords")
    public List<String> forbiddenWords = new ArrayList<>();
    @JsonProperty("ignoreResults")
    public String ignoreResults;
    @JsonProperty("max")
    public int max;
    @JsonProperty("min")
    public int min;
    @JsonProperty("newznabCategories")
    public List<Integer> newznabCategories = new ArrayList<>();
    @JsonProperty("requiredRegex")
    public String requiredRegex;
    @JsonProperty("requiredWords")
    public List<String> requiredWords = new ArrayList<>();

}
