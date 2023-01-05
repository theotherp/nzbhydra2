package org.nzbhydra.mediainfo;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.base.MoreObjects;
import lombok.Setter;
import org.nzbhydra.config.mediainfo.MediaIdType;

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
        return Optional.ofNullable(Imdb.withTt(imdbId));
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
    public Optional<String> getByIdType(MediaIdType idType) {
        return switch (idType) {
            case IMDB, TVIMDB -> getImdbId();
            case TMDB -> getTmdbId();
            case TVMAZE -> getTvMazeId();
            case TVRAGE -> getTvRageId();
            case TVDB -> getTvDbId();
            case TVTITLE, MOVIETITLE -> getTitle();
            default -> Optional.empty();
        };
    }

    @JsonIgnore
    public boolean isInfoContained(Collection<MediaIdType> types) {
        return types.stream().anyMatch(x -> getByIdType(x).isPresent());
    }

    public MediaInfo(TvMazeSearchResult searchResult) {
        tvrageId = searchResult.getTvrageId();
        tvmazeId = searchResult.getTvmazeId();
        tvdbId = searchResult.getTvdbId();
        imdbId = Imdb.withTt(searchResult.getImdbId());
        title = searchResult.getTitle();
        year = searchResult.getYear();
        posterUrl = searchResult.getPosterUrl();
    }

    public MediaInfo(TmdbSearchResult searchResult) {
        imdbId = Imdb.withTt(searchResult.getImdbId());
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
        imdbId = tvInfo.getImdbId().orElse(null);
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
