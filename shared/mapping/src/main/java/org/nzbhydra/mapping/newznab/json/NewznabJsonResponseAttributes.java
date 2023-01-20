
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
    "offset",
    "total"
})
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class NewznabJsonResponseAttributes {

    public NewznabJsonResponseAttributes(Integer offset, Integer total) {
        this.offset = String.valueOf(offset);
        this.total = String.valueOf(total);
    }

    @JsonProperty("offset")
    public String offset;
    @JsonProperty("total")
    public String total;

}
