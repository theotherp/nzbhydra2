package org.nzbhydra.downloading;

import lombok.Data;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.indexers.IndexerAccessResult;
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
    private Integer age;

    public NzbDownloadEntity(IndexerEntity indexerEntity, String title, NzbAccessType nzbAccessType, SearchSource accessSource, IndexerAccessResult result, String usernameOrIp, Integer age, String error) {
        this.indexer = indexerEntity;
        this.title = title;
        this.nzbAccessType = nzbAccessType;
        this.accessSource = accessSource;
        this.result = result;
        this.time = Instant.now();
        this.usernameOrIp = usernameOrIp;
        this.age = age;
        this.error = error;
    }


    public NzbDownloadEntity() {
        this.time = Instant.now();
    }
}
