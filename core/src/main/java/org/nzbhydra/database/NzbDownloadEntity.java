package org.nzbhydra.database;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

@Data
@Entity
@Table(name = "indexernzbdownload")
@NoArgsConstructor
public class NzbDownloadEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    @ManyToOne
    @NotNull
    private IndexerApiAccessEntity indexerApiAccess;
    @ManyToOne
    private SearchResultEntity searchResult;
    @Enumerated(EnumType.STRING)
    private NzbAccessType nzbAccessType;
    @Enumerated(EnumType.STRING)
    private SearchSource searchSource;

    private String title;

    public NzbDownloadEntity(IndexerApiAccessEntity indexerApiAccess, SearchResultEntity searchResult, String title, NzbAccessType nzbAccessType, SearchSource searchSource) {
        this.indexerApiAccess = indexerApiAccess;
        this.searchResult = searchResult;
        this.title = title;
        this.nzbAccessType = nzbAccessType;
        this.searchSource = searchSource;
    }

    public NzbDownloadEntity(IndexerApiAccessEntity indexerApiAccess) {
        this.indexerApiAccess = indexerApiAccess;
    }
}
