package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface IndexerRepository extends JpaRepository<IndexerEntity, Integer>{

    IndexerEntity findByName(String name);
}
