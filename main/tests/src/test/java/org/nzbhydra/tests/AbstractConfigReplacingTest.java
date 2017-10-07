package org.nzbhydra.tests;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import org.nzbhydra.config.BaseConfig;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.IOException;
import java.net.URL;

public class AbstractConfigReplacingTest {

    @Autowired
    protected BaseConfig baseConfig;

    public void replaceConfig(URL resource) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.writeValueAsString(baseConfig);
        ObjectReader updater = objectMapper.readerForUpdating(baseConfig);
        BaseConfig updatedConfig = updater.readValue(resource);
        baseConfig.replace(updatedConfig);
    }

}
