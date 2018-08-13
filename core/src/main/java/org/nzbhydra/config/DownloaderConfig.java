package org.nzbhydra.config;

import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Optional;

@Data
@ConfigurationProperties(prefix = "downloaders")
public class DownloaderConfig extends ValidatingConfig<DownloaderConfig> {

    @SensitiveData
    private String apiKey;
    private String defaultCategory;
    private DownloadType downloadType;
    private boolean enabled;
    private String iconCssClass;
    private String name;
    private NzbAddingType nzbAddingType;
    private DownloaderType downloaderType;
    @SensitiveData
    private String url;
    @SensitiveData
    private String username;
    @SensitiveData
    private String password;

    public DownloaderType getDownloaderType() {
        return downloaderType;
    }

    public Optional<String> getUsername() {
        return Optional.ofNullable(Strings.emptyToNull(username));
    }

    public Optional<String> getPassword() {
        return Optional.ofNullable(Strings.emptyToNull(password));
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, DownloaderConfig newDownloaderConfig) {
        return new ConfigValidationResult();
    }

    @Override
    public DownloaderConfig prepareForSaving() {
        return this;
    }

    @Override
    public DownloaderConfig updateAfterLoading() {
        return this;
    }
}
