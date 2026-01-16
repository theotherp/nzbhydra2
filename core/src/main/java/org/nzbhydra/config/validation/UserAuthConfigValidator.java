

package org.nzbhydra.config.validation;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class UserAuthConfigValidator implements ConfigValidator<UserAuthConfig> {

    private static final String BCRYPT_PREFIX = "{bcrypt}";
    private static final String UNCHANGED_PASSWORD_MARKER = "***UNCHANGED***";
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == UserAuthConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, UserAuthConfig newConfig) {
        return new ConfigValidationResult();
    }

    @Override
    public UserAuthConfig prepareForSaving(BaseConfig oldBaseConfig, UserAuthConfig newConfig) {
        if (newConfig.getPassword() != null) {
            // If password is the unchanged marker, find the old password and keep it
            if (UNCHANGED_PASSWORD_MARKER.equals(newConfig.getPassword())) {
                // Find the corresponding old user config
                UserAuthConfig oldUserConfig = findCorrespondingOldUserConfig(oldBaseConfig, newConfig);
                if (oldUserConfig != null && oldUserConfig.getPassword() != null) {
                    newConfig.setPassword(oldUserConfig.getPassword());
                }
            } else {
                // Check if it's already hashed (starts with bcrypt prefix or old noop prefix)
                if (!newConfig.getPassword().startsWith(BCRYPT_PREFIX) &&
                    !newConfig.getPassword().startsWith(UserAuthConfig.PASSWORD_ID)) {
                    // It's a new plaintext password, hash it
                    String hashedPassword = passwordEncoder.encode(newConfig.getPassword());
                    newConfig.setPassword(BCRYPT_PREFIX + hashedPassword);
                } else if (newConfig.getPassword().startsWith(UserAuthConfig.PASSWORD_ID)) {
                    // Migrate old {noop} passwords to BCrypt
                    String plainPassword = newConfig.getPassword().substring(UserAuthConfig.PASSWORD_ID.length());
                    String hashedPassword = passwordEncoder.encode(plainPassword);
                    newConfig.setPassword(BCRYPT_PREFIX + hashedPassword);
                }
                // If it already starts with BCRYPT_PREFIX, leave it as is
            }
        }
        return newConfig;
    }

    @Override
    public UserAuthConfig updateAfterLoading(UserAuthConfig newConfig) {
        if (newConfig.getPassword() != null) {
            // For display purposes, show a placeholder for any hashed password
            if (newConfig.getPassword().startsWith(BCRYPT_PREFIX) ||
                newConfig.getPassword().startsWith(UserAuthConfig.PASSWORD_ID)) {
                newConfig.setPassword(UNCHANGED_PASSWORD_MARKER);
            }
        }
        return newConfig;
    }

    private UserAuthConfig findCorrespondingOldUserConfig(BaseConfig oldBaseConfig, UserAuthConfig newConfig) {
        if (oldBaseConfig == null || oldBaseConfig.getAuth() == null || oldBaseConfig.getAuth().getUsers() == null) {
            return null;
        }
        // Match by username
        return oldBaseConfig.getAuth().getUsers().stream()
                .filter(user -> user.getUsername() != null && user.getUsername().equals(newConfig.getUsername()))
                .findFirst()
                .orElse(null);
    }
}
