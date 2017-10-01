package org.nzbhydra.downloading;

import lombok.Data;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import java.time.Instant;

@Data
@Entity
@Table(name = "indexernzbdownload", indexes = {@Index(name = "NZB_DOWNLOAD_EXT_ID", columnList = "EXTERNAL_ID")})
public class NzbDownloadEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;
    @ManyToOne
    private IndexerEntity indexer;
    @Enumerated(EnumType.STRING)
    private NzbAccessType nzbAccessType;
    @Enumerated(EnumType.STRING)
    private SearchSource accessSource;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time = Instant.now();
    @Enumerated(EnumType.STRING)
    private NzbDownloadStatus status;
    private String error;
    @Column(length = 4000)
    private String title;
    private String userAgent;
    private String usernameOrIp;
    /**
     * The age of the NZB at the time of downloading.
     */
    private Integer age;
    @Column(name = "EXTERNAL_ID")
    private String externalId;

    public NzbDownloadEntity(IndexerEntity indexerEntity, String title, NzbAccessType nzbAccessType, SearchSource accessSource, NzbDownloadStatus status, String usernameOrIp, String userAgent, Integer age, String error) {
        this.indexer = indexerEntity;
        this.title = title;
        this.nzbAccessType = nzbAccessType;
        this.accessSource = accessSource;
        this.status = status;
        this.time = Instant.now();
        this.usernameOrIp = usernameOrIp;
        this.userAgent = userAgent;
        this.age = age;
        this.error = error;
    }


    public NzbDownloadEntity() {
        this.time = Instant.now();
    }
}
