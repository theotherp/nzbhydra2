package org.nzbhydra.mediainfo;

import com.google.common.base.MoreObjects;
import lombok.Setter;
import org.nzbhydra.database.MovieInfo;
import org.nzbhydra.database.TvInfo;

import java.util.Optional;

@Setter
public class MediaInfo {
    private String imdbId;
    private String tmdbId;
    private String tvmazeId;
    private String tvrageId;
    private String tvdbId;
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
        return Optional.ofNullable(tvmazeId);
    }

    public Optional<String> getTvRageId() {
        return Optional.ofNullable(tvrageId);
    }

    public Optional<String> getTvDbId() {
        return Optional.ofNullable(tvdbId);
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

    public MediaInfo(TvMazeSearchResult searchResult) {
        tvrageId = searchResult.getTvrageId();
        tvmazeId = searchResult.getTvmazeId();
        tvdbId = searchResult.getTvdbId();
        title = searchResult.getTitle();
        year = searchResult.getYear();
        posterUrl = searchResult.getPosterUrl();
    }

    public MediaInfo(TmdbSearchResult searchResult) {
        imdbId = searchResult.getImdbId();
        tmdbId = searchResult.getTmdbId();
        title = searchResult.getTitle();
        year = searchResult.getYear();
        posterUrl = searchResult.getPosterUrl();
    }

    public MediaInfo(MovieInfo movieInfo) {
        imdbId = movieInfo.getImdbId();
        tmdbId = movieInfo.getTmdbId();
        title = movieInfo.getTitle();
        year = movieInfo.getYear();
        posterUrl = movieInfo.getPosterUrl();
    }

    public MediaInfo(TvInfo tvInfo) {
        tvrageId = tvInfo.getTvrageId();
        tvmazeId = tvInfo.getTvmazeId();
        tvdbId = tvInfo.getTvdbId();
        title = tvInfo.getTitle();
        year = tvInfo.getYear();
        posterUrl = tvInfo.getPosterUrl();
    }

    public MediaInfo() {

    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("imdbId", imdbId)
                .add("tmdbId", tmdbId)
                .add("tvmazeId", tvmazeId)
                .add("tvrageId", tvrageId)
                .add("tvdbId", tvdbId)
                .add("title", title)
                .add("posterUrl", posterUrl)
                .omitNullValues()
                .toString();
    }
}
