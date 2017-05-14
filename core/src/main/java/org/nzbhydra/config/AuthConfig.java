package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Data
@ConfigurationProperties
@EqualsAndHashCode
public class AuthConfig extends ValidatingConfig {

    @JsonFormat(shape = Shape.STRING)
    private AuthType authType;
    private boolean rememberUsers;
    private boolean restrictAdmin;
    private boolean restrictDetailsDl;
    private boolean restrictIndexerSelection;
    private boolean restrictSearch;
    private boolean restrictStats;

    private List<UserAuthConfig> users = new ArrayList<>();

    @JsonIgnore
    public boolean isAuthConfigured() {
        return authType != AuthType.NONE;
    }


    @Override
    public ConfigValidationResult validateConfig() {
        List<String> errors = new ArrayList<>();
        if (authType != AuthType.NONE && users.isEmpty()) {
            errors.add("You've enabled security but not defined any users");
        } else if (authType != AuthType.NONE && restrictAdmin && users.stream().noneMatch(UserAuthConfig::isMaySeeAdmin)) {
            errors.add("You've restricted admin access but no user has admin rights");
        }

        return new ConfigValidationResult(errors.isEmpty(), errors, Collections.emptyList());
    }
}
