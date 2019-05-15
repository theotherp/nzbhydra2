/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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
import com.google.common.base.Strings;
import net.jodah.failsafe.Failsafe;
import net.jodah.failsafe.RetryPolicy;
import org.apache.commons.io.IOUtils;
import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

public class ConfigReaderWriter {

    private static final Logger logger = LoggerFactory.getLogger(ConfigReaderWriter.class);

    public static final TypeReference<HashMap<String, Object>> MAP_TYPE_REFERENCE = new TypeReference<HashMap<String, Object>>() {
    };
    private final RetryPolicy saveRetryPolicy = new RetryPolicy().retryOn(IOException.class).withDelay(1000, TimeUnit.MILLISECONDS).withMaxRetries(3);


    public void save(BaseConfig baseConfig) {
        try {
            save(buildConfigFileFile(), Jackson.YAML_MAPPER.writeValueAsString(baseConfig));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Unable to save config", e);
        }
    }

    public void save(BaseConfig baseConfig, File targetFile) {
        try {
            save(targetFile, Jackson.YAML_MAPPER.writeValueAsString(baseConfig));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Unable to save config", e);
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

    protected void save(File targetFile, String configAsYamlString) {
        synchronized (Jackson.YAML_MAPPER) {
            Failsafe.with(saveRetryPolicy)
                    .onFailure(throwable -> logger.error("Unable to save config", throwable))
                    .run(() -> doWrite(targetFile, configAsYamlString))
            ;
        }
    }

    private void doWrite(File targetFile, String configAsYamlString) throws IOException {
        if (Strings.isNullOrEmpty(configAsYamlString)) {
            logger.warn("Empty config string provided");
            throw new IOException("Empty YAML");
        }
        //Make sure correct YAML was provided
        try {
            Jackson.YAML_MAPPER.readValue(configAsYamlString, BaseConfig.class);
        } catch (IOException e) {
            logger.warn("Unreadable config string provided", e);
            throw e;
        }


        //Write to temp file and make sure it can be read correctly
        File tempFile = new File(targetFile.getCanonicalPath() + ".bak");
        logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Using temporary file {}", tempFile);
        try (final FileOutputStream fos = new FileOutputStream(tempFile)) {
            IOUtils.write(configAsYamlString.getBytes(Charsets.UTF_8), fos);
            fos.flush();
            fos.getFD().sync();
        }

        try {
            Jackson.YAML_MAPPER.readValue(tempFile, BaseConfig.class);
        } catch (IOException e) {
            logger.warn("Written temporary config file corrupted", e);
            throw e;
        }

        //Copy temp file to target file and verify again it's correct
        logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Copying temporary file to {}", targetFile);
        Files.copy(tempFile.toPath(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
        try (final FileInputStream fis = new FileInputStream(tempFile); final FileOutputStream fos = new FileOutputStream(targetFile)) {
            IOUtils.copy(fis, fos);
            fos.flush();
            fos.getFD().sync();
        }

        try {
            Jackson.YAML_MAPPER.readValue(targetFile, BaseConfig.class);
        } catch (IOException e) {
            logger.warn("Written target config file corrupted", e);
            throw e;
        }
    }

    /**
     * Initializes the given YAML file with an initial config if needed.
     *
     * @param yamlFile The path of the file to be created
     * @return true if initialization was needed
     * @throws IOException
     */
    public boolean initializeIfNeeded(File yamlFile) throws IOException {
        if (!yamlFile.exists()) {
            logger.info("No config file found at {}. Initializing with base config", yamlFile);
            try {
                try (InputStream stream = BaseConfig.class.getResource("/config/baseConfig.yml").openStream()) {
                    logger.debug(LoggingMarkers.CONFIG_READ_WRITE, "Copying YAML to {}", yamlFile);
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
            return Jackson.YAML_MAPPER.readValue(configFile, BaseConfig.class);
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
