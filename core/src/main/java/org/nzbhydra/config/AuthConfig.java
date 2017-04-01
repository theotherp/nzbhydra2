package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@Data
@ConfigurationProperties
public class AuthConfig {

    private AuthType authType;
    private boolean rememberUsers;
    private boolean restrictAdmin;
    private boolean restrictDetailsDl;
    private boolean restrictIndexerSelection;
    private boolean restrictSearch;
    private boolean restrictStats;

    private List<UserAuthConfig> users;

    @JsonIgnore
    public boolean isAuthConfigured() {
        return authType != AuthType.NONE;
    }

}
