

package org.nzbhydra.config.emby;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ReflectionMarker
@ConfigurationProperties(prefix = "downloading")
public class EmbyConfig {

    private String embyBaseUrl;
    private String embyApiKey;

}
