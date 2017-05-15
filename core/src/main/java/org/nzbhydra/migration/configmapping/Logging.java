
package org.nzbhydra.migration.configmapping;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Data;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonPropertyOrder({
        "consolelevel",
        "keepLogFiles",
        "logIpAddresses",
        "logMaxSize",
        "logRotateAfterDays",
        "logfilelevel",
        "logfilename",
        "rolloverAtStart"
})
@Data
public class Logging {

    @JsonProperty("consolelevel")
    public String consolelevel;
    @JsonProperty("keepLogFiles")
    public int keepLogFiles;
    @JsonProperty("logIpAddresses")
    public boolean logIpAddresses;
    @JsonProperty("logMaxSize")
    public int logMaxSize;
    @JsonProperty("logRotateAfterDays")
    public Integer logRotateAfterDays;
    @JsonProperty("logfilelevel")
    public String logfilelevel;
    @JsonProperty("logfilename")
    public String logfilename;
    @JsonProperty("rolloverAtStart")
    public boolean rolloverAtStart;

}
