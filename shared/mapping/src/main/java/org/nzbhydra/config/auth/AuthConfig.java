

package org.nzbhydra.config.auth;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.RestartRequired;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
@ConfigurationProperties(prefix = "auth")
@EqualsAndHashCode
public class AuthConfig {

    @JsonFormat(shape = Shape.STRING)
    @RestartRequired
    private AuthType authType;
    private boolean rememberUsers = true;
    private int rememberMeValidityDays;
    @SensitiveData
    private String authHeader;
    private List<String> authHeaderIpRanges = new ArrayList<>();
    private boolean restrictAdmin = false;
    private boolean restrictDetailsDl = false;
    private boolean restrictIndexerSelection = false;
    private boolean restrictSearch = false;
    private boolean restrictStats = false;
    private boolean allowApiStats = true;
    @RestartRequired
    private String oidcIssuerUri;
    @RestartRequired
    private String oidcAuthorizationUri;
    @RestartRequired
    private String oidcTokenUri;
    @RestartRequired
    private String oidcUserInfoUri;
    @RestartRequired
    private String oidcJwkSetUri;
    @RestartRequired
    private String oidcClientId;
    @RestartRequired
    @SensitiveData
    private String oidcClientSecret;
    @RestartRequired
    private String oidcUsernameClaim = "preferred_username";
    @RestartRequired
    private String oidcRedirectUri = "{baseUrl}/login/oauth2/code/{registrationId}";
    @RestartRequired
    private List<String> oidcScopes = new ArrayList<>(List.of("openid", "profile", "email"));

    @DiffIgnore
    private List<UserAuthConfig> users = new ArrayList<>();

    @JsonIgnore
    public boolean isAuthConfigured() {
        return authType != AuthType.NONE;
    }


}
