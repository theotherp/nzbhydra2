package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface MovieInfoRepository extends JpaRepository<MovieInfo, Integer> {

    TvInfo findByImdbId(String imdbId);

    TvInfo findByTmdbId(String imdbId);
}
