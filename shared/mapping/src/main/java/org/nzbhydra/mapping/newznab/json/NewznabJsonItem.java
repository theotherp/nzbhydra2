
package org.nzbhydra.mapping.newznab.json;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "title",
    "guid",
    "link",
    "comments",
    "pubDate",
    "category",
    "description",
    "enclosure",
    "attr"
})
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class NewznabJsonItem {

    @JsonProperty("title")
    public String title;
    @JsonProperty("guid")
    public String guid;
    @JsonProperty("id")
    public String id;
    @JsonProperty("link")
    public String link;
    @JsonProperty("comments")
    public String comments;
    @JsonProperty("pubDate")
    @JsonDeserialize(using = JsonPubdateDeserializer.class)
    @JsonSerialize(using = JsonPubdateSerializer.class)
    public Instant pubDate;
    @JsonProperty("category")
    public String category;
    @JsonProperty("description")
    public String description;
    @JsonProperty("enclosure")
    public NewznabJsonEnclosure enclosure;
    @JsonProperty("attr")
    public List<NewznabJsonItemAttr> attr = new ArrayList<>();

}
