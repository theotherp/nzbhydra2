

package org.nzbhydra.config.emby;

import lombok.Data;
import org.nzbhydra.config.sensitive.HiddenInDebugInfos;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ReflectionMarker
@ConfigurationProperties(prefix = "downloading")
public class EmbyConfig {

    @HiddenInDebugInfos
    private String embyBaseUrl;
    @SensitiveData
    private String embyApiKey;

}
