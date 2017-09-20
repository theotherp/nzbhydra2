package org.nzbhydra.searching;


import org.nzbhydra.indexers.IndexerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public interface SearchResultRepository extends JpaRepository<SearchResultEntity, Long> {

    SearchResultEntity findByIndexerAndIndexerGuid(IndexerEntity indexer, String indexerGuid);
    Set<SearchResultEntity> findByIndexerAndIndexerGuidIn(IndexerEntity indexer, List<String> indexerGuid);

    @Modifying
    int deleteByFirstFoundBefore(Instant foundBefore);


}
