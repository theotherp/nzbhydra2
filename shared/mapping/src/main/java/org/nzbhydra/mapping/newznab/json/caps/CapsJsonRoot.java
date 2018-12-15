
package org.nzbhydra.mapping.newznab.json.caps;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "server",
        "limits",
        "registration",
        "searching"
})
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CapsJsonRoot {

    @JsonProperty("server")
    private CapsJsonServer server;
    @JsonProperty("limits")
    private CapsJsonLimits limits;
    @JsonProperty("registration")
    private CapsJsonRegistration registration;
    @JsonProperty("searching")
    private CapsJsonSearching searching;
    @JsonProperty("categories")
    private CapsJsonCategoriesHolder categories;


}
