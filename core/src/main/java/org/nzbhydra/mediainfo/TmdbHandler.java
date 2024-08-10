package org.nzbhydra.mediainfo;

import org.nzbhydra.Jackson;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.webaccess.WebAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@SuppressWarnings("unchecked")
@Component
public class TmdbHandler {

    private static final Logger logger = LoggerFactory.getLogger(TmdbHandler.class);

    @Value("${nzbhydra.tmdb.apikey:}")
    protected String tmdbApiKey;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private WebAccess webAccess;


    public TmdbSearchResult getInfos(String value, MediaIdType idType) throws InfoProviderException {
        if (idType == MediaIdType.MOVIETITLE) {
            return fromTitle(value, null);
        }
        if (idType == MediaIdType.IMDB) {
            return getMovieByImdbId(value);
        }
        if (idType == MediaIdType.TMDB) {
            return getMovieByTmdbId(value);
        }
        throw new IllegalArgumentException("Unable to get infos from " + idType);
    }

    TmdbSearchResult fromTitle(String title, Integer year) throws InfoProviderException {
        final List<TmdbSearchResult> list = search(title, year);
        return list.isEmpty() ? null : list.get(0);
    }

    public List<TmdbSearchResult> search(String title, Integer year) throws InfoProviderException {
        String url = "https://api.themoviedb.org/3/search/movie?query=%s&year=%s&api_key=%s".formatted(title, year == null ? "null" : year, tmdbApiKey);
        try {
            final String json = webAccess.callUrl(url);
            final Map map = Jackson.JSON_MAPPER.readValue(json, Map.class);
            List<Map> list = (List<Map>) map.get("results");
            return list.stream()
                .limit(10)
                .map(x -> {
                    TmdbSearchResult result = new TmdbSearchResult();
                    fillFromMap(x, result);
                    return result;
                }).toList();

        } catch (IOException e) {
            throw new InfoProviderException("Error loading details for movie with title " + title, e);
        }
    }

    private TmdbSearchResult getMovieByImdbId(String imdbId) throws InfoProviderException {
        final String correctImdbId = imdbId.startsWith("tt") ? imdbId : "tt" + imdbId;
        String url = "https://api.themoviedb.org/3/find/%s?external_source=imdb_id&api_key=%s".formatted(correctImdbId, tmdbApiKey);
        try {
            final String json = webAccess.callUrl(url);
            final Map map = Jackson.JSON_MAPPER.readValue(json, Map.class);
            final List<Map> list = (List<Map>) map.get("movie_results");
            TmdbSearchResult result = new TmdbSearchResult();
            if (list.isEmpty()) {
                throw new InfoProviderException(String.format("TMDB query for IMDB ID %s returned no searchResults", imdbId));
            }
            fillFromMap(list.get(0), result);
            result.setImdbId(correctImdbId);
            return result;
        } catch (IOException e) {
            throw new InfoProviderException("Error loading details for movie with IMDB ID " + imdbId, e);
        }
    }


    private TmdbSearchResult getMovieByTmdbId(String tmdbId) throws InfoProviderException {
        String url = "https://api.themoviedb.org/3/movie/%s?api_key=%s".formatted(tmdbId, tmdbApiKey);
        try {
            final String json = webAccess.callUrl(url);
            final Map map = Jackson.JSON_MAPPER.readValue(json, Map.class);
            TmdbSearchResult result = new TmdbSearchResult();
            fillFromMap(map, result);
            result.setImdbId(getImdbId(tmdbId));
            return result;
        } catch (IOException e) {
            throw new InfoProviderException("Error loading details for movie with TMDB ID " + tmdbId, e);
        }

    }

    private static void fillFromMap(Map map, TmdbSearchResult result) {
        result.setTmdbId(String.valueOf(map.get("id")));
        result.setYear(map.get("release_date") != null ? LocalDate.parse(map.get("release_date").toString()).getYear() : null);
        result.setTitle(String.valueOf(map.get("title")));
        result.setPosterUrl(map.get("poster_path") != null ? ("https://image.tmdb.org/t/p/w500/" + map.get("poster_path")) : null);
    }

    private String getImdbId(String tmdbId) throws InfoProviderException {
        String url = "https://api.themoviedb.org/3/movie/%s/external_ids?api_key=%s".formatted(tmdbId, tmdbApiKey);
        try {
            final String json = webAccess.callUrl(url);
            final Map map = Jackson.JSON_MAPPER.readValue(json, Map.class);
            return Optional.ofNullable(map.get("imdb_id")).map(x -> String.valueOf(map.get("imdb_id"))).orElse(null);
        } catch (IOException e) {
            throw new InfoProviderException("Error loading details for movie with ID " + tmdbId, e);
        }
    }


}
