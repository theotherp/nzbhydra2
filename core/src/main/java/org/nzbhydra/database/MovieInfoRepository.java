package org.nzbhydra.database;


import org.springframework.data.jpa.repository.JpaRepository;

public interface MovieInfoRepository extends JpaRepository<MovieInfo, Integer> {

    MovieInfo findByImdbId(String imdbId);

    MovieInfo findByTmdbId(String tmdbId);

    MovieInfo findByTitle(String title);
}
