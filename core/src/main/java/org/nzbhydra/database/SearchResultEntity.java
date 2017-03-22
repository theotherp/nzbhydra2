package org.nzbhydra.database;

import lombok.Getter;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import javax.validation.constraints.NotNull;
import java.time.Instant;


@Entity
@Getter
@Table(name="searchresult"
        ,indexes = {
        @Index(columnList = "indexer_id,indexerguid", unique = true)}
        )
public class SearchResultEntity {

    @Id
    @GenericGenerator(
            name = "search-result-sequence",
            strategy = "org.nzbhydra.database.SearchResultSequenceGenerator",
            parameters = @org.hibernate.annotations.Parameter(
                    name = "sequence_name",
                    value = "hibernate_sequence"
            )
    )

    @GeneratedValue(generator = "search-result-sequence", strategy = GenerationType.SEQUENCE)
    protected int id;

    @ManyToOne
    @NotNull
    protected IndexerEntity indexer;

    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    protected Instant firstFound;

    @NotNull
    protected String title;

    @Column(name = "indexerguid")
    @NotNull
    protected String indexerGuid;

    protected String link;

    protected String details;

    public void setId(int id) {
        this.id = id;
    }

    public void setIndexer(IndexerEntity indexer) {
        this.indexer = indexer;
    }

    public void setFirstFound(Instant firstFound) {
        this.firstFound = firstFound;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setIndexerGuid(String indexerGuid) {
        this.indexerGuid = indexerGuid;
    }

    public void setLink(String link) {
        this.link = link;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
