

package org.nzbhydra.downloading.downloaders.torbox;

import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.downloading.downloadurls.DownloadLink;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilderStrategy;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
public class TorboxDownloadUrlBuilderStrategy implements DownloadUrlBuilderStrategy {
    @Override
    public Optional<DownloadLink> getDownloadLinkForSendingToDownloader(SearchResultEntity searchResult, boolean internal, DownloadType downloadType) {
        if (downloadType == DownloadType.TORBOX
            || downloadType == DownloadType.TORRENT
            //We may only send results from the torbox indexer to torbox
            || searchResult.getLink().contains("search-api.torbox.app")
            //We can only send an external link to torbox, they won't be able to reach us
            || searchResult.getIndexer().getName().contains("Torbox")
        ) {
            return Optional.of(new DownloadLink(searchResult.getLink(), false));
        }
        return Optional.empty();
    }
}
