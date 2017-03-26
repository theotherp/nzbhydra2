package org.nzbhydra.database;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.SearchingConfig.NzbAccessType;
import org.nzbhydra.searching.searchrequests.SearchRequest.AccessSource;

import javax.persistence.*;

@Data
@Entity
@Table(name = "indexernzbdownload")
@NoArgsConstructor
public class NzbDownloadEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    @ManyToOne
    private IndexerApiAccessEntity indexerApiAccess;
    @ManyToOne
    private SearchResultEntity searchResult;
    private String title;
    @Enumerated(EnumType.STRING)
    private NzbAccessType nzbAccessType;
    @Enumerated(EnumType.STRING)
    private AccessSource accessSource;

    public NzbDownloadEntity(IndexerApiAccessEntity indexerApiAccess, SearchResultEntity searchResult, String title, NzbAccessType nzbAccessType, AccessSource accessSource) {
        this.indexerApiAccess = indexerApiAccess;
        this.searchResult = searchResult;
        this.title = title;
        this.nzbAccessType = nzbAccessType;
        this.accessSource = accessSource;
    }
}
