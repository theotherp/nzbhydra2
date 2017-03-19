package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface IndexerApiAccessRepository extends JpaRepository<IndexerApiAccessEntity, Integer>{

    IndexerApiAccessEntity findByIndexer(IndexerEntity indexerEntity);
}
