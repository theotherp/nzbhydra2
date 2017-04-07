package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface TvInfoRepository extends JpaRepository<TvInfo, Integer> {

    TvInfo findByTvrageId(String tvrageId);

    TvInfo findByTvmazeId(String tvmazeId);

    TvInfo findByTvdbId(String tvdbId);

    TvInfo findByTitle(String title);
}
