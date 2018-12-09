package org.nzbhydra.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

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


}
