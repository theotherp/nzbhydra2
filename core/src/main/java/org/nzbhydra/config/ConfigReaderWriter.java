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
import org.nzbhydra.NzbHydra;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class ConfigReaderWriter {

    private static final Logger logger = LoggerFactory.getLogger(ConfigReaderWriter.class);

    private final ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
    private final TypeReference<HashMap<String, Object>> MAP_TYPE_REFERENCE = new TypeReference<HashMap<String, Object>>() {
    };
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
            if (Strings.isNullOrEmpty(configAsYamlString)) {
                logger.warn("Not writing empty config to file");
            } else {
                try {
                    File tempFile = new File(targetFile.getCanonicalPath() + ".tmp");
                    Files.write(tempFile.toPath(), configAsYamlString.getBytes(Charsets.UTF_8));
                    Files.move(tempFile.toPath(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
                } catch (IOException e) {
                    logger.error("Unable to write config to temp file or temp file to yml file: " + e.getMessage());
                }
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
        BufferedReader reader = new BufferedReader(new InputStreamReader(BaseConfig.class.getResource("/config/baseConfig.yml").openStream()));
        String applicationYmlContent = reader.lines().collect(Collectors.joining("\n"));
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
