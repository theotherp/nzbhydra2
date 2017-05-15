
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "categories",
        "enableCategorySizes"
})
@Data
public class Categories {

    @JsonProperty("categories")
    public Map<String, Category> categories = new HashMap<>();
    @JsonProperty("enableCategorySizes")
    public boolean enableCategorySizes;

}
