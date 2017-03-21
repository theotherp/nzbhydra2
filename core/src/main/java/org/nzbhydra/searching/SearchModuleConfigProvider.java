package org.nzbhydra.searching;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
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
    public void afterPropertiesSet() throws Exception {
        if (indexers != null) {
            configsByname = indexers.stream().collect(Collectors.toMap(IndexerConfig::getName, Function.identity()));
        } else {
            logger.error("Configuration incomplete, no indexers found");
            configsByname = Collections.emptyMap();
        }
    }
}
