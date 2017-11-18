package org.nzbhydra.indexers;


import org.nzbhydra.searching.SearchEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IndexerSearchRepository extends JpaRepository<IndexerSearchEntity, Integer> {

    IndexerSearchEntity findByIndexerEntityAndSearchEntity(IndexerEntity indexerEntity, SearchEntity searchEntity);
}
