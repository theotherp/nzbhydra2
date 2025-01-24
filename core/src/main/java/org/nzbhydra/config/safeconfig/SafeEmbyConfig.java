package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.emby.EmbyConfig;


@Getter
public class SafeEmbyConfig {

    private final String embyBaseUrl;
    private final String embyApiKey;

    public SafeEmbyConfig(EmbyConfig embyConfig) {
        embyBaseUrl = embyConfig.getEmbyBaseUrl();
        embyApiKey = embyConfig.getEmbyApiKey();
    }

}
