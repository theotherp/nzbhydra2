

package org.nzbhydra.searching.uniqueness;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface IndexerUniquenessScoreEntityRepository extends JpaRepository<IndexerUniquenessScoreEntity, Long> {

    /**
     * Returns the score observations with data version 3 or higher whose recordedAt lies in [after, before], both
     * bounds inclusive. A null bound leaves that side of the range open. Rows with a null recordedAt only match when
     * both bounds are null. The indexer is fetched in the same query.
     */
    @Query("select s from IndexerUniquenessScoreEntity s left join fetch s.indexer"
           + " where s.dataVersion >= 3"
           + " and (:after is null or s.recordedAt >= :after)"
           + " and (:before is null or s.recordedAt <= :before)")
    List<IndexerUniquenessScoreEntity> findCorrectedObservationsRecordedBetween(@Param("after") Instant after, @Param("before") Instant before);

}
