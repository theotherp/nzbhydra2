package org.nzbhydra.database;

import lombok.Data;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import java.time.Instant;

@Data
@Entity
@Table(name = "indexernzbdownload")
public class NzbDownloadEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    @ManyToOne
    private IndexerEntity indexer;
    @ManyToOne
    private SearchResultEntity searchResult;
    @Enumerated(EnumType.STRING)
    private NzbAccessType nzbAccessType;
    @Enumerated(EnumType.STRING)
    private SearchSource accessSource;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time = Instant.now();
    @Enumerated(EnumType.STRING)
    private IndexerAccessResult result;
    private String error;
    @Column(length = 4000)
    private String title;
    private String usernameOrIp;

    public NzbDownloadEntity(IndexerEntity indexerEntity, SearchResultEntity searchResult, String title, NzbAccessType nzbAccessType, SearchSource accessSource, IndexerAccessResult result, String usernameOrIp, String error) {
        this.indexer = indexerEntity;
        this.searchResult = searchResult;
        this.title = title;
        this.nzbAccessType = nzbAccessType;
        this.accessSource = accessSource;
        this.result = result;
        this.time = Instant.now();
        this.usernameOrIp = usernameOrIp;
    }

    public NzbDownloadEntity(IndexerEntity indexerEntity, SearchResultEntity searchResult, String title, NzbAccessType nzbAccessType, SearchSource accessSource, IndexerAccessResult result) {
        this.indexer = indexerEntity;
        this.searchResult = searchResult;
        this.title = title;
        this.nzbAccessType = nzbAccessType;
        this.accessSource = accessSource;
        this.result = result;
        this.time = Instant.now();
    }

    public NzbDownloadEntity() {
        this.time = Instant.now();
    }
}
