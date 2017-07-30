package org.nzbhydra.mediainfo;

import com.google.common.base.Throwables;
import com.google.common.collect.Sets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.nzbhydra.mediainfo.InfoProvider.IdType.IMDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.MOVIETITLE;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TMDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TRAKT;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVDB;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVMAZE;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVRAGE;
import static org.nzbhydra.mediainfo.InfoProvider.IdType.TVTITLE;

@Component
public class InfoProvider {


    public enum IdType {
        TVDB,
        TVRAGE,
        TVMAZE,
        TRAKT,
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
        canConvertMap.put(TRAKT, Sets.newHashSet(TRAKT)); //Currently no conversion supported
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
    public MediaInfo convert(String value, IdType fromType) throws InfoProviderException {
        logger.info("Conversion of {} {} requested", fromType, value);
        try {
            MediaInfo info;
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
                    info = new MediaInfo(movieInfo);
                } else {
                    TmdbSearchResult result = tmdbHandler.getInfos(value, fromType);
                    info = new MediaInfo(result);
                    movieInfo = new MovieInfo(info.getImdbId().orElse(null), info.getTmdbId().orElse(null), info.getTitle().orElse(null), info.getYear().orElse(null), info.getPosterUrl().orElse(null));
                    movieInfoRepository.save(movieInfo);
                }
            } else if (fromType == TVMAZE || fromType == TVDB || fromType == TVRAGE || fromType == TVTITLE) {
                TvInfo tvInfo;
                if (fromType == TVMAZE) {
                    tvInfo = tvInfoRepository.findByTvmazeId(value);
                } else if (fromType == TVDB) {
                    tvInfo = tvInfoRepository.findByTvdbId(value);
                } else if (fromType == TVRAGE) {
                    tvInfo = tvInfoRepository.findByTvrageId(value);
                } else {
                    tvInfo = tvInfoRepository.findByTitle(value);
                }
                if (tvInfo != null) {
                    info = new MediaInfo(tvInfo);
                } else {
                    TvMazeSearchResult result = tvMazeHandler.getInfos(value, fromType);
                    info = new MediaInfo(result);
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
    public List<MediaInfo> search(String title, IdType titleType) throws InfoProviderException {
        try {
            List<MediaInfo> infos;
            if (titleType == TVTITLE) {
                List<TvMazeSearchResult> results = tvMazeHandler.search(title);
                infos = results.stream().map(MediaInfo::new).collect(Collectors.toList());
            } else if (titleType == MOVIETITLE) {
                List<TmdbSearchResult> results = tmdbHandler.search(title, null);
                infos = results.stream().map(MediaInfo::new).collect(Collectors.toList());
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


}
