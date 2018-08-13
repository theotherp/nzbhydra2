package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "auth.users")
public class UserAuthConfig extends ValidatingConfig<UserAuthConfig> {

    private static final String PASSWORD_ID = "{noop}";
    private boolean maySeeAdmin;
    private boolean maySeeDetailsDl;
    private boolean maySeeStats;
    private boolean showIndexerSelection;
    @SensitiveData
    private String username;
    @SensitiveData
    private String password;

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, UserAuthConfig newConfig) {
        return new ConfigValidationResult();
    }

    @Override
    public UserAuthConfig prepareForSaving() {
        if (password != null && !password.startsWith("{noop}")) {
            password = PASSWORD_ID + password;
        }
        return this;
    }

    @Override
    public UserAuthConfig updateAfterLoading() {
        if (password != null && password.startsWith("{noop}")) {
            password = password.substring(6);
        }
        return this;
    }
}
