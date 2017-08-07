package org.nzbhydra.config;


import lombok.Data;

@Data
public class LoggingConfig extends ValidatingConfig {

    @RestartRequired
    private String consolelevel;
    private HistoryUserInfoType historyUserInfoType = HistoryUserInfoType.NONE;
    private boolean logIpAddresses;
    private int logMaxSize;
    @RestartRequired
    private String logfilelevel;
    private boolean logUsername;


    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig) {
        ConfigValidationResult result = new ConfigValidationResult();

        result.setRestartNeeded(isRestartNeeded(oldConfig.getMain().getLogging()));

        return result;
    }


}
