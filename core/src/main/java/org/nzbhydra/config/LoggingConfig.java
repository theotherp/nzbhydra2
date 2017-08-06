package org.nzbhydra.config;


import lombok.Data;

@Data
public class LoggingConfig extends ValidatingConfig {

    @RestartNeeded
    private String consolelevel;
    private HistoryUserInfoType historyUserInfoType = HistoryUserInfoType.NONE;
    private boolean logIpAddresses;
    private int logMaxSize;
    @RestartNeeded
    private String logfilelevel;
    private boolean logUsername;


    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig) {
        return new ConfigValidationResult();
    }
}
