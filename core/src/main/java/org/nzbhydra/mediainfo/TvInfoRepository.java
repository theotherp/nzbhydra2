package org.nzbhydra.mediainfo;


import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface TvInfoRepository extends JpaRepository<TvInfo, Integer> {

    TvInfo findByTvrageId(String tvrageId);

    TvInfo findByTvmazeId(String tvmazeId);

    TvInfo findByTvdbId(String tvdbId);

    TvInfo findByTitle(String title);

    Collection<TvInfo> findByTvrageIdOrTvmazeIdOrTvdbId(String tvrageId, String tvmazeId, String tvdbId);
}
