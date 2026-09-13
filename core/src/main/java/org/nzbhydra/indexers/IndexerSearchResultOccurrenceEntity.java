package org.nzbhydra.indexers;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.springnative.ReflectionMarker;

@Entity
@Data
@ReflectionMarker
@Table(name = "indexersearchresultoccurrence", indexes = {
        @Index(name = "ISRO_INDEXERSEARCH_RESULT_INDEX", columnList = "indexer_search_id,search_result_id", unique = true),
        @Index(name = "ISRO_SEARCH_RESULT_INDEX", columnList = "search_result_id")
})
public final class IndexerSearchResultOccurrenceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "INDEXERSEARCHRESULTOCCURRENCE_SEQ")
    @SequenceGenerator(name = "INDEXERSEARCHRESULTOCCURRENCE_SEQ", sequenceName = "INDEXERSEARCHRESULTOCCURRENCE_SEQ", allocationSize = 1)
    private int id;

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    private IndexerSearchEntity indexerSearch;

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SearchResultEntity searchResult;

    public IndexerSearchResultOccurrenceEntity() {
    }

    public IndexerSearchResultOccurrenceEntity(IndexerSearchEntity indexerSearch, SearchResultEntity searchResult) {
        this.indexerSearch = indexerSearch;
        this.searchResult = searchResult;
    }
}
