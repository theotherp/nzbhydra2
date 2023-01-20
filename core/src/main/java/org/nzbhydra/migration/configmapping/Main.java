
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@ReflectionMarker
public class Main {

    @JsonProperty("apikey")
    public String apikey;
    @JsonProperty("branch")
    public String branch;
    @JsonProperty("configVersion")
    public int configVersion;
    @JsonProperty("debug")
    public boolean debug;
    @JsonProperty("dereferer")
    public String dereferer;
    @JsonProperty("externalUrl")
    public String externalUrl;
    @JsonProperty("firstStart")
    public int firstStart;
    @JsonProperty("flaskReloader")
    public boolean flaskReloader;
    @JsonProperty("gitPath")
    public String gitPath;
    @JsonProperty("host")
    public String host;
    @JsonProperty("httpProxy")
    public String httpProxy;
    @JsonProperty("httpsProxy")
    public String httpsProxy;
    @JsonProperty("isFirstStart")
    public boolean isFirstStart;
    @JsonProperty("keepSearchResultsForDays")
    public int keepSearchResultsForDays;
    @JsonProperty("logging")
    public Logging logging;
    @JsonProperty("pollShown")
    public int pollShown;
    @JsonProperty("port")
    public int port;
    @JsonProperty("repositoryBase")
    public String repositoryBase;
    @JsonProperty("runThreaded")
    public boolean runThreaded;
    @JsonProperty("secret")
    public String secret;
    @JsonProperty("shutdownForRestart")
    public boolean shutdownForRestart;
    @JsonProperty("socksProxy")
    public String socksProxy;
    @JsonProperty("ssl")
    public boolean ssl;
    @JsonProperty("sslcert")
    public String sslcert;
    @JsonProperty("sslkey")
    public String sslkey;
    @JsonProperty("startupBrowser")
    public boolean startupBrowser;
    @JsonProperty("theme")
    public String theme;
    @JsonProperty("urlBase")
    public String urlBase;
    @JsonProperty("useLocalUrlForApiAccess")
    public boolean useLocalUrlForApiAccess;

}
