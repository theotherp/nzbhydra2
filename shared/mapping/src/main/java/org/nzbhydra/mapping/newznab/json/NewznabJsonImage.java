
package org.nzbhydra.mapping.newznab.json;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "url",
    "title",
    "link",
    "description"
})
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class NewznabJsonImage {

    @JsonProperty("url")
    public String url;
    @JsonProperty("title")
    public String title;
    @JsonProperty("link")
    public String link;
    @JsonProperty("description")
    public String description;

}
