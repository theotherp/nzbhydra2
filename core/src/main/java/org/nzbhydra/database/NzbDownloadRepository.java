package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface NzbDownloadRepository extends JpaRepository<NzbDownloadEntity, Integer> {

    Collection<NzbDownloadEntity> findByIndexerApiAccessIndexer(IndexerEntity indexerEntity);

    NzbDownloadEntity findByIndexerApiAccess(IndexerApiAccessEntity apiAccessEntity);
}
