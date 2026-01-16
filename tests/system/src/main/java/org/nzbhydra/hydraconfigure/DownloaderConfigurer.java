

package org.nzbhydra.hydraconfigure;

import org.nzbhydra.HydraClient;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.DownloadingConfig;
import org.nzbhydra.downloading.DownloaderType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
public class DownloaderConfigurer {

    @Autowired
    private ConfigManager configManager;

    @Autowired
    private HydraClient hydraClient;

    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    public void configureSabnzbdMock() {
        final BaseConfig config = configManager.getCurrentConfig();
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setApiKey("apikey");
        downloaderConfig.setName("Mock");
        downloaderConfig.setUrl(mockUrl + "/sabnzbd");
        downloaderConfig.setDownloaderType(DownloaderType.SABNZBD);
        downloaderConfig.setDownloadType(DownloadType.NZB);
        downloaderConfig.setEnabled(true);

        final DownloadingConfig downloadingConfig = config.getDownloading();
        downloadingConfig.setDownloaders(Collections.singletonList(downloaderConfig));
        configManager.setConfig(config);

    }
}
