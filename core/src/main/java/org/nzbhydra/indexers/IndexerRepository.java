package org.nzbhydra.indexers;


import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface IndexerRepository extends JpaRepository<IndexerEntity, Integer> {

    IndexerEntity findByName(String name);

    Collection<IndexerEntity> findByNameNotIn(Collection<String> names);
    void deleteAllByNameNotIn(Collection<String> names);

    @Override
    <S extends IndexerEntity> S save(S entity);
}
