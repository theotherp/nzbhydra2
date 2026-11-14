package org.nzbhydra.mediainfo;

import com.google.common.base.Throwables;
import com.google.common.collect.Sets;
import com.google.common.util.concurrent.Striped;
import net.jodah.expiringmap.ExpirationPolicy;
import net.jodah.expiringmap.ExpiringMap;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.Lock;
import java.util.stream.Collectors;

import static org.nzbhydra.config.mediainfo.MediaIdType.*;

@Component
public class InfoProvider {

    public static Set<MediaIdType> TV_ID_TYPES = Sets.newHashSet(TVDB, TVRAGE, TVMAZE, TVIMDB);
    public static Set<MediaIdType> MOVIE_ID_TYPES = Sets.newHashSet(TMDB, IMDB);
    public static Set<MediaIdType> REAL_ID_TYPES = Sets.union(TV_ID_TYPES, MOVIE_ID_TYPES);

    private static final Map<MediaIdType, Set<MediaIdType>> canConvertMap = new HashMap<>();

    static {
        canConvertMap.put(TVDB, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVIMDB, TVTITLE));
        canConvertMap.put(TVMAZE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVIMDB, TVTITLE));
        canConvertMap.put(TVRAGE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVIMDB, TVTITLE));
        canConvertMap.put(TVIMDB, Sets.newHashSet(TVIMDB, TVMAZE, TVRAGE, TVDB, TVTITLE));
        canConvertMap.put(TRAKT, Sets.newHashSet(TRAKT)); //Currently no conversion supported
        canConvertMap.put(TVTITLE, Sets.newHashSet(TVDB, TVMAZE, TVRAGE, TVIMDB, TVTITLE));

        canConvertMap.put(TMDB, Sets.newHashSet(IMDB, TMDB, TVDB, TVMAZE, TVRAGE, MOVIETITLE));
        canConvertMap.put(IMDB, Sets.newHashSet(IMDB, TMDB, MOVIETITLE));
        canConvertMap.put(MOVIETITLE, Sets.newHashSet(IMDB, TMDB, MOVIETITLE));

    }

    private static final Logger logger = LoggerFactory.getLogger(InfoProvider.class);

    private final Map<MediaInfoKey, MediaInfo> mediaInfoMap = ExpiringMap.builder()
            .expiration(5, TimeUnit.MINUTES)
            .expirationPolicy(ExpirationPolicy.ACCESSED)
            .build();
    private final Striped<Lock> conversionLocks = Striped.lock(64);
    /**
     * Different IDs of the same show or movie are converted in parallel. This lock serializes re-checking the
     * database and saving, so two of them can't both insert a row for the same show or movie.
     */
    private final Object saveLock = new Object();

    @Autowired
    protected TmdbHandler tmdbHandler;
    @Autowired
    private MovieInfoRepository movieInfoRepository;
    @Autowired
    protected TvMazeHandler tvMazeHandler;
    @Autowired
    private TvInfoRepository tvInfoRepository;

    public boolean canConvert(MediaIdType from, MediaIdType to) {
        return canConvertMap.get(from).contains(to);
    }

    public static Set<MediaIdType> getConvertibleFrom(MediaIdType from) {
        return canConvertMap.get(from);
    }

    public boolean canConvertAny(Set<MediaIdType> from, Set<MediaIdType> to) {
        return from.stream().anyMatch(x -> canConvertMap.containsKey(x) && canConvertMap.get(x).stream().anyMatch(to::contains));
    }

    @Cacheable(cacheNames = "infos", sync = true, cacheManager = "genericCacheManager")
    public MediaInfo convert(Map<MediaIdType, String> identifiers) throws InfoProviderException {
        for (MediaIdType idType : REAL_ID_TYPES) {
            if (identifiers.containsKey(idType) && identifiers.get(idType) != null) {
                try {
                    return convert(identifiers.get(idType), idType);
                } catch (InfoProviderException ignored) {
                    //Already logged in call, we continue and hope another ID will work
                }
            }
        }

        throw new InfoProviderException("Unable to find any convertable IDs");
    }


    /**
     * Converts the given ID to a {@link MediaInfo}. Results are cached in {@link #mediaInfoMap} for five minutes after
     * the last access. Lookups for the same ID are serialized so only one of them calls TMDB or TVMaze; lookups for
     * different IDs run in parallel. Failed lookups are not cached.
     * <p>
     * Not annotated with {@code @Cacheable}: {@link #convert(Map)} calls this method on {@code this}, which bypasses
     * the Spring cache proxy, so {@link #mediaInfoMap} is the cache that applies on every call path.
     */
    public MediaInfo convert(String value, MediaIdType fromType) throws InfoProviderException {
        if (value == null) {
            throw new InfoProviderException("Unable to convert IDType " + fromType + " with null value");
        }
        final MediaInfoKey key = new MediaInfoKey(value, fromType);
        MediaInfo cached = mediaInfoMap.get(key);
        if (cached != null) {
            return cached;
        }
        final Lock lock = conversionLockFor(key);
        lock.lock();
        try {
            //Another thread may have converted the same ID while we were waiting for the lock
            cached = mediaInfoMap.get(key);
            if (cached != null) {
                return cached;
            }
            MediaInfo info = loadMediaInfo(value, fromType);
            mediaInfoMap.put(key, info);
            return info;
        } finally {
            lock.unlock();
        }
    }

    Lock conversionLockFor(MediaInfoKey key) {
        return conversionLocks.get(key);
    }

    private MediaInfo loadMediaInfo(String value, MediaIdType fromType) throws InfoProviderException {
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
                        MovieInfo existing = saveMovieInfoIfNew(movieInfo);
                        if (existing != null) {
                            info = new MediaInfo(existing);
                        }
                    }
                    break;
                case TVMAZE:
                case TVDB:
                case TVRAGE:
                case TVTITLE:
                case TVIMDB:
                    TvInfo tvInfo;
                    if (fromType == TVMAZE) {
                        tvInfo = tvInfoRepository.findByTvmazeId(value);
                    } else if (fromType == TVDB) {
                        tvInfo = tvInfoRepository.findByTvdbId(value);
                    } else if (fromType == TVRAGE) {
                        tvInfo = tvInfoRepository.findByTvrageId(value);
                    } else if (fromType == TVIMDB) {
                        tvInfo = tvInfoRepository.findByImdbId(Imdb.withTt(value));
                    } else {
                        tvInfo = tvInfoRepository.findByTitle(value);
                    }
                    if (tvInfo != null) {
                        info = new MediaInfo(tvInfo);
                    } else {
                        TvMazeSearchResult result = tvMazeHandler.getInfos(value, fromType);
                        info = new MediaInfo(result);
                        tvInfo = new TvInfo(info.getTvDbId().orElse(null), info.getTvRageId().orElse(null), info.getTvMazeId().orElse(null), info.getImdbId().orElse(null), info.getTitle().orElse(null), info.getYear().orElse(null), info.getPosterUrl().orElse(null));
                        TvInfo existing = saveTvInfoIfNew(tvInfo);
                        if (existing != null) {
                            info = new MediaInfo(existing);
                        }
                    }
                    break;
                default:
                    throw new IllegalArgumentException("Wrong IdType");
            }
            logger.debug("Conversion successful: {}", info);
            return info;
        } catch (Exception e) {
            logger.error("Error while converting {} {}", fromType, value, e);
            Throwables.throwIfInstanceOf(e, InfoProviderException.class);
            throw new InfoProviderException("Unexpected error while converting infos", e);
        }
    }

    /**
     * Saves the movie info unless the database already contains a row with its TMDB or IMDB ID, which happens when
     * another ID of the same movie was converted concurrently.
     *
     * @return the existing row, or null if the given info was saved
     */
    private MovieInfo saveMovieInfoIfNew(MovieInfo movieInfo) {
        synchronized (saveLock) {
            MovieInfo existing = null;
            if (movieInfo.getTmdbId().isPresent()) {
                existing = movieInfoRepository.findByTmdbId(movieInfo.getTmdbId().get());
            }
            if (existing == null && movieInfo.getImdbId().isPresent()) {
                existing = movieInfoRepository.findByImdbId(movieInfo.getImdbId().get());
            }
            if (existing != null) {
                logger.debug("Movie info was saved concurrently, using existing entry {}", existing);
                return existing;
            }
            movieInfoRepository.save(movieInfo);
            return null;
        }
    }

    /**
     * Saves the TV info unless the database already contains a row with one of its IDs, which happens when another ID
     * of the same show was converted concurrently.
     *
     * @return the existing row, or null if the given info was saved
     */
    private TvInfo saveTvInfoIfNew(TvInfo tvInfo) {
        synchronized (saveLock) {
            TvInfo existing = null;
            if (tvInfo.getTvdbId().isPresent()) {
                existing = tvInfoRepository.findByTvdbId(tvInfo.getTvdbId().get());
            }
            if (existing == null && tvInfo.getTvmazeId().isPresent()) {
                existing = tvInfoRepository.findByTvmazeId(tvInfo.getTvmazeId().get());
            }
            if (existing == null && tvInfo.getTvrageId().isPresent()) {
                existing = tvInfoRepository.findByTvrageId(tvInfo.getTvrageId().get());
            }
            if (existing == null && tvInfo.getImdbId().isPresent()) {
                existing = tvInfoRepository.findByImdbId(tvInfo.getImdbId().get());
            }
            if (existing != null) {
                logger.debug("TV info was saved concurrently, using existing entry {}", existing);
                return existing;
            }
            tvInfoRepository.save(tvInfo);
            return null;
        }
    }

    public TvInfo findTvInfoInDatabase(Map<MediaIdType, String> ids) {
        Collection<TvInfo> matchingInfos = tvInfoRepository.findByTvrageIdOrTvmazeIdOrTvdbIdOrImdbId(ids.getOrDefault(TVRAGE, "-1"), ids.getOrDefault(TVMAZE, "-1"), ids.getOrDefault(TVDB, "-1"), ids.getOrDefault(IMDB, "-1"));
        return matchingInfos.stream().max(TvInfo::compareTo).orElse(null);
    }

    public MovieInfo findMovieInfoInDatabase(Map<MediaIdType, String> ids) {
        Collection<MovieInfo> matchingInfos = movieInfoRepository.findByImdbIdOrTmdbId(ids.getOrDefault(IMDB, "-1"), ids.getOrDefault(TMDB, "-1"));
        return matchingInfos.stream().max(MovieInfo::compareTo).orElse(null);
    }

    @Cacheable(cacheNames = "titles", sync = true, cacheManager = "genericCacheManager")
    public List<MediaInfo> search(String title, MediaIdType titleType) throws InfoProviderException {
        try {
            List<MediaInfo> infos;
            //Always do a search and don't rely on the database, otherwise results might be outdated
            switch (titleType) {
                case TVTITLE -> {
                    List<TvMazeSearchResult> results = tvMazeHandler.search(title);
                    infos = results.stream().map(MediaInfo::new).collect(Collectors.toList());
                    for (MediaInfo mediaInfo : infos) {
                        TvInfo tvInfo = new TvInfo(mediaInfo);
                        if (tvInfoRepository.findByTvrageIdOrTvmazeIdOrTvdbIdOrImdbId(tvInfo.getTvrageId().orElse("-1"), tvInfo.getTvmazeId().orElse("-1"), tvInfo.getTvdbId().orElse("-1"), tvInfo.getImdbId().orElse("-1")).isEmpty()) {
                            tvInfoRepository.save(tvInfo);
                        }
                    }
                }
                case MOVIETITLE -> {
                    List<TmdbSearchResult> results = tmdbHandler.search(title, null);
                    infos = results.stream().map(MediaInfo::new).collect(Collectors.toList());
                    //Do not save these infos to database because TMDB only returns basic info. IMDB ID might be missing and when the repository is queried for conversion it returns an empty IMDB ID
                }
                default -> throw new IllegalArgumentException("Wrong IdType");
            }


            return infos;
        } catch (Exception e) {
            logger.error("Error while searching for {} {}", titleType, title, e);
            Throwables.throwIfInstanceOf(e, InfoProviderException.class);
            throw new InfoProviderException("Unexpected error while converting infos", e);
        }
    }

    record MediaInfoKey(String value, MediaIdType fromType) {

        /**
         * Uses the enum's name instead of its identity hash code so a key maps to the same lock stripe in every JVM run.
         */
        @Override
        public int hashCode() {
            return 31 * value.hashCode() + (fromType == null ? 0 : fromType.name().hashCode());
        }
    }

}
