package org.nzbhydra.config;


import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class LoggingConfig extends ValidatingConfig {

    private String consolelevel;
    private HistoryUserInfoType historyUserInfoType;
    private int logMaxDays;
    private boolean logIpAddresses;
    private int logMaxSize;
    private String logfilelevel;
    private String logfilename;
    private boolean logUsername;

    @Override
    public List<String> validateConfig() {
        return new ArrayList<>();
    }
}
