
package org.nzbhydra.mapping.newznab.json.caps;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "search",
        "tv-search",
        "movie-search",
        "audio-search"
})
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CapsJsonSearching {

    @JsonProperty("search")
    private CapsJsonSearchIdAttributesHolder search;
    @JsonProperty("tv-search")
    private CapsJsonSearchIdAttributesHolder tvSearch;
    @JsonProperty("movie-search")
    private CapsJsonSearchIdAttributesHolder movieSearch;
    @JsonProperty("audio-search")
    private CapsJsonSearchIdAttributesHolder audioSearch;
    @JsonProperty("book-search")
    private CapsJsonSearchIdAttributesHolder bookSearch;

}
