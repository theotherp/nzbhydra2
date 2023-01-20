
package org.nzbhydra.mapping.newznab.json;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "title",
    "description",
    "link",
    "language",
    "webMaster",
    "category",
    "image",
    "response",
    "item"
})
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class NewznabJsonChannel {

    @JsonProperty("title")
    public String title;
    @JsonProperty("description")
    public String description;
    @JsonProperty("link")
    public String link;
    @JsonProperty("language")
    public String language;
    @JsonProperty("webMaster")
    public String webMaster;
    @JsonProperty("category")
    public Map<Object, Object> category = new HashMap<>(); //Don't know what this is
    @JsonProperty("image")
    public NewznabJsonImage image;
    @JsonProperty("response")
    public NewznabJsonChannelResponse response;
    @JsonProperty("item")
    public List<NewznabJsonItem> item = new ArrayList<>();
    @JsonProperty("generator")
    private String generator;

}
