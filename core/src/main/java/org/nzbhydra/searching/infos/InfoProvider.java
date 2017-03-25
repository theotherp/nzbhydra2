package org.nzbhydra.searching.infos;

import com.google.common.base.Throwables;
import com.google.common.collect.Sets;
import org.nzbhydra.database.MovieInfo;
import org.nzbhydra.database.MovieInfoRepository;
import org.nzbhydra.database.TvInfo;
import org.nzbhydra.database.TvInfoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

import static org.nzbhydra.searching.infos.InfoProvider.IdType.*;

@Component
public class InfoProvider {

    public enum IdType {
        TVDB,
        TVRAGE,
        TVMAZE,
        IMDB,
        TMDB,
        TVTITLE,
        MOVIETITLE
    }

    private static Map<IdType, Set<IdType>> canConvertMap = new HashMap<>();

    static {
        canConvertMap.put(TVDB, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVTITLE));
        canConvertMap.put(TVMAZE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVTITLE));
        canConvertMap.put(TVRAGE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVTITLE));
        canConvertMap.put(TVTITLE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVTITLE));

        canConvertMap.put(TMDB, Sets.newHashSet(TMDB, IMDB, MOVIETITLE));
        canConvertMap.put(IMDB, Sets.newHashSet(TMDB, IMDB, MOVIETITLE));
        canConvertMap.put(MOVIETITLE, Sets.newHashSet(TMDB, IMDB, MOVIETITLE));

    }

    private static final Logger logger = LoggerFactory.getLogger(InfoProvider.class);


    @Autowired
    protected TmdbHandler tmdbHandler;
    @Autowired
    private MovieInfoRepository movieInfoRepository;
    @Autowired
    protected TvMazeHandler tvMazeHandler;
    @Autowired
    private TvInfoRepository tvInfoRepository;


    public boolean canConvert(IdType from, IdType to) {
        return canConvertMap.get(from).contains(to);
    }

    public boolean canConvertAny(Set<IdType> from, Set<IdType> to) {
        return from.stream().anyMatch(x -> canConvertMap.containsKey(x) && canConvertMap.get(x).stream().anyMatch(to::contains));
    }


    @Cacheable(cacheNames = "infos", sync = true)
    public Info convert(String value, IdType fromType) throws InfoProviderException {
        logger.info("Conversion of {} {} requested", fromType, value);
        try {
            Info info;
            if (fromType == TMDB || fromType == IMDB || fromType == MOVIETITLE) {
                MovieInfo movieInfo;
                if (fromType == TMDB) {
                    movieInfo = movieInfoRepository.findByTmdbId(value);
                } else if (fromType == IMDB) {
                    movieInfo = movieInfoRepository.findByImdbId(value);
                } else {
                    movieInfo = movieInfoRepository.findByTitle(value);
                }
                if (movieInfo != null) {
                    info = new Info(movieInfo);
                } else {
                    TmdbSearchResult result = tmdbHandler.getInfos(value, fromType);
                    info = new Info(result);
                    movieInfo = new MovieInfo(info.getImdbId().orElse(null), info.getTmdbId().orElse(null), info.getTitle().orElse(null), info.getYear().orElse(null), info.getPosterUrl().orElse(null));
                    movieInfoRepository.save(movieInfo);
                }
            } else if (fromType == TVMAZE || fromType == TVDB || fromType == TVRAGE || fromType == TVTITLE) {
                TvInfo tvInfo;
                if (fromType == TVMAZE) {
                    tvInfo = tvInfoRepository.findByTvMazeId(value);
                } else if (fromType == TVDB) {
                    tvInfo = tvInfoRepository.findByTvDbId(value);
                } else if (fromType == TVRAGE) {
                    tvInfo = tvInfoRepository.findByTvRageId(value);
                } else {
                    tvInfo = tvInfoRepository.findByTitle(value);
                }
                if (tvInfo != null) {
                    info = new Info(tvInfo);
                } else {
                    TvMazeSearchResult result = tvMazeHandler.getInfos(value, fromType);
                    info = new Info(result);
                    tvInfo = new TvInfo(info.getTvDbId().orElse(null), info.getTvRageId().orElse(null), info.getTvMazeId().orElse(null), info.getTitle().orElse(null), info.getYear().orElse(null), info.getPosterUrl().orElse(null));
                    tvInfoRepository.save(tvInfo);
                }
            } else {
                throw new IllegalArgumentException("Wrong IdType");
            }
            logger.info("Conversion successful: " + info);
            return info;
        } catch (Exception e) {
            logger.error("Error while converting " + fromType + " " + value, e);
            Throwables.throwIfInstanceOf(e, InfoProviderException.class);
            throw new InfoProviderException("Unexpected error while converting infos", e);
        }
    }

    @Cacheable(cacheNames = "titles", sync = true)
    public List<Info> search(String title, IdType titleType) throws InfoProviderException {
        try {
            List<Info> infos;
            if (titleType == TVTITLE) {
                List<TvMazeSearchResult> results = tvMazeHandler.search(title);
                infos = results.stream().map(Info::new).collect(Collectors.toList());
            } else if (titleType == MOVIETITLE) {
                List<TmdbSearchResult> results = tmdbHandler.search(title, null);
                infos = results.stream().map(Info::new).collect(Collectors.toList());
            } else {
                throw new IllegalArgumentException("Wrong IdType");
            }
            return infos;
        } catch (Exception e) {
            logger.error("Error while searching for " + titleType + " " + title, e);
            Throwables.throwIfInstanceOf(e, InfoProviderException.class);
            throw new InfoProviderException("Unexpected error while converting infos", e);
        }
    }


    private class CacheKey {
        private IdType idType;
        private String value;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            CacheKey cacheKey = (CacheKey) o;
            return idType == cacheKey.idType &&
                    Objects.equals(value, cacheKey.value);
        }

        @Override
        public int hashCode() {
            return Objects.hash(idType, value);
        }


    }


}
