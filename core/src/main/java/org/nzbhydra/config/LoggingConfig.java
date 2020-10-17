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
    private boolean mapIpToHost;
    @RestartRequired
    private boolean logGc;
    private int logMaxHistory;
    @RestartRequired
    private String logfilelevel;
    private boolean logUsername;
    private List<String> markersToLog = new ArrayList<>();

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, LoggingConfig newLoggingConfig, BaseConfig newBaseConfig) {
        ConfigValidationResult result = new ConfigValidationResult();

        result.setRestartNeeded(isRestartNeeded(newBaseConfig.getMain().getLogging()));

        if (newBaseConfig.getMain().getLogging().getMarkersToLog().size() > 3) {
            result.getWarningMessages().add("You have more than 3 logging markers enabled. This is very rarely useful. Please make sure that this is actually needed. When creating debug infos please only enable those markers requested by the developer.");
        }

        return result;
    }

    @Override
    public LoggingConfig prepareForSaving(BaseConfig oldBaseConfig) {
        return this;
    }

    @Override
    public LoggingConfig updateAfterLoading() {
        return this;
    }

    @Override
    public LoggingConfig initializeNewConfig() {
        return this;
    }

}
