package org.nzbhydra.downloading;


import org.nzbhydra.indexers.IndexerEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface NzbDownloadRepository extends JpaRepository<NzbDownloadEntity, Integer> {


    Collection<NzbDownloadEntity> findByExternalId(String externalId);

    List<NzbDownloadEntity> findBySearchResultTitleOrderByTimeDesc(String title);

    Page<NzbDownloadEntity> findBySearchResultIndexerOrderByTimeDesc(IndexerEntity indexerEntity, Pageable pageable);


}
