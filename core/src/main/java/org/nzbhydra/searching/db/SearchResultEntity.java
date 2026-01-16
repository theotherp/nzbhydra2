

package org.nzbhydra.searching.db;

import com.google.common.base.MoreObjects;
import com.google.common.base.Objects;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.indexers.IndexerEntity;

import java.time.Instant;


@Entity
@Getter
@Table(name = "searchresult"
    , indexes = {
    @Index(columnList = "indexer_id,indexerguid", unique = true)}
)
public final class SearchResultEntity {


    @GenericGenerator(
        name = "search-result-sequence",
        strategy = "org.nzbhydra.searching.db.SearchResultSequenceGenerator",
        parameters = {@org.hibernate.annotations.Parameter(
            name = "sequence_name",
            value = "HIBERNATE_SEQUENCE"
        ),
            @org.hibernate.annotations.Parameter(
                name = "increment_size",
                value = "1"
            )}
    )
    @Id
    @GeneratedValue(generator = "search-result-sequence", strategy = GenerationType.SEQUENCE)
    private long id;

    @ManyToOne
    @NotNull
    @OnDelete(action = OnDeleteAction.CASCADE)
    private IndexerEntity indexer;

    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
    private Instant firstFound;

    @NotNull
    @Column(length = 4000)
    private String title;

    @Column(name = "indexerguid")
    @NotNull
    private String indexerGuid;
    @Column(length = 4000)
    private String link;
    @Column(length = 4000)
    private String details;
    @Enumerated(EnumType.STRING)
    private DownloadType downloadType;
    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
    private Instant pubDate;

    @Column(name = "INDEXERSEARCHENTITY")
    private Integer indexerSearchEntityId;

    public SearchResultEntity() {
    }

    public SearchResultEntity(IndexerEntity indexer, Instant firstFound, String title, String indexerGuid, String link, String details, DownloadType downloadType, Instant pubDate) {
        this.indexer = indexer;
        this.firstFound = firstFound;
        this.title = title;
        this.indexerGuid = indexerGuid;
        this.link = link;
        this.details = details;
        this.downloadType = downloadType;
        this.pubDate = pubDate;
    }

    public void setId(long id) {
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

    public void setDownloadType(DownloadType downloadType) {
        this.downloadType = downloadType;
    }

    public void setPubDate(Instant pubDate) {
        this.pubDate = pubDate;
    }

    public Integer getIndexerSearchEntityId() {
        return indexerSearchEntityId;
    }

    public void setIndexerSearchEntityId(Integer indexerSearchEntityId) {
        this.indexerSearchEntityId = indexerSearchEntityId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        SearchResultEntity that = (SearchResultEntity) o;
        if (this.id != 0 || that.id != 0) {
            return this.id == that.id;
        }
        return Objects.equal(indexer, that.indexer) &&
                Objects.equal(indexerGuid, that.indexerGuid);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("indexer", indexer.getName())
                .add("title", title)
                .add("link", link)
                .add("details", details)
                .add("pubDate", pubDate)
                .toString();
    }
}
