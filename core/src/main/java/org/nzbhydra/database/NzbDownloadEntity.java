package org.nzbhydra.database;

import lombok.Data;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

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
    private SearchSource searchSource;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time = Instant.now();
    @Enumerated(EnumType.STRING)
    private IndexerAccessResult result;
    private String error;
    private String title;

    public NzbDownloadEntity(IndexerEntity indexerEntity, SearchResultEntity searchResult, String title, NzbAccessType nzbAccessType, SearchSource searchSource, IndexerAccessResult result, String error) {
        this.indexer = indexerEntity;
        this.searchResult = searchResult;
        this.title = title;
        this.nzbAccessType = nzbAccessType;
        this.searchSource = searchSource;
        this.result = result;
        this.time = Instant.now();
    }

    public NzbDownloadEntity(IndexerEntity indexerEntity, SearchResultEntity searchResult, String title, NzbAccessType nzbAccessType, SearchSource searchSource, IndexerAccessResult result) {
        this.indexer = indexerEntity;
        this.searchResult = searchResult;
        this.title = title;
        this.nzbAccessType = nzbAccessType;
        this.searchSource = searchSource;
        this.result = result;
        this.time = Instant.now();
    }

    public NzbDownloadEntity() {
        this.time = Instant.now();
    }
}
