package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface IndexerStatusRepository extends JpaRepository<IndexerStatusEntity, Integer> {

    public IndexerStatusEntity findByIndexerName(String indexerName);

}
