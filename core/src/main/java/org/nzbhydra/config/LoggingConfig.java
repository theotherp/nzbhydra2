package org.nzbhydra.config;


import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class LoggingConfig extends ValidatingConfig {

    private String consolelevel = "DEBUG";
    private int keepLogFiles = 25;
    private boolean logIpAddresses = true;
    private int logMaxSize = 1000;
    private Integer logRotateAfterDays = null;
    private String logfilelevel = "DEBUG";
    private String logfilename = "nzbhydra.log";
    private boolean rolloverAtStart = false;

    @Override
    public List<String> validateConfig() {
        return new ArrayList<>();
    }
}
