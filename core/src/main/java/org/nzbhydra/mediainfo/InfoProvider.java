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

import static org.nzbhydra.mediainfo.InfoProvider.IdType.*;

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

    public static Set<IdType> TV_ID_TYPES = Sets.newHashSet(TVDB, TVRAGE, TVMAZE);
    public static Set<IdType> MOVIE_ID_TYPES = Sets.newHashSet(TMDB, IMDB);
    public static Set<IdType> REAL_ID_TYPES = Sets.union(TV_ID_TYPES, MOVIE_ID_TYPES);

    private static Map<IdType, Set<IdType>> canConvertMap = new HashMap<>();

    static {
        canConvertMap.put(TVDB, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVTITLE));
        canConvertMap.put(TVMAZE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVTITLE));
        canConvertMap.put(TVRAGE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVTITLE));
        canConvertMap.put(TRAKT, Sets.newHashSet(TRAKT)); //Currently no conversion supported
        canConvertMap.put(TVTITLE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVTITLE));

        canConvertMap.put(TMDB, Sets.newHashSet(IMDB, TMDB, MOVIETITLE));
        canConvertMap.put(IMDB, Sets.newHashSet(IMDB, TMDB, MOVIETITLE));
        canConvertMap.put(MOVIETITLE, Sets.newHashSet(IMDB, TMDB, MOVIETITLE));

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

    public MediaInfo convert(Map<IdType, String> identifiers) throws InfoProviderException {
        for (IdType idType : REAL_ID_TYPES) {
            if (identifiers.containsKey(idType) && identifiers.get(idType) != null) {
                return convert(identifiers.get(idType), idType);
            }
        }

        throw new InfoProviderException("Unable to find any convertable IDs");
    }


    @Cacheable(cacheNames = "infos", sync = true)
    public MediaInfo convert(String value, IdType fromType) throws InfoProviderException {
        if (value == null) {
            throw new InfoProviderException("Unable to convert IDType " + fromType + " with null value");
        }
        logger.debug("Conversion of {} ID {} requested", fromType, value);
        try {
            MediaInfo info;
            switch (fromType) {
                case IMDB:
                    if (!value.startsWith("tt")) {
                        value = "tt" + value;
                    }
                case TMDB:
                case MOVIETITLE:
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
                        //The info currently only contains the value we converted to, we also want the one we converted from of course
                        if (fromType == TMDB) {
                            info.setTmdbId(value);
                        } else if (fromType == IMDB) {
                            info.setImdbId(value);
                        }
                        movieInfo = new MovieInfo(info.getImdbId().orElse(null), info.getTmdbId().orElse(null), info.getTitle().orElse(null), info.getYear().orElse(null), info.getPosterUrl().orElse(null));
                        movieInfoRepository.save(movieInfo);
                    }
                    break;
                case TVMAZE:
                case TVDB:
                case TVRAGE:
                case TVTITLE:
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
                    break;
                default:
                    throw new IllegalArgumentException("Wrong IdType");
            }
            logger.debug("Conversion successful: " + info);
            return info;
        } catch (Exception e) {
            logger.error("Error while converting " + fromType + " " + value, e);
            Throwables.throwIfInstanceOf(e, InfoProviderException.class);
            throw new InfoProviderException("Unexpected error while converting infos", e);
        }
    }

    public TvInfo findTvInfoInDatabase(Map<IdType, String> ids) {
        return tvInfoRepository.findByTvrageIdOrTvmazeIdOrTvdbId(ids.getOrDefault(TVRAGE, "-1"), ids.getOrDefault(TVMAZE, "-1"), ids.getOrDefault(TVDB, "-1"));
    }

    public MovieInfo findMovieInfoInDatabase(Map<IdType, String> ids) {
        return movieInfoRepository.findByImdbIdOrTmdbId(ids.getOrDefault(IMDB, "-1"), ids.getOrDefault(TMDB, "-1"));
    }

    @Cacheable(cacheNames = "titles", sync = true)
    public List<MediaInfo> search(String title, IdType titleType) throws InfoProviderException {
        try {
            List<MediaInfo> infos;
            //Always do a search and don't rely on the database, otherwise results might be outdated
            switch (titleType) {
                case TVTITLE: {
                    List<TvMazeSearchResult> results = tvMazeHandler.search(title);
                    infos = results.stream().map(MediaInfo::new).collect(Collectors.toList());
                    for (MediaInfo mediaInfo : infos) {
                        TvInfo tvInfo = new TvInfo(mediaInfo);
                        if (tvInfoRepository.findByTvrageIdOrTvmazeIdOrTvdbId(nullableId(tvInfo.getTvrageId()), nullableId(tvInfo.getTvmazeId()), nullableId(tvInfo.getTvdbId())) == null) {
                            tvInfoRepository.save(tvInfo);
                        }
                    }
                    break;
                }
                case MOVIETITLE: {
                    List<TmdbSearchResult> results = tmdbHandler.search(title, null);
                    infos = results.stream().map(MediaInfo::new).collect(Collectors.toList());
                    //Do not save these infos to database because TMDB only returns basic info. IMDB ID might be missing and when the repository is queried for conversion it returns an empty IMDB ID
                    break;
                }
                default:
                    throw new IllegalArgumentException("Wrong IdType");
            }


            return infos;
        } catch (Exception e) {
            logger.error("Error while searching for " + titleType + " " + title, e);
            Throwables.throwIfInstanceOf(e, InfoProviderException.class);
            throw new InfoProviderException("Unexpected error while converting infos", e);
        }
    }

    private String nullableId(String id) {
        return id == null ? "-1" : id;
    }


}
