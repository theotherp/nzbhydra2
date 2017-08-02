package org.nzbhydra.indexers;


import org.springframework.data.jpa.repository.JpaRepository;

public interface IndexerRepository extends JpaRepository<IndexerEntity, Integer>{

    IndexerEntity findByName(String name);

    @Override
    <S extends IndexerEntity> S save(S entity);
}
