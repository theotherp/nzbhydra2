package org.nzbhydra.genericstorage;

import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;

import java.io.Serializable;
import java.util.Map;
import java.util.Optional;

@Component
public class GenericStorage {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private BaseConfigHandler baseConfigHandler;

    public synchronized <T extends Serializable> void save(String key, T value) {
        Map<String, String> genericStorage = configProvider.getBaseConfig().getGenericStorage();
        try {
            genericStorage.put(key, Jackson.JSON_MAPPER.writeValueAsString(value));
            baseConfigHandler.save(true);
        } catch (JacksonException e) {
            throw new RuntimeException("Error writing data as JSON", e);
        }
    }

    public synchronized <T extends Serializable> void setNoSave(String key, T value) {
        try {
            configProvider.getBaseConfig().getGenericStorage().put(key, Jackson.JSON_MAPPER.writeValueAsString(value));
        } catch (JacksonException e) {
            throw new RuntimeException("Error writing data as JSON", e);
        }
    }

    public synchronized <T extends Serializable> void remove(String key) {
        configProvider.getBaseConfig().getGenericStorage().remove(key);
        baseConfigHandler.save(true);
    }


    /**
     * Stores a value that is already serialized to JSON, removing the key for null.
     */
    public synchronized void saveJson(String key, String json) {
        if (json == null) {
            configProvider.getBaseConfig().getGenericStorage().remove(key);
        } else {
            configProvider.getBaseConfig().getGenericStorage().put(key, json);
        }
        baseConfigHandler.save(true);
    }

    public synchronized Optional<String> getJson(String key) {
        return Optional.ofNullable(configProvider.getBaseConfig().getGenericStorage().get(key));
    }

    public synchronized <T> Optional<T> get(String key, Class<T> clazz) {
        if (configProvider.getBaseConfig().getGenericStorage().containsKey(key)) {
            String json = configProvider.getBaseConfig().getGenericStorage().get(key);
            try {
                return Optional.of(Jackson.JSON_MAPPER.readValue(json, clazz));
            } catch (Exception e) {
                throw new RuntimeException("Error reading data from " + json, e);
            }
        }
        return Optional.empty();
    }

}
