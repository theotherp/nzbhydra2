

package org.nzbhydra.hydraconfigure;

import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.DownloaderType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;


@Component
public class DownloaderConfigurer {

    @Value("${nzbhydra.mockUrl}")
    private String mockUrl;

    /**
     * The mock SABnzbd downloader the baseline is made of, as configuration rather than as a write, so
     * {@link org.nzbhydra.BeforeAll#applyBaseline()} can establish the whole baseline in one request.
     */
    public DownloaderConfig getSabnzbdMockConfig() {
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setApiKey("apikey");
        downloaderConfig.setName("Mock");
        downloaderConfig.setUrl(mockUrl + "/sabnzbd");
        downloaderConfig.setDownloaderType(DownloaderType.SABNZBD);
        downloaderConfig.setDownloadType(DownloadType.NZB);
        downloaderConfig.setEnabled(true);
        return downloaderConfig;
    }
}
