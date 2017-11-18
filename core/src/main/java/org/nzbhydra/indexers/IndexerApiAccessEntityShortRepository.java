package org.nzbhydra.indexers;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.Instant;

public interface IndexerApiAccessEntityShortRepository extends JpaRepository<IndexerApiAccessEntityShort, Integer> {

    @Modifying
    public int deleteByTimeBefore(Instant before);

}
