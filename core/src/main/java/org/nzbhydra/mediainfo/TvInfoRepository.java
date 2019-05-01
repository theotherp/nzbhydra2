package org.nzbhydra.mediainfo;


import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface TvInfoRepository extends JpaRepository<TvInfo, Integer> {

    TvInfo findByTvrageId(String tvrageId);

    TvInfo findByTvmazeId(String tvmazeId);

    TvInfo findByTvdbId(String tvdbId);

    TvInfo findByImdbId(String imdbId);

    TvInfo findByTitle(String title);

    Collection<TvInfo> findByTvrageIdOrTvmazeIdOrTvdbIdOrImdbId(String tvrageId, String tvmazeId, String tvdbId, String imdbId);
}
