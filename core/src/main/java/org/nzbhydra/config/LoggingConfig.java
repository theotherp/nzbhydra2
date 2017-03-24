package org.nzbhydra.config;


import lombok.Data;

@Data
public class LoggingConfig {

    private String consolelevel = "DEBUG";
    private int keepLogFiles = 25;
    private boolean logIpAddresses = true;
    private int logMaxSize = 1000;
    private Integer logRotateAfterDays = null;
    private String logfilelevel = "DEBUG";
    private String logfilename = "nzbhydra.log";
    private boolean rolloverAtStart = false;
}
