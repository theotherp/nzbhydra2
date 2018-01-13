
package org.nzbhydra.mapping.newznab.json;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
    "url",
    "length",
    "type"
})
@Data
@AllArgsConstructor
@NoArgsConstructor
public class NewznabJsonEnclosureAttributes {

    public NewznabJsonEnclosureAttributes(String url, long length, String type) {
        this.url = url;
        this.length = String.valueOf(length);
        this.type = type;
    }

    @JsonProperty("url")
    public String url;
    @JsonProperty("length")
    public String length;
    @JsonProperty("type")
    public String type;

}
