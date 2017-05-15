
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "authType",
        "rememberUsers",
        "restrictAdmin",
        "restrictDetailsDl",
        "restrictIndexerSelection",
        "restrictSearch",
        "restrictStats",
        "users"
})
@Data
public class Auth {

    @JsonProperty("authType")
    public String authType;
    @JsonProperty("rememberUsers")
    public boolean rememberUsers;
    @JsonProperty("restrictAdmin")
    public boolean restrictAdmin;
    @JsonProperty("restrictDetailsDl")
    public boolean restrictDetailsDl;
    @JsonProperty("restrictIndexerSelection")
    public boolean restrictIndexerSelection;
    @JsonProperty("restrictSearch")
    public boolean restrictSearch;
    @JsonProperty("restrictStats")
    public boolean restrictStats;
    @JsonProperty("users")
    public List<User> users = new ArrayList<>();

}
