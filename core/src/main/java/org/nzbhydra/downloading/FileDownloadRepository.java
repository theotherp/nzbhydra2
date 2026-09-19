package org.nzbhydra.downloading;


import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface FileDownloadRepository extends JpaRepository<FileDownloadEntity, Integer> {

    List<FileDownloadEntity> findByUsernameAndTimeAfterOrderByTimeDesc(String username, Instant minTime);

    List<FileDownloadEntity> findByTimeAfterOrderByTimeDesc(Instant minTime);

    List<FileDownloadEntity> findByStatusInAndTimeAfterOrderByTimeDesc(Collection<FileDownloadStatus> status, Instant minTime);

    Collection<FileDownloadEntity> findBySearchResult_HashIn(Collection<Long> hash);
}
