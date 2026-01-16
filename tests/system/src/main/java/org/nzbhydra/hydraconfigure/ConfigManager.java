

package org.nzbhydra.hydraconfigure;

import org.nzbhydra.HydraClient;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ConfigManager {

    @Autowired
    private HydraClient hydraClient;

    public BaseConfig getCurrentConfig() {
        try {
            return Jackson.JSON_MAPPER.readValue(hydraClient.get("/internalapi/config").body(), BaseConfig.class);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void setConfig(BaseConfig baseConfig) {
        try {
            hydraClient.put("/internalapi/config", Jackson.JSON_MAPPER.writeValueAsString(baseConfig));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
