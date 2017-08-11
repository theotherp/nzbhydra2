package org.nzbhydra.downloading;


import org.nzbhydra.indexers.IndexerEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface NzbDownloadRepository extends JpaRepository<NzbDownloadEntity, Integer> {

    Collection<NzbDownloadEntity> findByIndexer(IndexerEntity indexerEntity);

    Collection<NzbDownloadEntity> findByExternalId(String externalId);

    List<NzbDownloadEntity> findByTitleOrderByTimeDesc(String title);

    Page<NzbDownloadEntity> findByIndexerOrderByTimeDesc(IndexerEntity indexerEntity, Pageable pageable);
}
