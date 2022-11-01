package org.nzbhydra.tests;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;
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
    @Autowired
    private EntityManagerFactory entityManagerFactory;


    @PostConstruct
    protected void init() {
        baseConfig.getSearching().setIgnoreTemporarilyDisabled(true);
    }

    public void replaceConfig(URL resource) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.writeValueAsString(baseConfig);
        ObjectReader updater = objectMapper.readerForUpdating(baseConfig);
        BaseConfig updatedConfig = updater.readValue(resource);
        final EntityTransaction transaction = entityManagerFactory.createEntityManager().getTransaction();
        transaction.begin();
        baseConfig.replace(updatedConfig);
        transaction.commit();
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
