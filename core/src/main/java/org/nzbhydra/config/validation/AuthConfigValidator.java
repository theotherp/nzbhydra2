

package org.nzbhydra.config.validation;

import com.google.common.base.Joiner;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AuthConfigValidator implements ConfigValidator<AuthConfig> {

    @Autowired
    private UserAuthConfigValidator userAuthConfigValidator;

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == AuthConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, AuthConfig newConfig) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (newConfig.getAuthType() != AuthType.NONE && newConfig.getUsers().isEmpty()) {
            errors.add("You've enabled security but not defined any users");
        } else if (newConfig.getAuthType() != AuthType.NONE && newConfig.isRestrictAdmin() && newConfig.getUsers().stream().noneMatch(UserAuthConfig::isMaySeeAdmin)) {
            errors.add("You've restricted admin access but no user has admin rights");
        } else if (newConfig.getAuthType() != AuthType.NONE && !newConfig.isRestrictSearch() && !newConfig.isRestrictAdmin()) {
            errors.add("You haven't enabled any access restrictions. Auth will not take any effect");
        }
        if (newConfig.getAuthType() == AuthType.OIDC) {
            validateOidcConfig(newConfig, errors);
        }
        Set<String> usernames = new HashSet<>();
        List<String> duplicateUsernames = new ArrayList<>();
        for (UserAuthConfig user : newConfig.getUsers()) {
            if (usernames.contains(user.getUsername())) {
                duplicateUsernames.add(user.getUsername());
            }
            usernames.add(user.getUsername());
        }
        if (!duplicateUsernames.isEmpty()) {
            errors.add("The following user names are not unique: " + Joiner.on(", ").join(duplicateUsernames));
        }

        if (!newConfig.getAuthHeaderIpRanges().isEmpty()) {
            newConfig.getAuthHeaderIpRanges().forEach(x -> {
                Matcher matcher = Pattern.compile("^(\\*|(?:(?:\\d{1,3}\\.){3}\\d{1,3}(?:\\/\\d{1,2})?|(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(?:\\/\\d{1,3})?)(-(?:(?:\\d{1,3}\\.){3}\\d{1,3}|(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}))?,?)+$").matcher(x);
                if (!matcher.matches()) {
                    errors.add("IP range " + x + " is invalid");
                }
            });
        }

        return new ConfigValidationResult(errors.isEmpty(), ConfigValidationTools.isRestartNeeded(oldBaseConfig.getAuth(), newConfig), errors, warnings);
    }

    private void validateOidcConfig(AuthConfig newConfig, List<String> errors) {
        if (!StringUtils.hasText(newConfig.getOidcClientId())) {
            errors.add("OIDC client ID is required");
        }
        if (!StringUtils.hasText(newConfig.getOidcClientSecret())) {
            errors.add("OIDC client secret is required");
        }
        if (!StringUtils.hasText(newConfig.getOidcUsernameClaim())) {
            errors.add("OIDC username claim is required");
        }
        if (!StringUtils.hasText(newConfig.getOidcRedirectUri())) {
            errors.add("OIDC redirect URI is required");
        }
        if (newConfig.getOidcScopes() == null || newConfig.getOidcScopes().stream().noneMatch("openid"::equals)) {
            errors.add("OIDC scopes must include openid");
        }
        if (!StringUtils.hasText(newConfig.getOidcIssuerUri()) &&
            (!StringUtils.hasText(newConfig.getOidcAuthorizationUri()) ||
             !StringUtils.hasText(newConfig.getOidcTokenUri()) ||
             !StringUtils.hasText(newConfig.getOidcUserInfoUri()) ||
             !StringUtils.hasText(newConfig.getOidcJwkSetUri()))) {
            errors.add("OIDC issuer URI or all manual provider endpoints must be configured");
        }
    }

    @Override
    public AuthConfig prepareForSaving(BaseConfig oldBaseConfig, AuthConfig newAuthConfig) {
        // Identify all users at once so a user's stored password is only ever kept for the same user (by id, or by
        // username for a user without id) - never for another one that happens to sit at the same position
        final List<UserAuthConfig> newUsers = newAuthConfig.getUsers();
        final List<UserAuthConfig> oldUsers = oldBaseConfig == null || oldBaseConfig.getAuth() == null ? List.of() : oldBaseConfig.getAuth().getUsers();
        final List<Object> matches = StoredRecordMatcher.matchList(newUsers, oldUsers);
        for (int i = 0; i < newUsers.size(); i++) {
            newUsers.set(i, userAuthConfigValidator.prepareForSaving(newUsers.get(i), (UserAuthConfig) matches.get(i)));
        }
        return newAuthConfig;
    }

    @Override
    public AuthConfig updateAfterLoading(AuthConfig newAuthConfig) {
        // Need to update each user config and replace it with the result
        for (int i = 0; i < newAuthConfig.getUsers().size(); i++) {
            UserAuthConfig updated = userAuthConfigValidator.updateAfterLoading(newAuthConfig.getUsers().get(i));
            newAuthConfig.getUsers().set(i, updated);
        }
        return newAuthConfig;
    }

}
