package org.nzbhydra.downloader;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.NzbDownloadResult;
import org.nzbhydra.NzbDownloader;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.config.SearchingConfig.NzbAccessType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public abstract class Downloader {

    @Autowired
    private NzbDownloader nzbDownloader;

    protected DownloaderConfig downloaderConfig;

    public void intialize(DownloaderConfig downloaderConfig) {
        this.downloaderConfig = downloaderConfig;
    }


    public GenericResponse addBySearchResultIds(Set<Long> searchResultIds, String category) {
        NzbAccessType accessType = NzbAccessType.valueOf(downloaderConfig.getNzbAccessType()); //TODO store/use enum in config
        for (Long searchResultId : searchResultIds) {
            NzbDownloadResult result = nzbDownloader.getNzbByGuid(searchResultId, accessType);
            if (accessType == NzbAccessType.PROXY) {
                addNzb(result.getNzbContent(), result.getTitle(), category);
            } else {
                addLink(result.getUrl(), result.getTitle(), category);
            }
        }

        //TODO Capture error or something
        return new GenericResponse(true, null);
    }


    public abstract GenericResponse checkConnection();

    public abstract List<String> getCategories();

    public abstract boolean addLink(String link, String title, String category);

    public abstract boolean addNzb(String content, String title, String category);

}
