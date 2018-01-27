package org.nzbhydra.indexers;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface IndexerApiAccessRepository extends JpaRepository<IndexerApiAccessEntity, Integer> {

    IndexerApiAccessEntity findByIndexer(IndexerEntity indexerEntity);

    Page<IndexerApiAccessEntity> findByIndexerOrderByTimeDesc(IndexerEntity indexerEntity, Pageable pageable);

    void deleteAllByIndexerIn(Collection<IndexerEntity> searchEntity);


}
