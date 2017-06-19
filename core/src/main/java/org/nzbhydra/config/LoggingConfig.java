package org.nzbhydra.config;


import lombok.Data;

@Data
public class LoggingConfig extends ValidatingConfig {

    private String consolelevel;
    private HistoryUserInfoType historyUserInfoType = HistoryUserInfoType.NONE;
    private int logMaxDays;
    private boolean logIpAddresses;
    private int logMaxSize;
    private String logfilelevel;
    private String logFolder;
    private boolean logUsername;

    public void setLogFolder(String logFolder) {
        if (logFolder != null && logFolder.endsWith("/")) {
            logFolder = logFolder.substring(0, logFolder.length() - 1);
        }
        this.logFolder = logFolder;
    }

    @Override
    public ConfigValidationResult validateConfig() {
        return new ConfigValidationResult();
    }
}
