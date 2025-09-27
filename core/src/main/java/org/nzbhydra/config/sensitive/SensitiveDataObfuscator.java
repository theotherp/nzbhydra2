package org.nzbhydra.config.sensitive;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;

public class SensitiveDataObfuscator {

    private static final Logger logger = LoggerFactory.getLogger(SensitiveDataObfuscator.class);

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final String KEY_ALGORITHM = "AES";
    private static final String ENCRYPTED_PREFIX = "{OBF}";

    // Hardcoded key derived from application-specific data
    // This provides obfuscation, not security - the goal is to prevent casual inspection
    private static final String MASTER_KEY = "NZBHydra2-Obfuscation-Key-2024!";

    private static final byte[] IV = "NZBHydra2IV12345".getBytes(StandardCharsets.UTF_8);

    private static SecretKeySpec secretKey;

    static {
        try {
            // Derive a proper 256-bit key from the master key
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] key = sha.digest(MASTER_KEY.getBytes(StandardCharsets.UTF_8));
            key = Arrays.copyOf(key, 16); // Use 128-bit AES to avoid JCE policy issues
            secretKey = new SecretKeySpec(key, KEY_ALGORITHM);
        } catch (Exception e) {
            logger.error("Failed to initialize encryption key", e);
        }
    }

    public static String encrypt(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }

        // Don't re-encrypt already encrypted values
        if (value.startsWith(ENCRYPTED_PREFIX)) {
            return value;
        }

        // Don't encrypt BCrypt passwords (they have their own protection)
        if (value.startsWith("{bcrypt}") || value.startsWith("{noop}") || value.startsWith("{NOOP}")) {
            return value;
        }

        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            IvParameterSpec ivSpec = new IvParameterSpec(IV);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec);

            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            String encoded = Base64.getEncoder().encodeToString(encrypted);

            return ENCRYPTED_PREFIX + encoded;
        } catch (Exception e) {
            logger.error("Failed to encrypt sensitive data", e);
            return value; // Return original value if encryption fails
        }
    }

    public static String decrypt(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }

        if (!value.startsWith(ENCRYPTED_PREFIX)) {
            return value; // Not encrypted, return as-is
        }

        try {
            String encrypted = value.substring(ENCRYPTED_PREFIX.length());
            byte[] decodedBytes = Base64.getDecoder().decode(encrypted);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            IvParameterSpec ivSpec = new IvParameterSpec(IV);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, ivSpec);

            byte[] decrypted = cipher.doFinal(decodedBytes);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            logger.error("Failed to decrypt sensitive data", e);
            return value; // Return original value if decryption fails
        }
    }

    public static boolean isEncrypted(String value) {
        return value != null && value.startsWith(ENCRYPTED_PREFIX);
    }

    public static boolean needsEncryption(String value) {
        if (value == null || value.isEmpty()) {
            return false;
        }

        // Already encrypted
        if (value.startsWith(ENCRYPTED_PREFIX)) {
            return false;
        }

        // BCrypt passwords don't need additional encryption
        if (value.startsWith("{bcrypt}") || value.startsWith("{noop}") || value.startsWith("{NOOP}")) {
            return false;
        }

        return true;
    }
}