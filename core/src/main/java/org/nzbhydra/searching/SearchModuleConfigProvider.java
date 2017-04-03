package org.nzbhydra.searching;

import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.IndexerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
public class SearchModuleConfigProvider implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(SearchModuleConfigProvider.class);

    private List<IndexerConfig> indexers;
    private Map<String, IndexerConfig> configsByname;
    @Autowired
    private SearchModuleProvider searchModuleProvider;

    @EventListener
    public void handleNewConfig(ConfigChangedEvent newConfig) {
        indexers = newConfig.getNewConfig().getIndexers();
        afterPropertiesSet();
    }

    public void setIndexers(List<IndexerConfig> indexers) {
        this.indexers = indexers;
    }


    public List<IndexerConfig> getIndexers() {
        return indexers;
    }

    public IndexerConfig getConfigByName(String name) {
        return configsByname.get(name);
    }

    @Override
    public void afterPropertiesSet() {
        if (indexers != null) {
            configsByname = indexers.stream().collect(Collectors.toMap(IndexerConfig::getName, Function.identity()));
        } else {
            logger.error("Configuration incomplete, no indexers found");
            configsByname = Collections.emptyMap();
        }
        searchModuleProvider.loadIndexers();
    }
}
