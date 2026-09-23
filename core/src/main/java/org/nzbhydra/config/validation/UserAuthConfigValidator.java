

package org.nzbhydra.config.validation;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class UserAuthConfigValidator implements ConfigValidator<UserAuthConfig> {

    private static final String BCRYPT_PREFIX = "{bcrypt}";
    /**
     * The same marker the generic pass uses. {@link org.nzbhydra.config.auth.UserAuthConfig#password} is masked here
     * rather than by that pass ({@code @HiddenInUI}), and {@link BaseConfigValidator#prepareForSaving} runs this
     * validator first so the stored hash is kept, and a new plaintext password hashed, before the generic pass sees
     * the user. A user is identified by {@link StoredRecordMatcher}: by its id, or by its username if it has none.
     */
    private static final String UNCHANGED_PASSWORD_MARKER = SensitiveDataConfigValidator.UNCHANGED_MARKER;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == UserAuthConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, UserAuthConfig newConfig) {
        return new ConfigValidationResult();
    }

    /**
     * Prepares a single user, identifying its stored counterpart on its own. When saving the whole config
     * {@link AuthConfigValidator} matches all users at once instead (see {@link #prepareForSaving(UserAuthConfig, UserAuthConfig)}),
     * which also knows which stored users the other submitted users claim.
     */
    @Override
    public UserAuthConfig prepareForSaving(BaseConfig oldBaseConfig, UserAuthConfig newConfig) {
        return prepareForSaving(newConfig, findCorrespondingOldUserConfig(oldBaseConfig, newConfig));
    }

    /**
     * @param oldUserConfig the stored counterpart of {@code newConfig} as identified by {@link StoredRecordMatcher}, or
     *                      null if there is none. An unchanged password marker is then left in place and the save is
     *                      rejected.
     */
    public UserAuthConfig prepareForSaving(UserAuthConfig newConfig, UserAuthConfig oldUserConfig) {
        if (newConfig.getPassword() != null) {
            // If password is the unchanged marker, keep the stored password of the same user
            if (UNCHANGED_PASSWORD_MARKER.equals(newConfig.getPassword())) {
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
        return StoredRecordMatcher.findStoredCounterpart(newConfig, oldBaseConfig.getAuth().getUsers());
    }
}
