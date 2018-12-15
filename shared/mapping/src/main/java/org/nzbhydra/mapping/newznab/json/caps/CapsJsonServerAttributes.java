
package org.nzbhydra.mapping.newznab.json.caps;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "appversion",
        "version",
        "title",
        "strapline",
        "email",
        "url",
        "image"
})
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CapsJsonServerAttributes {

    @JsonProperty("appversion")
    private String appversion;
    @JsonProperty("version")
    private String version;
    @JsonProperty("title")
    private String title;
    @JsonProperty("strapline")
    private String strapline;
    @JsonProperty("email")
    private String email;
    @JsonProperty("url")
    private String url;
    @JsonProperty("image")
    private String image;

}
