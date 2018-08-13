package org.nzbhydra.config;


import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class LoggingConfig extends ValidatingConfig<LoggingConfig> {

    @RestartRequired
    private String consolelevel;
    private HistoryUserInfoType historyUserInfoType = HistoryUserInfoType.NONE;
    private boolean logIpAddresses;
    private int logMaxHistory;
    @RestartRequired
    private String logfilelevel;
    private boolean logUsername;
    private List<String> markersToLog = new ArrayList<>();


    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, LoggingConfig newLoggingConfig) {
        ConfigValidationResult result = new ConfigValidationResult();

        result.setRestartNeeded(isRestartNeeded(oldConfig.getMain().getLogging()));

        return result;
    }

    @Override
    public LoggingConfig prepareForSaving() {
        return this;
    }

    @Override
    public LoggingConfig updateAfterLoading() {
        return this;
    }

}
