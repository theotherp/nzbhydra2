package org.nzbhydra.indexers;


import org.springframework.data.jpa.repository.JpaRepository;

//Only used for stats, do not delete just because there's usages of reading methods!
public interface IndexerApiAccessRepository extends JpaRepository<IndexerApiAccessEntity, Integer> {


}
