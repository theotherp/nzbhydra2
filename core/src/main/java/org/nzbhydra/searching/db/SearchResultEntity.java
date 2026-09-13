

package org.nzbhydra.searching.db;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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
import jakarta.persistence.PrePersist;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.searching.SearchResultIdCalculator;

import java.time.Instant;


@Entity
@Getter
@Table(name = "searchresult"
    , indexes = {
    //Not unique: the same indexer GUID may be stored again with a changed title or link (see V8 migration)
    @Index(columnList = "indexer_id,indexerguid"),
    @Index(name = "SEARCHRESULT_HASH_INDEX", columnList = "hash", unique = true),
    @Index(name = "SEARCHRESULT_FIRST_FOUND_INDEX", columnList = "first_found")}
)
public final class SearchResultEntity {

    /**
     * Internal, sequential primary key. Only used for JPA relations and foreign keys so that inserts append to the
     * end of the primary key index instead of landing on random pages. Never exposed to the outside.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "searchresult_seq")
    @SequenceGenerator(name = "searchresult_seq", sequenceName = "SEARCHRESULT_SEQ", allocationSize = 50)
    @JsonIgnore
    private long id;

    /**
     * Externally visible identifier of the result, calculated by {@link SearchResultIdCalculator} from the indexer,
     * GUID, title and link. This is what download links, the API and the UI use (and what used to be the primary
     * key), so it is serialized as {@code id}.
     */
    @Column(name = "HASH", nullable = false)
    @JsonProperty("id")
    private long hash;

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

    @Transient
    @Getter(AccessLevel.NONE)
    private Integer downloadSearchId;

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

    public void setHash(long hash) {
        this.hash = hash;
    }

    @PrePersist
    void calculateHashIfMissing() {
        if (hash == 0) {
            hash = SearchResultIdCalculator.calculateSearchResultHash(this);
        }
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

    public void setDownloadSearchId(Integer downloadSearchId) {
        this.downloadSearchId = downloadSearchId;
    }

    @JsonIgnore
    public Integer getDownloadSearchId() {
        return downloadSearchId;
    }

    @JsonIgnore
    public boolean isMagnetLink() {
        return link != null && link.startsWith("magnet:");
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
        if (this.hash != 0 || that.hash != 0) {
            return this.hash == that.hash;
        }
        return Objects.equal(indexer, that.indexer) &&
                Objects.equal(indexerGuid, that.indexerGuid);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(hash);
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
