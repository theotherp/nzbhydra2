

package org.nzbhydra.config.auth;

import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ReflectionMarker
@ConfigurationProperties(prefix = "auth.users")
public class UserAuthConfig {

    public static final String PASSWORD_ID = "{noop}";
    private boolean maySeeAdmin;
    private boolean maySeeDetailsDl;
    private boolean maySeeStats;
    private boolean showIndexerSelection;
    @SensitiveData
    private String username;
    @SensitiveData
    private String password;

}
