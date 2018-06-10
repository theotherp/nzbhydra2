package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "auth.users")
public class UserAuthConfig extends ValidatingConfig<UserAuthConfig> {

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
}
