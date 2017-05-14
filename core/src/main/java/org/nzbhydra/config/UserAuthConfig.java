package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "auth.users")
public class UserAuthConfig extends ValidatingConfig {

    private boolean maySeeAdmin;
    private boolean maySeeDetailsDl;
    private boolean maySeeStats;
    private boolean showIndexerSelection;
    @SensitiveData
    private String username;
    @SensitiveData
    private String password;

    @Override
    public ConfigValidationResult validateConfig() {
        return new ConfigValidationResult();
    }
}
