package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.Instant;

public interface SearchResultRepository extends JpaRepository<SearchResultEntity, Long> {

    SearchResultEntity findByIndexerAndIndexerGuid(IndexerEntity indexer, String indexerGuid);

    @Modifying
    public int deleteByFirstFoundBefore(Instant foundBefore);


}
