package org.nzbhydra.searching;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
public class SearchModuleConfigProvider implements InitializingBean{

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
        configsByname = indexers.stream().collect(Collectors.toMap(IndexerConfig::getName, Function.identity()));
    }
}
