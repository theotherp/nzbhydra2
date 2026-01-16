

package org.nzbhydra.downloading.downloadurls;

import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.searching.db.SearchResultEntity;

import java.util.Optional;

public interface DownloadUrlBuilderStrategy {

    Optional<DownloadLink> getDownloadLinkForSendingToDownloader(SearchResultEntity searchResult, boolean internal, DownloadType downloadType);
}
