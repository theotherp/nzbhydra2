package org.nzbhydra.config;


import lombok.Data;

@Data
public class LoggingConfig extends ValidatingConfig {

    private String consolelevel;
    private HistoryUserInfoType historyUserInfoType = HistoryUserInfoType.NONE;
    private boolean logIpAddresses;
    private int logMaxSize;
    private String logfilelevel;
    private boolean logUsername;


    @Override
    public ConfigValidationResult validateConfig() {
        return new ConfigValidationResult();
    }
}
