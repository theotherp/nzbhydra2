
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
    "version"
})
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class NewznabJsonRootAttributes {

    @JsonProperty("version")
    public String version;

}
