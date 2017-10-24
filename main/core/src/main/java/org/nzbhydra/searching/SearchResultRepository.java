package org.nzbhydra.searching;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public interface SearchResultRepository extends JpaRepository<SearchResultEntity, Long> {

    @Query("select x.id from SearchResultEntity x where x.id in :ids")
    Set<Long> findAllIdsByIdIn(@Param("ids") List<Long> ids);

    @Modifying
    int deleteByFirstFoundBefore(Instant foundBefore);


}
