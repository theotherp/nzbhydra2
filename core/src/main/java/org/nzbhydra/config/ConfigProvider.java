package org.nzbhydra.config;

import org.nzbhydra.config.indexer.IndexerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

//BaseConfig must be initialized before we can provide it
@DependsOn("baseConfigHandler")
@Component
public class ConfigProvider {

    @Autowired
    private BaseConfig baseConfig;

    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) throws Exception {
        baseConfig = configChangedEvent.getNewConfig();
    }

    public BaseConfig getBaseConfig() {
        return baseConfig;
    }

    public IndexerConfig getIndexerByName(String name) {
        return baseConfig.getIndexers().stream().filter(x -> x.getName().equals(name)).findFirst().orElseThrow(() -> new RuntimeException("Unable to find indexer with name " + name));
    }


}
