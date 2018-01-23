package org.nzbhydra.downloading;


import org.nzbhydra.indexers.IndexerEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface FileDownloadRepository extends JpaRepository<FileDownloadEntity, Integer> {

    Collection<FileDownloadEntity> findByExternalId(String externalId);

    List<FileDownloadEntity> findBySearchResultTitleOrderByTimeDesc(String title);

    List<FileDownloadEntity> findByStatusInAndTimeAfterOrderByTimeDesc(Collection<FileDownloadStatus> status, Instant minTime);

    Page<FileDownloadEntity> findBySearchResultIndexerOrderByTimeDesc(IndexerEntity indexerEntity, Pageable pageable);
}
