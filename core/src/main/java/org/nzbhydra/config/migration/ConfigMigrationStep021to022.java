

package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Map;

public class ConfigMigrationStep021to022 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigration.class);
    private static final String BCRYPT_PREFIX = "{bcrypt}";
    private static final String NOOP_PREFIX = "{noop}";
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public int forVersion() {
        return 21;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        logger.info("Migrating user passwords from plaintext to BCrypt encryption");

        Map<String, Object> authConfig = getFromMap(toMigrate, "auth");
        if (authConfig != null) {
            List<Map<String, Object>> users = getListFromMap(authConfig, "users");
            if (users != null) {
                for (Map<String, Object> user : users) {
                    String password = (String) user.get("password");
                    if (password != null && !password.isEmpty()) {
                        String migratedPassword = migratePassword(password, (String) user.get("username"));
                        if (!migratedPassword.equals(password)) {
                            user.put("password", migratedPassword);
                        }
                    }
                }
            }
        }

        return toMigrate;
    }

    private String migratePassword(String password, String username) {
        // Skip if already using BCrypt
        if (password.startsWith(BCRYPT_PREFIX)) {
            logger.debug("Password for user '{}' is already BCrypt encrypted", username);
            return password;
        }

        // Handle {noop} prefixed passwords
        if (password.startsWith(NOOP_PREFIX)) {
            String plainPassword = password.substring(NOOP_PREFIX.length());
            String hashedPassword = passwordEncoder.encode(plainPassword);
            logger.info("Migrated {noop} password to BCrypt for user '{}'", username);
            return BCRYPT_PREFIX + hashedPassword;
        }

        // Handle completely plaintext passwords (no prefix)
        if (!password.startsWith("{")) {
            String hashedPassword = passwordEncoder.encode(password);
            logger.info("Migrated plaintext password to BCrypt for user '{}'", username);
            return BCRYPT_PREFIX + hashedPassword;
        }

        // For any other prefixed format, leave as-is
        logger.debug("Password for user '{}' has unknown format, leaving unchanged", username);
        return password;
    }
}