package org.nzbhydra.searching.infos;

import com.google.common.base.MoreObjects;
import lombok.Setter;
import org.nzbhydra.database.MovieInfo;
import org.nzbhydra.database.TvInfo;

import java.util.Optional;

@Setter
public class Info {
    private String imdbId;
    private String tmdbId;
    private String tvMazeId;
    private String tvRageId;
    private String tvDbId;
    private String title;
    private Integer year;
    private String posterUrl;


    public Optional<String> getImdbId() {
        return Optional.ofNullable(imdbId);
    }

    public Optional<String> getTmdbId() {
        return Optional.ofNullable(tmdbId);
    }

    public Optional<String> getTvMazeId() {
        return Optional.ofNullable(tvMazeId);
    }

    public Optional<String> getTvRageId() {
        return Optional.ofNullable(tvRageId);
    }

    public Optional<String> getTvDbId() {
        return Optional.ofNullable(tvDbId);
    }

    public Optional<String> getTitle() {
        return Optional.ofNullable(title);
    }

    public Optional<Integer> getYear() {
        return Optional.ofNullable(year);
    }

    public Optional<String> getPosterUrl() {
        return Optional.ofNullable(posterUrl);
    }

    public Info(TvMazeSearchResult searchResult) {
        tvRageId = searchResult.getTvRageId();
        tvMazeId = searchResult.getTvMazeId();
        tvDbId = searchResult.getTvdbId();
        title = searchResult.getTitle();
        year = searchResult.getYear();
        posterUrl = searchResult.getPosterUrl();
    }

    public Info(TmdbSearchResult searchResult) {
        imdbId = searchResult.getImdbId();
        tmdbId = searchResult.getTmdbId();
        title = searchResult.getTitle();
        year = searchResult.getYear();
        posterUrl = searchResult.getPosterUrl();
    }

    public Info(MovieInfo movieInfo) {
        imdbId = movieInfo.getImdbId();
        tmdbId = movieInfo.getTmdbId();
        title = movieInfo.getTitle();
        year = movieInfo.getYear();
        posterUrl = movieInfo.getPosterUrl();
    }

    public Info(TvInfo tvInfo) {
        tvRageId = tvInfo.getTvRageId();
        tvMazeId = tvInfo.getTvMazeId();
        tvDbId = tvInfo.getTvDbId();
        title = tvInfo.getTitle();
        year = tvInfo.getYear();
        posterUrl = tvInfo.getPosterUrl();
    }

    public Info() {

    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("imdbId", imdbId)
                .add("tmdbId", tmdbId)
                .add("tvMazeId", tvMazeId)
                .add("tvRageId", tvRageId)
                .add("tvDbId", tvDbId)
                .add("title", title)
                .add("posterUrl", posterUrl)
                .omitNullValues()
                .toString();
    }
}
