package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "downloaders")
public class DownloaderConfig extends ValidatingConfig {

    @SensitiveData
    private String apiKey;
    private String defaultCategory;
    private DownloadType downloadType;
    private boolean enabled;
    private String iconCssClass;
    private String name;
    private NzbAccessType nzbAccessType;
    private NzbAddingType nzbAddingType;
    private DownloaderType downloaderType;
    @SensitiveData
    private String url;

    public DownloaderType getDownloaderType() {
        return downloaderType;
    }

    @Override
    public ConfigValidationResult validateConfig() {
        return new ConfigValidationResult();
    }
}
