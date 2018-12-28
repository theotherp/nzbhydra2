package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.base.Joiner;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@ConfigurationProperties
@EqualsAndHashCode
public class AuthConfig extends ValidatingConfig<AuthConfig> {

    @JsonFormat(shape = Shape.STRING)
    @RestartRequired
    private AuthType authType;
    private boolean rememberUsers = true;
    private int rememberMeValidityDays;
    private boolean restrictAdmin = false;
    private boolean restrictDetailsDl = false;
    private boolean restrictIndexerSelection = false;
    private boolean restrictSearch = false;
    private boolean restrictStats = false;
    private boolean allowApiStats = true;

    private List<UserAuthConfig> users = new ArrayList<>();

    @JsonIgnore
    public boolean isAuthConfigured() {
        return authType != AuthType.NONE;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, AuthConfig newConfig) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (authType != AuthType.NONE && users.isEmpty()) {
            errors.add("You've enabled security but not defined any users");
        } else if (authType != AuthType.NONE && restrictAdmin && users.stream().noneMatch(UserAuthConfig::isMaySeeAdmin)) {
            errors.add("You've restricted admin access but no user has admin rights");
        } else if (authType != AuthType.NONE && !restrictSearch && !restrictAdmin) {
            errors.add("You haven't enabled any access restrictions. Auth will not take any effect");
        }
        Set<String> usernames = new HashSet<>();
        List<String> duplicateUsernames = new ArrayList<>();
        for (UserAuthConfig user : users) {
            if (usernames.contains(user.getUsername())) {
                duplicateUsernames.add(user.getUsername());
            }
            usernames.add(user.getUsername());
        }
        if (!duplicateUsernames.isEmpty()) {
            errors.add("The following user names are not unique: " + Joiner.on(", ").join(duplicateUsernames));
        }

        return new ConfigValidationResult(errors.isEmpty(), isRestartNeeded(oldConfig.getAuth()), errors, warnings);
    }

    @Override
    public AuthConfig prepareForSaving() {
        getUsers().forEach(ValidatingConfig::prepareForSaving);
        return this;
    }

    @Override
    public AuthConfig updateAfterLoading() {
        getUsers().forEach(ValidatingConfig::updateAfterLoading);
        return this;
    }

    @Override
    public AuthConfig initializeNewConfig() {
        return this;
    }
}
