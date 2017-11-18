
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class User {

    @JsonProperty("maySeeAdmin")
    public boolean maySeeAdmin;
    @JsonProperty("maySeeDetailsDl")
    public boolean maySeeDetailsDl;
    @JsonProperty("maySeeStats")
    public boolean maySeeStats;
    @JsonProperty("password")
    public String password;
    @JsonProperty("showIndexerSelection")
    public boolean showIndexerSelection;
    @JsonProperty("username")
    public String username;

}
