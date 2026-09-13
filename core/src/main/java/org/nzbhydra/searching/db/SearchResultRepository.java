package org.nzbhydra.searching.db;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface SearchResultRepository extends JpaRepository<SearchResultEntity, Long> {

    Optional<SearchResultEntity> findByHash(long hash);

    List<SearchResultEntity> findAllByHashIn(Collection<Long> hashes);

    /**
     * Lightweight existence check: returns only the internal ID and the hash of the results whose hash is contained in
     * the given collection, without loading the full entities.
     */
    @Query("select x.id as id, x.hash as hash from SearchResultEntity x where x.hash in :hashes")
    List<SearchResultIdAndHash> findIdsAndHashesByHashIn(@Param("hashes") Collection<Long> hashes);

    /**
     * Backfills the legacy INDEXERSEARCHENTITY column for results which were persisted without one (e.g. while the
     * history was disabled).
     */
    @Modifying
    @Query("update SearchResultEntity x set x.indexerSearchEntityId = :indexerSearchEntityId where x.id in :ids and x.indexerSearchEntityId is null")
    int setIndexerSearchEntityIdWhereMissing(@Param("ids") Collection<Long> ids, @Param("indexerSearchEntityId") int indexerSearchEntityId);

    Set<SearchResultEntity> findAllByTitleLikeIgnoreCase(String title);

    Set<SearchResultEntity> findAllByTitleLike(String title);

}
