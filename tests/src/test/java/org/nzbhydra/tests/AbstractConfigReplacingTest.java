package org.nzbhydra.tests;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.springframework.beans.factory.annotation.Autowired;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.net.URL;
import java.util.List;

public class AbstractConfigReplacingTest {

    @Autowired
    protected BaseConfig baseConfig;


    @PostConstruct
    protected void init() {
        baseConfig.getSearching().setIgnoreTemporarilyDisabled(true);
    }

    public void replaceConfig(URL resource) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.writeValueAsString(baseConfig);
        ObjectReader updater = objectMapper.readerForUpdating(baseConfig);
        BaseConfig updatedConfig = updater.readValue(resource);
        baseConfig.replace(updatedConfig);
    }

    public void replaceConfig(BaseConfig replacingConfig) throws IOException {
        baseConfig.replace(replacingConfig);
    }

 public void replaceIndexers(List<IndexerConfig> indexerConfigs) throws IOException {
        baseConfig.getIndexers().clear();
        baseConfig.getIndexers().addAll(indexerConfigs);
        baseConfig.replace(baseConfig);
    }

}
