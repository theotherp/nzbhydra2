
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "defaultCategory",
        "downloadType",
        "enabled",
        "host",
        "iconCssClass",
        "name",
        "nzbAddingType",
        "nzbaccesstype",
        "password",
        "port",
        "ssl",
        "type",
        "username",
        "apikey",
        "url"
})
@Data
public class Downloader {

    @JsonProperty("defaultCategory")
    public String defaultCategory;
    @JsonProperty("downloadType")
    public String downloadType;
    @JsonProperty("enabled")
    public boolean enabled;
    @JsonProperty("host")
    public String host;
    @JsonProperty("iconCssClass")
    public String iconCssClass;
    @JsonProperty("name")
    public String name;
    @JsonProperty("nzbAddingType")
    public String nzbAddingType;
    @JsonProperty("nzbaccesstype")
    public String nzbaccesstype;
    @JsonProperty("password")
    public String password;
    @JsonProperty("port")
    public int port;
    @JsonProperty("ssl")
    public boolean ssl;
    @JsonProperty("type")
    public String type;
    @JsonProperty("username")
    public String username;
    @JsonProperty("apikey")
    public String apikey;
    @JsonProperty("url")
    public String url;

}
