package org.nzbhydra.mediainfo;


import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface MovieInfoRepository extends JpaRepository<MovieInfo, Integer> {

    MovieInfo findByImdbId(String imdbId);

    MovieInfo findByTmdbId(String tmdbId);

    MovieInfo findByTitle(String title);

    Collection<MovieInfo> findByImdbIdOrTmdbId(String imdbId, String tmdbId);
}
