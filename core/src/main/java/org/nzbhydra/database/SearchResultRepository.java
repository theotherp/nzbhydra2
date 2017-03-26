package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface SearchResultRepository extends JpaRepository<SearchResultEntity, Long> {

    SearchResultEntity findByIndexerAndIndexerGuid(IndexerEntity indexer, String indexerGuid);
}
