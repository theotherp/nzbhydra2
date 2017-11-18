
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class Category {

    @JsonProperty("applyRestrictions")
    public String applyRestrictions;
    @JsonProperty("forbiddenRegex")
    public String forbiddenRegex;
    @JsonProperty("forbiddenWords")
    @JsonDeserialize(using = ListOrStringToStringDeserializer.class)
    public List<String> forbiddenWords;
    @JsonProperty("ignoreResults")
    public String ignoreResults;
    @JsonProperty("max")
    public Integer max;
    @JsonProperty("min")
    public Integer min;
    @JsonProperty("newznabCategories")
    public List<Integer> newznabCategories = new ArrayList<>();
    @JsonProperty("requiredRegex")
    public String requiredRegex;
    @JsonProperty("requiredWords")
    @JsonDeserialize(using = ListOrStringToStringDeserializer.class)
    public List<String> requiredWords;

}
