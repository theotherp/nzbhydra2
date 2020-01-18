package org.nzbhydra.indexers.status;


import org.nzbhydra.indexers.IndexerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IndexerLimitRepository extends JpaRepository<IndexerLimit, Integer> {

    IndexerLimit findByIndexer(IndexerEntity indexerEntity);

}
