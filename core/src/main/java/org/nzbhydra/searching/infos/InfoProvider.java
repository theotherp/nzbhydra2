package org.nzbhydra.searching.infos;

import com.google.common.base.Throwables;
import com.google.common.collect.Sets;
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
    protected TvMazeHandler tvMazeHandler;


    public boolean canConvert(IdType from, IdType to) {
        return canConvertMap.get(from).contains(to);
    }


    @Cacheable(cacheNames = "infos", sync = true)
    public Info convert(String value, IdType fromType) throws InfoProviderException {
        logger.info("Conversion of {} {} requested", fromType, value);
        try {
            Info info;
            if (fromType == TMDB || fromType == IMDB || fromType == MOVIETITLE) {
                TmdbSearchResult result = tmdbHandler.getInfos(value, fromType);
                info = new Info(result);
            } else if (fromType == TVMAZE || fromType == TVDB || fromType == TVRAGE || fromType == TVTITLE) {
                TvMazeSearchResult result = tvMazeHandler.getInfos(value, fromType);
                info = new Info(result);
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
