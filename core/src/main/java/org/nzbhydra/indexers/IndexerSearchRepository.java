package org.nzbhydra.indexers;


import org.nzbhydra.searching.db.SearchEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface IndexerSearchRepository extends JpaRepository<IndexerSearchEntity, Integer> {

    IndexerSearchEntity findByIndexerEntityAndSearchEntity(IndexerEntity indexerEntity, SearchEntity searchEntity);
    Collection<IndexerSearchEntity> findBySearchEntity(SearchEntity searchEntity);
    void deleteAllByIndexerEntityIn(Collection<IndexerEntity> searchEntity);
}
