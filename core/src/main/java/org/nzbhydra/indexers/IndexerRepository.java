package org.nzbhydra.indexers;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;

public interface IndexerRepository extends JpaRepository<IndexerEntity, Integer> {

    IndexerEntity findByName(String name);

    Collection<IndexerEntity> findByNameNotIn(Collection<String> names);
    void deleteAllByNameNotIn(Collection<String> names);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM INDEXER WHERE ID = :id", nativeQuery = true)
    void deleteByIdNative(@Param("id") int id);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM INDEXER", nativeQuery = true)
    void deleteAllNative();

    @Override
    <S extends IndexerEntity> S save(S entity);
}
