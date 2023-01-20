package org.nzbhydra.downloading;

import lombok.Data;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.searching.db.SearchResultEntityTO;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

@Data
@ReflectionMarker
public class FileDownloadEntityTO {

    protected int id;
    private SearchResultEntityTO searchResult;
    private FileDownloadAccessType nzbAccessType;
    private SearchSource accessSource;
    private Instant time = Instant.now();
    private FileDownloadStatus status;
    private String error;
    private String username;
    private String ip;
    private String userAgent;
    /**
     * The age of the NZB at the time of downloading.
     */
    private Integer age;
    private String externalId;


}
