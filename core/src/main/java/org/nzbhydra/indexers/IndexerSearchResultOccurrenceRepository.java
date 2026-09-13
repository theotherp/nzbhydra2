package org.nzbhydra.indexers;

import org.nzbhydra.searching.db.SearchResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.NativeQuery;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface IndexerSearchResultOccurrenceRepository extends JpaRepository<IndexerSearchResultOccurrenceEntity, Integer> {

    List<IndexerSearchResultOccurrenceEntity> findBySearchResultOrderByIndexerSearchSearchEntityTimeDesc(SearchResultEntity searchResult);

    List<IndexerSearchResultOccurrenceEntity> findBySearchResultAndIndexerSearchSearchEntityId(SearchResultEntity searchResult, int searchId);

    Collection<IndexerSearchResultOccurrenceEntity> findByIndexerSearchSearchEntityId(int searchId);

    // H2 MERGE is atomic, unlike a preceding existence check followed by an insert.
    @Modifying
    @NativeQuery("MERGE INTO INDEXERSEARCHRESULTOCCURRENCE (ID, INDEXER_SEARCH_ID, SEARCH_RESULT_ID) " +
                 "KEY (INDEXER_SEARCH_ID, SEARCH_RESULT_ID) VALUES (NEXT VALUE FOR INDEXERSEARCHRESULTOCCURRENCE_SEQ, :indexerSearchId, :searchResultId)")
    void merge(@Param("indexerSearchId") int indexerSearchId, @Param("searchResultId") long searchResultId);
}
