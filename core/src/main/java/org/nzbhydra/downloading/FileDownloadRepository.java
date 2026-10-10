package org.nzbhydra.downloading;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface FileDownloadRepository extends JpaRepository<FileDownloadEntity, Integer> {

    List<FileDownloadEntity> findByUsernameAndTimeAfterOrderByTimeDesc(String username, Instant minTime);

    List<FileDownloadEntity> findByTimeAfterOrderByTimeDesc(Instant minTime);

    List<FileDownloadEntity> findByStatusInAndTimeAfterOrderByTimeDesc(Collection<FileDownloadStatus> status, Instant minTime);

    @Query("select d from FileDownloadEntity d join d.searchResult s where s.hash in :hashes")
    Collection<FileDownloadEntity> findBySearchResult_HashIn(@Param("hashes") Collection<Long> hashes);
}
