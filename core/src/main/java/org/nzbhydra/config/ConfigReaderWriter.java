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
import com.fasterxml.jackson.core.util.DefaultIndenter;
import com.fasterxml.jackson.core.util.DefaultPrettyPrinter;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.google.common.base.Charsets;
import com.google.common.base.Strings;
import net.jodah.failsafe.Failsafe;
import net.jodah.failsafe.RetryPolicy;
import org.nzbhydra.NzbHydra;
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

    private final ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
    private final TypeReference<HashMap<String, Object>> MAP_TYPE_REFERENCE = new TypeReference<HashMap<String, Object>>() {
    };
    private final RetryPolicy saveRetryPolicy = new RetryPolicy().retryOn(IOException.class).withDelay(500, TimeUnit.MILLISECONDS).withMaxRetries(3);
    private ObjectWriter objectWriter;

    public ConfigReaderWriter() {
        DefaultPrettyPrinter.Indenter indenter = new DefaultIndenter("    ", DefaultIndenter.SYS_LF);
        DefaultPrettyPrinter defaultPrettyPrinter = new DefaultPrettyPrinter();
        defaultPrettyPrinter.indentObjectsWith(indenter);
        defaultPrettyPrinter.indentArraysWith(indenter);
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        objectMapper.registerModule(new Jdk8Module());
        objectWriter = objectMapper.writer(defaultPrettyPrinter);
    }

    public void save(BaseConfig baseConfig) {
        try {
            save(buildConfigFileFile(), objectWriter.writeValueAsString(baseConfig));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Unable to save config", e);
        }
    }

    public void save(BaseConfig baseConfig, File targetFile) {
        try {
            save(targetFile, objectWriter.writeValueAsString(baseConfig));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Unable to save config", e);
        }
    }

    public void save(Map<String, Object> baseConfig, File targetFile) {
        BaseConfig converted = objectMapper.convertValue(baseConfig, BaseConfig.class);
        save(converted, targetFile);
    }

    public void save(Map<String, Object> baseConfig) {
        BaseConfig converted = objectMapper.convertValue(baseConfig, BaseConfig.class);
        save(converted, buildConfigFileFile());
    }

    protected void save(File targetFile, String configAsYamlString) {
        synchronized (objectMapper) {
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
            objectMapper.readValue(configAsYamlString, BaseConfig.class);
        } catch (IOException e) {
            logger.warn("Unreadable config string provided", e);
            throw e;
        }


        File tempFile = new File(targetFile.getCanonicalPath() + ".bak");
        Files.write(tempFile.toPath(), configAsYamlString.getBytes(Charsets.UTF_8));
        Files.copy(tempFile.toPath(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING);

        try {
            objectMapper.readValue(targetFile, BaseConfig.class);
        } catch (IOException e) {
            logger.warn("Written target config file {} corrupted", e);
            throw e;
        }
    }

    public void initializeIfNeeded(File yamlFile) throws IOException {
        if (!yamlFile.exists()) {
            logger.info("No config file found at {}. Initializing with base config", yamlFile.getAbsolutePath());
            try {
                try (InputStream stream = BaseConfig.class.getResource("/config/baseConfig.yml").openStream()) {
                    Files.copy(stream, yamlFile.toPath());
                }
            } catch (IOException e) {
                logger.error("Unable to initialize config file", e);
                throw e;
            }
        }
    }

    public void validateExistingConfig() {
        File configFile = buildConfigFileFile();
        if (!configFile.exists()) {
            return;
        }
        try {
            objectMapper.readValue(configFile, BaseConfig.class);
        } catch (IOException e) {
            File tempFile = new File(configFile.getAbsolutePath() + ".bak");
            if (!tempFile.exists()) {
                logger.error("Config file corrupted: {}", e.getMessage());
                throw new RuntimeException("Config file " + configFile.getAbsolutePath() + " corrupted. If you find a ZIP in your backup folder restore it from there. Otherwise you'öö have to delete the file and start over. Please contact the developer when you have it running.");
            }
            try {
                objectMapper.readValue(tempFile, BaseConfig.class);
            } catch (IOException e2) {
                logger.error("Config backup file corrupted: {}", e.getMessage());
                throw new RuntimeException("Config file " + configFile.getAbsolutePath() + " and its backup are corrupted. If you find a ZIP in your backup folder restore it from there. Otherwise you'öö have to delete the file and start over. Please contact the developer when you have it running.");
            }

            logger.warn("Invalid config file found. Will try to restore from backup. Error message: {}", e.getMessage());
            try {
                Files.copy(tempFile.toPath(), configFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e1) {
                throw new RuntimeException("Error while restoring config file. You'll have to manually copy " + tempFile.getAbsolutePath() + " to " + configFile.getAbsolutePath());
            }
        }
    }

    public BaseConfig loadSavedConfig() throws IOException {
        File configFile = buildConfigFileFile();
        if (configFile.exists()) {
            return objectMapper.readValue(configFile, BaseConfig.class);
        }
        return originalConfig();
    }

    public Map<String, Object> loadSavedConfigAsMap() throws IOException {
        return objectMapper.readValue(buildConfigFileFile(), MAP_TYPE_REFERENCE);
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
        return objectMapper.readValue(applicationYmlContent, BaseConfig.class);
    }

    public BaseConfig getCopy(BaseConfig toCopy) {
        try {
            return objectMapper.readValue(objectMapper.writeValueAsString(toCopy), BaseConfig.class);
        } catch (IOException e) {
            throw new RuntimeException("Unable to copy config", e);
        }
    }

    public String getAsYamlString(BaseConfig baseConfig) {
        try {
            return objectWriter.writeValueAsString(baseConfig);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error while deserializing config", e);
        }
    }
}
