package org.nzbhydra.config.safeconfig;

import com.google.common.base.Strings;
import lombok.Getter;
import org.nzbhydra.config.emby.EmbyConfig;


@Getter
public class SafeEmbyConfig {

    private final String embyBaseUrl;
    /**
     * The API key itself is never sent to the UI: the safe config is readable by every user and all Emby calls go
     * through the server. The UI only needs to know whether Emby is set up.
     */
    private final boolean embyApiKeySet;

    public SafeEmbyConfig(EmbyConfig embyConfig) {
        embyBaseUrl = embyConfig.getEmbyBaseUrl();
        embyApiKeySet = !Strings.isNullOrEmpty(embyConfig.getEmbyApiKey());
    }

}
