

package org.nzbhydra.downloading;

import lombok.Getter;
import org.nzbhydra.searching.db.SearchResultEntity;

@Getter
public class FileDownloadEvent {


    private final FileDownloadEntity fileDownloadEntity;

    private final SearchResultEntity searchResultEntity;


    public FileDownloadEvent(FileDownloadEntity fileDownloadEntity, SearchResultEntity searchResultEntityHasDownloaded) {
        this.fileDownloadEntity = fileDownloadEntity;
        this.searchResultEntity = searchResultEntityHasDownloaded;
    }
}
