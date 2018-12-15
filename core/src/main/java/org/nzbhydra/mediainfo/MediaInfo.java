package org.nzbhydra.mediainfo;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.base.MoreObjects;
import lombok.Setter;

import java.util.Collection;
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

    @JsonIgnore
    public Optional<String> getByIdType(InfoProvider.IdType idType) {
        switch (idType) {
            case IMDB:
                return getImdbId();
            case TMDB:
                return getTmdbId();
            case TVMAZE:
                return getTvMazeId();
            case TVRAGE:
                return getTvRageId();
            case TVDB:
                return getTvDbId();
            case TVTITLE:
            case MOVIETITLE:
                return getTitle();
        }
        return Optional.empty();
    }

    @JsonIgnore
    public boolean isInfoContained(Collection<InfoProvider.IdType> types) {
        return types.stream().anyMatch(x -> getByIdType(x).isPresent());
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
        imdbId = movieInfo.getImdbId().orElse(null);
        tmdbId = movieInfo.getTmdbId().orElse(null);
        title = movieInfo.getTitle().orElse(null);
        year = movieInfo.getYear();
        posterUrl = movieInfo.getPosterUrl().orElse(null);
    }

    public MediaInfo(TvInfo tvInfo) {
        tvrageId = tvInfo.getTvrageId().orElse(null);
        tvmazeId = tvInfo.getTvmazeId().orElse(null);
        tvdbId = tvInfo.getTvdbId().orElse(null);
        title = tvInfo.getTitle();
        year = tvInfo.getYear();
        posterUrl = tvInfo.getPosterUrl().orElse(null);
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
