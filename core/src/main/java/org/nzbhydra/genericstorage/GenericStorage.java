package org.nzbhydra.genericstorage;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.Serializable;
import java.util.Optional;

@Component
public class GenericStorage<T extends Serializable> {

    @Autowired
    private GenericStorageDataRepository repository;

    private ObjectMapper objectMapper = new ObjectMapper();

    public GenericStorage() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Transactional
    public void save(String key, T value) {
        repository.deleteByKey(key);
        try {
            repository.save(new GenericStorageData(key, objectMapper.writeValueAsString(value)));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error writing data as JSON", e);
        }
    }

    public Optional<T> get(String key, Class<T> clazz) {
        GenericStorageData first = repository.findByKey(key);
        if (first == null) {
            return Optional.empty();
        } else {
            try {
                return Optional.of(objectMapper.readValue(first.getData(), clazz));
            } catch (IOException e) {
                throw new RuntimeException("Error reading data", e);
            }
        }
    }

}
