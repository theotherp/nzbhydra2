package org.nzbhydra.database;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface NzbDownloadRepository extends JpaRepository<NzbDownloadEntity, Integer> {

    Collection<NzbDownloadEntity> findByIndexerApiAccessIndexer(IndexerEntity indexerEntity);

    Page<NzbDownloadEntity> findByIndexerApiAccessIndexerOrderByIndexerApiAccessTimeDesc(IndexerEntity indexerEntity, Pageable pageable);

    NzbDownloadEntity findByIndexerApiAccess(IndexerApiAccessEntity apiAccessEntity);
}
