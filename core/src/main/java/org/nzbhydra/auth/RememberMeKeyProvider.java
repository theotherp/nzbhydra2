package org.nzbhydra.auth;

import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Provides a stable key for Spring Security's remember-me feature.
 * <p>
 * {@code RememberMeConfigurer} generates a random key with {@code UUID.randomUUID()} when none is set explicitly,
 * which means a fresh key on every startup and every previously issued remember-me cookie being rejected after a
 * restart or update (#1099). This reads a key from {@code rememberMe.key} in the data folder, generating and
 * persisting one on first use, so the key - and therefore the validity of issued cookies - survives restarts.
 */
@Component
public class RememberMeKeyProvider {

    private static final Logger logger = LoggerFactory.getLogger(RememberMeKeyProvider.class);
    private static final String KEY_FILE_NAME = "rememberMe.key";
    private static final int KEY_LENGTH_BYTES = 32;

    //Null means the data folder is resolved on first use; it may not be set yet when the bean is created
    private final File dataFolder;
    private String key;

    public RememberMeKeyProvider() {
        this(null);
    }

    RememberMeKeyProvider(File dataFolder) {
        this.dataFolder = dataFolder;
    }

    /**
     * Returns the stable remember-me key, reading it from disk (and generating and persisting one if it doesn't
     * exist yet) on first call, then returning the cached value on every subsequent call.
     */
    public synchronized String getKey() {
        if (key != null) {
            return key;
        }
        key = readOrCreateKey();
        return key;
    }

    private String readOrCreateKey() {
        File folder = dataFolder;
        if (folder == null) {
            if (NzbHydra.getDataFolder() == null) {
                logger.warn("Data folder not set. Using a remember-me key generated in memory");
                return generateKey();
            }
            folder = new File(NzbHydra.getDataFolder());
        }
        Path keyFilePath = new File(folder, KEY_FILE_NAME).toPath();
        try {
            if (Files.exists(keyFilePath)) {
                String existingKey = Files.readString(keyFilePath, StandardCharsets.UTF_8).trim();
                if (!existingKey.isEmpty()) {
                    return existingKey;
                }
                logger.warn("Remember-me key file {} exists but is empty. Generating a new key", keyFilePath);
            }
            String generatedKey = generateKey();
            Files.writeString(keyFilePath, generatedKey, StandardCharsets.UTF_8);
            restrictToOwner(keyFilePath);
            logger.debug("Wrote new remember-me key to {}", keyFilePath);
            return generatedKey;
        } catch (IOException e) {
            logger.error("Unable to read or write remember-me key file {}. Falling back to a key generated in memory, " +
                    "which means users will be logged out of remember-me sessions after this restart", keyFilePath, e);
            return generateKey();
        }
    }

    private static void restrictToOwner(Path keyFilePath) {
        if (!FileSystems.getDefault().supportedFileAttributeViews().contains("posix")) {
            return;
        }
        try {
            Files.setPosixFilePermissions(keyFilePath, PosixFilePermissions.fromString("rw-------"));
        } catch (IOException | UnsupportedOperationException e) {
            logger.warn("Unable to restrict permissions of remember-me key file {}", keyFilePath, e);
        }
    }

    private static String generateKey() {
        byte[] randomBytes = new byte[KEY_LENGTH_BYTES];
        new SecureRandom().nextBytes(randomBytes);
        return Base64.getEncoder().encodeToString(randomBytes);
    }

}
