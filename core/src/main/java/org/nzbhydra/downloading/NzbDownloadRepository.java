package org.nzbhydra.downloading;


import org.nzbhydra.indexers.IndexerEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface NzbDownloadRepository extends JpaRepository<NzbDownloadEntity, Integer> {

    Collection<NzbDownloadEntity> findByExternalId(String externalId);

    List<NzbDownloadEntity> findBySearchResultTitleOrderByTimeDesc(String title);

    List<NzbDownloadEntity> findByStatusInAndSearchResultNotNullOrderByTimeDesc(Collection<NzbDownloadStatus> status);
    List<NzbDownloadEntity> findByStatusInAndSearchResultNotNullAndTimeAfterOrderByTimeDesc(Collection<NzbDownloadStatus> status, Instant minTime);

    Page<NzbDownloadEntity> findBySearchResultIndexerOrderByTimeDesc(IndexerEntity indexerEntity, Pageable pageable);
}
