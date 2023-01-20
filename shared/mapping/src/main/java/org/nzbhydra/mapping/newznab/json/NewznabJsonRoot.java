
package org.nzbhydra.mapping.newznab.json;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.springnative.ReflectionMarker;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "@attributes",
        "channel"
})
@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class NewznabJsonRoot extends NewznabResponse {

    @Override
    @JsonIgnore
    public String getContentHeader() {
        return "application/json; charset=UTF-8";
    }

    @Override
    @JsonIgnore
    public NewznabResponse.SearchType getSearchType() {
        return SearchType.JSON;
    }

    @Override
    public void setSearchType(NewznabResponse.SearchType searchType) {
        //Not needed, always JSON (unless at some point torznab supports JSON)
    }

    @JsonProperty("@attributes")
    public NewznabJsonRootAttributes attributes;
    @JsonProperty("channel")
    public NewznabJsonChannel channel;

}
