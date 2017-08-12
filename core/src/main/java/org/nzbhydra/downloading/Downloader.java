package org.nzbhydra.downloading;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.config.NzbAddingType;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.searching.SearchResultEntity;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultRepository;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.web.UsernameOrIpStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Component
public abstract class Downloader {

    private static final Logger logger = LoggerFactory.getLogger(Downloader.class);

    @Autowired
    private NzbHandler nzbHandler;
    @Autowired
    private SearchResultRepository searchResultRepository;

    protected DownloaderConfig downloaderConfig;

    public void intialize(DownloaderConfig downloaderConfig) {
        this.downloaderConfig = downloaderConfig;
    }

    @Transactional
    public GenericResponse addBySearchResultIds(Set<Long> searchResultIds, String category) {
        NzbAddingType addingType = downloaderConfig.getNzbAddingType();
        int countAddedNzbs = 0;
        try {
            for (Long searchResultId : searchResultIds) {
                if (addingType == NzbAddingType.UPLOAD) {
                    NzbDownloadResult result = nzbHandler.getNzbByGuid(searchResultId, downloaderConfig.getNzbAccessType(), SearchSource.INTERNAL, UsernameOrIpStorage.usernameOrIp.get());
                    String externalId = addNzb(result.getNzbContent(), result.getTitle(), category);
                    result.getDownloadEntity().setExternalId(externalId);
                    nzbHandler.updateStatusByEntity(result.getDownloadEntity(), NzbDownloadStatus.NZB_ADDED);
                } else {
                    SearchResultEntity searchResultEntity = searchResultRepository.getOne(searchResultId);
                    addLink(nzbHandler.getNzbDownloadLink(searchResultId, false, DownloadType.NZB), searchResultEntity.getTitle(), category);
                    //TODO: Use the external ID some way, perhaps store it or something
                    //At this point we don't have a DownloadEntity for which we could set the external status. When a link is added to the download it will download the NZB from us and only then
                    //will there be an entity. So just adding an link will not be considered a download. The external ID will have to be set using the title (for now)
                }

                countAddedNzbs++;
            }

        } catch (DownloaderException e) {
            String message = "Error while adding NZB(s) to downloader: " + e.getMessage();
            logger.error(message);
            if (countAddedNzbs > 0) {
                message += ".\n" + countAddedNzbs + " were added successfully";
            }
            return new GenericResponse(false, message);
        }
        return new GenericResponse(true, null);
    }


    public abstract GenericResponse checkConnection();

    public abstract List<String> getCategories();

    /**
     * @param link     Link to the NZB
     * @param title    Title to tell the downloader
     * @param category Category to file under
     * @return ID returned by the downloader
     * @throws DownloaderException
     */
    public abstract String addLink(String link, String title, String category) throws DownloaderException;

    /**
     * @param content  NZB content to upload
     * @param title    Title to tell the downloader
     * @param category Category to file under
     * @return ID returned by the downloader
     * @throws DownloaderException
     */
    public abstract String addNzb(String content, String title, String category) throws DownloaderException;

}
