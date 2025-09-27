/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.google.common.base.Charsets;
import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import dev.failsafe.Failsafe;
import dev.failsafe.RetryPolicy;
import dev.failsafe.event.EventListener;
import dev.failsafe.event.ExecutionCompletedEvent;
import org.apache.commons.io.IOUtils;
import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.sensitive.SensitiveDataHandler;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

public class ConfigReaderWriter {

    private static final Logger logger = LoggerFactory.getLogger(ConfigReaderWriter.class);

    public static final TypeReference<HashMap<String, Object>> MAP_TYPE_REFERENCE = new TypeReference<>() {
    };
    private final RetryPolicy saveRetryPolicy = RetryPolicy.builder().withDelay(Duration.ofMillis(1000)).withMaxRetries(3).handle(IOException.class).build();
    private final SensitiveDataHandler sensitiveDataHandler = new SensitiveDataHandler();


    public void save(BaseConfig baseConfig) {
        try {
            // Create a copy to avoid modifying the original
            BaseConfig copy = getCopy(baseConfig);
            // Encrypt sensitive data before saving
            sensitiveDataHandler.encryptSensitiveData(copy);
            save(buildConfigFileFile(), Jackson.YAML_MAPPER.writeValueAsString(copy));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Unable to save config", e);
        }
    }

    public void save(BaseConfig baseConfig, File targetFile) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        try {
            // Create a copy to avoid modifying the original
            BaseConfig copy = getCopy(baseConfig);
            // Encrypt sensitive data before saving
            sensitiveDataHandler.encryptSensitiveData(copy);
            save(targetFile, Jackson.YAML_MAPPER.writeValueAsString(copy));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Unable to save config", e);
        } finally {
            logger.debug(LoggingMarkers.PERFORMANCE, "Writing config took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        }
    }

    public void save(Map<String, Object> baseConfig, File targetFile) {
        BaseConfig converted = Jackson.YAML_MAPPER.convertValue(baseConfig, BaseConfig.class);
        save(converted, targetFile);
    }

    public void save(Map<String, Object> baseConfig) {
        BaseConfig converted = Jackson.YAML_MAPPER.convertValue(baseConfig, BaseConfig.class);
        save(converted, buildConfigFileFile());
    }

    @SuppressWarnings({"Convert2Lambda", "Convert2Diamond"}) // Will not work with diamond
    protected void save(File targetFile, String configAsYamlString) {
        if (NzbHydra.isNativeBuild()) {
            return;
        }
        synchronized (Jackson.YAML_MAPPER) {
            Failsafe.with(saveRetryPolicy)
                    .onFailure(new EventListener<ExecutionCompletedEvent<Object>>() {
                        @Override
                        public void accept(ExecutionCompletedEvent<Object> event) throws Throwable {
                            logger.error("Unable to save config", event.getException());
                        }
                    })
                    .run(() -> doWrite(targetFile, configAsYamlString))
            ;
        }
    }

    private void doWrite(File targetFile, String configAsYamlString) throws IOException {
        if (Strings.isNullOrEmpty(configAsYamlString)) {
            logger.warn("Empty config string provided");
            throw new IOException("Empty YAML");
        }

        File tempFile = new File(targetFile.getParentFile(), targetFile.getName() + ".tmp");
        if (tempFile.exists()) {
            boolean deleted = tempFile.delete();
            if (!deleted) {
                logger.error("Error deleting previous temp file {}", tempFile);
                throw new RuntimeException("Error deleting previous temp file");
            }
        }
        logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Writing to file {}", tempFile);
        try (final FileOutputStream fos = new FileOutputStream(tempFile)) {
            IOUtils.write(configAsYamlString.getBytes(Charsets.UTF_8), fos);
            fos.flush();
            fos.getFD().sync();
        }

        try {
            BaseConfig baseConfig = Jackson.YAML_MAPPER.readValue(tempFile, BaseConfig.class);
        } catch (IOException e) {
            logger.warn("Written target config file corrupted", e);
            throw e;
        }
        try {
            Files.move(tempFile.toPath(), targetFile.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            logger.warn("Error moving temp file {} to target file {}", tempFile, targetFile, e);
            throw e;
        }
    }

    /**
     * Initializes the given YAML file with an initial config if needed.
     *
     * @param yamlFile The path of the file to be created
     * @return true if initialization was needed
     */
    public boolean initializeIfNeeded(File yamlFile) throws IOException {
        if (NzbHydra.isNativeBuild()) {
            return false;
        }
        if (!yamlFile.exists()) {
            logger.info("No config file found at {}. Initializing with base config", yamlFile);
            try {
                try (InputStream stream = BaseConfig.class.getResource("/config/baseConfig.yml").openStream()) {
                    logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Copying YAML to {}", yamlFile);
                    yamlFile.getParentFile().mkdirs();
                    Files.copy(stream, yamlFile.toPath());
                    return true;
                }
            } catch (IOException e) {
                logger.error("Unable to initialize config file", e);
                throw e;
            }
        }
        return false;
    }

    public void validateExistingConfig() {
        if (NzbHydra.isNativeBuild()) {
            return;
        }
        File configFile = buildConfigFileFile();
        if (!configFile.exists()) {
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Config file {} doesn't exist. Nothing to validate", configFile);
            return;
        }

        try {
            //We must first check if a migration is needed. If yes we can't convert the existing (valid) config file so a simple check must suffice
            Map<String, Object> map = Jackson.YAML_MAPPER.readValue(configFile, ConfigReaderWriter.MAP_TYPE_REFERENCE);
            if (!map.containsKey("main") || !((Map<String, Object>) map.get("main")).containsKey("configVersion")) {
                throw new IOException("Unable to find main config or config version in config file");
            }
            int foundConfigVersion = (int) ((Map<String, Object>) map.get("main")).get("configVersion");
            if (foundConfigVersion < new MainConfig().getConfigVersion()) {
                //We can't read an old config
                return;
            }
            Jackson.YAML_MAPPER.readValue(configFile, BaseConfig.class);
        } catch (IOException e) {
            logger.warn("Error while reading YAML from {}", configFile);
            File tempFile = new File(configFile.getAbsolutePath() + ".bak");
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Using temporary file {}", tempFile);
            if (!tempFile.exists()) {
                logger.error("Config file corrupted: {}", e.getMessage());
                throw new RuntimeException("Config file " + configFile.getAbsolutePath() + " corrupted. If you find a ZIP in your backup folder restore it from there. Otherwise you'll have to delete the file and start over. Please contact the developer when you have it running.");
            }
            logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Temporary file {} exists", tempFile);

            try {
                Jackson.YAML_MAPPER.readValue(tempFile, BaseConfig.class);
            } catch (IOException e2) {
                logger.error("Config backup file corrupted: {}", e.getMessage());
                throw new RuntimeException("Config file " + configFile.getAbsolutePath() + " and its backup are corrupted. If you find a ZIP in your backup folder restore it from there. Otherwise you'll have to delete the file and start over. Please contact the developer when you have it running.");
            }

            logger.warn("Invalid config file found. Will try to restore from backup. Error message: {}", e.getMessage());
            try {
                Files.copy(tempFile.toPath(), configFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e1) {
                throw new RuntimeException("Error while restoring config file. You'll have to manually copy " + tempFile.getAbsolutePath() + " to " + configFile.getAbsolutePath());
            }
            logger.warn("Restored config file from backup");
        }
    }

    public BaseConfig loadSavedConfig() throws IOException {
        File configFile = buildConfigFileFile();
        if (configFile.exists()) {
            BaseConfig baseConfig = Jackson.YAML_MAPPER.readValue(configFile, BaseConfig.class);
            // Decrypt sensitive data after loading
            sensitiveDataHandler.decryptSensitiveData(baseConfig);
            return baseConfig;
        }
        return originalConfig();
    }

    public Map<String, Object> loadSavedConfigAsMap() throws IOException {
        return Jackson.YAML_MAPPER.readValue(buildConfigFileFile(), MAP_TYPE_REFERENCE);
    }


    public static File buildConfigFileFile() {
        return new File(NzbHydra.getDataFolder(), "nzbhydra.yml");
    }

    /**
     * Returns the original config as it was deployed
     *
     * @return the content of config/baseConfig.yml (from resources) as BaseConfig object
     * @throws IOException Unable to read baseConfig.yml
     */
    public BaseConfig originalConfig() throws IOException {
        String applicationYmlContent;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(BaseConfig.class.getResource("/config/baseConfig.yml").openStream()))) {
            applicationYmlContent = reader.lines().collect(Collectors.joining("\n"));
        }
        return Jackson.YAML_MAPPER.readValue(applicationYmlContent, BaseConfig.class);
    }

    public BaseConfig getCopy(BaseConfig toCopy) {
        try {
            return Jackson.YAML_MAPPER.readValue(Jackson.YAML_MAPPER.writeValueAsString(toCopy), BaseConfig.class);
        } catch (IOException e) {
            throw new RuntimeException("Unable to copy config", e);
        }
    }

    public String getAsYamlString(BaseConfig baseConfig) {
        try {
            return Jackson.YAML_WRITER.writeValueAsString(baseConfig);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error while deserializing config", e);
        }
    }
}
