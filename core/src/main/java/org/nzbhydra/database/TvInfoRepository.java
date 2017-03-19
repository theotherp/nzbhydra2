package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface TvInfoRepository extends JpaRepository<TvInfo, Integer> {

    TvInfo findByTvRageId(String tvRageId);

    TvInfo findByTvMazeId(String tvMazeId);

    TvInfo findByTvDbId(String tvDbId);
}
