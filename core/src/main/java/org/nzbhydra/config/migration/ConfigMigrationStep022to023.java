package org.nzbhydra.config.migration;

import org.nzbhydra.config.sensitive.SensitiveDataObfuscator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

public class ConfigMigrationStep022to023 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep022to023.class);

    @Override
    public int forVersion() {
        return 22;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        logger.info("Migrating config to encrypt sensitive data fields");

        int encryptedCount = 0;

        // Migrate main config sensitive fields
        Map<String, Object> main = (Map<String, Object>) toMigrate.get("main");
        if (main != null) {
            encryptedCount += migrateField(main, "apiKey", "Main API key");
            encryptedCount += migrateField(main, "proxyUsername", "Proxy username");
            encryptedCount += migrateField(main, "proxyPassword", "Proxy password");
            encryptedCount += migrateField(main, "sslKeyStorePassword", "SSL keystore password");
            encryptedCount += migrateField(main, "dereferer", "Dereferer");
        }

        // Migrate indexers
        List<Map<String, Object>> indexers = (List<Map<String, Object>>) toMigrate.get("indexers");
        if (indexers != null) {
            for (Map<String, Object> indexer : indexers) {
                String name = (String) indexer.get("name");
                encryptedCount += migrateField(indexer, "apiKey", "Indexer " + name + " API key");
                encryptedCount += migrateField(indexer, "username", "Indexer " + name + " username");
                encryptedCount += migrateField(indexer, "password", "Indexer " + name + " password");
            }
        }

        // Migrate downloaders
        Map<String, Object> downloading = (Map<String, Object>) toMigrate.get("downloading");
        if (downloading != null) {
            List<Map<String, Object>> downloaders = (List<Map<String, Object>>) downloading.get("downloaders");
            if (downloaders != null) {
                for (Map<String, Object> downloader : downloaders) {
                    String name = (String) downloader.get("name");
                    encryptedCount += migrateField(downloader, "apiKey", "Downloader " + name + " API key");
                    encryptedCount += migrateField(downloader, "username", "Downloader " + name + " username");
                    encryptedCount += migrateField(downloader, "password", "Downloader " + name + " password");
                }
            }
        }

        // Migrate notification config
        Map<String, Object> notificationConfig = (Map<String, Object>) toMigrate.get("notificationConfig");
        if (notificationConfig != null) {
            encryptedCount += migrateField(notificationConfig, "appriseApiUrl", "Apprise API URL");
            encryptedCount += migrateField(notificationConfig, "appriseUrls", "Apprise URLs");

            List<Map<String, Object>> entries = (List<Map<String, Object>>) notificationConfig.get("entries");
            if (entries != null) {
                for (Map<String, Object> entry : entries) {
                    String eventType = (String) entry.get("eventType");
                    encryptedCount += migrateField(entry, "messageBody", "Notification " + eventType + " message body");
                }
            }
        }

        // Migrate external tools
        Map<String, Object> externalTools = (Map<String, Object>) toMigrate.get("externalTools");
        if (externalTools != null) {
            List<Map<String, Object>> toolsList = (List<Map<String, Object>>) externalTools.get("externalTools");
            if (toolsList != null) {
                for (Map<String, Object> tool : toolsList) {
                    String name = (String) tool.get("name");
                    encryptedCount += migrateField(tool, "apiKey", "External tool " + name + " API key");
                }
            }
        }

        // Migrate Emby config
        Map<String, Object> emby = (Map<String, Object>) toMigrate.get("emby");
        if (emby != null) {
            encryptedCount += migrateField(emby, "embyApiKey", "Emby API key");
        }

        // Migrate auth config
        Map<String, Object> auth = (Map<String, Object>) toMigrate.get("auth");
        if (auth != null) {
            encryptedCount += migrateField(auth, "rememberMeKey", "Remember-me key");

            // Note: User passwords are already handled with BCrypt from previous migration,
            // so we skip those
        }

        // Update config version
        main.put("configVersion", 23);

        logger.info("Successfully encrypted {} sensitive data fields", encryptedCount);

        return toMigrate;
    }

    private int migrateField(Map<String, Object> config, String fieldName, String description) {
        Object value = config.get(fieldName);
        if (value instanceof String) {
            String stringValue = (String) value;
            if (SensitiveDataObfuscator.needsEncryption(stringValue)) {
                String encrypted = SensitiveDataObfuscator.encrypt(stringValue);
                config.put(fieldName, encrypted);
                logger.debug("Encrypted {}", description);
                return 1;
            }
        }
        return 0;
    }
}