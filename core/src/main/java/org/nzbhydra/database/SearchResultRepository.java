package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface SearchResultRepository extends JpaRepository<SearchResultEntity, Integer>{

    SearchResultEntity findByIndexerEntityAndIndexerGuid(IndexerEntity indexerEntity, String indexerGuid);

    SearchResultEntity findByIndexerEntityIdAndIndexerGuid(int indexerEntityId, String indexerGuid);
}
