package org.nzbhydra.searching;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
public class SearchModuleConfigProvider implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(SearchModuleConfigProvider.class);

    private List<IndexerConfig> indexers;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private BaseConfig baseConfig;

    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        baseConfig = configChangedEvent.getNewConfig();
        afterPropertiesSet();
    }

    public void setIndexers(List<IndexerConfig> indexers) {
        this.indexers = indexers;
    }


    public List<IndexerConfig> getIndexers() {
        return indexers;
    }

    @Override
    public void afterPropertiesSet() {
        indexers = baseConfig.getIndexers();
        searchModuleProvider.loadIndexers(indexers);

    }
}
