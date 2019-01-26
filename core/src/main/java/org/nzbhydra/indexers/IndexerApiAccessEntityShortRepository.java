package org.nzbhydra.indexers;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.Instant;

public interface IndexerApiAccessEntityShortRepository extends JpaRepository<IndexerApiAccessEntityShort, Integer> {

    @Modifying
    int deleteByTimeBefore(Instant before);

    Page<IndexerApiAccessEntityShort> findAllByIndexerIdAndApiAccessTypeOrderByTimeDesc(int indexerId, IndexerApiAccessType apiAccessType, Pageable pageable);

}
