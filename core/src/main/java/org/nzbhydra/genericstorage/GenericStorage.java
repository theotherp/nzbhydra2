package org.nzbhydra.genericstorage;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.nzbhydra.Jackson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.Serializable;
import java.util.Optional;

@Component
public class GenericStorage {

    @Autowired
    private GenericStorageDataRepository repository;

    @Transactional
    public <T extends Serializable> void save(String key, T value) {
        repository.deleteByKey(key);
        try {
            repository.save(new GenericStorageData(key, Jackson.JSON_MAPPER.writeValueAsString(value)));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error writing data as JSON", e);
        }
    }

    public <T> Optional<T> get(String key, Class<T> clazz) {
        GenericStorageData first = repository.findByKey(key);
        if (first == null) {
            return Optional.empty();
        } else {
            try {
                return Optional.of(Jackson.JSON_MAPPER.readValue(first.getData(), clazz));
            } catch (IOException e) {
                throw new RuntimeException("Error reading data", e);
            }
        }
    }

}
