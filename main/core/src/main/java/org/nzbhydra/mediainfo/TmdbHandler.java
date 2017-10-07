package org.nzbhydra.mediainfo;

import com.uwetrottmann.tmdb2.Tmdb;
import com.uwetrottmann.tmdb2.entities.FindResults;
import com.uwetrottmann.tmdb2.entities.Movie;
import com.uwetrottmann.tmdb2.entities.MovieResultsPage;
import com.uwetrottmann.tmdb2.enumerations.ExternalSource;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import retrofit2.Call;
import retrofit2.Response;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoField;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class TmdbHandler {

    private static final Logger logger = LoggerFactory.getLogger(TmdbHandler.class);
    @Autowired
    protected Tmdb tmdb;
    @Autowired
    private ConfigProvider configProvider;


    public TmdbSearchResult getInfos(String value, InfoProvider.IdType idType) throws InfoProviderException {
        if (idType == InfoProvider.IdType.MOVIETITLE) {
            return fromTitle(value, null);
        }
        if (idType == InfoProvider.IdType.IMDB) {
            return fromImdb(value);
        }
        if (idType == InfoProvider.IdType.TMDB) {
            return fromTmdb(value);
        }
        throw new IllegalArgumentException("Unable to get infos from " + idType);
    }

    private TmdbSearchResult fromImdb(String imdbId) throws InfoProviderException {
        Movie movie = getMovieByImdbId(imdbId);
        TmdbSearchResult result = getSearchResultFromMovie(movie);
        return result;
    }

    private TmdbSearchResult fromTmdb(String imdbId) throws InfoProviderException {
        Movie movie = getMovieByTmdbId(imdbId);
        TmdbSearchResult result = getSearchResultFromMovie(movie);
        return result;
    }

    TmdbSearchResult fromTitle(String title, Integer year) throws InfoProviderException {
        Movie movie = getMovieByTitle(title, year);
        TmdbSearchResult result = getSearchResultFromMovie(movie);
        return result;
    }

    private TmdbSearchResult getSearchResultFromMovie(Movie movie) {
        String fullPosterUrl = movie.poster_path != null ? ("https://image.tmdb.org/t/p/w500/" + movie.poster_path) : null;
        Integer year = movie.release_date != null ? LocalDateTime.ofInstant(movie.release_date.toInstant(), ZoneId.systemDefault()).get(ChronoField.YEAR) : null;
        return new TmdbSearchResult(String.valueOf(movie.id), movie.imdb_id, movie.title, fullPosterUrl, year);
    }

    private Movie getMovieByTitle(String title, Integer year) throws InfoProviderException {
        List<TmdbSearchResult> movies = search(title, year);
        TmdbSearchResult movie = movies.get(0);
        //Unfortunately IMDB ID is not filled here, so we need to make a new query using the TMDB ID
        return getMovieByTmdbId(String.valueOf(movie.getTmdbId()));
    }

    public List<TmdbSearchResult> search(String title, Integer year) throws InfoProviderException {
        List<Movie> movies;
        Call<MovieResultsPage> movieSearch = tmdb.searchService().movie(title, null, configProvider.getBaseConfig().getSearching().getLanguage().orElse("en"), null, year, null, null);
        try {
            Response<MovieResultsPage> response = movieSearch.execute();
            if (!response.isSuccessful()) {
                throw new InfoProviderException("Error while contacting TMDB: " + response.errorBody().string());
            }
            if (response.body().total_results == 0) {
                logger.info("TMDB query for title '{}' returned no searchResults", title);
                return Collections.emptyList();
            }
            movies = response.body().results;
        } catch (IOException e) {
            logger.error("Error while contacting TMDB", e);
            return Collections.emptyList();
        }

        return movies.stream().map(this::getSearchResultFromMovie).collect(Collectors.toList());
    }

    private Movie getMovieByImdbId(String imdbId) throws InfoProviderException {
        Movie movie;
        Call<FindResults> resultsCall = tmdb.findService().find(imdbId, ExternalSource.IMDB_ID, configProvider.getBaseConfig().getSearching().getLanguage().orElse("en"));
        try {
            Response<FindResults> response = resultsCall.execute();
            if (!response.isSuccessful()) {
                throw new InfoProviderException("Error while contacting TMDB: " + response.errorBody().string());
            }
            if (response.body().movie_results.size() == 0) {
                throw new InfoProviderException(String.format("TMDB query for IMDB ID %s returned no searchResults", imdbId));
            }
            movie = response.body().movie_results.get(0);
        } catch (IOException e) {
            throw new InfoProviderException("Error while contacting TMDB", e);
        }
        return movie;
    }


    private Movie getMovieByTmdbId(String tmdbId) throws InfoProviderException {
        Movie movie;
        Call<Movie> english = tmdb.moviesService().summary(Integer.valueOf(tmdbId), configProvider.getBaseConfig().getSearching().getLanguage().orElse("en"), null);
        try {
            Response<Movie> response = english.execute();
            if (!response.isSuccessful()) {
                throw new InfoProviderException("Error while contacting TMDB: " + response.errorBody().string());
            }

            movie = response.body();
        } catch (IOException e) {
            throw new InfoProviderException("Error while contacting TMDB", e);
        }
        return movie;
    }

}
